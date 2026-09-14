"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Mail, Phone, Trash2, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { QuizSession } from "@/lib/types";
import { displaySessionStatus, durationLabel } from "@/lib/quiz-session-status";
import { SessionStatusBadge, CategoryBadge } from "@/components/shared/status-badges";

export function SessionDetails({ session, onDelete }: { session: QuizSession | null; onDelete: (id: string) => void }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 3000);
    return () => clearInterval(t);
  }, []);

  if (!session) return <div className="w-72 shrink-0 border-r" />;

  const status = displaySessionStatus(session, nowMs);
  const endpoint = status === "completed" && session.completedAt ? session.completedAt : new Date(nowMs).toISOString();

  return (
    <div className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-r p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <Avatar className="size-16">
          <AvatarFallback className="text-lg">{session.name ? session.name.slice(0, 2) : <User className="size-6" />}</AvatarFallback>
        </Avatar>
        <p className="font-semibold">{session.name || "מבקר אנונימי"}</p>
        <SessionStatusBadge status={status} />
      </div>

      {(session.phone || session.email) && (
        <div className="space-y-2 text-sm">
          {session.phone && (
            <a href={`tel:${session.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Phone className="size-3.5" /> <span dir="ltr">{session.phone}</span>
            </a>
          )}
          {session.email && (
            <a href={`mailto:${session.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Mail className="size-3.5" /> <span dir="ltr">{session.email}</span>
            </a>
          )}
        </div>
      )}

      <div className="space-y-2 rounded-lg border p-3 text-sm">
        <Row label="שאלון" value={session.quizName} />
        <Row label="התקדמות" value={`שלב ${session.stepIndex} מתוך ${session.totalSteps || "?"}`} />
        <Row label="ניקוד" value={String(session.score)} extra={session.category && <CategoryBadge category={session.category as "hot" | "warm" | "cold"} />} />
        <Row label="משך שיחה" value={durationLabel(session.startedAt, endpoint)} />
        {session.utmSource && <Row label="מקור" value={session.utmSource} />}
      </div>

      {!session.phone && !session.email && (
        <p className="rounded-lg bg-muted p-3 text-center text-xs text-muted-foreground">
          המבקר עדיין לא השאיר פרטי קשר
        </p>
      )}

      <Button variant="outline" size="sm" className="mt-auto text-destructive hover:text-destructive" onClick={() => onDelete(session.id)}>
        <Trash2 className="size-3.5" /> מחק שיחה
      </Button>
    </div>
  );
}

function Row({ label, value, extra }: { label: string; value: string; extra?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        {value} {extra}
      </span>
    </div>
  );
}
