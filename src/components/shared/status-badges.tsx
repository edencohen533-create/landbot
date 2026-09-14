import { Badge } from "@/components/ui/badge";
import { SESSION_STATUS_LABELS, QuizSessionDisplayStatus, LEAD_STATUS_LABELS, LeadStatus, QuizStatus } from "@/lib/types";

const QUIZ_STATUS_LABEL: Record<QuizStatus, string> = {
  draft: "טיוטה",
  active: "פעיל",
  paused: "מושהה",
};

const QUIZ_STATUS_CLASS: Record<QuizStatus, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  active: "bg-primary/15 text-primary border-transparent",
  paused: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent",
};

export function QuizStatusBadge({ status }: { status: QuizStatus }) {
  return <Badge className={QUIZ_STATUS_CLASS[status]}>{QUIZ_STATUS_LABEL[status]}</Badge>;
}

const LEAD_STATUS_CLASS: Record<LeadStatus, string> = {
  new: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent",
  in_progress: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent",
  meeting_scheduled: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-transparent",
  closed: "bg-primary/15 text-primary border-transparent",
  not_relevant: "bg-muted text-muted-foreground border-transparent",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Badge className={LEAD_STATUS_CLASS[status]}>{LEAD_STATUS_LABELS[status]}</Badge>;
}

const CATEGORY_LABEL = { hot: "חם", warm: "בינוני", cold: "קר" } as const;
const CATEGORY_CLASS = {
  hot: "bg-red-500/15 text-red-600 dark:text-red-400 border-transparent",
  warm: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent",
  cold: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-transparent",
} as const;

export function CategoryBadge({ category }: { category: "hot" | "warm" | "cold" }) {
  return <Badge className={CATEGORY_CLASS[category]}>{CATEGORY_LABEL[category]}</Badge>;
}

const SESSION_STATUS_CLASS: Record<QuizSessionDisplayStatus, string> = {
  live: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-transparent",
  abandoned: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent",
  completed: "bg-primary/15 text-primary border-transparent",
};

export function SessionStatusBadge({ status }: { status: QuizSessionDisplayStatus }) {
  return <Badge className={SESSION_STATUS_CLASS[status]}>{SESSION_STATUS_LABELS[status]}</Badge>;
}
