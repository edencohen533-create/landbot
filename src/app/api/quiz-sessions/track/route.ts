import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { QuizSessionAnswer } from "@/lib/types";

interface TrackBody {
  sessionId?: string;
  quizId?: string;
  stepIndex?: number;
  totalSteps?: number;
  currentNodeId?: string;
  currentNodeTitle?: string;
  status?: "active" | "completed";
  name?: string;
  phone?: string;
  email?: string;
  score?: number;
  category?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  answers?: QuizSessionAnswer[];
}

export async function POST(req: NextRequest) {
  let body: TrackBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  const { sessionId, quizId } = body;
  if (!sessionId || !quizId) {
    return NextResponse.json({ ok: false, error: "missing sessionId or quizId" }, { status: 400 });
  }

  // Anonymous-safe: only succeeds against a published quiz, same rule the
  // public runtime itself relies on to load the quiz. workspace_id / quiz
  // name are derived server-side from the quiz row, never trusted from
  // the client, so a visitor can't spoof which workspace this lands in.
  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, name, workspace_id")
    .eq("id", quizId)
    .eq("status", "active")
    .maybeSingle();
  if (!quiz) {
    return NextResponse.json({ ok: false, error: "quiz not found or not published" }, { status: 404 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("quiz_sessions").upsert({
    id: sessionId,
    quiz_id: quiz.id,
    workspace_id: quiz.workspace_id,
    quiz_name: quiz.name,
    step_index: body.stepIndex ?? 0,
    total_steps: body.totalSteps ?? 0,
    current_node_id: body.currentNodeId ?? null,
    current_node_title: body.currentNodeTitle ?? null,
    status: body.status ?? "active",
    name: body.name ?? null,
    phone: body.phone ?? null,
    email: body.email ?? null,
    score: body.score ?? 0,
    category: body.category ?? null,
    utm_source: body.utmSource ?? null,
    utm_medium: body.utmMedium ?? null,
    utm_campaign: body.utmCampaign ?? null,
    answers: body.answers ?? [],
    last_event_at: now,
    completed_at: body.status === "completed" ? now : null,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
