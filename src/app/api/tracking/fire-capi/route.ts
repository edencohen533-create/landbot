import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function POST(req: NextRequest) {
  let body: {
    quizId?: string;
    eventName?: string;
    eventId?: string;
    value?: number;
    currency?: string;
    phone?: string;
    email?: string;
    sourceUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  const { quizId, eventName, eventId } = body;
  if (!quizId || !eventName || !eventId) {
    return NextResponse.json({ ok: false, error: "missing quizId, eventName or eventId" }, { status: 400 });
  }

  // Anonymous-safe: this only succeeds if the quiz is published, same
  // policy the public runtime itself relies on to load the quiz at all.
  const supabase = await createClient();
  const { data: quiz } = await supabase.from("quizzes").select("id").eq("id", quizId).eq("status", "active").maybeSingle();
  if (!quiz) {
    return NextResponse.json({ ok: false, error: "quiz not found or not published" }, { status: 404 });
  }

  const admin = createAdminClient();
  const [{ data: settings }, { data: secret }] = await Promise.all([
    admin.from("quiz_tracking_settings").select("meta_pixel_id").eq("quiz_id", quizId).maybeSingle(),
    admin.from("quiz_tracking_secrets").select("meta_access_token").eq("quiz_id", quizId).maybeSingle(),
  ]);
  const pixelId = settings?.meta_pixel_id;
  const token = secret?.meta_access_token;
  if (!pixelId || !token) {
    return NextResponse.json({ ok: false, error: "meta not configured" });
  }

  const userData: Record<string, unknown> = {
    client_ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    client_user_agent: req.headers.get("user-agent") ?? undefined,
  };
  if (body.email) userData.em = [sha256(body.email)];
  if (body.phone) userData.ph = [sha256(body.phone.replace(/\D/g, ""))];

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: token,
        data: [
          {
            event_name: eventName,
            event_id: eventId,
            event_time: Math.floor(Date.now() / 1000),
            action_source: "website",
            event_source_url: body.sourceUrl,
            user_data: userData,
            custom_data: body.value != null ? { value: body.value, currency: body.currency || "ILS" } : undefined,
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return NextResponse.json({ ok: false, error: data.error?.message || `HTTP ${res.status}` });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "שגיאת רשת" });
  }
}
