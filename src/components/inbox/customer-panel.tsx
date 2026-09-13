"use client";

import { useEffect, useState } from "react";
import { Phone, Mail, Tag, X, Plus, ShoppingBag, History } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CHANNEL_LABELS, Conversation, ConversationNote } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { addConversationNote, listConversationNotes, updateConversationTags } from "@/lib/supabase/inbox-queries";

export function CustomerPanel({
  conversation,
  allConversations,
  onConversationUpdated,
}: {
  conversation: Conversation | null;
  allConversations: Conversation[];
  onConversationUpdated: () => void;
}) {
  const supabase = createClient();
  const [notes, setNotes] = useState<ConversationNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (!conversation) return;
    listConversationNotes(supabase, conversation.id).then(setNotes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id]);

  if (!conversation) {
    return <aside className="hidden lg:flex w-72 shrink-0 border-s bg-card h-screen" />;
  }

  const history = allConversations.filter(
    (c) =>
      c.id !== conversation.id &&
      ((conversation.customerPhone && c.customerPhone === conversation.customerPhone) ||
        (conversation.customerEmail && c.customerEmail === conversation.customerEmail))
  );

  async function handleAddTag() {
    if (!tagInput.trim() || !conversation) return;
    const next = [...conversation.tags, tagInput.trim()];
    setTagInput("");
    await updateConversationTags(supabase, conversation.id, next);
    onConversationUpdated();
  }

  async function handleRemoveTag(tag: string) {
    if (!conversation) return;
    await updateConversationTags(supabase, conversation.id, conversation.tags.filter((t) => t !== tag));
    onConversationUpdated();
  }

  async function handleAddNote() {
    if (!noteText.trim() || !conversation) return;
    await addConversationNote(supabase, conversation.id, noteText.trim());
    setNoteText("");
    setNotes(await listConversationNotes(supabase, conversation.id));
  }

  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col border-s bg-card h-screen overflow-y-auto">
      <div className="flex flex-col items-center gap-2 border-b p-5">
        <Avatar className="size-14">
          <AvatarFallback className="text-lg">{conversation.customerName.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <p className="font-semibold">{conversation.customerName}</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{CHANNEL_LABELS[conversation.channel]}</span>
      </div>

      <div className="space-y-2 border-b p-4 text-sm">
        {conversation.customerPhone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="size-3.5 shrink-0" />
            <span dir="ltr">{conversation.customerPhone}</span>
          </div>
        )}
        {conversation.customerEmail && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="size-3.5 shrink-0" />
            <span dir="ltr" className="truncate">{conversation.customerEmail}</span>
          </div>
        )}
      </div>

      <div className="border-b p-4 space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Tag className="size-3.5" /> תגיות</p>
        <div className="flex flex-wrap gap-1.5">
          {conversation.tags.map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">
              {t}
              <button onClick={() => handleRemoveTag(t)}><X className="size-2.5" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="תגית חדשה" className="h-7 text-xs" onKeyDown={(e) => e.key === "Enter" && handleAddTag()} />
          <Button size="icon" variant="outline" className="size-7 shrink-0" onClick={handleAddTag}><Plus className="size-3.5" /></Button>
        </div>
      </div>

      <div className="border-b p-4 space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><History className="size-3.5" /> היסטוריית שיחות</p>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">אין שיחות קודמות מלקוח זה</p>
        ) : (
          <div className="space-y-1.5">
            {history.map((h) => (
              <div key={h.id} className="rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs">
                <p className="truncate">{h.lastMessagePreview}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(h.createdAt).toLocaleDateString("he-IL")}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-b p-4 space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><ShoppingBag className="size-3.5" /> הזמנות</p>
        <p className="text-xs text-muted-foreground">מודול הזמנות עדיין לא מחובר למערכת זו — בקרוב.</p>
      </div>

      <div className="p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">הערות פנימיות</p>
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg bg-muted/60 p-2 text-xs">{n.text}</div>
        ))}
        <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} placeholder="הוסף הערה..." className="text-xs" />
        <Button size="sm" variant="outline" className="w-full" disabled={!noteText.trim()} onClick={handleAddNote}>
          הוסף הערה
        </Button>
      </div>
    </aside>
  );
}
