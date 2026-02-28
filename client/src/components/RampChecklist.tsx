import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, AlertTriangle, Circle, Loader2, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type CheckItem = {
  id: string;
  label: string;
  category: "required" | "recommended" | "info";
  checked: boolean;
};

const DEFAULT_ITEMS: CheckItem[] = [
  { id: "irb", label: "IRB approval obtained or not required", category: "required", checked: false },
  { id: "sponsor", label: "Sponsor guidelines reviewed and confirmed", category: "required", checked: false },
  { id: "budget", label: "Budget reviewed by departmental administrator", category: "required", checked: false },
  { id: "internal_deadline", label: "Internal FSU deadline noted (10 days before sponsor deadline)", category: "required", checked: false },
  { id: "ramp_routing", label: "RAMP routing initiated in system", category: "required", checked: false },
  { id: "cost_share", label: "Cost share commitments documented if applicable", category: "recommended", checked: false },
  { id: "subcontracts", label: "Subcontract letters of intent collected", category: "recommended", checked: false },
  { id: "conflict", label: "Conflict of interest disclosure complete", category: "recommended", checked: false },
  { id: "facilities", label: "Facilities and resources statement updated", category: "info", checked: false },
  { id: "data_mgmt", label: "Data management plan prepared if required", category: "info", checked: false },
];

function parseComplianceItems(details: string): CheckItem[] {
  if (!details || details.length < 50) return DEFAULT_ITEMS;

  // Try to extract compliance checklist items from KB response
  const lines = details.split("\n").filter((l) => l.trim().length > 10);
  const parsed: CheckItem[] = [];

  for (const line of lines.slice(0, 8)) {
    const clean = line.replace(/^[-•*\d\.\s]+/, "").trim();
    if (clean.length < 10 || clean.length > 150) continue;

    const category =
      /required|must|mandatory|deadline/i.test(clean) ? "required" :
      /recommended|should|consider/i.test(clean) ? "recommended" : "info";

    parsed.push({
      id: `kb_${parsed.length}`,
      label: clean,
      category,
      checked: false,
    });
  }

  // Merge KB items with defaults
  return [...parsed, ...DEFAULT_ITEMS.slice(0, Math.max(0, 8 - parsed.length))];
}

export function RampChecklist({
  complianceScore,
  complianceDetails,
}: {
  complianceScore?: number | null;
  complianceDetails?: string;
}) {
  const initialItems = useMemo(
    () => parseComplianceItems(complianceDetails ?? ""),
    [complianceDetails]
  );

  const [items, setItems] = useState<CheckItem[]>(initialItems);

  const toggle = (id: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const requiredItems = items.filter((i) => i.category === "required");
  const requiredChecked = requiredItems.filter((i) => i.checked).length;
  const progress = Math.round((checkedCount / items.length) * 100);

  const scoreColor = complianceScore
    ? complianceScore >= 80 ? "text-emerald-400" : complianceScore >= 65 ? "text-amber-400" : "text-red-400"
    : "text-muted-foreground";

  const scoreBg = complianceScore
    ? complianceScore >= 80 ? "bg-emerald-500/10 border-emerald-500/30" : complianceScore >= 65 ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30"
    : "bg-background/20 border-border/60";

  return (
    <Card className="ff-grain rounded-2xl border border-border/60 bg-card/35 p-5 backdrop-blur">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            <div className="text-sm font-semibold">RAMP Compliance Checklist</div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Pre-award routing checklist. Tick items as you complete them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {complianceScore !== null && complianceScore !== undefined ? (
            <Badge className={cn("border font-bold text-sm px-3 py-1", scoreBg, scoreColor)}>
              {complianceScore}% match
            </Badge>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking…
            </div>
          )}
          <Badge variant="secondary" className="border border-border/60">
            {checkedCount}/{items.length}
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>{requiredChecked}/{requiredItems.length} required items complete</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progress >= 80 ? "bg-emerald-500" : progress >= 50 ? "bg-accent" : "bg-amber-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {["required", "recommended", "info"].map((category) => {
          const categoryItems = items.filter((i) => i.category === category);
          if (categoryItems.length === 0) return null;
          return (
            <div key={category}>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 mt-3">
                {category === "required" ? "⚠ Required" : category === "recommended" ? "Recommended" : "Information"}
              </div>
              {categoryItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                    item.checked
                      ? "bg-accent/10 border border-accent/20"
                      : "hover:bg-background/30 border border-transparent"
                  )}
                >
                  {item.checked ? (
                    <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                  ) : category === "required" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-400/70 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-sm leading-snug",
                    item.checked ? "line-through text-muted-foreground" : ""
                  )}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {complianceDetails && (
        <div className="mt-4 rounded-xl border border-border/50 bg-background/15 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-semibold">From FSU Policy Knowledge Base</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {complianceDetails.slice(0, 400)}{complianceDetails.length > 400 ? "…" : ""}
          </p>
        </div>
      )}
    </Card>
  );
}
