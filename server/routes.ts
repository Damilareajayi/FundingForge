import type { Express } from "express";
import { createServer, type Server } from "http";
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { storage } from "./storage";

// Initialize the AWS Client
const bedrockClient = new BedrockAgentRuntimeClient({ 
  region: "us-east-1" 
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Standard API Routes
  app.get("/api/grants", async (_req, res) => {
    try {
      const grants = await storage.getGrants();
      res.json(grants);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch grants" });
    }
  });

  app.get("/api/faculty", async (_req, res) => {
    try {
      const faculty = await storage.getFaculty();
      res.json(faculty);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch faculty" });
    }
  });

  // AWS Agent Route
  app.post("/api/forge", async (req, res) => {
    const { grantId, userInput, userId } = req.body;

    try {
      const command = new InvokeAgentCommand({
        agentId: process.env.AWS_AGENT_ID,
        agentAliasId: process.env.AWS_AGENT_ALIAS_ID,
        sessionId: userId || "session-1",
        inputText: `Grant: ${grantId}. Context: ${userInput}`,
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
      console.error("Bedrock Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // THIS IS THE CRITICAL PART: Return the server
  const httpServer = createServer(app);
  return httpServer;
}
