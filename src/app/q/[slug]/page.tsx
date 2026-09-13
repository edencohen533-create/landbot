"use client";

import { Suspense, use } from "react";
import { useQuizFlowStore } from "@/lib/store";
import { QuizRunner } from "@/components/runtime/quiz-runner";

function PublicQuizPageInner({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const quiz = useQuizFlowStore((s) => s.quizzes.find((q) => q.slug === slug));

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        השאלון לא נמצא
      </div>
    );
  }

  return <QuizRunner quiz={quiz} />;
}

export default function PublicQuizPage(props: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense>
      <PublicQuizPageInner {...props} />
    </Suspense>
  );
}
