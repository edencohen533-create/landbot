"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Quiz, QuizNode, LeadAnswer } from "@/lib/types";
import { getStartNode, resolveRenderable, isValidIsraeliPhone } from "@/lib/quiz-runtime";
import { createClient } from "@/lib/supabase/client";
import { recordAnalyticsEvent, submitPublicQuizResponse } from "@/lib/supabase/queries";
import { triggerIntegrations } from "@/lib/integrations";
import { Checkbox } from "@/components/ui/checkbox";
import { SunAvatar } from "@/components/runtime/sun-avatar";

const PALETTE = {
  page: "#F7F6EC",
  bubbleBot: "#FFFFFF",
  bubbleUser: "#F1EFF2",
  buttonBorder: "#F5C85E",
  buttonText: "#EE746C",
  text: "#535C82",
  muted: "#9AA0BE",
};

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

type Entry =
  | { id: string; kind: "bot"; nodeId: string; ts: number }
  | { id: string; kind: "result"; nodeId: string; ts: number }
  | { id: string; kind: "user"; text: string; ts: number }
  | { id: string; kind: "typing"; ts: number };

interface LeadInfoState {
  name: string;
  phone: string;
  email: string;
  consent: boolean;
}

export function QuizRunner({ quiz }: { quiz: Quiz }) {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const utmSource = searchParams.get("utm_source") ?? undefined;
  const startedRef = useRef(false);
  const submittedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const firstNode = useMemo(() => {
    const start = getStartNode(quiz);
    return start ? resolveRenderable(quiz, start.id) : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [entries, setEntries] = useState<Entry[]>(() => {
    if (!firstNode) return [];
    if (firstNode.type === "end") return [{ id: uid(), kind: "result", nodeId: firstNode.id, ts: Date.now() }];
    return [{ id: uid(), kind: "bot", nodeId: firstNode.id, ts: Date.now() }];
  });
  const [activeNodeId, setActiveNodeId] = useState<string | null>(() =>
    firstNode && firstNode.type !== "end" ? firstNode.id : null
  );
  const [answers, setAnswers] = useState<Record<string, LeadAnswer>>({});
  const [leadInfo, setLeadInfo] = useState<LeadInfoState>({ name: "", phone: "", email: "", consent: false });

  useEffect(() => {
    recordAnalyticsEvent(supabase, quiz.id, "view", utmSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length]);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  async function submitLead(finalAnswers: Record<string, LeadAnswer>, finalScore: number) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const category = finalScore >= 26 ? "hot" : finalScore >= 16 ? "warm" : "cold";
    const leadId = await submitPublicQuizResponse(
      supabase,
      quiz,
      {
        name: leadInfo.name || "ללא שם",
        phone: leadInfo.phone,
        email: leadInfo.email,
        score: finalScore,
        category,
        utmSource,
        utmMedium: searchParams.get("utm_medium") ?? undefined,
        utmCampaign: searchParams.get("utm_campaign") ?? undefined,
      },
      Object.values(finalAnswers)
    );
    recordAnalyticsEvent(supabase, quiz.id, "complete", utmSource);
    triggerIntegrations(leadId);
  }

  function advanceTo(fromId: string, handle: string | null, answerForScore?: LeadAnswer) {
    if (!startedRef.current) {
      startedRef.current = true;
      recordAnalyticsEvent(supabase, quiz.id, "start", utmSource);
    }
    const next = resolveRenderable(quiz, fromId, handle);
    setActiveNodeId(null);
    if (!next) return;

    const mergedAnswers = answerForScore ? { ...answers, [answerForScore.nodeId]: answerForScore } : answers;
    const mergedScore = Object.values(mergedAnswers).reduce((sum, a) => sum + a.score, 0);

    const typingId = uid();
    setEntries((es) => [...es, { id: typingId, kind: "typing", ts: Date.now() }]);
    setTimeout(() => {
      setEntries((es) => {
        const withoutTyping = es.filter((e) => e.id !== typingId);
        if (next.type === "end") {
          return [...withoutTyping, { id: uid(), kind: "result", nodeId: next.id, ts: Date.now() }];
        }
        return [...withoutTyping, { id: uid(), kind: "bot", nodeId: next.id, ts: Date.now() }];
      });
      if (next.type === "end") {
        if (leadInfo.phone || leadInfo.email || leadInfo.name) submitLead(mergedAnswers, mergedScore);
      } else {
        setActiveNodeId(next.id);
      }
    }, 650);
  }

  function handleComplete(node: QuizNode, userText: string, handle: string | null, answer?: LeadAnswer) {
    if (answer) setAnswers((a) => ({ ...a, [node.id]: answer }));
    setEntries((es) => [...es, { id: uid(), kind: "user", text: userText, ts: Date.now() }]);
    advanceTo(node.id, handle, answer);
  }

  if (!firstNode) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6" style={{ background: PALETTE.page }}>
        <p style={{ color: PALETTE.text }}>השאלון עדיין לא כולל תוכן.</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: PALETTE.page }}>
      <div className="mx-auto max-w-2xl px-4 pb-32 pt-6 sm:px-6">
        <div className="mb-6 flex items-center justify-center rounded-[28px] bg-white py-8 shadow-sm">
          {quiz.theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={quiz.theme.logoUrl} alt={quiz.name} className="h-14 object-contain" />
          ) : (
            <p className="text-2xl font-bold" style={{ color: PALETTE.text }}>{quiz.name}</p>
          )}
        </div>

        <div className="space-y-5">
          {entries.map((entry) => {
            if (entry.kind === "user") {
              return (
                <div key={entry.id} className="flex flex-col items-start gap-1">
                  <div
                    className="max-w-[75%] rounded-[20px] px-5 py-3 leading-relaxed"
                    style={{ background: PALETTE.bubbleUser, color: PALETTE.text }}
                  >
                    {entry.text}
                  </div>
                  <span className="px-1 text-xs" style={{ color: PALETTE.muted }}>{timeLabel(entry.ts)}</span>
                </div>
              );
            }

            if (entry.kind === "typing") {
              return (
                <div key={entry.id} className="flex items-end justify-start gap-2">
                  <div className="flex items-center gap-1.5 rounded-[22px] bg-white px-5 py-4" style={{ background: PALETTE.bubbleBot }}>
                    <span className="size-2 animate-bounce rounded-full bg-current" style={{ color: PALETTE.muted }} />
                    <span className="size-2 animate-bounce rounded-full bg-current [animation-delay:0.15s]" style={{ color: PALETTE.muted }} />
                    <span className="size-2 animate-bounce rounded-full bg-current [animation-delay:0.3s]" style={{ color: PALETTE.muted }} />
                  </div>
                  <SunAvatar />
                </div>
              );
            }

            if (entry.kind === "result") {
              const node = quiz.nodes.find((n) => n.id === entry.nodeId);
              if (!node || node.data.kind !== "end") return null;
              return <ResultCard key={entry.id} data={node.data} />;
            }

            const node = quiz.nodes.find((n) => n.id === entry.nodeId);
            if (!node) return null;
            const isActive = entry.nodeId === activeNodeId;

            return (
              <div key={entry.id} className="flex flex-col items-end gap-1">
                <div className="flex items-end gap-2">
                  <div
                    className="max-w-[85%] rounded-[22px] px-5 py-4 leading-relaxed"
                    style={{ background: PALETTE.bubbleBot, color: PALETTE.text }}
                  >
                    <BotNodeContent node={node} />
                    {isActive && (
                      <div className="mt-4">
                        <NodeControls
                          node={node}
                          leadInfo={leadInfo}
                          onLeadInfoChange={(patch) => setLeadInfo((s) => ({ ...s, ...patch }))}
                          onComplete={(text, handle, answer) => handleComplete(node, text, handle, answer)}
                        />
                      </div>
                    )}
                  </div>
                  <SunAvatar />
                </div>
                <span className="px-1 text-xs" style={{ color: PALETTE.muted }}>{timeLabel(entry.ts)}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <button
        onClick={scrollToBottom}
        className="fixed bottom-6 left-1/2 flex size-11 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-lg"
        style={{ color: PALETTE.buttonText }}
        aria-label="גלול למטה"
      >
        <ChevronDown className="size-5" />
      </button>
    </div>
  );
}

function BotNodeContent({ node }: { node: QuizNode }) {
  if (node.data.kind === "message") {
    return (
      <div className="space-y-2 whitespace-pre-line">
        {node.data.title && <p className="font-bold">{node.data.title}</p>}
        <p>{node.data.text}</p>
      </div>
    );
  }
  if (node.data.kind === "question") {
    return (
      <div>
        <p className="font-bold">{node.data.title}</p>
        {node.data.description && <p className="mt-1 text-sm opacity-80">{node.data.description}</p>}
      </div>
    );
  }
  if (node.data.kind === "lead_details") {
    return <p className="font-bold">השאירו פרטים ונחזור אליכם</p>;
  }
  return null;
}

function NodeControls({
  node,
  leadInfo,
  onLeadInfoChange,
  onComplete,
}: {
  node: QuizNode;
  leadInfo: LeadInfoState;
  onLeadInfoChange: (patch: Partial<LeadInfoState>) => void;
  onComplete: (userText: string, handle: string | null, answer?: LeadAnswer) => void;
}) {
  const [text, setText] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (node.data.kind === "message") {
    const data = node.data;
    return (
      <button
        onClick={() => onComplete(data.buttonLabel || "המשך", null)}
        className="rounded-lg border-2 bg-white px-6 py-2.5 text-sm font-semibold transition-transform active:scale-[0.97]"
        style={{ borderColor: PALETTE.buttonBorder, color: PALETTE.buttonText }}
      >
        {data.buttonLabel || "המשך"}
      </button>
    );
  }

  if (node.data.kind === "question") {
    const data = node.data;

    if (data.answerType === "single_choice") {
      return (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: PALETTE.muted }}>בחר/י תשובה</p>
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            {data.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() =>
                  onComplete(opt.label, opt.id, { nodeId: node.id, questionTitle: data.title, answerLabel: opt.label, score: opt.score })
                }
                className="rounded-lg border-2 bg-white px-4 py-3 text-sm font-semibold transition-transform active:scale-[0.97] sm:min-w-[140px] sm:basis-[31%] sm:grow-0"
                style={{ borderColor: PALETTE.buttonBorder, color: PALETTE.buttonText }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (data.answerType === "multi_choice") {
      return (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: PALETTE.muted }}>ניתן לבחור כמה תשובות</p>
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
            {data.options.map((opt) => {
              const checked = multi.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMulti((m) => (checked ? m.filter((id) => id !== opt.id) : [...m, opt.id]))}
                  className="flex items-center gap-2 rounded-lg border-2 bg-white px-4 py-3 text-sm font-semibold sm:min-w-[140px] sm:basis-[31%] sm:grow-0"
                  style={{ borderColor: checked ? PALETTE.buttonText : PALETTE.buttonBorder, color: PALETTE.buttonText }}
                >
                  <Checkbox checked={checked} />
                  {opt.label}
                </button>
              );
            })}
          </div>
          <button
            className="w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: PALETTE.buttonText }}
            disabled={data.required && multi.length === 0}
            onClick={() => {
              const labels = data.options.filter((o) => multi.includes(o.id)).map((o) => o.label).join(", ");
              const totalScore = data.options.filter((o) => multi.includes(o.id)).reduce((s, o) => s + o.score, 0);
              onComplete(labels || "—", multi[0] ?? null, { nodeId: node.id, questionTitle: data.title, answerLabel: labels || "—", score: totalScore });
            }}
          >
            המשך
          </button>
        </div>
      );
    }

    const submitFreeform = () => {
      if (!text.trim() && data.required) return;
      onComplete(text || "—", null, {
        nodeId: node.id,
        questionTitle: data.title,
        answerLabel: text || "—",
        score: data.answerType === "rating" ? Number(text) || 0 : 0,
      });
      setText("");
    };

    if (data.answerType === "rating") {
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setText(String(n))}
                className="aspect-square rounded-lg border-2 text-sm font-semibold"
                style={{
                  borderColor: PALETTE.buttonBorder,
                  background: text === String(n) ? PALETTE.buttonText : "white",
                  color: text === String(n) ? "white" : PALETTE.buttonText,
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            className="w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: PALETTE.buttonText }}
            onClick={submitFreeform}
            disabled={!text}
          >
            המשך
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {data.answerType === "long_text" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2"
            style={{ borderColor: PALETTE.buttonBorder }}
          />
        ) : (
          <input
            type={data.answerType === "number" ? "number" : data.answerType === "date" ? "date" : "text"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2"
            style={{ borderColor: PALETTE.buttonBorder }}
          />
        )}
        <button
          className="w-full rounded-lg py-3 text-sm font-semibold text-white"
          style={{ background: PALETTE.buttonText }}
          onClick={submitFreeform}
        >
          המשך
        </button>
      </div>
    );
  }

  if (node.data.kind === "lead_details") {
    const data = node.data;

    function handleSubmit() {
      if (data.showPhone && data.requirePhoneIL && !isValidIsraeliPhone(leadInfo.phone)) {
        setError("מספר טלפון לא תקין");
        return;
      }
      if (data.showConsent && !leadInfo.consent) {
        setError("יש לאשר את תנאי ההסכמה כדי להמשיך");
        return;
      }
      setError(null);
      onComplete(leadInfo.name || "הפרטים נשלחו", null);
    }

    return (
      <div className="space-y-2.5">
        {data.showName && (
          <input
            placeholder="שם מלא"
            value={leadInfo.name}
            onChange={(e) => onLeadInfoChange({ name: e.target.value })}
            className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none focus:ring-2"
            style={{ borderColor: PALETTE.buttonBorder }}
          />
        )}
        {data.showPhone && (
          <input
            placeholder="טלפון"
            dir="ltr"
            value={leadInfo.phone}
            onChange={(e) => onLeadInfoChange({ phone: e.target.value })}
            className="w-full rounded-lg border px-4 py-2.5 text-end text-sm outline-none focus:ring-2"
            style={{ borderColor: PALETTE.buttonBorder }}
          />
        )}
        {data.showEmail && (
          <input
            placeholder="אימייל"
            dir="ltr"
            value={leadInfo.email}
            onChange={(e) => onLeadInfoChange({ email: e.target.value })}
            className="w-full rounded-lg border px-4 py-2.5 text-end text-sm outline-none focus:ring-2"
            style={{ borderColor: PALETTE.buttonBorder }}
          />
        )}
        {data.showConsent && (
          <label className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: PALETTE.muted }}>
            <Checkbox checked={leadInfo.consent} onCheckedChange={(v) => onLeadInfoChange({ consent: !!v })} className="mt-0.5" />
            {data.consentText}
          </label>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button className="w-full rounded-lg py-3 text-sm font-semibold text-white" style={{ background: PALETTE.buttonText }} onClick={handleSubmit}>
          שליחה
        </button>
      </div>
    );
  }

  return null;
}

