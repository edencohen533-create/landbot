"use client";

import { useState } from "react";
import { Copy, MessageCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadStatusBadge, CategoryBadge } from "@/components/shared/status-badges";
import { Lead, LEAD_STATUS_LABELS, LeadStatus } from "@/lib/types";
import { useQuizFlowStore } from "@/lib/store";
import { toast } from "sonner";

export function LeadDrawer({ lead, onOpenChange }: { lead: Lead | null; onOpenChange: (open: boolean) => void }) {
  const updateLeadStatus = useQuizFlowStore((s) => s.updateLeadStatus);
  const addLeadNote = useQuizFlowStore((s) => s.addLeadNote);
  const [note, setNote] = useState("");

  if (!lead) return null;

  return (
    <Sheet open={!!lead} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {lead.name}
            <CategoryBadge category={lead.category} />
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6 space-y-5">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(lead.phone);
                toast.success("הטלפון הועתק");
              }}
            >
              <Copy className="size-3.5" /> {lead.phone}
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={
                <a href={`https://wa.me/972${lead.phone.replace(/^0/, "")}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-3.5" /> WhatsApp
                </a>
              }
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">סטטוס</p>
            <Select
              value={lead.status}
              onValueChange={(v) => updateLeadStatus(lead.id, v as LeadStatus)}
              items={LEAD_STATUS_LABELS}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">אימייל</p><p className="truncate">{lead.email}</p></div>
            <div><p className="text-xs text-muted-foreground">ציון</p><p>{lead.score}</p></div>
            <div><p className="text-xs text-muted-foreground">שאלון מקור</p><p className="truncate">{lead.quizName}</p></div>
            <div><p className="text-xs text-muted-foreground">תאריך מילוי</p><p>{new Date(lead.createdAt).toLocaleString("he-IL")}</p></div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">נתוני UTM</p>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {lead.utmSource && <span className="rounded-full bg-muted px-2 py-1">source: {lead.utmSource}</span>}
              {lead.utmMedium && <span className="rounded-full bg-muted px-2 py-1">medium: {lead.utmMedium}</span>}
              {lead.utmCampaign && <span className="rounded-full bg-muted px-2 py-1">campaign: {lead.utmCampaign}</span>}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">תשובות</p>
            <div className="space-y-2">
              {lead.answers.map((a, i) => (
                <div key={i} className="rounded-lg border p-2.5 text-sm">
                  <p className="text-xs text-muted-foreground">{a.questionTitle}</p>
                  <p className="font-medium">{a.answerLabel}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">היסטוריית סטטוס</p>
            <div className="space-y-1.5">
              {lead.statusHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <LeadStatusBadge status={h.status} />
                  <span className="text-muted-foreground">{new Date(h.at).toLocaleString("he-IL")}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">הערות פנימיות</p>
            {lead.notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-muted/60 p-2 text-sm">{n.text}</div>
            ))}
            <div className="flex gap-2">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="הוסף הערה..." />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!note.trim()}
              onClick={() => {
                addLeadNote(lead.id, note.trim());
                setNote("");
              }}
            >
              הוסף הערה
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
