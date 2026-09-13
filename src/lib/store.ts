import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Lead, LeadNote, LeadStatus, Quiz, QuizEdge, QuizNode, QuizStatus } from "./types";
import { DEMO_QUIZ, buildDemoLeads } from "./demo-data";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

interface QuizFlowState {
  quizzes: Quiz[];
  leads: Lead[];
  createQuiz: (input: { name: string; description?: string; template: string }) => Quiz;
  updateQuiz: (id: string, patch: Partial<Quiz>) => void;
  duplicateQuiz: (id: string) => void;
  deleteQuiz: (id: string) => void;
  setQuizStatus: (id: string, status: QuizStatus) => void;
  saveFlow: (id: string, nodes: QuizNode[], edges: QuizEdge[]) => void;
  getQuizBySlug: (slug: string) => Quiz | undefined;
  addSubmission: (quizId: string, lead: Omit<Lead, "id" | "quizId" | "quizName" | "createdAt" | "statusHistory" | "notes">) => void;
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  addLeadNote: (id: string, text: string) => void;
}

const START_TEMPLATES: Record<string, { nodes: QuizNode[]; edges: QuizEdge[] }> = {
  blank: {
    nodes: [{ id: "start-1", type: "start", position: { x: 0, y: 0 }, data: { kind: "start" } }],
    edges: [],
  },
};

export const useQuizFlowStore = create<QuizFlowState>()(
  persist(
    (set, get) => ({
      quizzes: [DEMO_QUIZ],
      leads: buildDemoLeads(),

      createQuiz: ({ name, description, template }) => {
        const base = START_TEMPLATES[template] ?? START_TEMPLATES.blank;
        const now = new Date().toISOString();
        const quiz: Quiz = {
          id: uid("quiz"),
          workspaceId: "ws-demo",
          name,
          description,
          slug: name
            .trim()
            .toLowerCase()
            .replace(/[^֐-׿a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") || uid("quiz"),
          status: "draft",
          nodes: base.nodes,
          edges: base.edges,
          theme: {
            primaryColor: "#10b981",
            backgroundColor: "#f8fafc",
            textColor: "#0f172a",
            overlay: "none",
            fontFamily: "assistant",
            buttonStyle: "pill",
            cardPosition: "center",
            showProgressBar: true,
            showQuestionNumber: true,
          },
          allowBack: true,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ quizzes: [quiz, ...s.quizzes] }));
        return quiz;
      },

      updateQuiz: (id, patch) => {
        set((s) => ({
          quizzes: s.quizzes.map((q) =>
            q.id === id ? { ...q, ...patch, updatedAt: new Date().toISOString() } : q
          ),
        }));
      },

      duplicateQuiz: (id) => {
        const source = get().quizzes.find((q) => q.id === id);
        if (!source) return;
        const now = new Date().toISOString();
        const copy: Quiz = {
          ...source,
          id: uid("quiz"),
          name: `${source.name} (עותק)`,
          slug: `${source.slug}-copy-${Math.floor(Math.random() * 1000)}`,
          status: "draft",
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ quizzes: [copy, ...s.quizzes] }));
      },

      deleteQuiz: (id) => {
        set((s) => ({ quizzes: s.quizzes.filter((q) => q.id !== id) }));
      },

      setQuizStatus: (id, status) => {
        set((s) => ({
          quizzes: s.quizzes.map((q) =>
            q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q
          ),
        }));
      },

      saveFlow: (id, nodes, edges) => {
        set((s) => ({
          quizzes: s.quizzes.map((q) =>
            q.id === id ? { ...q, nodes, edges, updatedAt: new Date().toISOString() } : q
          ),
        }));
      },

      getQuizBySlug: (slug) => get().quizzes.find((q) => q.slug === slug),

      addSubmission: (quizId, leadInput) => {
        const quiz = get().quizzes.find((q) => q.id === quizId);
        if (!quiz) return;
        const now = new Date().toISOString();
        const lead: Lead = {
          ...leadInput,
          id: uid("lead"),
          quizId,
          quizName: quiz.name,
          createdAt: now,
          notes: [],
          statusHistory: [{ status: "new", at: now }],
        };
        set((s) => ({ leads: [lead, ...s.leads] }));
      },

      updateLeadStatus: (id, status) => {
        set((s) => ({
          leads: s.leads.map((l) =>
            l.id === id
              ? { ...l, status, statusHistory: [...l.statusHistory, { status, at: new Date().toISOString() }] }
              : l
          ),
        }));
      },

      addLeadNote: (id, text) => {
        const note: LeadNote = { id: uid("note"), text, createdAt: new Date().toISOString() };
        set((s) => ({
          leads: s.leads.map((l) => (l.id === id ? { ...l, notes: [...l.notes, note] } : l)),
        }));
      },
    }),
    { name: "quizflow-storage" }
  )
);
