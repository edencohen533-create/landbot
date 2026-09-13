import { Sparkles } from "lucide-react";

export function ComingSoonTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full items-center justify-center p-10">
      <div className="text-center max-w-sm space-y-3">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Sparkles className="size-5" />
        </div>
        <h3 className="font-semibold">{title} — בקרוב</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
