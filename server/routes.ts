import type { Express } from "express";
import { createServer, type Server } from "http";
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  RetrieveAndGenerateCommand,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { storage } from "./storage";

const bedrockClient = new BedrockAgentRuntimeClient({ region: "us-east-1" });

export async function registerRoutes(app: Express): Promise<Server> {
  if (!app || typeof app.get !== "function") {
    console.error("Critical Error: Express 'app' object was not passed correctly to registerRoutes.");
    throw new TypeError("app.get is not a function - check server/index.ts");
  }

  // ─── Existing Routes ───────────────────────────────────────────────────────

  app.get("/api/grants", async (_req, res) => {
    const grants = await storage.getGrants();
    res.json(grants);
  });

  app.get("/api/faculty", async (_req, res) => {
    const faculty = await storage.getFaculty();
    res.json(faculty);
  });

  app.post("/api/forge", async (req, res) => {
    const { grantId, userInput, userId } = req.body;
    try {
      const command = new InvokeAgentCommand({
        agentId: process.env.AWS_AGENT_ID,
        agentAliasId: process.env.AWS_AGENT_ALIAS_ID,
        sessionId: userId || "session-1",
        inputText: `Grant ID: ${grantId}. Context: ${userInput}`,
      });
      const response = await bedrockClient.send(command);
      let completion = "";
      if (response.completion) {
        for await (const chunk of response.completion) {
          if (chunk.chunk?.bytes) {
            completion += new TextDecoder("utf-8").decode(chunk.chunk.bytes);
          }
        }
      }
      res.json({ success: true, data: completion });
    } catch (error: any) {
      console.error("AWS Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // ─── Knowledge Base Routes ─────────────────────────────────────────────────

  // Query KB and get an AI-generated answer with citations
  app.post("/api/knowledge-base/query", async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ message: "Query is required" });
    }
    try {
      const command = new RetrieveAndGenerateCommand({
        input: { text: query },
        retrieveAndGenerateConfiguration: {
          type: "KNOWLEDGE_BASE",
          knowledgeBaseConfiguration: {
            knowledgeBaseId: process.env.BEDROCK_KNOWLEDGE_BASE_ID!,
            modelArn: `arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
          },
        },
      });
      const response = await bedrockClient.send(command);
      res.json({
        success: true,
        answer: response.output?.text,
        citations: response.citations,
      });
    } catch (error: any) {
      console.error("Knowledge Base Query Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Retrieve raw document chunks from KB (useful for agents to use as context)
  app.post("/api/knowledge-base/retrieve", async (req, res) => {
    const { query, numResults = 5 } = req.body;
    if (!query) {
      return res.status(400).json({ message: "Query is required" });
    }
    try {
      const command = new RetrieveCommand({
        knowledgeBaseId: process.env.BEDROCK_KNOWLEDGE_BASE_ID!,
        retrievalQuery: { text: query },
        retrievalConfiguration: {
          vectorSearchConfiguration: { numberOfResults: numResults },
        },
      });
      const response = await bedrockClient.send(command);
      res.json({
        success: true,
        results: response.retrievalResults,
      });
    } catch (error: any) {
      console.error("Knowledge Base Retrieve Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
