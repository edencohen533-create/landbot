import { Card, CardContent } from "@/components/ui/card";
import { Webhook, Sheet, Zap, Target, Music2 } from "lucide-react";

const INTEGRATIONS = [
  { icon: Webhook, name: "Webhook מותאם אישית", desc: "שליחת כל שליחת שאלון לכתובת שבחרת" },
  { icon: Sheet, name: "Google Sheets", desc: "הוספת לידים אוטומטית לגיליון" },
  { icon: Zap, name: "Zapier", desc: "חיבור ל-6,000+ אפליקציות" },
  { icon: Target, name: "Meta Conversions API", desc: "שליחת אירועי המרה לפייסבוק" },
  { icon: Music2, name: "TikTok Pixel", desc: "שליחת אירועי המרה לטיקטוק" },
];

export default function IntegrationsPage() {
  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px]">
      <h1 className="text-2xl font-bold tracking-tight">אינטגרציות</h1>
      <p className="text-sm text-muted-foreground max-w-xl">
        חיבור אינטגרציות ברמת הארגון יתווסף בשלב הבא. כרגע ניתן להגדיר Webhook ופעולות פרטניות מתוך צומת &quot;פעולה&quot; בעורך הזרימה של כל שאלון.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATIONS.map((i) => (
          <Card key={i.name} className="opacity-70">
            <CardContent className="flex items-start gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
                <i.icon className="size-4.5" />
              </span>
              <div>
                <p className="font-medium text-sm">{i.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{i.desc}</p>
                <p className="text-xs text-primary mt-1.5">בקרוב</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
