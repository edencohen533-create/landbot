"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, User } from "lucide-react";
import { QuizSession } from "@/lib/types";
import { displaySessionStatus, timeAgoLabel } from "@/lib/quiz-session-status";
import { SessionStatusBadge } from "@/components/shared/status-badges";

export function SessionThread({ session }: { session: QuizSession | null }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 3000);
    return () => clearInterval(t);
  }, []);

  if (!session) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        בחר שיחה כדי לצפות בה בזמן אמת
      </div>
    );
  }

  const status = displaySessionStatus(session, nowMs);
  const showFrontier = status !== "completed";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-muted">
            <User className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">{session.name || "מבקר אנונימי"}</p>
            <p className="text-xs text-muted-foreground">{session.quizName}</p>
          </div>
        </div>
        <SessionStatusBadge status={status} />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {session.answers.length === 0 && !showFrontier && (
          <p className="text-center text-sm text-muted-foreground">אין הודעות בשיחה הזו</p>
        )}
        {session.answers.map((a, i) => (
          <div key={`${a.nodeId}-${i}`} className="space-y-2">
            <div className="flex justify-end">
              <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm">{a.questionTitle}</div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-primary/10 px-4 py-2.5 text-sm">
                {a.answerLabel}
              </div>
            </div>
          </div>
        ))}

        {showFrontier && session.currentNodeTitle && (
          <div className="flex justify-end">
            <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm">
              {session.currentNodeTitle}
              {status === "live" && (
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-current opacity-60" />
                  <span className="size-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:0.3s]" />
                </div>
              )}
            </div>
          </div>
        )}

        {status === "abandoned" && (
          <p className="text-center text-xs font-medium text-amber-600 dark:text-amber-400">
            ננטש כאן — לא היה עדכון מאז {timeAgoLabel(session.lastEventAt, nowMs)}
          </p>
        )}
        {status === "completed" && (
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary">
            <CheckCircle2 className="size-3.5" /> השלים/ה את השאלון
          </div>
        )}
      </div>
    </div>
  );
}
