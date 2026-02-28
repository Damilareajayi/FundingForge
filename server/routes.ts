import type { Express } from "express";
import { createServer, type Server } from "http";
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";

// This is the connection to AWS
const client = new BedrockAgentRuntimeClient({ region: "us-east-1" });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // This route handles the "Forge" button click
  app.post("/api/forge", async (req, res) => {
    const { userId, grantId, userInput } = req.body;

    try {
      const command = new InvokeAgentCommand({
        // These IDs will come from Phase 2 below
        agentId: process.env.AWS_AGENT_ID, 
        agentAliasId: process.env.AWS_AGENT_ALIAS_ID,
        sessionId: userId, 
        inputText: `User Input: ${userInput}. Grant ID: ${grantId}. Please scan the S3 policies and faculty directory to create a match report and draft a proposal.`,
      });

      const response = await client.send(command);

      // This sends the AI's answer back to your frontend
      let completion = "";
      if (response.completion) {
        for await (const chunk of response.completion) {
          const chunkText = new TextDecoder("utf-8").decode(chunk.chunk?.bytes);
          completion += chunkText;
        }
      }
      res.json({ success: true, data: completion });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "AWS Agent error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
