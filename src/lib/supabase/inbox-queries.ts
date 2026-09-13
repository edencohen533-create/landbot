import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import {
  Conversation,
  ConversationChannel,
  ConversationMessage,
  ConversationNote,
  ConversationStatus,
  MessageSenderType,
  QuickReply,
} from "@/lib/types";

interface ConversationRow {
  id: string;
  workspace_id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_avatar_url: string | null;
  channel: ConversationChannel;
  status: ConversationStatus;
  assigned_to: string | null;
  tags: string[];
  unread_count: number;
  last_message_at: string;
  last_message_preview: string | null;
  is_demo: boolean;
  created_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_type: MessageSenderType;
  sender_id: string | null;
  body: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  status: "sent" | "delivered" | "read";
  is_demo: boolean;
  created_at: string;
}

function rowToConversation(row: ConversationRow, assignedToName?: string): Conversation {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone ?? undefined,
    customerEmail: row.customer_email ?? undefined,
    customerAvatarUrl: row.customer_avatar_url ?? undefined,
    channel: row.channel,
    status: row.status,
    assignedTo: row.assigned_to ?? undefined,
    assignedToName,
    tags: row.tags ?? [],
    unreadCount: row.unread_count,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview ?? undefined,
    isDemo: row.is_demo,
    createdAt: row.created_at,
  };
}

function rowToMessage(row: MessageRow): ConversationMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type,
    senderId: row.sender_id ?? undefined,
    body: row.body ?? undefined,
    attachmentUrl: row.attachment_url ?? undefined,
    attachmentType: row.attachment_type ?? undefined,
    attachmentName: row.attachment_name ?? undefined,
    status: row.status,
    isDemo: row.is_demo,
    createdAt: row.created_at,
  };
}

export async function listConversations(supabase: SupabaseClient, workspaceId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as ConversationRow[];

  const agentIds = Array.from(new Set(rows.map((r) => r.assigned_to).filter(Boolean))) as string[];
  const namesById = new Map<string, string>();
  if (agentIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", agentIds);
    for (const p of profiles ?? []) namesById.set(p.id, p.full_name ?? "נציג");
  }

  return rows.map((r) => rowToConversation(r, r.assigned_to ? namesById.get(r.assigned_to) : undefined));
}

export async function listMessages(supabase: SupabaseClient, conversationId: string): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToMessage);
}

export async function sendMessage(
  supabase: SupabaseClient,
  workspaceId: string,
  conversationId: string,
  input: { body?: string; senderType: MessageSenderType; senderId?: string; attachmentUrl?: string; attachmentType?: string; attachmentName?: string; isDemo?: boolean }
) {
  const { error } = await supabase.from("conversation_messages").insert({
    conversation_id: conversationId,
    workspace_id: workspaceId,
    sender_type: input.senderType,
    sender_id: input.senderId ?? null,
    body: input.body ?? null,
    attachment_url: input.attachmentUrl ?? null,
    attachment_type: input.attachmentType ?? null,
    attachment_name: input.attachmentName ?? null,
    status: "sent",
    is_demo: input.isDemo ?? false,
  });
  if (error) throw error;
}

export async function createConversation(
  supabase: SupabaseClient,
  workspaceId: string,
  input: {
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAvatarUrl?: string;
    channel: ConversationChannel;
    tags?: string[];
    isDemo?: boolean;
  }
): Promise<Conversation> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      workspace_id: workspaceId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone ?? null,
      customer_email: input.customerEmail ?? null,
      customer_avatar_url: input.customerAvatarUrl ?? null,
      channel: input.channel,
      tags: input.tags ?? [],
      is_demo: input.isDemo ?? false,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToConversation(data);
}

export async function markConversationRead(supabase: SupabaseClient, conversationId: string) {
  await supabase.from("conversations").update({ unread_count: 0 }).eq("id", conversationId);
}

export async function updateConversationStatus(supabase: SupabaseClient, conversationId: string, status: ConversationStatus) {
  await supabase.from("conversations").update({ status }).eq("id", conversationId);
}

export async function assignConversation(supabase: SupabaseClient, conversationId: string, userId: string | null) {
  await supabase.from("conversations").update({ assigned_to: userId }).eq("id", conversationId);
}

export async function updateConversationTags(supabase: SupabaseClient, conversationId: string, tags: string[]) {
  await supabase.from("conversations").update({ tags }).eq("id", conversationId);
}

export async function listConversationNotes(supabase: SupabaseClient, conversationId: string): Promise<ConversationNote[]> {
  const { data, error } = await supabase
    .from("conversation_notes")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((n) => ({ id: n.id, conversationId: n.conversation_id, text: n.text, createdAt: n.created_at }));
}

export async function addConversationNote(supabase: SupabaseClient, conversationId: string, text: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("conversation_notes").insert({ conversation_id: conversationId, text, created_by: user?.id ?? null });
}

export async function listQuickReplies(supabase: SupabaseClient, workspaceId: string): Promise<QuickReply[]> {
  const { data, error } = await supabase.from("quick_replies").select("*").eq("workspace_id", workspaceId).order("label");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, workspaceId: r.workspace_id, label: r.label, body: r.body }));
}

export async function seedDefaultQuickReplies(supabase: SupabaseClient, workspaceId: string) {
  const defaults = [
    { label: "ברוכים הבאים", body: "היי 💛 תודה שפנית אלינו! איך אפשר לעזור?" },
    { label: "בדיקת מלאי", body: "בודקים זמינות במלאי ומעדכנים אותך תוך כמה דקות." },
    { label: "מעקב משלוח", body: "אפשר לשלוח לי מספר הזמנה כדי שאבדוק את סטטוס המשלוח?" },
    { label: "סגירת שיחה", body: "שמחנו לעזור! אם יש עוד משהו, אנחנו כאן 🙌" },
  ];
  await supabase.from("quick_replies").insert(defaults.map((d) => ({ ...d, workspace_id: workspaceId })));
}

export async function getInboxSettings(supabase: SupabaseClient, workspaceId: string): Promise<{ demoLiveEnabled: boolean }> {
  const { data } = await supabase.from("inbox_settings").select("demo_live_enabled").eq("workspace_id", workspaceId).maybeSingle();
  return { demoLiveEnabled: data?.demo_live_enabled ?? false };
}

export async function setInboxDemoLive(supabase: SupabaseClient, workspaceId: string, enabled: boolean) {
  await supabase.from("inbox_settings").upsert({ workspace_id: workspaceId, demo_live_enabled: enabled, updated_at: new Date().toISOString() });
}

export async function deleteDemoData(supabase: SupabaseClient, workspaceId: string) {
  await supabase.from("conversations").delete().eq("workspace_id", workspaceId).eq("is_demo", true);
}

export function subscribeToConversations(
  supabase: SupabaseClient,
  workspaceId: string,
  onChange: () => void
): RealtimeChannel {
  return supabase
    .channel(`conversations-${workspaceId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversations", filter: `workspace_id=eq.${workspaceId}` },
      onChange
    )
    .subscribe();
}

export function subscribeToMessages(
  supabase: SupabaseClient,
  workspaceId: string,
  onInsert: (row: ConversationMessage) => void
): RealtimeChannel {
  return supabase
    .channel(`conversation-messages-${workspaceId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "conversation_messages", filter: `workspace_id=eq.${workspaceId}` },
      (payload) => onInsert(rowToMessage(payload.new as MessageRow))
    )
    .subscribe();
}
