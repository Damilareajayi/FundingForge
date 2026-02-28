import type { Express } from "express";
import { createServer, type Server } from "http";
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { storage } from "./storage";

const bedrockClient = new BedrockAgentRuntimeClient({ region: "us-east-1" });

export async function registerRoutes(app: Express): Promise<Server> {
  // SAFETY CHECK: Ensure app is valid before calling methods
  if (!app || typeof app.get !== 'function') {
    console.error("Critical Error: Express 'app' object was not passed correctly to registerRoutes.");
    // Fallback to avoid a crash if possible, or throw a clearer error
    throw new TypeError("app.get is not a function - check server/index.ts");
  }

  // Define your routes
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

  const httpServer = createServer(app);
  return httpServer;
}
