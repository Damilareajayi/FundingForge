import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, ChevronRight, GraduationCap, School, UserCog,
  Upload, FileText, CheckCircle2, BookOpen, Target, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

export type IntakeProfile = {
  role: "Faculty" | "Grad Student" | "Undergrad";
  year: string;
  program: string;
  researchInterests?: string;
  cv?: File;
  cvText?: string;
};

const roleCards = [
  {
    role: "Faculty" as const,
    title: "Faculty",
    icon: UserCog,
    blurb: "Pre-award routing, collaborator mesh, and compliance-aware packet generation.",
    color: "from-amber-500/20 to-orange-500/10",
    accent: "text-amber-400",
    border: "border-amber-500/30",
  },
  {
    role: "Grad Student" as const,
    title: "Grad Student",
    icon: GraduationCap,
    blurb: "Fellowship targeting, narrative scaffolding, and mentorship alignment for PhD & MSc.",
    color: "from-blue-500/20 to-cyan-500/10",
    accent: "text-blue-400",
    border: "border-blue-500/30",
  },
  {
    role: "Undergrad" as const,
    title: "Undergraduate",
    icon: School,
    blurb: "Fast discovery, simplified compliance guidance, and mentorship connection.",
    color: "from-emerald-500/20 to-teal-500/10",
    accent: "text-emerald-400",
    border: "border-emerald-500/30",
  },
];

const features = [
  { icon: Target, label: "Grant Matching", desc: "AI matches grants to your profile from our curated database" },
  { icon: Shield, label: "Compliance Check", desc: "Policy & RAMP checklist verified against FSU requirements" },
  { icon: BookOpen, label: "Proposal Draft", desc: "Full tailored proposal scaffold ready for your edits" },
];

export function SelectionPortal({
  initial,
  onForge,
}: {
  initial?: IntakeProfile;
  onForge: (profile: IntakeProfile) => void;
}) {
  const [role, setRole] = useState<IntakeProfile["role"]>(initial?.role ?? "Faculty");
  const [year, setYear] = useState(initial?.year ?? "");
  const [program, setProgram] = useState(initial?.program ?? "");
  const [researchInterests, setResearchInterests] = useState(initial?.researchInterests ?? "");
  const [cv, setCv] = useState<File | null>(null);
  const [cvText, setCvText] = useState("");
  const [cvLoading, setCvLoading] = useState(false);

  const years = useMemo(() => {
    if (role === "Undergrad") return ["Freshman", "Sophomore", "Junior", "Senior"];
    if (role === "Grad Student") return ["MSc Year 1", "MSc Year 2", "PhD Year 1", "PhD Year 2", "PhD Year 3", "PhD Year 4+", "ABD"];
    return ["Pre-tenure", "Tenure-track", "Tenured", "Research Faculty"];
  }, [role]);

  const programs = [
    "Computer Science", "Engineering", "Psychology", "Biology",
    "Economics", "Information Science", "Education", "Chemistry",
    "Physics", "Mathematics", "Neuroscience", "Interdisciplinary Studies",
  ];

  const handleCvUpload = async (file: File) => {
    setCv(file);
    setCvLoading(true);
    try {
      const formData = new FormData();
      formData.append("cv", file);
      const res = await fetch("/api/upload-cv", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) setCvText(data.preview ?? "");
    } catch {
      // CV text extraction failed, continue without it
    } finally {
      setCvLoading(false);
    }
  };

  const canForge = Boolean(role && year && program);
  const activeCard = roleCards.find((c) => c.role === role)!;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.2, 0.9, 0.2, 1] }}
      >
        <div className="pt-10 md:pt-16">
          {/* Hero */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur mb-6"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              AI-Powered Grant Intelligence · FSU Research Office
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4"
            >
              Turn your research into
              <br />
              <span className="text-accent">funded reality.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              FundingForge matches your profile to the right grants, checks compliance,
              finds collaborators, and drafts your proposal — powered by AI agents.
            </motion.p>
          </div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 mb-12"
          >
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/30 px-4 py-3 backdrop-blur max-w-xs"
              >
                <div className="rounded-xl bg-accent/15 p-2">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Main form grid */}
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">

            {/* Role selection */}
            <div className="space-y-4">
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Select your role
              </div>
              {roleCards.map((c) => {
                const Icon = c.icon;
                const active = role === c.role;
                return (
                  <motion.button
                    key={c.role}
                    onClick={() => { setRole(c.role); setYear(""); }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      "w-full rounded-2xl border bg-card/35 p-4 text-left backdrop-blur transition-all duration-200",
                      active
                        ? `border-accent/50 bg-gradient-to-br ${c.color} shadow-lg shadow-accent/5`
                        : "border-border/60 hover:border-border",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "rounded-xl p-2.5 ring-1",
                          active ? `bg-accent/15 ring-accent/30` : "bg-muted/40 ring-border/50"
                        )}>
                          <Icon className={cn("h-5 w-5", active ? "text-accent" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <div className="font-semibold">{c.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{c.blurb}</div>
                        </div>
                      </div>
                      <div className={cn(
                        "h-3 w-3 rounded-full border-2 transition-all",
                        active ? "bg-accent border-accent" : "border-border"
                      )} />
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Intake form */}
            <Card className="border border-border/60 bg-card/40 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Build Your Profile</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your answers unlock tailored grant discovery and a compliance-aware proposal.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Year / Level</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="bg-background/40">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Program / Department</Label>
                    <Select value={program} onValueChange={setProgram}>
                      <SelectTrigger className="bg-background/40">
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Research Interests <span className="text-muted-foreground">(optional but recommended)</span></Label>
                  <Textarea
                    value={researchInterests}
                    onChange={(e) => setResearchInterests(e.target.value)}
                    placeholder="e.g. machine learning for healthcare, natural language processing, climate modeling..."
                    className="bg-background/40 min-h-[80px] resize-none text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Upload className="h-3.5 w-3.5" />
                    Upload CV / Resume
                    <span className="text-xs text-muted-foreground font-normal">(optional — improves proposal quality)</span>
                  </Label>

                  <div
                    className={cn(
                      "relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all",
                      cv ? "border-accent/50 bg-accent/5" : "border-border/60 hover:border-border bg-background/20"
                    )}
                    onClick={() => document.getElementById("cv-upload-input")?.click()}
                  >
                    <input
                      id="cv-upload-input"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCvUpload(file);
                      }}
                    />
                    {cv ? (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        {cvLoading ? (
                          <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-accent" />
                        )}
                        <span className="font-medium text-accent">{cv.name}</span>
                        <span className="text-muted-foreground">({(cv.size / 1024).toFixed(0)}KB)</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <FileText className="h-6 w-6 text-muted-foreground mx-auto" />
                        <div className="text-sm text-muted-foreground">
                          Drop your CV here or <span className="text-accent underline">browse</span>
                        </div>
                        <div className="text-xs text-muted-foreground">PDF, DOC, DOCX, TXT up to 10MB</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-1">
                  <Button
                    onClick={() => onForge({ role, year, program, researchInterests, cv: cv || undefined, cvText })}
                    disabled={!canForge}
                    className={cn(
                      "w-full border border-accent/30 bg-accent text-accent-foreground",
                      "shadow-lg shadow-accent/20 h-12 text-base font-semibold",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                    )}
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Forge My Grant Profile
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>

                  {!canForge && (
                    <p className="mt-2 text-xs text-center text-muted-foreground">
                      Select your level and program to continue
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="pb-10 md:pb-16" />
        </div>
      </motion.div>
    </div>
  );
}
