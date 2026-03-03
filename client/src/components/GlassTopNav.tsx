import { useLocation } from "wouter";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function getIsDark() {
  return typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false;
}

export function GlassTopNav({
  stageLabel,
  onReset,
}: {
  stageLabel: string;
  onReset: () => void;
}) {
  const [, setLocation] = useLocation();
  const [isDark, setIsDark] = useState(getIsDark());

  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.toggle("dark");
    setIsDark(root.classList.contains("dark"));
  };

  return (
    <header className="sticky top-0 z-[999] border-b border-border/40 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Left: Logo */}
          <button
            onClick={() => setLocation("/")}
            className="rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2"
            aria-label="Go to home"
          >
            <BrandMark />
          </button>

          {/* Center: Tab Pills */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>RAMP-aware</span>
            </div>
            <span className="text-muted-foreground">·</span>
            <div className="text-sm text-muted-foreground">
              FundingForge Flow
            </div>
            <Badge className="bg-amber-500 text-white border-amber-600/30 hover:bg-amber-600">
              {stageLabel}
            </Badge>
          </div>

          {/* Right: Reset + Theme Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
            <Button size="icon" variant="ghost" onClick={toggleTheme} aria-label="Toggle theme">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
