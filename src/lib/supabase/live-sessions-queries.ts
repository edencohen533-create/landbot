import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { QuizSession } from "@/lib/types";
import { QuizSessionRow, sessionRowToSession } from "./mappers";

export async function listLiveSessions(supabase: SupabaseClient, workspaceId: string): Promise<QuizSession[]> {
  const { data, error } = await supabase
    .from("quiz_sessions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("last_event_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as QuizSessionRow[]).map(sessionRowToSession);
}

export async function deleteSession(supabase: SupabaseClient, sessionId: string) {
  const { error } = await supabase.from("quiz_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}

export async function deleteDemoSessions(supabase: SupabaseClient, workspaceId: string) {
  const { error } = await supabase.from("quiz_sessions").delete().eq("workspace_id", workspaceId).eq("is_demo", true);
  if (error) throw error;
}

export async function getDemoLiveEnabled(supabase: SupabaseClient, workspaceId: string): Promise<boolean> {
  const { data } = await supabase.from("inbox_settings").select("demo_live_enabled").eq("workspace_id", workspaceId).maybeSingle();
  return data?.demo_live_enabled ?? false;
}

export async function setDemoLiveEnabled(supabase: SupabaseClient, workspaceId: string, enabled: boolean) {
  const { error } = await supabase
    .from("inbox_settings")
    .upsert({ workspace_id: workspaceId, demo_live_enabled: enabled, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export function subscribeToSessions(
  supabase: SupabaseClient,
  workspaceId: string,
  onChange: () => void
): RealtimeChannel {
  return supabase
    .channel(`quiz-sessions-${workspaceId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "quiz_sessions", filter: `workspace_id=eq.${workspaceId}` },
      onChange
    )
    .subscribe();
}
