import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ProposalDraft({
  grantName,
  profile,
  done,
}: {
  grantName: string;
  profile: { role: string; year: string; program: string };
  done: boolean;
}) {
  const { toast } = useToast();
  const initial = useMemo(() => {
    return `Title: ${grantName} — Draft Narrative Scaffold

Applicant profile:
- Role: ${profile.role}
- Level: ${profile.year}
- Program: ${profile.program}

Summary (auto-generated scaffold):
This packet draft is designed as a high-signal starting point for your ${grantName} submission. It highlights alignment with sponsor priorities, articulates a clear intellectual merit + broader impacts story, and anticipates internal compliance needs. 

Core contributions:
1) Research vision: a crisp, testable agenda with milestones, risks, and contingency paths.
2) Method: rigorous design, measurable outcomes, and reproducibility.
3) Training + mentorship: a plan appropriate to your role and program context.
4) Integration: clear link between research, education/training, and dissemination.

Next edits to finalize:
- Insert 2–3 concrete prior results (figures or citations).
- Add a one-paragraph \"Why FSU\" institutional strength statement.
- Confirm sponsor-specific formatting + page limits.
`;
  }, [grantName, profile.program, profile.role, profile.year]);

  const [text, setText] = useState(initial);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Proposal draft copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard permission blocked.", variant: "destructive" });
    }
  };

  const downloadTxt = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FundingForge_${grantName.replace(/\s+/g, "_")}_draft.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: "Draft saved as .txt." });
  };

  return (
    <Card className="ff-grain rounded-2xl border border-border/60 bg-card/35 p-5 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            <div className="text-sm font-semibold">Proposal Draft</div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Editable scaffold — export or copy into your internal workflow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="border border-border/60">
            {done ? "Forged" : "Drafting…"}
          </Badge>
          <Button variant="secondary" className="border border-border/60" onClick={copyToClipboard}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button onClick={downloadTxt} className="bg-accent text-accent-foreground border border-accent/30">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-[260px] bg-background/30"
          placeholder="Draft will appear here…"
        />
      </div>
    </Card>
  );
}
