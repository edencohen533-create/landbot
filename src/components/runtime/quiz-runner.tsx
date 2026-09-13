"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Quiz, QuizNode, LeadAnswer } from "@/lib/types";
import { getStartNode, resolveRenderable, isValidIsraeliPhone } from "@/lib/quiz-runtime";
import { useQuizFlowStore } from "@/lib/store";
import { triggerIntegrations } from "@/lib/integrations";
import { Checkbox } from "@/components/ui/checkbox";

function radiusFor(style: Quiz["theme"]["buttonStyle"]) {
  return style === "square" ? 6 : style === "pill" ? 999 : 14;
}

interface StepState {
  nodeId: string;
  handle: string | null;
}

export function QuizRunner({ quiz }: { quiz: Quiz }) {
  const addSubmission = useQuizFlowStore((s) => s.addSubmission);
  const searchParams = useSearchParams();
  const theme = quiz.theme;

  const totalSteps = useMemo(
    () => quiz.nodes.filter((n) => n.type === "question" || n.type === "lead_details").length,
    [quiz.nodes]
  );

  const [history, setHistory] = useState<StepState[]>(() => {
    const start = getStartNode(quiz);
    const first = start ? resolveRenderable(quiz, start.id) : undefined;
    return first ? [{ nodeId: first.id, handle: null }] : [];
  });
  const [answers, setAnswers] = useState<Record<string, LeadAnswer>>({});
  const [leadInfo, setLeadInfo] = useState({ name: "", phone: "", email: "", consent: false });
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);

  const currentStep = history[history.length - 1];
  const currentNode: QuizNode | undefined = quiz.nodes.find((n) => n.id === currentStep?.nodeId);

  const score = useMemo(() => Object.values(answers).reduce((sum, a) => sum + a.score, 0), [answers]);
  const stepIndex = useMemo(
    () => history.filter((h) => {
      const n = quiz.nodes.find((nn) => nn.id === h.nodeId);
      return n?.type === "question" || n?.type === "lead_details";
    }).length,
    [history, quiz.nodes]
  );
  const progress = totalSteps ? Math.min((stepIndex / totalSteps) * 100, 100) : 0;

  function goTo(node: QuizNode | undefined) {
    if (!node) return;
    setHistory((h) => [...h, { nodeId: node.id, handle: null }]);
  }

  function handleAdvance(fromId: string, handle: string | null = null) {
    const next = resolveRenderable(quiz, fromId, handle);
    goTo(next);
  }

  function goBack() {
    if (history.length > 1) setHistory((h) => h.slice(0, -1));
  }

  function recordAnswer(nodeId: string, answer: LeadAnswer) {
    setAnswers((a) => ({ ...a, [nodeId]: answer }));
  }

  function submitLead() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    const lead = addSubmission(quiz.id, {
      name: leadInfo.name || "ללא שם",
      phone: leadInfo.phone,
      email: leadInfo.email,
      score,
      category: score >= 26 ? "hot" : score >= 16 ? "warm" : "cold",
      status: "new",
      utmSource: searchParams.get("utm_source") ?? undefined,
      utmMedium: searchParams.get("utm_medium") ?? undefined,
      utmCampaign: searchParams.get("utm_campaign") ?? undefined,
      answers: Object.values(answers),
      assignedTo: undefined,
    });
    if (lead) triggerIntegrations(lead);
  }

  useEffect(() => {
    if (currentNode?.type === "end" && !submittedRef.current && (leadInfo.phone || leadInfo.email || leadInfo.name)) {
      submitLead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNode?.id]);

  const cardStyle: React.CSSProperties = {
    background: theme.overlay === "dark" ? "rgba(255,255,255,0.97)" : "#ffffff",
    color: theme.textColor,
    borderRadius: 20,
  };

  const containerStyle: React.CSSProperties = {
    background: theme.backgroundImageUrl
      ? `${theme.overlay === "dark" ? "linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55))," : theme.overlay === "light" ? "linear-gradient(rgba(255,255,255,.4),rgba(255,255,255,.4))," : ""}url(${theme.backgroundImageUrl}) center/cover no-repeat`
      : theme.backgroundColor,
  };

  const justify = theme.cardPosition === "right" ? "flex-end" : theme.cardPosition === "left" ? "flex-start" : "center";

  if (!currentNode) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6" style={containerStyle}>
        <p style={{ color: theme.textColor }}>השאלון עדיין לא כולל תוכן.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4" style={containerStyle}>
      <div className="flex-1 flex" style={{ justifyContent: justify, alignItems: "center" }}>
        <div className="w-full max-w-md">
          {theme.showProgressBar && totalSteps > 0 && (
            <div className="h-1.5 rounded-full bg-black/10 overflow-hidden mb-4 mx-1">
              <motion.div
                className="h-full"
                style={{ background: theme.primaryColor }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35 }}
              />
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentNode.id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="p-6 shadow-xl"
              style={cardStyle}
            >
              {theme.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={theme.logoUrl} alt="" className="h-8 mb-4 mx-auto object-contain" />
              )}
              {theme.showQuestionNumber && (currentNode.type === "question" || currentNode.type === "lead_details") && totalSteps > 0 && (
                <p className="text-xs opacity-60 mb-2">שאלה {stepIndex} מתוך {totalSteps}</p>
              )}

              {currentNode.data.kind === "message" && (
                <div className="space-y-4 text-center">
                  <h1 className="text-xl font-bold">{currentNode.data.title}</h1>
                  <p className="opacity-80 leading-relaxed">{currentNode.data.text}</p>
                  <button
                    className="w-full py-3 font-semibold text-white transition-transform active:scale-[0.98]"
                    style={{ background: theme.primaryColor, borderRadius: radiusFor(theme.buttonStyle) }}
                    onClick={() => handleAdvance(currentNode.id, null)}
                  >
                    {currentNode.data.buttonLabel || "המשך"}
                  </button>
                </div>
              )}

              {currentNode.data.kind === "question" && (
                <QuestionStep
                  node={currentNode}
                  theme={theme}
                  onAnswer={(answer, handle) => {
                    recordAnswer(currentNode.id, answer);
                    handleAdvance(currentNode.id, handle);
                  }}
                />
              )}

              {currentNode.data.kind === "lead_details" && (
                <LeadDetailsStep
                  node={currentNode}
                  theme={theme}
                  leadInfo={leadInfo}
                  setLeadInfo={setLeadInfo}
                  onSubmit={() => handleAdvance(currentNode.id, null)}
                />
              )}

              {currentNode.data.kind === "end" && <EndStep node={currentNode} theme={theme} />}
            </motion.div>
          </AnimatePresence>

          {quiz.allowBack && history.length > 1 && currentNode.type !== "end" && (
            <button
              onClick={goBack}
              className="mt-3 flex items-center gap-1 text-xs opacity-70 hover:opacity-100 mx-1"
              style={{ color: theme.overlay || theme.backgroundImageUrl ? "#fff" : theme.textColor }}
            >
              <ArrowRight className="size-3.5" />
              חזרה לשאלה קודמת
            </button>
          )}
        </div>
      </div>
      {submitted && currentNode.type === "end" && (
        <p className="text-center text-[10px] opacity-40 pb-2" style={{ color: "#fff" }}>QuizFlow</p>
      )}
    </div>
  );
}

