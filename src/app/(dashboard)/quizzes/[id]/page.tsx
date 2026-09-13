"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye, Save, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { QuizStatusBadge } from "@/components/shared/status-badges";
import { useQuizFlowStore } from "@/lib/store";
import { FlowEditor } from "@/components/editor/flow-editor";
import { DesignTab } from "@/components/editor/design-tab";
import { AnalyticsTab } from "@/components/editor/analytics-tab";
import { ShareTab } from "@/components/editor/share-tab";
import { ComingSoonTab } from "@/components/editor/coming-soon-tab";
import { toast } from "sonner";

export default function QuizEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const quiz = useQuizFlowStore((s) => s.quizzes.find((q) => q.id === id));
  const updateQuiz = useQuizFlowStore((s) => s.updateQuiz);
  const setQuizStatus = useQuizFlowStore((s) => s.setQuizStatus);
  const [nameDraft, setNameDraft] = useState(quiz?.name ?? "");
  const [savedAgo, setSavedAgo] = useState<string | null>(null);

  if (!quiz) {
    notFound();
  }

  function handlePublish() {
    if (!quiz) return;
    const hasStart = quiz.nodes.some((n) => n.type === "start");
    const hasEnd = quiz.nodes.some((n) => n.type === "end");
    if (!hasStart || !hasEnd) {
      toast.error("לא ניתן לפרסם: חסר צומת התחלה או סיום בזרימה");
      return;
    }
    setQuizStatus(quiz.id, "active");
    toast.success("השאלון פורסם בהצלחה");
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between gap-4 border-b px-5 h-16 shrink-0 bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            nativeButton={false}
            render={
              <Link href="/quizzes">
                <ChevronLeft className="size-4" />
              </Link>
            }
          />
          <nav className="text-sm text-muted-foreground hidden md:block shrink-0">
            <Link href="/quizzes" className="hover:underline">שאלונים</Link>
            <span className="mx-1.5">/</span>
          </nav>
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => quiz && updateQuiz(quiz.id, { name: nameDraft || quiz.name })}
            className="h-8 w-56 border-transparent bg-transparent px-1.5 font-semibold shadow-none hover:border-input focus-visible:border-input"
          />
          {quiz && <QuizStatusBadge status={quiz.status} />}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {savedAgo && <span className="text-xs text-muted-foreground hidden lg:inline">{savedAgo}</span>}
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <a href={`/q/${quiz?.slug}`} target="_blank" rel="noreferrer">
                <Eye className="size-4" /> תצוגה מקדימה
              </a>
            }
          />
          <Button variant="outline" size="sm" onClick={() => setSavedAgo("נשמר לפני רגע")}>
            <Save className="size-4" /> שמור טיוטה
          </Button>
          <Button size="sm" onClick={handlePublish}>
            <Rocket className="size-4" /> פרסום
          </Button>
        </div>
      </header>

      {quiz && (
        <Tabs defaultValue="flow" className="flex-1 min-h-0 flex flex-col gap-0">
          <div className="border-b px-5 shrink-0 bg-card">
            <TabsList className="bg-transparent h-11 p-0 gap-1">
              <TabsTrigger value="flow" className="data-[state=active]:bg-accent">זרימה</TabsTrigger>
              <TabsTrigger value="design" className="data-[state=active]:bg-accent">עיצוב</TabsTrigger>
              <TabsTrigger value="ai" className="data-[state=active]:bg-accent">AI</TabsTrigger>
              <TabsTrigger value="integrations" className="data-[state=active]:bg-accent">אינטגרציות</TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:bg-accent">אנליטיקה</TabsTrigger>
              <TabsTrigger value="share" className="data-[state=active]:bg-accent">שיתוף והטמעה</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="flow" className="flex-1 min-h-0 m-0">
            <FlowEditor
              quizId={quiz.id}
              initialNodes={quiz.nodes}
              initialEdges={quiz.edges}
              onSavedIndicator={setSavedAgo}
            />
          </TabsContent>
          <TabsContent value="design" className="flex-1 min-h-0 m-0 overflow-auto">
            <DesignTab quiz={quiz} />
          </TabsContent>
          <TabsContent value="ai" className="flex-1 min-h-0 m-0 overflow-auto">
            <ComingSoonTab title="AI" description="יצירת שאלון אוטומטית וניסוח שאלות בעזרת AI תגיע בשלב הבא." />
          </TabsContent>
          <TabsContent value="integrations" className="flex-1 min-h-0 m-0 overflow-auto">
            <ComingSoonTab title="אינטגרציות" description="חיבור Webhook, Google Sheets, Zapier ופיקסלים לשאלון הזה יתווסף בשלב הבא." />
          </TabsContent>
          <TabsContent value="analytics" className="flex-1 min-h-0 m-0 overflow-auto">
            <AnalyticsTab quizId={quiz.id} />
          </TabsContent>
          <TabsContent value="share" className="flex-1 min-h-0 m-0 overflow-auto">
            <ShareTab quiz={quiz} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
