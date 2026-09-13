"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { buildDemoAnalytics } from "@/lib/demo-data";

const RANGE_OPTIONS = [
  { value: "today", label: "היום" },
  { value: "week", label: "שבוע" },
  { value: "month", label: "חודש" },
  { value: "30", label: "30 יום" },
  { value: "90", label: "90 יום" },
];

const RANGE_DAYS: Record<string, number> = { today: 1, week: 7, month: 30, "30": 30, "90": 90 };

export function AnalyticsTab({ quizId }: { quizId: string }) {
  void quizId;
  const [range, setRange] = useState("30");
  const allData = useMemo(() => buildDemoAnalytics(), []);
  const days = RANGE_DAYS[range] ?? 30;
  const data = allData.slice(-days);

  const totals = data.reduce(
    (acc, p) => ({
      views: acc.views + p.views,
      starts: acc.starts + p.starts,
      completions: acc.completions + p.completions,
      leads: acc.leads + p.leads,
    }),
    { views: 0, starts: 0, completions: 0, leads: 0 }
  );
  const completionRate = totals.starts ? Math.round((totals.completions / totals.starts) * 100) : 0;
  const conversionRate = totals.views ? Math.round((totals.leads / totals.views) * 100) : 0;

  const questionDropoff = [
    { question: "גיל", dropoff: 4 },
    { question: "תחום עיסוק", dropoff: 7 },
    { question: "הכנסה", dropoff: 11 },
    { question: "עדיפות", dropoff: 6 },
    { question: "פרטי קשר", dropoff: 14 },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">אנליטיקה</h2>
        <Select
          value={range}
          onValueChange={(v) => v && setRange(v)}
          items={Object.fromEntries(RANGE_OPTIONS.map((r) => [r.value, r.label]))}
        >
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "צפיות", value: totals.views },
          { label: "התחילו", value: totals.starts },
          { label: "סיימו", value: totals.completions },
          { label: "שיעור השלמה", value: `${completionRate}%` },
          { label: "לידים", value: totals.leads },
          { label: "Conversion", value: `${conversionRate}%` },
        ].map((k) => (
          <Card key={k.label}><CardContent className="py-1"><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-lg font-bold mt-1">{k.value}</p></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">ביצועים לאורך זמן</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="date" tickFormatter={(v: string) => v.slice(5)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} orientation="right" width={30} />
              <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="views" fill="var(--color-chart-2)" radius={4} name="צפיות" />
              <Bar dataKey="completions" fill="var(--color-chart-1)" radius={4} name="השלמות" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Drop-off לפי שאלה</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={questionDropoff} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid horizontal={false} stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="question" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={90} orientation="right" />
              <Tooltip contentStyle={{ direction: "rtl", fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}%`, "נטישה"]} />
              <Bar dataKey="dropoff" fill="var(--color-chart-5)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
