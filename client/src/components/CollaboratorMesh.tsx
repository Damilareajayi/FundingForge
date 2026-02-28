import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Users, Loader2, ExternalLink } from "lucide-react";
import { useMemo } from "react";

function parseCollaborators(text: string) {
  if (!text) return [];

  // Try to parse structured collaborator data from AI response
  const collaborators: Array<{
    name: string;
    email: string;
    department: string;
    researchInterests: string;
    currentWork: string;
  }> = [];

  // Split by numbered list items or by name patterns
  const blocks = text.split(/\n(?=\d+\.|#{1,3}\s|\*\*[A-Z])/g).filter(Boolean);

  for (const block of blocks.slice(0, 5)) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (lines.length < 2) continue;

    const name = lines[0]
      .replace(/^[\d\.\*#\s]+/, "")
      .replace(/\*\*/g, "")
      .trim();

    if (name.length < 3 || name.length > 60) continue;

    const emailMatch = block.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
    const deptMatch = block.match(/(?:department|dept|program|division)[:\s]+([^\n,]+)/i);
    const interestMatch = block.match(/(?:research interest[s]?|expertise|specializ)[:\s]+([^\n]+)/i);
    const workMatch = block.match(/(?:current(?:ly)?|working on|project)[:\s]+([^\n]+)/i);

    collaborators.push({
      name,
      email: emailMatch?.[0] ?? "",
      department: deptMatch?.[1]?.trim() ?? "Faculty",
      researchInterests: interestMatch?.[1]?.trim() ?? lines[1]?.trim() ?? "",
      currentWork: workMatch?.[1]?.trim() ?? "",
    });
  }

  // Fallback: if parsing failed, show raw text as a single entry
  if (collaborators.length === 0 && text.length > 50) {
    return [{ name: "AI Suggestions", email: "", department: "", researchInterests: text.slice(0, 300), currentWork: "" }];
  }

  return collaborators;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

const COLORS = [
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-red-500",
];

export function CollaboratorMesh({
  collaboratorsText,
  onPing,
}: {
  collaboratorsText: string;
  onPing: (person: any) => void;
}) {
  const collaborators = useMemo(() => parseCollaborators(collaboratorsText), [collaboratorsText]);
  const isLoading = !collaboratorsText;

  return (
    <Card className="ff-grain rounded-2xl border border-border/60 bg-card/35 p-5 backdrop-blur">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <div className="text-sm font-semibold">Collaborator Mesh</div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            AI-suggested collaborators from FSU faculty directory, matched to this grant.
          </p>
        </div>
        <Badge variant="secondary" className="border border-border/60">
          {isLoading ? "Searching…" : `${collaborators.length} suggested`}
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/20 p-4">
          <Loader2 className="h-5 w-5 text-accent animate-spin" />
          <div className="text-sm text-muted-foreground">Searching faculty directory knowledge base…</div>
        </div>
      ) : collaborators.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-background/20 p-4 text-center">
          <p className="text-sm text-muted-foreground">No collaborators found in faculty directory for this grant profile.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {collaborators.map((f, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/20 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex items-start gap-3">
                {/* Avatar with gradient */}
                <div className={`flex-shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br ${COLORS[i % COLORS.length]} flex items-center justify-center text-white text-sm font-bold`}>
                  {initials(f.name)}
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold">{f.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {[f.department, f.email].filter(Boolean).join(" · ")}
                  </div>
                  {f.researchInterests && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      <span className="font-medium text-foreground/70">Interests: </span>
                      {f.researchInterests}
                    </p>
                  )}
                  {f.currentWork && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      <span className="font-medium text-foreground/70">Working on: </span>
                      {f.currentWork}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {f.email && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="border border-border/60 h-8 text-xs"
                    onClick={() => onPing(f)}
                  >
                    <Mail className="mr-1.5 h-3 w-3" />
                    Ping
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && collaboratorsText && collaborators.length > 0 && (
        <div className="mt-3 rounded-xl border border-border/50 bg-background/15 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{collaboratorsText.slice(0, 400)}
            {collaboratorsText.length > 400 && "…"}
          </p>
        </div>
      )}
    </Card>
  );
}
