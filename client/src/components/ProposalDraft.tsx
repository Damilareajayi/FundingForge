import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Copy, Download, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SCAFFOLD = (grantName: string, role: string, program: string, year: string) => `
Title: ${grantName} — Research Proposal

[AI is generating your tailored proposal based on grant requirements, your profile, and compliance data...]

This proposal is being crafted specifically for:
• Grant: ${grantName}
• Applicant: ${role} — ${year} — ${program}

The system is analyzing:
✓ Grant eligibility and requirements from the grants database
✓ FSU compliance and RAMP policy requirements  
✓ Your profile and research context

Your full proposal will appear here shortly.
`.trim();

export function ProposalDraft({
  grantName,
  profile,
  done,
  aiProposal,
}: {
  grantName: string;
  profile: { role: string; year: string; program: string };
  done: boolean;
  aiProposal?: string;
}) {
  const { toast } = useToast();
  const [text, setText] = useState(() => SCAFFOLD(grantName, profile.role, profile.program, profile.year));

  // Replace scaffold with AI proposal when it arrives
  useEffect(() => {
    if (aiProposal && aiProposal.trim().length > 100) {
      setText(aiProposal);
    }
  }, [aiProposal]);

  const wordCount = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);

  // Parse target word count from proposal if AI specified it
  const targetWords = useMemo(() => {
    const match = text.match(/target.*?(\d{3,4})\s*words/i) || text.match(/(\d{3,4})\s*words.*required/i);
    return match ? parseInt(match[1]) : 1500;
  }, [text]);

  const progress = Math.min(Math.round((wordCount / targetWords) * 100), 100);

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
    a.download = `FundingForge_${grantName.replace(/\s+/g, "_")}_proposal.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: "Proposal saved as .txt file." });
  };

  const isGenerating = !done && !aiProposal;

  return (
    <Card className="ff-grain rounded-2xl border border-border/60 bg-card/35 p-5 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <Loader2 className="h-4 w-4 text-accent animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-accent" />
            )}
            <div className="text-sm font-semibold">
              {isGenerating ? "AI Drafting Proposal…" : "Proposal Draft"}
            </div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isGenerating
              ? "Tailoring proposal to grant requirements, compliance data, and your profile."
              : "AI-generated draft tailored to this grant. Edit freely before submitting."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className={done && aiProposal
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border border-border/60"
            }
          >
            {done && aiProposal ? "✓ AI Generated" : isGenerating ? "Generating…" : "Ready"}
          </Badge>

          <div className="flex flex-col items-end gap-1">
            <div className="text-[10px] font-medium text-muted-foreground">
              {wordCount} / {targetWords} words
            </div>
            <div className="h-1.5 w-28 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ${
                  progress >= 80 ? "bg-emerald-500" : progress >= 50 ? "bg-accent" : "bg-amber-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <Button variant="secondary" className="border border-border/60" onClick={copyToClipboard} disabled={isGenerating}>
            <Copy className="mr-2 h-4 w-4" />Copy
          </Button>
          <Button onClick={downloadTxt} className="bg-accent text-accent-foreground border border-accent/30" disabled={isGenerating}>
            <Download className="mr-2 h-4 w-4" />Export
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={`min-h-[400px] bg-background/30 font-mono text-sm leading-relaxed ${
            isGenerating ? "opacity-60 cursor-not-allowed" : ""
          }`}
          placeholder="AI-generated proposal will appear here…"
          disabled={isGenerating}
        />
      </div>

      {done && aiProposal && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2">
          <Sparkles className="h-3.5 w-3.5 text-accent flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            This proposal was drafted by Claude AI based on the grant requirements, FSU policy data, and your profile.
            Review all sections carefully and edit to reflect your specific research plans before submission.
          </p>
        </div>
      )}
    </Card>
  );
}
