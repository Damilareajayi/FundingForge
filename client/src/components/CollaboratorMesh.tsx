import { Faculty } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Users } from "lucide-react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function CollaboratorMesh({
  faculty,
  onPing,
}: {
  faculty: Faculty[];
  onPing: (person: Faculty) => void;
}) {
  return (
    <Card className="ff-grain rounded-2xl border border-border/60 bg-card/35 p-5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <div className="text-sm font-semibold">Collaborator Mesh</div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Suggested collaborators aligned to match criteria (seeded list).
          </p>
        </div>
        <Badge variant="secondary" className="border border-border/60">
          {faculty.length} profiles
        </Badge>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {faculty.slice(0, 3).map((f) => (
          <div
            key={f.id}
            className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/20 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={f.imageUrl} alt={f.name} />
                <AvatarFallback>{initials(f.name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-semibold">{f.name}</div>
                <div className="text-xs text-muted-foreground">
                  {f.department} · {f.expertise}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="border border-border/60"
                onClick={() => onPing(f)}
              >
                <Mail className="mr-2 h-4 w-4" />
                Ping
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
