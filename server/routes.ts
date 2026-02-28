import type { Express } from "express";
import { createServer, type Server } from "http";
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";

// Initialize AWS Client
const bedrockClient = new BedrockAgentRuntimeClient({ 
  region: "us-east-1" 
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Add your API routes here
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
          const text = new TextDecoder("utf-8").decode(chunk.chunk?.bytes);
          completion += text;
        }
      }
      res.json({ success: true, data: completion });
    } catch (error: any) {
      console.error("AWS Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // This line is CRUCIAL: It creates the server for index.ts to use
  const httpServer = createServer(app);
  return httpServer;
}
