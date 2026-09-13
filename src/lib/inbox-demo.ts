import type { SupabaseClient } from "@supabase/supabase-js";
import { createConversation, listConversations, sendMessage } from "@/lib/supabase/inbox-queries";
import { ConversationChannel } from "@/lib/types";

interface DemoCustomer {
  name: string;
  phone: string;
  channel: ConversationChannel;
  opener: string;
  followUps: string[];
  tags: string[];
}

const DEMO_CUSTOMERS: DemoCustomer[] = [
  {
    name: "מאיה אלקבץ",
    phone: "0521234567",
    channel: "whatsapp",
    opener: "היי! ראיתי אתכם באינסטגרם, הפרוביוטיקה קאלמה+ מתאימה לנפיחות אחרי אוכל?",
    followUps: ["כמה זמן לוקח עד שרואים תוצאה?", "אפשר לקחת את זה גם עם תרופות אחרות?"],
    tags: ["פרוביוטיקה", "ליד חדש"],
  },
  {
    name: "רוני שגיא",
    phone: "0538765432",
    channel: "webchat",
    opener: "שלום, מתעניינת בקולגן לעור ולשיער, יש לכם המלצה על מינון יומי?",
    followUps: ["יש טעם לא נעים? אכפת לי מזה", "מתי הכי כדאי לקחת, בבוקר או בערב?"],
    tags: ["קולגן"],
  },
  {
    name: "עדי ברששת",
    phone: "0541122334",
    channel: "instagram",
    opener: "היי 😊 ראיתי סטורי על מגנזיום לשינה, זה מתאים גם למי שסובל מחרדה קלה?",
    followUps: ["אפשר לקחת את זה ביחד עם ויטמין D?", "יש לכם משלוח עד הבית באותו יום?"],
    tags: ["מגנזיום", "שינה"],
  },
  {
    name: "טל הרוש",
    phone: "0559988776",
    channel: "whatsapp",
    opener: "שלום, אני מתאמן קבוע והכאבים במפרקים מפריעים לי. שמעתי על MOVE, זה עוזר?",
    followUps: ["כמה זמן עד שמרגישים הבדל בברכיים?", "אפשר לשלב עם קולגן?"],
    tags: ["MOVE", "מפרקים"],
  },
  {
    name: "שירה נחמיאס",
    phone: "0502233445",
    channel: "email",
    opener: "בוקר טוב, קיבלתי המלצה על קאלמה+ מחברה. יש לכם מבצע על מנוי חודשי?",
    followUps: ["אפשר להקפיא מנוי לחודש אם אני נוסעת לחו״ל?", "יש החזר אם זה לא מתאים לי?"],
    tags: ["פרוביוטיקה", "מנוי"],
  },
  {
    name: "יובל קריספין",
    phone: "0587766554",
    channel: "messenger",
    opener: "היי, קניתי את שילוב הקולגן+מגנזיום, מתי אמורה להגיע ההזמנה?",
    followUps: ["המשלוח עדיין לא הגיע, אפשר לבדוק?", "תודה, קיבלתי היום 🙏"],
    tags: ["הזמנה", "משלוח"],
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function generateDemoTick(supabase: SupabaseClient, workspaceId: string) {
  const existing = (await listConversations(supabase, workspaceId)).filter((c) => c.isDemo && c.status !== "closed");

  // ~40% chance to start a brand-new conversation, otherwise continue an existing one.
  const shouldCreateNew = existing.length === 0 || Math.random() < 0.4;

  if (shouldCreateNew) {
    const customer = pick(DEMO_CUSTOMERS);
    const conversation = await createConversation(supabase, workspaceId, {
      customerName: customer.name,
      customerPhone: customer.phone,
      channel: customer.channel,
      tags: customer.tags,
      isDemo: true,
    });
    await sendMessage(supabase, workspaceId, conversation.id, {
      body: customer.opener,
      senderType: "customer",
      isDemo: true,
    });
    return;
  }

  const target = pick(existing);
  const customer = DEMO_CUSTOMERS.find((c) => c.phone === target.customerPhone) ?? pick(DEMO_CUSTOMERS);
  await sendMessage(supabase, workspaceId, target.id, {
    body: pick(customer.followUps),
    senderType: "customer",
    isDemo: true,
  });
}

export function startDemoSimulator(supabase: SupabaseClient, workspaceId: string): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function scheduleNext() {
    if (stopped) return;
    const delay = 15000 + Math.random() * 15000;
    timer = setTimeout(async () => {
      try {
        await generateDemoTick(supabase, workspaceId);
      } finally {
        scheduleNext();
      }
    }, delay);
  }

  scheduleNext();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
