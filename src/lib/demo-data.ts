import {
  Lead,
  LeadStatus,
  Quiz,
  QuizNode,
  QuizEdge,
  THEME_PRESETS,
} from "./types";

const DEMO_QUIZ_ID = "quiz-demo-financial";

function n(id: string, type: QuizNode["type"], x: number, y: number, data: QuizNode["data"]): QuizNode {
  return { id, type, position: { x, y }, data };
}

const nodes: QuizNode[] = [
  n("start-1", "start", 0, 0, { kind: "start" }),
  n("msg-1", "message", 0, 160, {
    kind: "message",
    title: "בואו נבדוק את ההתאמה שלך",
    text: "כמה שאלות קצרות שייקחו לך פחות מדקה, ויעזרו לנו להבין את הצרכים הפיננסיים שלך.",
    buttonLabel: "בואו נתחיל",
    nextNodeId: "q-age",
  }),
  n("q-age", "question", 0, 340, {
    kind: "question",
    title: "מהו גילך?",
    answerType: "single_choice",
    required: true,
    allowOther: false,
    options: [
      { id: "o1", label: "עד 30", value: "under_30", score: 2, nextNodeId: "q-field" },
      { id: "o2", label: "31–45", value: "31_45", score: 5, nextNodeId: "q-field" },
      { id: "o3", label: "46–60", value: "46_60", score: 8, nextNodeId: "q-field" },
      { id: "o4", label: "60+", value: "60_plus", score: 4, nextNodeId: "q-field" },
    ],
    nextNodeId: null,
  }),
  n("q-field", "question", 0, 520, {
    kind: "question",
    title: "באיזה תחום עיסוק?",
    answerType: "single_choice",
    required: true,
    allowOther: true,
    options: [
      { id: "o1", label: "שכיר", value: "employee", score: 4, nextNodeId: "q-income" },
      { id: "o2", label: "עצמאי", value: "self_employed", score: 7, nextNodeId: "q-income" },
      { id: "o3", label: "בעל עסק", value: "business_owner", score: 9, nextNodeId: "q-income" },
      { id: "o4", label: "פרישה", value: "retired", score: 3, nextNodeId: "q-income" },
    ],
    nextNodeId: null,
  }),
  n("q-income", "question", 0, 700, {
    kind: "question",
    title: "מהו סדר הגודל של ההכנסה החודשית?",
    answerType: "single_choice",
    required: true,
    allowOther: false,
    options: [
      { id: "o1", label: "עד 10,000 ₪", value: "under_10k", score: 2, nextNodeId: "q-priority" },
      { id: "o2", label: "10,000–20,000 ₪", value: "10_20k", score: 5, nextNodeId: "q-priority" },
      { id: "o3", label: "20,000–40,000 ₪", value: "20_40k", score: 8, nextNodeId: "q-priority" },
      { id: "o4", label: "מעל 40,000 ₪", value: "over_40k", score: 10, nextNodeId: "q-priority" },
    ],
    nextNodeId: null,
  }),
  n("q-priority", "question", 0, 880, {
    kind: "question",
    title: "מה הכי חשוב לך כרגע?",
    answerType: "single_choice",
    required: true,
    allowOther: false,
    options: [
      { id: "o1", label: "חיסכון לפנסיה", value: "pension", score: 6, nextNodeId: "lead-1" },
      { id: "o2", label: "השקעות", value: "investing", score: 8, nextNodeId: "lead-1" },
      { id: "o3", label: "צמצום הוצאות", value: "expenses", score: 3, nextNodeId: "lead-1" },
      { id: "o4", label: "תכנון ירושה", value: "inheritance", score: 7, nextNodeId: "lead-1" },
    ],
    nextNodeId: null,
  }),
  n("lead-1", "lead_details", 0, 1060, {
    kind: "lead_details",
    showName: true,
    showPhone: true,
    showEmail: true,
    requirePhoneIL: true,
    showConsent: true,
    consentText: "אני מאשר/ת קבלת מידע ופנייה טלפונית בנוגע לתוצאות הבדיקה.",
    nextNodeId: "end-1",
  }),
  n("end-1", "end", 0, 1240, {
    kind: "end",
    title: "תודה רבה!",
    text: "קיבלנו את הפרטים שלך, ניצור איתך קשר בהקדם עם תוצאות ההתאמה האישית שלך.",
    ctaLabel: "לקביעת פגישת ייעוץ",
    ctaUrl: "https://wa.me/972500000000",
  }),
];

