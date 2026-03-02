import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, GraduationCap, School, UserCog, Upload, CircleDot, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type IntakeProfile = {
  role: "Faculty" | "Grad Student" | "Undergrad";
  year: string;
  program: string;
  interests?: string;
  cv?: File;
};

const roleCards = [
  {
    role: "Faculty" as const,
    title: "Faculty",
    icon: UserCog,
    blurb: "Pre-award routing, collaborator mesh, and compliance-aware packet generation.",
  },
  {
    role: "Grad Student" as const,
    title: "Grad Student",
    icon: GraduationCap,
    blurb: "Fellowship targeting, narrative scaffolding, and mentorship alignment for PhD & MSc.",
  },
  {
    role: "Undergrad" as const,
    title: "Undergraduate",
    icon: School,
    blurb: "Fast discovery, simplified compliance guidance, and mentorship connection.",
  },
];

const featureCards = [
  {
    icon: "◎",
    title: "Grant Matching",
    description: "AI matches grants to your profile from our curated database",
  },
  {
    icon: "⬡",
    title: "Compliance Check",
    description: "Policy & RAMP checklist verified against FSU requirements",
  },
  {
    icon: "☰",
    title: "Proposal Draft",
    description: "Full tailored proposal scaffold ready for your edits",
  },
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
  const [interests, setInterests] = useState(initial?.interests ?? "");
  const [cv, setCv] = useState<File | null>(null);

  const years = useMemo(() => {
    if (role === "Undergrad") return ["Freshman", "Sophomore", "Junior", "Senior"];
    if (role === "Grad Student") return ["MSc Year 1", "MSc Year 2", "PhD Year 1", "PhD Year 2", "PhD Year 3", "PhD Year 4+", "ABD"];
    return ["Pre-tenure", "Tenure-track", "Tenured", "Research faculty"];
  }, [role]);

  const programs = useMemo(
    () => [
      "Computer Science",
      "Engineering",
      "Psychology",
      "Biology",
      "Economics",
      "Information",
      "Education",
      "Interdisciplinary Studies",
    ],
    [],
  );

  const canForge = Boolean(role && year && program);

  return (
    <div className="ff-light-gradient min-h-[calc(100vh-88px)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.55, ease: [0.2, 0.9, 0.2, 1] }}
        >
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur mb-4">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              AI-Powered Grant Intelligence · FSU Research Office
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
              Turn your research into
              <br />
              <span className="text-amber-600" style={{ fontFamily: "var(--font-serif)" }}>
                funded reality.
              </span>
            </h1>

            <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              FundingForge matches your profile to the right grants, checks compliance, finds
              collaborators, and drafts your proposal — powered by AI agents.
            </p>

            {/* Feature Cards Row */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {featureCards.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-border/60 bg-white/80 p-4 text-left shadow-sm backdrop-blur"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-lg">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{feature.title}</div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Two-Column Main Section */}
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            {/* Left Column: Role Selector */}
            <div>
              <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                SELECT YOUR ROLE
              </div>

              <div className="space-y-3">
                {roleCards.map((c) => {
                  const Icon = c.icon;
                  const active = role === c.role;
                  return (
                    <button
                      key={c.role}
                      onClick={() => setRole(c.role)}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
                        active
                          ? "bg-amber-50 border-amber-400 shadow-sm"
                          : "bg-white border-border/60 hover:border-border",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "rounded-lg p-2",
                              active ? "bg-amber-100" : "bg-muted/40",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-5 w-5",
                                active ? "text-amber-600" : "text-muted-foreground",
                              )}
                            />
                          </div>
                          <div className="font-semibold">{c.title}</div>
                        </div>
                        {active ? (
                          <CircleDot className="h-4 w-4 text-amber-500 mt-0.5" />
                        ) : (
                          <Circle className="h-4 w-4 text-border mt-0.5" />
                        )}
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                        {c.blurb}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Profile Builder */}
            <Card className="border border-border/60 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Build Your Profile</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your answers unlock tailored grant discovery and a compliance-aware proposal.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Year / Level and Program / Department Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Year / Level</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger className="bg-muted/30">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Program / Department</Label>
                    <Select value={program} onValueChange={setProgram}>
                      <SelectTrigger className="bg-muted/30">
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Research Interests */}
                <div className="space-y-2">
                  <Label>
                    Research Interests{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      (optional but recommended)
                    </span>
                  </Label>
                  <Textarea
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder="e.g. machine learning for healthcare, natural language processing, climate modeling..."
                    className="min-h-[100px] bg-muted/30 resize-none"
                  />
                </div>

                {/* Upload CV / Resume */}
                <div className="space-y-2">
                  <button
                    onClick={() => document.getElementById("cv-upload")?.click()}
                    className="flex items-center gap-2 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload CV / Resume</span>
                    <span className="text-xs text-muted-foreground">
                      (optional — improves proposal quality)
                    </span>
                  </button>
                  <input
                    id="cv-upload"
                    type="file"
                    className="hidden"
                    onChange={(e) => setCv(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx"
                  />
                  {cv && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {cv.name}
                    </p>
                  )}
                </div>

                {/* Forge Button */}
                <div className="pt-2">
                  <Button
                    onClick={() => onForge({ role, year, program, interests, cv: cv || undefined })}
                    disabled={!canForge}
                    className="w-full bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                    size="lg"
                  >
                    Forge My Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