function ResultCard({ data }: { data: Extract<QuizNode["data"], { kind: "end" }> }) {
  const shouldRedirect = !!(data.redirectEnabled && data.redirectUrl);
  const [secondsLeft, setSecondsLeft] = useState(data.redirectDelaySeconds ?? 3);

  useEffect(() => {
    if (!shouldRedirect) return;
    if (secondsLeft <= 0) {
      window.location.href = data.redirectUrl!;
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [shouldRedirect, secondsLeft, data.redirectUrl]);

  return (
    <div className="flex justify-end">
      <div
        className="max-w-[92%] rounded-[24px] border-2 bg-white p-6 text-center shadow-md sm:max-w-[85%]"
        style={{ borderColor: PALETTE.buttonBorder, color: PALETTE.text }}
      >
        <div className="mb-3 flex justify-center">
          <SunAvatar size={48} />
        </div>
        <h2 className="text-xl font-bold">{data.title}</h2>
        <p className="mt-2 leading-relaxed">{data.text}</p>
        {shouldRedirect && (
          <p className="mt-3 text-xs" style={{ color: PALETTE.muted }}>מעביר אותך אוטומטית תוך {secondsLeft} שניות...</p>
        )}
        {data.ctaLabel && data.ctaUrl && (
          <a
            href={data.ctaUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block rounded-lg border-2 bg-white py-3 text-sm font-semibold"
            style={{ borderColor: PALETTE.buttonBorder, color: PALETTE.buttonText }}
          >
            {data.ctaLabel}
          </a>
        )}
      </div>
    </div>
  );
}
