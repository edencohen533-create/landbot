import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  let body: { quizId?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  const { quizId, token } = body;
  if (!quizId || !token) {
    return NextResponse.json({ ok: false, error: "missing quizId or token" }, { status: 400 });
  }

  // Verify the caller actually owns this quiz using the session-scoped
  // (RLS-respecting) client before touching anything with the admin client.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });
  }
  const { data: quiz } = await supabase.from("quizzes").select("id").eq("id", quizId).maybeSingle();
  if (!quiz) {
    return NextResponse.json({ ok: false, error: "not found or not authorized" }, { status: 403 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error: secretError } = await admin
    .from("quiz_tracking_secrets")
    .upsert({ quiz_id: quizId, meta_access_token: token, updated_at: now });
  if (secretError) {
    return NextResponse.json({ ok: false, error: secretError.message }, { status: 500 });
  }
  await admin.from("quiz_tracking_settings").upsert({ quiz_id: quizId, meta_has_token: true, updated_at: now });

  return NextResponse.json({ ok: true });
}
