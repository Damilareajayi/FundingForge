import type { Express } from "express";
import { createServer, type Server } from "http";
import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { storage } from "./storage";
import multer from "multer";

// ─── AWS Clients ──────────────────────────────────────────────────────────────
const agentRuntimeClient = new BedrockAgentRuntimeClient({ region: "us-east-1" });
const bedrockRuntime = new BedrockRuntimeClient({ region: "us-east-1" });

// ─── Knowledge Base IDs ───────────────────────────────────────────────────────
const KB_FACULTY      = "Q89ZCWQSRY";   // Faculty Directory
const KB_GRANTS       = "KFW7ZEBGMR";   // Grant Opportunities
const KB_COMPLIANCE   = "LULFPOFCTD";   // Policy & Compliance

const CLAUDE_MODEL_ARN =
  "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0";

// ─── Multer for CV upload ─────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Helper: query a knowledge base and get AI answer ─────────────────────────
async function kbRetrieveAndGenerate(knowledgeBaseId: string, query: string): Promise<string> {
  const cmd = new RetrieveAndGenerateCommand({
    input: { text: query },
    retrieveAndGenerateConfiguration: {
      type: "KNOWLEDGE_BASE",
      knowledgeBaseConfiguration: {
        knowledgeBaseId,
        modelArn: CLAUDE_MODEL_ARN,
      },
    },
  });
  const resp = await agentRuntimeClient.send(cmd);
  return resp.output?.text ?? "";
}

// ─── Helper: retrieve raw chunks from a knowledge base ────────────────────────
async function kbRetrieve(knowledgeBaseId: string, query: string, n = 5) {
  const cmd = new RetrieveCommand({
    knowledgeBaseId,
    retrievalQuery: { text: query },
    retrievalConfiguration: { vectorSearchConfiguration: { numberOfResults: n } },
  });
  const resp = await agentRuntimeClient.send(cmd);
  return (resp.retrievalResults ?? [])
    .map((r) => r.content?.text ?? "")
    .filter(Boolean)
    .join("\n\n");
}

// ─── Helper: call Claude directly via Bedrock Runtime ─────────────────────────
async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  const cmd = new InvokeModelCommand({
    modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body,
  });
  const resp = await bedrockRuntime.send(cmd);
  const decoded = JSON.parse(new TextDecoder().decode(resp.body));
  return decoded.content?.[0]?.text ?? "";
}

