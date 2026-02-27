import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ClipboardCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  hint: string;
  severity: "standard" | "attention";
};

const baseTasks: Task[] = [
  { id: "irb", title: "IRB determination", hint: "Human subjects? Confirm exempt/expedited/full.", severity: "attention" },
  { id: "coi", title: "COI disclosure", hint: "Update COI and verify sponsor requirements.", severity: "attention" },
  { id: "data", title: "Data management plan", hint: "Retention, sharing, and storage location.", severity: "standard" },
  { id: "export", title: "Export control check", hint: "International collaborators, restricted tech.", severity: "standard" },
  { id: "subaward", title: "Subaward docs", hint: "If partners involved, gather scope & budget.", severity: "standard" },
];

export function RampChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const completion = useMemo(() => {
    const total = baseTasks.length;
    const done = baseTasks.reduce((acc, t) => acc + (checked[t.id] ? 1 : 0), 0);
    return { total, done, pct: Math.round((done / total) * 100) };
  }, [checked]);

  return (
    <Card className="ff-grain rounded-2xl border border-border/60 bg-card/35 p-5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-accent" />
            <div className="text-sm font-semibold">RAMP Checklist</div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Toggle tasks to keep your internal routing clean and fast.
          </p>
        </div>

        <Badge
          className={cn(
            "border",
            completion.pct === 100
              ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/20"
              : "bg-accent/15 text-accent-foreground border-accent/25",
          )}
        >
          {completion.done}/{completion.total} · {completion.pct}%
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        {baseTasks.map((t) => {
          const isOn = Boolean(checked[t.id]);
          return (
            <button
              key={t.id}
              onClick={() => setChecked((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
              className={cn(
                "relative w-full rounded-xl border border-border/60 bg-background/18 p-3 text-left transition-colors duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "toggle-elevate",
                isOn ? "toggle-elevated" : "",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {isOn ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : t.severity === "attention" ? (
                      <ShieldAlert className="h-4 w-4 text-amber-300" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-border/60" />
                    )}
                    <div className="text-sm font-semibold">{t.title}</div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{t.hint}</div>
                </div>

                <Badge variant="secondary" className="border border-border/60">
                  {isOn ? "Done" : "Open"}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          className="border border-border/60"
          onClick={() => setChecked({})}
        >
          Clear all
        </Button>
        <Button
          onClick={() =>
            setChecked(baseTasks.reduce((acc, t) => ({ ...acc, [t.id]: true }), {} as Record<string, boolean>))
          }
          className="bg-accent text-accent-foreground border border-accent/30"
        >
          Mark all complete
        </Button>
      </div>
    </Card>
  );
}
