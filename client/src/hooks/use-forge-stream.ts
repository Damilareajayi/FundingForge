import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

export const ForgeChunkSchema = z.object({
  step: z.string(),
  done: z.boolean(),
  result: z.any().optional(),
});

export type ForgeEvent = z.infer<typeof ForgeChunkSchema>;

export type ForgeProfile = {
  role: string;
  year: string;
  program: string;
  cvText?: string;
};

function parseSseLine(rawLine: string): unknown | null {
  const line = rawLine.trim();
  if (!line.startsWith("data:")) return null;
  const payload = line.slice(5).trim();
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch (e) {
    console.error("[SSE] Failed JSON.parse:", payload, e);
    return null;
  }
}

export function useForgeStream(
  grantId: number | null,
  enabled: boolean,
  profile?: ForgeProfile
) {
  const [events, setEvents] = useState<ForgeEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const url = useMemo(() => {
    if (!grantId) return null;
    const params = new URLSearchParams();
    if (profile?.role) params.set("role", profile.role);
    if (profile?.year) params.set("year", profile.year);
    if (profile?.program) params.set("program", profile.program);
    if (profile?.cvText) params.set("cvText", profile.cvText.slice(0, 2000));
    return `/api/forge/${grantId}?${params.toString()}`;
  }, [grantId, profile?.role, profile?.year, profile?.program, profile?.cvText]);

  useEffect(() => {
    if (!enabled || !url) return;

    setEvents([]);
    setConnected(false);
    setDone(false);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
          headers: { Accept: "text/event-stream" },
        });

        if (!res.ok || !res.body) {
          throw new Error(`Stream failed: ${res.status}`);
        }

        setConnected(true);
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
          const { value, done: readerDone } = await reader.read();
          if (readerDone) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            for (const line of part.split("\n")) {
              const raw = parseSseLine(line);
              if (!raw) continue;
              const parsed = ForgeChunkSchema.safeParse(raw);
              if (!parsed.success) continue;
              if (cancelled) return;
              setEvents((prev) => [...prev, parsed.data]);
              if (parsed.data.done) setDone(true);
            }
          }
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error("[SSE] Stream error:", e);
        setError(e?.message || "Stream error");
      } finally {
        setConnected(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, url]);

  const cancel = () => abortRef.current?.abort();
  return { events, connected, done, error, cancel };
}