function QuestionStep({
  node,
  theme,
  onAnswer,
}: {
  node: QuizNode;
  theme: Quiz["theme"];
  onAnswer: (answer: LeadAnswer, handle: string | null) => void;
}) {
  const data = node.data as Extract<QuizNode["data"], { kind: "question" }>;
  const [text, setText] = useState("");
  const [multi, setMulti] = useState<string[]>([]);

  function submitFreeform() {
    if (!text.trim() && data.required) return;
    onAnswer({ nodeId: node.id, questionTitle: data.title, answerLabel: text || "—", score: data.answerType === "rating" ? Number(text) || 0 : 0 }, null);
    setText("");
  }

  function submitMulti() {
    if (multi.length === 0 && data.required) return;
    const labels = data.options.filter((o) => multi.includes(o.id)).map((o) => o.label).join(", ");
    const totalScore = data.options.filter((o) => multi.includes(o.id)).reduce((s, o) => s + o.score, 0);
    onAnswer({ nodeId: node.id, questionTitle: data.title, answerLabel: labels || "—", score: totalScore }, multi[0] ?? null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{data.title}</h2>
        {data.description && <p className="text-sm opacity-70 mt-1">{data.description}</p>}
      </div>

      {data.answerType === "single_choice" && (
        <div className="space-y-2">
          {data.options.map((opt) => (
            <button
              key={opt.id}
              className="w-full text-start px-4 py-3 border font-medium transition-colors hover:brightness-95"
              style={{ borderRadius: radiusFor(theme.buttonStyle), borderColor: `${theme.primaryColor}55` }}
              onClick={() =>
                onAnswer({ nodeId: node.id, questionTitle: data.title, answerLabel: opt.label, score: opt.score }, opt.id)
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {data.answerType === "multi_choice" && (
        <div className="space-y-3">
          <div className="space-y-2">
            {data.options.map((opt) => {
              const checked = multi.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setMulti((m) => (checked ? m.filter((id) => id !== opt.id) : [...m, opt.id]))
                  }
                  className="w-full flex items-center gap-2 text-start px-4 py-3 border font-medium transition-colors"
                  style={{
                    borderRadius: radiusFor(theme.buttonStyle),
                    borderColor: checked ? theme.primaryColor : `${theme.primaryColor}33`,
                    background: checked ? `${theme.primaryColor}14` : "transparent",
                  }}
                >
                  <Checkbox checked={checked} />
                  {opt.label}
                </button>
              );
            })}
          </div>
          <button
            className="w-full py-3 font-semibold text-white"
            style={{ background: theme.primaryColor, borderRadius: radiusFor(theme.buttonStyle) }}
            onClick={submitMulti}
          >
            המשך
          </button>
        </div>
      )}

      {(data.answerType === "short_text" || data.answerType === "number" || data.answerType === "date") && (
        <div className="space-y-3">
          <input
            type={data.answerType === "number" ? "number" : data.answerType === "date" ? "date" : "text"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2"
            style={{ borderRadius: radiusFor(theme.buttonStyle) }}
          />
          <button
            className="w-full py-3 font-semibold text-white"
            style={{ background: theme.primaryColor, borderRadius: radiusFor(theme.buttonStyle) }}
            onClick={submitFreeform}
          >
            המשך
          </button>
        </div>
      )}

      {data.answerType === "long_text" && (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2"
          />
          <button
            className="w-full py-3 font-semibold text-white"
            style={{ background: theme.primaryColor, borderRadius: radiusFor(theme.buttonStyle) }}
            onClick={submitFreeform}
          >
            המשך
          </button>
        </div>
      )}

      {data.answerType === "rating" && (
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setText(String(n))}
                className="aspect-square rounded-lg border font-semibold"
                style={{
                  background: text === String(n) ? theme.primaryColor : "transparent",
                  color: text === String(n) ? "#fff" : undefined,
                  borderColor: `${theme.primaryColor}55`,
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            className="w-full py-3 font-semibold text-white"
            style={{ background: theme.primaryColor, borderRadius: radiusFor(theme.buttonStyle) }}
            onClick={submitFreeform}
            disabled={!text}
          >
            המשך
          </button>
        </div>
      )}
    </div>
  );
}

function LeadDetailsStep({
  node,
  theme,
  leadInfo,
  setLeadInfo,
  onSubmit,
}: {
  node: QuizNode;
  theme: Quiz["theme"];
  leadInfo: { name: string; phone: string; email: string; consent: boolean };
  setLeadInfo: React.Dispatch<React.SetStateAction<{ name: string; phone: string; email: string; consent: boolean }>>;
  onSubmit: () => void;
}) {
  const data = node.data as Extract<QuizNode["data"], { kind: "lead_details" }>;
  const [error, setError] = useState<string | null>(null);

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
    onSubmit();
  }

  const inputStyle: React.CSSProperties = { borderRadius: radiusFor(theme.buttonStyle) };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">השאירו פרטים ונחזור אליכם</h2>
      {data.showName && (
        <input
          placeholder="שם מלא"
          value={leadInfo.name}
          onChange={(e) => setLeadInfo((s) => ({ ...s, name: e.target.value }))}
          className="w-full px-4 py-3 border outline-none focus:ring-2"
          style={inputStyle}
        />
      )}
      {data.showPhone && (
        <input
          placeholder="טלפון"
          dir="ltr"
          value={leadInfo.phone}
          onChange={(e) => setLeadInfo((s) => ({ ...s, phone: e.target.value }))}
          className="w-full px-4 py-3 border outline-none focus:ring-2 text-end"
          style={inputStyle}
        />
      )}
      {data.showEmail && (
        <input
          placeholder="אימייל"
          dir="ltr"
          value={leadInfo.email}
          onChange={(e) => setLeadInfo((s) => ({ ...s, email: e.target.value }))}
          className="w-full px-4 py-3 border outline-none focus:ring-2 text-end"
          style={inputStyle}
        />
      )}
      {data.showConsent && (
        <label className="flex items-start gap-2 text-xs opacity-80 cursor-pointer">
          <Checkbox
            checked={leadInfo.consent}
            onCheckedChange={(v) => setLeadInfo((s) => ({ ...s, consent: !!v }))}
            className="mt-0.5"
          />
          {data.consentText}
        </label>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        className="w-full py-3 font-semibold text-white"
        style={{ background: theme.primaryColor, borderRadius: radiusFor(theme.buttonStyle) }}
        onClick={handleSubmit}
      >
        שליחה
      </button>
    </div>
  );
}

function EndStep({ node, theme }: { node: QuizNode; theme: Quiz["theme"] }) {
  const data = node.data as Extract<QuizNode["data"], { kind: "end" }>;
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
    <div className="space-y-4 text-center">
      <div
        className="mx-auto flex size-12 items-center justify-center rounded-full"
        style={{ background: `${theme.primaryColor}22`, color: theme.primaryColor }}
      >
        <Check className="size-6" />
      </div>
      <h1 className="text-xl font-bold">{data.title}</h1>
      <p className="opacity-80 leading-relaxed">{data.text}</p>
      {shouldRedirect && (
        <p className="text-xs opacity-60">מעביר אותך אוטומטית תוך {secondsLeft} שניות...</p>
      )}
      {data.ctaLabel && data.ctaUrl && (
        <a
          href={data.ctaUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block w-full py-3 font-semibold text-white"
          style={{ background: theme.primaryColor, borderRadius: radiusFor(theme.buttonStyle) }}
        >
          {data.ctaLabel}
        </a>
      )}
    </div>
  );
}
