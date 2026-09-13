"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getWorkspaceId } from "@/lib/supabase/queries";
import {
  getInboxSettings,
  listConversations,
  listMessages,
  listQuickReplies,
  markConversationRead,
  seedDefaultQuickReplies,
  sendMessage,
  setInboxDemoLive,
  subscribeToConversations,
  subscribeToMessages,
} from "@/lib/supabase/inbox-queries";
import { startDemoSimulator } from "@/lib/inbox-demo";
import { Conversation, ConversationMessage, QuickReply } from "@/lib/types";
import { ConversationList } from "@/components/inbox/conversation-list";
import { ConversationThread } from "@/components/inbox/conversation-thread";
import { CustomerPanel } from "@/components/inbox/customer-panel";
import { toast } from "sonner";

export default function InboxPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [demoLive, setDemoLive] = useState(false);

  const stopSimulatorRef = useRef<(() => void) | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const reloadConversations = useCallback(async () => {
    if (!workspaceId) return;
    const list = await listConversations(supabase, workspaceId);
    setConversations(list);
  }, [supabase, workspaceId]);

  useEffect(() => {
    (async () => {
      const wsId = await getWorkspaceId(supabase);
      setWorkspaceId(wsId);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setCurrentUserName((user.user_metadata?.full_name as string | undefined) || user.email || "נציג");
      }

      const [list, replies, settings] = await Promise.all([
        listConversations(supabase, wsId),
        listQuickReplies(supabase, wsId),
        getInboxSettings(supabase, wsId),
      ]);
      setConversations(list);
      setQuickReplies(replies);
      if (replies.length === 0) {
        await seedDefaultQuickReplies(supabase, wsId);
        setQuickReplies(await listQuickReplies(supabase, wsId));
      }
      setDemoLive(settings.demoLiveEnabled);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: conversations list (new/updated conversations) + new messages workspace-wide.
  useEffect(() => {
    if (!workspaceId) return;
    const convChannel = subscribeToConversations(supabase, workspaceId, () => {
      reloadConversations();
    });
    const msgChannel = subscribeToMessages(supabase, workspaceId, (msg) => {
      if (msg.conversationId === selectedIdRef.current) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        if (msg.senderType === "customer") markConversationRead(supabase, msg.conversationId);
      }
      if (msg.senderType === "customer") {
        toast.message(`הודעה חדשה`, { description: msg.body?.slice(0, 80) });
      }
    });
    return () => {
      supabase.removeChannel(convChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [supabase, workspaceId, reloadConversations]);

  useEffect(() => {
    if (!workspaceId) return;
    if (demoLive && !stopSimulatorRef.current) {
      stopSimulatorRef.current = startDemoSimulator(supabase, workspaceId);
    }
    if (!demoLive && stopSimulatorRef.current) {
      stopSimulatorRef.current();
      stopSimulatorRef.current = null;
    }
    return () => {
      stopSimulatorRef.current?.();
      stopSimulatorRef.current = null;
    };
  }, [demoLive, supabase, workspaceId]);

  async function handleToggleDemoLive(next: boolean) {
    setDemoLive(next);
    if (workspaceId) await setInboxDemoLive(supabase, workspaceId, next);
  }

  async function handleSelect(id: string) {
    setSelectedId(id);
    const msgs = await listMessages(supabase, id);
    setMessages(msgs);
    const conv = conversations.find((c) => c.id === id);
    if (conv && conv.unreadCount > 0) {
      await markConversationRead(supabase, id);
      setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
    }
  }

  async function handleSend(body: string, attachment?: { url: string; type: string; name: string }) {
    if (!workspaceId || !selectedId || !currentUserId) return;
    await sendMessage(supabase, workspaceId, selectedId, {
      body: body || undefined,
      senderType: "agent",
      senderId: currentUserId,
      attachmentUrl: attachment?.url,
      attachmentType: attachment?.type,
      attachmentName: attachment?.name,
    });
    const msgs = await listMessages(supabase, selectedId);
    setMessages(msgs);
    reloadConversations();
  }

  const selectedConversation = conversations.find((c) => c.id === selectedId) ?? null;

  if (loading || !workspaceId || !currentUserId) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        demoLive={demoLive}
        onToggleDemoLive={handleToggleDemoLive}
        onSelect={handleSelect}
      />
      <ConversationThread
        conversation={selectedConversation}
        messages={messages}
        quickReplies={quickReplies}
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        onSend={handleSend}
        onConversationUpdated={reloadConversations}
      />
      <CustomerPanel
        conversation={selectedConversation}
        allConversations={conversations}
        onConversationUpdated={reloadConversations}
      />
    </div>
  );
}
