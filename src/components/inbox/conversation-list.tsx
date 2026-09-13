"use client";

import { useMemo, useState } from "react";
import { Search, Radio, Mail, Camera, Send, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHANNEL_LABELS, Conversation, ConversationChannel } from "@/lib/types";

const CHANNEL_ICON: Record<ConversationChannel, typeof Globe> = {
  whatsapp: Radio,
  webchat: Globe,
  email: Mail,
  instagram: Camera,
  messenger: Send,
};

type Category = "mine" | "unassigned" | "all" | "pending" | "closed";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "mine", label: "מוקצה אליי" },
  { key: "unassigned", label: "ללא הקצאה" },
  { key: "all", label: "כל השיחות" },
  { key: "pending", label: "ממתינות לתשובה" },
  { key: "closed", label: "נסגרו" },
];

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "עכשיו";
  if (mins < 60) return `${mins} ד׳`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ש׳`;
  return new Date(iso).toLocaleDateString("he-IL");
}

export function ConversationList({
  conversations,
  selectedId,
  currentUserId,
  currentUserName,
  demoLive,
  onToggleDemoLive,
  onSelect,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  currentUserId: string;
  currentUserName: string;
  demoLive: boolean;
  onToggleDemoLive: (v: boolean) => void;
  onSelect: (id: string) => void;
}) {
  const [tab, setTab] = useState<"conversations" | "channels" | "team">("conversations");
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ConversationChannel | null>(null);

  const channelCounts = useMemo(() => {
    const counts = new Map<ConversationChannel, number>();
    for (const c of conversations) counts.set(c.channel, (counts.get(c.channel) ?? 0) + 1);
    return counts;
  }, [conversations]);

  const myCount = conversations.filter((c) => c.assignedTo === currentUserId).length;

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (channelFilter && c.channel !== channelFilter) return false;
      if (category === "mine" && c.assignedTo !== currentUserId) return false;
      if (category === "unassigned" && c.assignedTo) return false;
      if (category === "pending" && c.status !== "pending") return false;
      if (category === "closed" && c.status !== "closed") return false;
      if (category === "all" && c.status === "closed") return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const matches =
          c.customerName.toLowerCase().includes(q) ||
          (c.customerPhone ?? "").includes(q) ||
          (c.customerEmail ?? "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [conversations, category, channelFilter, currentUserId, query]);

  return (
    <aside className="flex w-80 shrink-0 flex-col border-e bg-card h-screen">
      <div className="flex items-center justify-between border-b px-4 h-16 shrink-0">
        <h1 className="font-bold">מרכז שיחות</h1>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Demo Live</span>
          <Switch checked={demoLive} onCheckedChange={onToggleDemoLive} />
        </div>
      </div>

      <div className="border-b px-3 pt-2 shrink-0">
        <Tabs value={tab} onValueChange={(v) => v && setTab(v as typeof tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="conversations" className="flex-1">שיחות</TabsTrigger>
            <TabsTrigger value="channels" className="flex-1">ערוצים</TabsTrigger>
            <TabsTrigger value="team" className="flex-1">צוות</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === "channels" && (
        <div className="flex flex-col gap-1 border-b p-2 shrink-0">
          <button
            onClick={() => setChannelFilter(null)}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${!channelFilter ? "bg-accent" : "hover:bg-accent/50"}`}
          >
            <span>כל הערוצים</span>
            <span className="text-xs text-muted-foreground">{conversations.length}</span>
          </button>
          {(Object.keys(CHANNEL_LABELS) as ConversationChannel[]).map((ch) => {
            const Icon = CHANNEL_ICON[ch];
            return (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${channelFilter === ch ? "bg-accent" : "hover:bg-accent/50"}`}
              >
                <span className="flex items-center gap-2"><Icon className="size-3.5" /> {CHANNEL_LABELS[ch]}</span>
                <span className="text-xs text-muted-foreground">{channelCounts.get(ch) ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}

      {tab === "team" && (
        <div className="flex flex-col gap-1 border-b p-2 shrink-0">
          <button
            onClick={() => setCategory("mine")}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${category === "mine" ? "bg-accent" : "hover:bg-accent/50"}`}
          >
            <Avatar className="size-6"><AvatarFallback className="text-[10px]">{currentUserName.slice(0, 2)}</AvatarFallback></Avatar>
            <span className="flex-1 text-start">{currentUserName}</span>
            <span className="text-xs text-muted-foreground">{myCount}</span>
          </button>
        </div>
      )}

      {tab === "conversations" && (
        <div className="flex flex-wrap gap-1.5 border-b p-2 shrink-0">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                category === c.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="border-b p-2 shrink-0">
        <div className="relative">
          <Search className="absolute end-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="חיפוש לקוח..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pe-8 text-sm" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">אין שיחות תואמות</p>
        )}
        {filtered.map((c) => {
          const Icon = CHANNEL_ICON[c.channel];
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`flex w-full items-start gap-2.5 border-b px-3 py-3 text-start transition-colors ${
                selectedId === c.id ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <Avatar className="size-9 shrink-0">
                <AvatarFallback className="text-xs">{c.customerName.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{c.customerName}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.lastMessageAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
                    <Icon className="size-3 shrink-0" />
                    {c.lastMessagePreview || "אין הודעות עדיין"}
                  </p>
                  {c.unreadCount > 0 && (
                    <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                {!c.assignedTo && (
                  <span className="mt-1 inline-block rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">ללא הקצאה</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
