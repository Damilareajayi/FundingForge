import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SelectionPortal, type IntakeProfile } from "@/components/SelectionPortal";
import { DiscoveryDashboard } from "@/components/DiscoveryDashboard";
import { FinalPacket } from "@/components/FinalPacket";
import { Grant } from "@shared/schema";
import { StagePill } from "@/components/StagePill";

type Stage = "intake" | "discovery" | "packet";

export default function Home() {
  const [stage, setStage] = useState<Stage>("intake");
  const [profile, setProfile] = useState<IntakeProfile | null>(null);
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);

  const stageLabel = useMemo(() => {
    if (stage === "intake") return "Intake";
    if (stage === "discovery") return "Discovery";
    return "Final Packet";
  }, [stage]);

  const resetAll = () => {
    setStage("intake");
    setProfile(null);
    setSelectedGrant(null);
  };

  return (
    <div className="min-h-[calc(100vh-88px)]">
      {/* Stage Progress Bar */}
      <div className="border-b border-border/40 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <div className={stage === "intake" ? "rounded-full bg-blue-600 text-white px-3 py-1 text-sm font-semibold" : "text-sm text-muted-foreground"}>
                {stage === "intake" ? "1 Intake" : "1 Intake"}
              </div>
              <span className="text-muted-foreground">·</span>
              <div className={stage === "discovery" ? "rounded-full bg-blue-600 text-white px-3 py-1 text-sm font-semibold" : "text-sm text-muted-foreground"}>
                2 Discovery
              </div>
              <span className="text-muted-foreground">·</span>
              <div className={stage === "packet" ? "rounded-full bg-blue-600 text-white px-3 py-1 text-sm font-semibold" : "text-sm text-muted-foreground"}>
                3 Packet
              </div>
            </div>
            <div className="hidden md:block text-sm text-muted-foreground">
              Current stage: <span className="font-semibold">{stageLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {stage === "intake" && (
          <motion.div
            key="intake"
            initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(8px)" }}
            transition={{ duration: 0.45, ease: [0.2, 0.9, 0.2, 1] }}
          >
            <SelectionPortal
              initial={profile ?? undefined}
              onForge={(p) => {
                setProfile(p);
                setStage("discovery");
              }}
            />
          </motion.div>
        )}

        {stage === "discovery" && profile && (
          <motion.div
            key="discovery"
            initial={{ opacity: 0, y: 12, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
            transition={{ duration: 0.45, ease: [0.2, 0.9, 0.2, 1] }}
            className="ff-mesh ff-grain"
          >
            <DiscoveryDashboard
              profileSummary={profile}
              selectedGrantId={selectedGrant?.id ?? null}
              onPickGrant={(g) => {
                setSelectedGrant(g);
                setStage("packet");
              }}
            />
          </motion.div>
        )}

        {stage === "packet" && profile && selectedGrant && (
          <motion.div
            key="packet"
            initial={{ opacity: 0, y: 12, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
            transition={{ duration: 0.45, ease: [0.2, 0.9, 0.2, 1] }}
            className="ff-mesh ff-grain"
          >
            <FinalPacket
              grant={selectedGrant}
              profile={profile}
              onBack={() => setStage("discovery")}
              onReset={resetAll}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safety: if state is inconsistent, reset */}
      {stage !== "intake" && !profile && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <button
            onClick={resetAll}
            className="rounded-xl border border-border/60 bg-card/35 px-4 py-3 text-sm backdrop-blur hover:brightness-[1.03] transition"
          >
            State mismatch — return to intake
          </button>
        </div>
      )}
    </div>
  );
}
