import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-start justify-between gap-3 py-1">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground shrink-0">
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
