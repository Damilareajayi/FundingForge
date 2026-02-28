import { Grant } from "@shared/schema";
import { useForgeStream } from "@/hooks/use-forge-stream";
import { ProposalDraft } from "@/components/ProposalDraft";
import { CollaboratorMesh } from "@/components/CollaboratorMesh";
import { RampChecklist } from "@/components/RampChecklist";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Flame, RefreshCw, Zap, CheckCircle2,
  Loader2, AlertTriangle, Search, Shield, Users, FileText
} from "lucide-react";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { IntakeProfile } from "@/components/SelectionPortal";

const PIPELINE_STEPS = [
  { key: "grant_match", icon: Search, label: "Grant Matching", desc: "Searching grant database for best matches" },
  { key: "compliance", icon: Shield, label: "Compliance Check", desc: "Verifying policy & RAMP requirements" },
  { key: "collaborators", icon: Users, label: "Collaborator Suggestions", desc: "Finding best-fit faculty collaborators" },
  { key: "proposal", icon: FileText, label: "Proposal Draft", desc: "Drafting tailored grant proposal" },
];

export function FinalPacket({
  grant,
  profile,
  onBack,
  onReset,
}: {
  grant: Grant;
  profile: IntakeProfile;
  onBack: () => void;
  onReset: () => void;
}) {
  const { toast } = useToast();
  const [streamEnabled, setStreamEnabled] = useState(true);

  const { events, connected, done, error, cancel } = useForgeStream(
    grant.id,
    streamEnabled,
    {
      role: profile.role,
      year: profile.year,
      program: profile.program,
      cvText: profile.cvText,
    }
  );

  // Extract results from events
  const stepResults = useMemo(() => {
    const results: Record<string, any> = {};
    for (const e of events) {
      if (e.result !== undefined) results[e.step] = e.result;
    }
    return results;
  }, [events]);

  const completedSteps = useMemo(() => {
    const completed = new Set<string>();
    for (const e of events) {
      if (e.step !== "error" && e.result) completed.add(e.step);
    }
    return completed;
  }, [events]);

  const activeStep = useMemo(() => {
    if (done) return "complete";
    for (const step of PIPELINE_STEPS) {
      if (!completedSteps.has(step.key)) return step.key;
    }
    return "complete";
  }, [completedSteps, done]);

  // Parse collaborators and proposal from final complete event
  const finalResult = useMemo(() => {
    const completeEvent = events.find((e) => e.step === "complete");
    return completeEvent?.result ?? null;
  }, [events]);

  const proposalText = useMemo(() => {
    return finalResult?.proposal || stepResults["proposal"] || "";
  }, [finalResult, stepResults]);

  const collaboratorsText = useMemo(() => {
    return finalResult?.collaborators || stepResults["collaborators"]?.collaborators || "";
  }, [finalResult, stepResults]);

  const complianceScore = useMemo(() => {
    return finalResult?.complianceScore || stepResults["compliance"]?.score || null;
  }, [finalResult, stepResults]);

  const complianceDetails = useMemo(() => {
    return finalResult?.complianceDetails || stepResults["compliance"]?.details || "";
  }, [finalResult, stepResults]);

  const restartForge = () => {
    cancel();
    setStreamEnabled(false);
    setTimeout(() => setStreamEnabled(true), 100);
  };

  const ping = (person: any) => {
    toast({
      title: "Ping queued",
      description: `Collaborator outreach prepared for ${person.name}.`,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.55, ease: [0.2, 0.9, 0.2, 1] }}
        className="pt-8 md:pt-10"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground border border-primary/30">Final Packet</Badge>
              <Badge variant="secondary" className="border border-border/60">{grant.name}</Badge>
              <Badge variant="secondary" className="border border-border/60">
                {profile.role} · {profile.year} · {profile.program}
              </Badge>
              {complianceScore && (
                <Badge
                  className={cn(
                    "border",
                    complianceScore >= 80 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                    complianceScore >= 65 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                    "bg-red-500/20 text-red-400 border-red-500/30"
                  )}
                >
                  {complianceScore}% Compliance Match
                </Badge>
              )}
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl">Forging your packet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              AI agents are working through each step — results unlock as they complete.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" className="border border-border/60" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />Back
            </Button>
            <Button variant="secondary" className="border border-border/60" onClick={() => {
              restartForge();
              toast({ title: "Re-forging", description: "Restarted the pipeline for this grant." });
            }}>
              <Flame className="mr-2 h-4 w-4" />Re-forge
            </Button>
            <Button onClick={onReset} className="bg-accent text-accent-foreground border border-accent/30">
              <Zap className="mr-2 h-4 w-4" />New Profile
            </Button>
          </div>
        </div>

        {/* Pipeline Status */}
        <Card className="ff-grain rounded-2xl border border-border/60 bg-card/35 p-5 backdrop-blur mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Pipeline Status</div>
            <Badge variant="secondary" className="border border-border/60">
              {error ? "error" : done ? "complete" : connected ? "live" : "initializing"}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE_STEPS.map((step) => {
              const Icon = step.icon;
              const isCompleted = completedSteps.has(step.key);
              const isActive = activeStep === step.key && !done && !error;
              return (
                <div
                  key={step.key}
                  className={cn(
                    "rounded-xl border p-3 transition-all",
                    isCompleted ? "border-accent/40 bg-accent/5" :
                    isActive ? "border-blue-500/40 bg-blue-500/5" :
                    "border-border/60 bg-background/20 opacity-50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 text-blue-400 animate-spin flex-shrink-0" />
                    ) : (
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-xs font-semibold">{step.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-red-400">Pipeline error</div>
                <div className="text-xs text-muted-foreground">{error}</div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="ml-auto border border-border/60"
                onClick={restartForge}
              >
                <RefreshCw className="mr-1 h-3 w-3" />Retry
              </Button>
            </div>
          )}
        </Card>

        {/* Results sections — unlock as steps complete */}
        <div className="space-y-6">
          <AnimatePresence>
            {/* Collaborators */}
            {(completedSteps.has("collaborators") || done) && (
              <motion.div
                key="collaborators"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <CollaboratorMesh
                  collaboratorsText={collaboratorsText}
                  onPing={ping}
                />
              </motion.div>
            )}

            {/* RAMP Checklist */}
            {(completedSteps.has("compliance") || done) && (
              <motion.div
                key="ramp"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <RampChecklist
                  complianceScore={complianceScore}
                  complianceDetails={complianceDetails}
                />
              </motion.div>
            )}

            {/* Proposal Draft */}
            {(completedSteps.has("proposal") || done) && (
              <motion.div
                key="proposal"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <ProposalDraft
                  grantName={grant.name}
                  profile={profile}
                  done={done}
                  aiProposal={proposalText}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Waiting state */}
          {!done && !error && events.length === 0 && (
            <Card className="rounded-2xl border border-border/60 bg-card/35 p-8 backdrop-blur text-center">
              <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto mb-3" />
              <div className="text-sm font-semibold">Initializing AI pipeline…</div>
              <p className="text-xs text-muted-foreground mt-1">Connecting to Bedrock agents and knowledge bases</p>
            </Card>
          )}
        </div>

        <div className="pb-10 md:pb-14" />
      </motion.div>
    </div>
  );
}
