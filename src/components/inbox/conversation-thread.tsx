"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, Smile, Zap, Pause, CheckCircle2, Play, Loader2, FileText, UserPlus, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConversationStatusBadge } from "@/components/shared/status-badges";
import { createClient } from "@/lib/supabase/client";
import { assignConversation, updateConversationStatus } from "@/lib/supabase/inbox-queries";
import { Conversation, ConversationMessage, QuickReply } from "@/lib/types";

const EMOJIS = ["😀", "😊", "🙏", "👍", "❤️", "🎉", "💛", "🙌", "😅", "🤔", "😢", "🔥", "✨", "✅", "📦", "💬"];

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export function ConversationThread({
  conversation,
  messages,
  quickReplies,
  workspaceId,
  currentUserId,
  currentUserName,
  onSend,
  onConversationUpdated,
}: {
  conversation: Conversation | null;
  messages: ConversationMessage[];
  quickReplies: QuickReply[];
  workspaceId: string;
  currentUserId: string;
  currentUserName: string;
  onSend: (body: string, attachment?: { url: string; type: string; name: string }) => Promise<void>;
  onConversationUpdated: () => void;
}) {
  const supabase = createClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, conversation?.id]);

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        בחר שיחה מהרשימה כדי להתחיל
      </div>
    );
  }

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    await onSend(text.trim());
    setText("");
    setSending(false);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);
      const res = await fetch("/api/inbox/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok) {
        await onSend("", { url: data.url, type: data.type, name: data.name });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleStatusChange(status: Conversation["status"]) {
    if (!conversation) return;
    await updateConversationStatus(supabase, conversation.id, status);
    onConversationUpdated();
  }

  async function handleAssignToggle() {
    if (!conversation) return;
    const nextAssignee = conversation.assignedTo === currentUserId ? null : currentUserId;
    await assignConversation(supabase, conversation.id, nextAssignee);
    onConversationUpdated();
  }

  return (
    <div className="flex flex-1 min-w-0 flex-col h-screen">
      <header className="flex items-center justify-between gap-3 border-b px-5 h-16 shrink-0 bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="size-9 shrink-0">
            <AvatarFallback>{conversation.customerName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold truncate">{conversation.customerName}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <ConversationStatusBadge status={conversation.status} />
              {conversation.assignedToName ? (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">מוקצה ל{conversation.assignedToName}</span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">ללא הקצאה</span>
              )}
              {conversation.tags.map((t) => (
                <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleAssignToggle} title={currentUserName}>
            {conversation.assignedTo === currentUserId ? <UserMinus className="size-3.5" /> : <UserPlus className="size-3.5" />}
            {conversation.assignedTo === currentUserId ? "בטל הקצאה" : "הקצה אליי"}
          </Button>
          {conversation.status !== "snoozed" ? (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("snoozed")}>
              <Pause className="size-3.5" /> השהה
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("open")}>
              <Play className="size-3.5" /> חדש שיחה
            </Button>
          )}
          {conversation.status !== "closed" ? (
            <Button size="sm" onClick={() => handleStatusChange("closed")}>
              <CheckCircle2 className="size-3.5" /> סיים שיחה
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("open")}>
              <Play className="size-3.5" /> פתח מחדש
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">אין הודעות עדיין בשיחה הזו</p>
        )}
        {messages.map((m) => {
          const isAgent = m.senderType === "agent";
          const isSystem = m.senderType === "system";
          if (isSystem) {
            return (
              <p key={m.id} className="text-center text-xs text-muted-foreground">{m.body}</p>
            );
          }
          return (
            <div key={m.id} className={`flex flex-col gap-1 ${isAgent ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isAgent ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {m.body && <p className="whitespace-pre-line">{m.body}</p>}
                {m.attachmentUrl && (
                  m.attachmentType?.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.attachmentUrl} alt={m.attachmentName ?? ""} className="mt-1 max-h-56 rounded-lg object-cover" />
                  ) : (
                    <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1.5 underline text-xs">
                      <FileText className="size-3.5" /> {m.attachmentName ?? "קובץ מצורף"}
                    </a>
                  )
                )}
              </div>
              <span className="px-1 text-[10px] text-muted-foreground">
                {timeLabel(m.createdAt)}
                {isAgent && m.status === "read" && " · נקרא"}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 shrink-0 space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="כתוב הודעה..."
          rows={2}
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger render={<Button variant="ghost" size="icon" className="size-8"><Smile className="size-4" /></Button>} />
              <PopoverContent className="w-56 p-2">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJIS.map((em) => (
                    <button key={em} className="rounded p-1 text-lg hover:bg-accent" onClick={() => setText((t) => t + em)}>
                      {em}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8"><Zap className="size-4" /></Button>} />
              <DropdownMenuContent align="start">
                {quickReplies.map((q) => (
                  <DropdownMenuItem key={q.id} onClick={() => setText(q.body)}>
                    {q.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button size="sm" onClick={handleSend} disabled={!text.trim() || sending}>
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            שליחה
          </Button>
        </div>
      </div>
    </div>
  );
}