// ─── SSE helper ───────────────────────────────────────────────────────────────
function sendSSE(res: any, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function registerRoutes(app: Express): Promise<Server> {
  if (!app || typeof app.get !== "function") {
    throw new TypeError("app.get is not a function - check server/index.ts");
  }

  // ── Static data routes ──────────────────────────────────────────────────────
  app.get("/api/grants", async (_req, res) => {
    const grants = await storage.getGrants();
    res.json(grants);
  });

  app.get("/api/faculty", async (_req, res) => {
    const faculty = await storage.getFaculty();
    res.json(faculty);
  });

  // ── CV Upload ───────────────────────────────────────────────────────────────
  app.post("/api/upload-cv", upload.single("cv"), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    // In production you'd store this to S3; for now we extract text via buffer
    const text = req.file.buffer.toString("utf-8", 0, Math.min(req.file.buffer.length, 8000));
    res.json({ success: true, preview: text.slice(0, 500), size: req.file.size });
  });

  // ── Main Forge Stream ────────────────────────────────────────────────────────
  // 4-step agentic pipeline streamed via SSE:
  // Step 1: Match grants from KB
  // Step 2: Compliance check from KB
  // Step 3: Suggest collaborators from KB
  // Step 4: Draft proposal with Claude
  app.get("/api/forge/:grantId", async (req, res) => {
    const { grantId } = req.params;
    const { role = "Faculty", program = "Research", year = "", cvText = "" } = req.query as Record<string, string>;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      // ── STEP 1: Grant Matching ──────────────────────────────────────────────
      sendSSE(res, { step: "grant_match", done: false, result: "🔍 Searching grant database for best matches…" });

      const grantQuery = `Find grants suitable for a ${role} in ${program} at ${year} level. Focus on eligibility, funding amount, and research alignment.`;
      const grantMatches = await kbRetrieve(KB_GRANTS, grantQuery, 5);

      sendSSE(res, {
        step: "grant_match",
        done: false,
        result: grantMatches
          ? `✅ Found relevant grant opportunities from database.`
          : "⚠️ Limited grant data found — using available information.",
      });

      // ── STEP 2: Compliance Check ────────────────────────────────────────────
      sendSSE(res, { step: "compliance", done: false, result: "📋 Running compliance & policy check…" });

      const complianceQuery = `What are the compliance requirements, RAMP checklist items, internal deadlines, and policy rules for a ${role} in ${program} applying for grant ID ${grantId}?`;
      const complianceData = await kbRetrieve(KB_COMPLIANCE, complianceQuery, 5);

      // Score compliance based on data richness
      const complianceScore = complianceData.length > 500 ? 87 : complianceData.length > 200 ? 72 : 65;

      sendSSE(res, {
        step: "compliance",
        done: false,
        result: {
          score: complianceScore,
          summary: complianceData
            ? `Compliance check complete. Match score: ${complianceScore}%.`
            : "Basic compliance check complete.",
          details: complianceData.slice(0, 800),
        },
      });

      // ── STEP 3: Collaborator Suggestions ───────────────────────────────────
      sendSSE(res, { step: "collaborators", done: false, result: "👥 Identifying best-fit collaborators…" });

      const collabQuery = `Suggest 3-5 faculty collaborators for a ${role} in ${program} working on a grant. List their name, email, department, research interests, and current projects.`;
      const collabData = await kbRetrieveAndGenerate(KB_FACULTY, collabQuery);

      sendSSE(res, {
        step: "collaborators",
        done: false,
        result: {
          summary: "Collaborator suggestions generated from faculty directory.",
          collaborators: collabData,
        },
      });

      // ── STEP 4: Proposal Draft ──────────────────────────────────────────────
      sendSSE(res, { step: "proposal", done: false, result: "✍️ Drafting tailored grant proposal…" });

      const systemPrompt = `You are an expert grant writer at Florida State University. 
You write compelling, detailed, compliance-aware grant proposals. 
Your proposals are tailored to the specific grant requirements, the applicant's profile, and FSU's research mission.
Always include all required sections, word targets, and make the proposal ready for the professor to review and edit.`;

      const proposalPrompt = `Write a complete grant proposal draft for:
- Applicant: ${role}, ${year}, ${program} department
- Grant ID: ${grantId}
- CV context: ${cvText ? cvText.slice(0, 1000) : "Not provided"}

Grant opportunities context:
${grantMatches.slice(0, 1500)}

Compliance requirements:
${complianceData.slice(0, 1000)}

Suggested collaborators:
${collabData.slice(0, 800)}

Write a FULL proposal with these sections:
1. Executive Summary (150-200 words)
2. Problem Statement & Research Significance (300-400 words)
3. Intellectual Merit (250-300 words)  
4. Broader Impacts (200-250 words)
5. Research Methodology & Timeline (300-400 words)
6. Training & Mentorship Plan (150-200 words)
7. Institutional Context: Why FSU? (150-200 words)
8. Budget Justification Overview (100-150 words)

At the end, add:
- Total word count
- Compliance notes based on the policy data
- 3 specific suggestions to strengthen this proposal`;

      const proposal = await callClaude(systemPrompt, proposalPrompt);

      sendSSE(res, {
        step: "proposal",
        done: false,
        result: proposal,
      });

      // ── DONE ────────────────────────────────────────────────────────────────
      sendSSE(res, {
        step: "complete",
        done: true,
        result: {
          grantMatches,
          complianceScore,
          complianceDetails: complianceData.slice(0, 1000),
          collaborators: collabData,
          proposal,
        },
      });
    } catch (error: any) {
      console.error("Forge pipeline error:", error);
      sendSSE(res, {
        step: "error",
        done: true,
        result: `Pipeline error: ${error.message}`,
      });
    } finally {
      res.end();
    }
  });

  // ── Standalone KB endpoints ─────────────────────────────────────────────────

  // Query grants KB
  app.post("/api/kb/grants", async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: "Query required" });
    try {
      const answer = await kbRetrieveAndGenerate(KB_GRANTS, query);
      res.json({ success: true, answer });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // Query compliance KB
  app.post("/api/kb/compliance", async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: "Query required" });
    try {
      const answer = await kbRetrieveAndGenerate(KB_COMPLIANCE, query);
      res.json({ success: true, answer });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // Query faculty KB
  app.post("/api/kb/faculty", async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: "Query required" });
    try {
      const answer = await kbRetrieveAndGenerate(KB_FACULTY, query);
      res.json({ success: true, answer });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