const edges: QuizEdge[] = [
  { id: "e-start-msg", source: "start-1", sourceHandle: null, target: "msg-1" },
  { id: "e-msg-q1", source: "msg-1", sourceHandle: null, target: "q-age" },
  ...nodes
    .filter((nd): nd is QuizNode & { data: { kind: "question" } } => nd.data.kind === "question")
    .flatMap((nd) =>
      (nd.data as unknown as { options: { id: string; nextNodeId: string | null }[] }).options.map(
        (opt) => ({
          id: `e-${nd.id}-${opt.id}`,
          source: nd.id,
          sourceHandle: opt.id,
          target: opt.nextNodeId as string,
        })
      )
    ),
  { id: "e-lead-end", source: "lead-1", sourceHandle: null, target: "end-1" },
];

export const DEMO_QUIZ: Quiz = {
  id: DEMO_QUIZ_ID,
  workspaceId: "ws-demo",
  name: "בדיקת התאמה לתכנון פיננסי",
  description: "שאלון דמו לאיתור לידים חמים לייעוץ פיננסי",
  slug: "financial-fit",
  status: "active",
  nodes,
  edges,
  theme: THEME_PRESETS.solina_green,
  allowBack: true,
  createdAt: "2026-08-10T09:00:00.000Z",
  updatedAt: "2026-09-08T14:30:00.000Z",
};

const FIRST_NAMES = ["דנה", "יוסי", "מיכל", "אורי", "שירה", "עידן", "נועה", "רועי", "טל", "ליאור", "אביגיל", "עומר", "הילה", "גיא", "רותם"];
const LAST_NAMES = ["כהן", "לוי", "מזרחי", "פרץ", "ביטון", "אברהם", "דהן", "אזולאי", "שפירא", "רוזן"];
const UTM_SOURCES = ["facebook", "google", "instagram", "tiktok", "direct"];
const STATUSES: LeadStatus[] = ["new", "in_progress", "meeting_scheduled", "closed", "not_relevant"];

function categoryFromScore(score: number): "hot" | "warm" | "cold" {
  if (score >= 26) return "hot";
  if (score >= 16) return "warm";
  return "cold";
}

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

export function buildDemoLeads(): Lead[] {
  const rand = seededRandom(42);
  const leads: Lead[] = [];
  for (let i = 0; i < 15; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const score = Math.round(8 + rand() * 30);
    const createdDaysAgo = Math.floor(rand() * 28);
    const createdAt = new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString();
    const status = STATUSES[Math.floor(rand() * STATUSES.length)];
    leads.push({
      id: `lead-demo-${i + 1}`,
      quizId: DEMO_QUIZ_ID,
      quizName: DEMO_QUIZ.name,
      name: `${first} ${last}`,
      phone: `05${Math.floor(10000000 + rand() * 89999999)}`,
      email: `${first}.${last}@example.co.il`.toLowerCase(),
      score,
      category: categoryFromScore(score),
      status,
      utmSource: UTM_SOURCES[Math.floor(rand() * UTM_SOURCES.length)],
      utmMedium: "cpc",
      utmCampaign: "quizflow-demo",
      answers: [
        { nodeId: "q-age", questionTitle: "מהו גילך?", answerLabel: "31–45", score: 5 },
        { nodeId: "q-field", questionTitle: "באיזה תחום עיסוק?", answerLabel: "עצמאי", score: 7 },
        { nodeId: "q-income", questionTitle: "מהו סדר הגודל של ההכנסה החודשית?", answerLabel: "20,000–40,000 ₪", score: 8 },
        { nodeId: "q-priority", questionTitle: "מה הכי חשוב לך כרגע?", answerLabel: "השקעות", score: 8 },
      ],
      notes: [],
      assignedTo: i % 3 === 0 ? "דניאל" : undefined,
      createdAt,
      statusHistory: [{ status: "new", at: createdAt }],
    });
  }
  return leads.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function buildDemoAnalytics() {
  const rand = seededRandom(7);
  const points = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const views = Math.round(20 + rand() * 60);
    const starts = Math.round(views * (0.55 + rand() * 0.2));
    const completions = Math.round(starts * (0.45 + rand() * 0.25));
    const leads = Math.round(completions * (0.8 + rand() * 0.15));
    points.push({ date, views, starts, completions, leads });
  }
  return points;
}
