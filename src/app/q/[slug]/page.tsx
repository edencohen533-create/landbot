import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchQuizFullBySlug } from "@/lib/supabase/queries";
import { QuizRunner } from "@/components/runtime/quiz-runner";

export default async function PublicQuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const quiz = await fetchQuizFullBySlug(supabase, slug);

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        השאלון לא נמצא
      </div>
    );
  }

  return (
    <Suspense>
      <QuizRunner quiz={quiz} />
    </Suspense>
  );
}
