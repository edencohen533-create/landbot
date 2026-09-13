"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuizFlowStore } from "@/lib/store";
import { MessageSquareText, Target, CalendarClock, FilePlus } from "lucide-react";

const TEMPLATES = [
  { id: "leads", label: "שאלון ליצירת לידים", icon: Target },
  { id: "fit", label: "שאלון התאמה למוצר", icon: MessageSquareText },
  { id: "meeting", label: "שאלון קביעת פגישה", icon: CalendarClock },
  { id: "blank", label: "התחלה מאפס", icon: FilePlus },
];

export function CreateQuizDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const createQuiz = useQuizFlowStore((s) => s.createQuiz);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("blank");

  function handleCreate() {
    if (!name.trim()) return;
    const quiz = createQuiz({ name: name.trim(), description: description.trim() || undefined, template });
    onOpenChange(false);
    setName("");
    setDescription("");
    setTemplate("blank");
    router.push(`/quizzes/${quiz.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>שאלון חדש</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="quiz-name">שם השאלון</Label>
            <Input
              id="quiz-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: בדיקת התאמה לייעוץ"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quiz-desc">תיאור פנימי (אופציונלי)</Label>
            <Textarea
              id="quiz-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="הערה פנימית לצוות שלך"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>בחירת תבנית</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                const active = template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={`flex flex-col items-start gap-2 rounded-lg border p-3 text-start text-sm transition-colors ${
                      active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-accent"
                    }`}
                  >
                    <Icon className="size-4 text-primary" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            צור שאלון
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
