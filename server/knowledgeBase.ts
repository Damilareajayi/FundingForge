import {
  BedrockAgentRuntimeClient,
  RetrieveAndGenerateCommand,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const KNOWLEDGE_BASE_ID = process.env.BEDROCK_KNOWLEDGE_BASE_ID!;
const MODEL_ARN = "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0";

// Query KB and get AI-generated answer
export async function queryKnowledgeBase(query: string) {
  const command = new RetrieveAndGenerateCommand({
    input: { text: query },
    retrieveAndGenerateConfiguration: {
      type: "KNOWLEDGE_BASE",
      knowledgeBaseConfiguration: {
        knowledgeBaseId: KNOWLEDGE_BASE_ID,
        modelArn: MODEL_ARN,
      },
    },
  });

  const response = await client.send(command);
  return {
    answer: response.output?.text,
    citations: response.citations,
  };
}

// Just retrieve relevant chunks without generating an answer
export async function retrieveFromKnowledgeBase(query: string, numResults = 5) {
  const command = new RetrieveCommand({
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
    retrievalQuery: { text: query },
    retrievalConfiguration: {
      vectorSearchConfiguration: { numberOfResults: numResults },
    },
  });

  const response = await client.send(command);
  return response.retrievalResults;
}
