import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  let body: { quizId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  const { quizId } = body;
  if (!quizId) return NextResponse.json({ ok: false, error: "missing quizId" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });
  const { data: quiz } = await supabase.from("quizzes").select("id").eq("id", quizId).maybeSingle();
  if (!quiz) return NextResponse.json({ ok: false, error: "not found or not authorized" }, { status: 403 });

  const admin = createAdminClient();
  const [{ data: settings }, { data: secret }] = await Promise.all([
    admin.from("quiz_tracking_settings").select("meta_pixel_id").eq("quiz_id", quizId).maybeSingle(),
    admin.from("quiz_tracking_secrets").select("meta_access_token").eq("quiz_id", quizId).maybeSingle(),
  ]);

  const pixelId = settings?.meta_pixel_id;
  const token = secret?.meta_access_token;
  const now = new Date().toISOString();

  if (!pixelId || !token) {
    await admin
      .from("quiz_tracking_settings")
      .upsert({ quiz_id: quizId, meta_last_test_status: "error", meta_last_test_error: "חסר Pixel ID או Access Token", meta_last_test_at: now });
    return NextResponse.json({ ok: false, error: "חסר Pixel ID או Access Token" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: token,
        data: [
          {
            event_name: "TestEvent",
            event_time: Math.floor(Date.now() / 1000),
            event_id: crypto.randomUUID(),
            action_source: "system_generated",
            user_data: { client_user_agent: "QuizFlow-Tracking-Test/1.0" },
          },
        ],
      }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      const message = data.error?.message || `HTTP ${res.status}`;
      await admin
        .from("quiz_tracking_settings")
        .upsert({ quiz_id: quizId, meta_last_test_status: "error", meta_last_test_error: message, meta_last_test_at: now });
      return NextResponse.json({ ok: false, error: message });
    }

    await admin
      .from("quiz_tracking_settings")
      .upsert({ quiz_id: quizId, meta_last_test_status: "success", meta_last_test_error: null, meta_last_test_at: now });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאת רשת";
    await admin
      .from("quiz_tracking_settings")
      .upsert({ quiz_id: quizId, meta_last_test_status: "error", meta_last_test_error: message, meta_last_test_at: now });
    return NextResponse.json({ ok: false, error: message });
  }
}
