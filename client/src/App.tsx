import React from "react";
import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { GlassTopNav } from "@/components/GlassTopNav";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const resetToIntake = () => {
    window.location.href = window.location.pathname;
  };

  React.useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground">
          {/* Use hash-based routing to avoid SageMaker proxy path conflicts */}
          <Router hook={useHashLocation}>
            <GlassTopNav stageLabel="FundingForge Flow" onReset={resetToIntake} />
            <main className="min-h-[calc(100vh-88px)]">
              <AppRouter />
            </main>
          </Router>
          <Toaster />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
