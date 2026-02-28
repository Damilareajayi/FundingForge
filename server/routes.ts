import type { Express } from "express";
import { createServer, type Server } from "http";
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { storage } from "./storage";

// Initialize the AWS Client
const bedrockClient = new BedrockAgentRuntimeClient({ 
  region: "us-east-1" 
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Use .get or .post directly on the 'app' object
  app.get("/api/grants", async (_req, res) => {
    const grants = await storage.getGrants();
    res.json(grants);
  });

  app.get("/api/faculty", async (_req, res) => {
    const faculty = await storage.getFaculty();
    res.json(faculty);
  });

  // This is the route for your AWS Agents
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
            const text = new TextDecoder("utf-8").decode(chunk.chunk.bytes);
            completion += text;
          }
        }
      }
      res.json({ success: true, data: completion });
    } catch (error: any) {
      console.error("AWS Bedrock Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // CRITICAL: This line creates the server and returns it to index.ts
  const httpServer = createServer(app);
  return httpServer;
}
