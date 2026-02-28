import type { Express } from "express";
import { createServer, type Server } from "http";
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";

// Initialize the AWS Client
// SageMaker Execution Role automatically provides credentials if configured
const bedrockClient = new BedrockAgentRuntimeClient({ 
  region: "us-east-1" 
});

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. Grant Retrieval Route
  app.get("/api/grants", async (_req, res) => {
    // Your existing logic to fetch grants from storage
    res.json({ success: true, data: [] }); 
  });

  // 2. The Main "Forge" Route for AWS Agents
  app.post("/api/forge", async (req, res) => {
    const { grantId, userInput, userId } = req.body;

    try {
      const command = new InvokeAgentCommand({
        agentId: process.env.AWS_AGENT_ID,
        agentAliasId: process.env.AWS_AGENT_ALIAS_ID,
        sessionId: userId || "session-1",
        inputText: `Grant ID: ${grantId}. Context: ${userInput}. Check FSU policies and directory.`,
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

  // This creates the HTTP server using the express app
  const httpServer = createServer(app);
  return httpServer;
}
