"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuizFlowStore } from "@/lib/store";
import { Quiz, QuizTheme, THEME_PRESETS } from "@/lib/types";

const PRESETS: { key: string; label: string }[] = [
  { key: "clean_light", label: "Clean Light" },
  { key: "dark_premium", label: "Dark Premium" },
  { key: "solina_green", label: "Solina Green" },
];

export function DesignTab({ quiz }: { quiz: Quiz }) {
  const updateQuiz = useQuizFlowStore((s) => s.updateQuiz);
  const [theme, setTheme] = useState<QuizTheme>(quiz.theme);

  function patch(next: Partial<QuizTheme>) {
    const merged = { ...theme, ...next };
    setTheme(merged);
    updateQuiz(quiz.id, { theme: merged });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 p-6 max-w-6xl">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">ערכות נושא מוכנות</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-3">
            {PRESETS.map((p) => {
              const preset = THEME_PRESETS[p.key];
              const active = theme.primaryColor === preset.primaryColor && theme.backgroundColor === preset.backgroundColor;
              return (
                <button
                  key={p.key}
                  onClick={() => patch(preset)}
                  className={`rounded-xl border p-3 text-start space-y-2 transition-colors ${
                    active ? "border-primary ring-1 ring-primary" : "hover:bg-accent"
                  }`}
                >
                  <div
                    className="h-16 rounded-lg flex items-center justify-center text-xs font-medium"
                    style={{ background: preset.backgroundColor, color: preset.textColor }}
                  >
                    <span
                      className="rounded-full px-3 py-1 text-white text-[11px]"
                      style={{ background: preset.primaryColor }}
                    >
                      כפתור
                    </span>
                  </div>
                  <p className="text-sm font-medium">{p.label}</p>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">התאמה אישית</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">צבע ראשי</Label>
                <Input type="color" value={theme.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} className="h-9 p-1" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">צבע רקע</Label>
                <Input type="color" value={theme.backgroundColor} onChange={(e) => patch({ backgroundColor: e.target.value })} className="h-9 p-1" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">צבע טקסט</Label>
                <Input type="color" value={theme.textColor} onChange={(e) => patch({ textColor: e.target.value })} className="h-9 p-1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">קישור לתמונת רקע</Label>
              <Input value={theme.backgroundImageUrl ?? ""} onChange={(e) => patch({ backgroundImageUrl: e.target.value })} placeholder="https://" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Overlay על תמונת הרקע</Label>
                <Select
                  value={theme.overlay}
                  onValueChange={(v) => patch({ overlay: v as QuizTheme["overlay"] })}
                  items={{ none: "ללא", light: "בהיר", dark: "כהה" }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא</SelectItem>
                    <SelectItem value="light">בהיר</SelectItem>
                    <SelectItem value="dark">כהה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">גופן</Label>
                <Select
                  value={theme.fontFamily}
                  onValueChange={(v) => patch({ fontFamily: v as QuizTheme["fontFamily"] })}
                  items={{ assistant: "Assistant", heebo: "Heebo" }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assistant">Assistant</SelectItem>
                    <SelectItem value="heebo">Heebo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">סגנון כפתורים</Label>
                <Select
                  value={theme.buttonStyle}
                  onValueChange={(v) => patch({ buttonStyle: v as QuizTheme["buttonStyle"] })}
                  items={{ rounded: "מעוגל", square: "מרובע", pill: "Pill" }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rounded">מעוגל</SelectItem>
                    <SelectItem value="square">מרובע</SelectItem>
                    <SelectItem value="pill">Pill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">מיקום כרטיס</Label>
                <Select
                  value={theme.cardPosition}
                  onValueChange={(v) => patch({ cardPosition: v as QuizTheme["cardPosition"] })}
                  items={{ center: "מרכז", right: "ימין", left: "שמאל" }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="center">מרכז</SelectItem>
                    <SelectItem value="right">ימין</SelectItem>
                    <SelectItem value="left">שמאל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">הצג progress bar</Label>
              <Switch checked={theme.showProgressBar} onCheckedChange={(v) => patch({ showProgressBar: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">הצג מספר שאלה</Label>
              <Switch checked={theme.showQuestionNumber} onCheckedChange={(v) => patch({ showQuestionNumber: v })} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-6 h-fit">
        <p className="text-xs text-muted-foreground mb-2">תצוגה מקדימה</p>
        <div
          className="rounded-2xl border overflow-hidden aspect-[9/16] flex items-center justify-center p-6"
          style={{
            background: theme.backgroundImageUrl ? `url(${theme.backgroundImageUrl}) center/cover` : theme.backgroundColor,
          }}
        >
          <div className="w-full rounded-xl bg-white/95 backdrop-blur p-5 shadow-lg space-y-3" style={{ color: theme.textColor }}>
            {theme.showProgressBar && <div className="h-1.5 rounded-full bg-black/10 overflow-hidden"><div className="h-full w-1/3" style={{ background: theme.primaryColor }} /></div>}
            <p className="font-semibold text-sm">מהו גילך?</p>
            <div className="space-y-2">
              {["עד 30", "31–45", "46–60"].map((label) => (
                <div
                  key={label}
                  className="border px-3 py-2 text-sm"
                  style={{ borderRadius: theme.buttonStyle === "square" ? 4 : theme.buttonStyle === "pill" ? 999 : 10 }}
                >
                  {label}
                </div>
              ))}
            </div>
            <Button className="w-full" style={{ background: theme.primaryColor, borderRadius: theme.buttonStyle === "square" ? 4 : theme.buttonStyle === "pill" ? 999 : 10 }}>
              המשך
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
