"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Users,
  Plug,
  Settings,
  Moon,
  Sun,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";

const NAV_ITEMS = [
  { href: "/", label: "לוח בקרה", icon: LayoutDashboard },
  { href: "/quizzes", label: "שאלונים", icon: ListChecks },
  { href: "/leads", label: "לידים", icon: Users },
  { href: "/integrations", label: "אינטגרציות", icon: Plug },
  { href: "/settings", label: "הגדרות", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("quizflow-theme");
    const isDark = stored === "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- theme preference only exists in localStorage, unreadable during SSR
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleDark(value: boolean) {
    setDark(value);
    document.documentElement.classList.toggle("dark", value);
    localStorage.setItem("quizflow-theme", value ? "dark" : "light");
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col justify-between bg-sidebar text-sidebar-foreground border-s border-sidebar-border h-screen sticky top-0">
      <div>
        <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <span className="font-bold text-lg tracking-tight">QuizFlow</span>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="p-3 border-t border-sidebar-border space-y-3">
        <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80">
          <span className="flex items-center gap-2">
            {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
            מצב כהה
          </span>
          <Switch checked={dark} onCheckedChange={toggleDark} />
        </div>
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              עכ
            </AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <p className="text-sm font-medium">עדן כהן</p>
            <p className="text-xs text-sidebar-foreground/60">workspace ראשי</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
