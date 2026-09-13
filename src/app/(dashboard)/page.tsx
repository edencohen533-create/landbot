"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus, ListChecks, Users, Percent, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LeadsChart } from "@/components/dashboard/leads-chart";
import { QuizStatusBadge, LeadStatusBadge } from "@/components/shared/status-badges";
import { useQuizFlowStore } from "@/lib/store";
import { buildDemoAnalytics } from "@/lib/demo-data";

export default function DashboardPage() {
  const quizzes = useQuizFlowStore((s) => s.quizzes);
  const leads = useQuizFlowStore((s) => s.leads);
  const analytics = useMemo(() => buildDemoAnalytics(), []);

  const activeQuizzes = quizzes.filter((q) => q.status === "active").length;
  const now = new Date();
  const leadsThisMonth = leads.filter((l) => {
    const d = new Date(l.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const totalViews = analytics.reduce((sum, p) => sum + p.views, 0);
  const totalCompletions = analytics.reduce((sum, p) => sum + p.completions, 0);
  const completionRate = totalViews ? Math.round((totalCompletions / totalViews) * 100) : 0;
  const avgLeadsPerQuiz = quizzes.length ? Math.round((leads.length / quizzes.length) * 10) / 10 : 0;

  const recentQuizzes = [...quizzes]
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 5);
  const recentLeads = leads.slice(0, 5);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">לוח בקרה</h1>
        <Button
          nativeButton={false}
          render={
            <Link href="/quizzes?new=1">
              <Plus className="size-4" />
              צור שאלון חדש
            </Link>
          }
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="שאלונים פעילים" value={String(activeQuizzes)} icon={ListChecks} hint={`מתוך ${quizzes.length} סה"כ`} />
        <KpiCard label="לידים החודש" value={String(leadsThisMonth)} icon={Users} />
        <KpiCard label="שיעור השלמה" value={`${completionRate}%`} icon={Percent} hint="30 הימים האחרונים" />
        <KpiCard label="ממוצע לידים לשאלון" value={String(avgLeadsPerQuiz)} icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">לידים לפי ימים</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadsChart data={analytics} />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">שאלונים אחרונים</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/quizzes">הצג הכול</Link>} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>עדכון אחרון</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentQuizzes.map((q) => (
                  <TableRow key={q.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/quizzes/${q.id}`}>{q.name}</Link>
                    </TableCell>
                    <TableCell><QuizStatusBadge status={q.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(q.updatedAt).toLocaleDateString("he-IL")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">לידים אחרונים</CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/leads">הצג הכול</Link>} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם</TableHead>
                  <TableHead>שאלון</TableHead>
                  <TableHead>סטטוס</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLeads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{l.quizName}</TableCell>
                    <TableCell><LeadStatusBadge status={l.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
