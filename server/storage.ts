import { type Grant, type Faculty } from "@shared/schema";
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({ region: "us-east-1" });

const KB_GRANTS   = "KFW7ZEBGMR";
const KB_FACULTY  = "Q89ZCWQSRY";

async function retrieveChunks(kbId: string, query: string, n = 20): Promise<string[]> {
  try {
    const cmd = new RetrieveCommand({
      knowledgeBaseId: kbId,
      retrievalQuery: { text: query },
      retrievalConfiguration: { vectorSearchConfiguration: { numberOfResults: n } },
    });
    const resp = await client.send(cmd);
    return (resp.retrievalResults ?? [])
      .map((r) => r.content?.text ?? "")
      .filter(Boolean);
  } catch (e) {
    console.error(`[KB] Failed to retrieve from ${kbId}:`, e);
    return [];
  }
}

function parseGrantsFromChunks(chunks: string[]): Grant[] {
  const grants: Grant[] = [];
  let id = 1;

  for (const chunk of chunks) {
    if (!chunk || chunk.length < 30) continue;

    // Extract grant name from first line or "Grant:" prefix
    const lines = chunk.split("\n").filter((l) => l.trim());
    const firstLine = lines[0]?.trim() ?? "";

    const nameMatch =
      chunk.match(/(?:grant name|title|program)[:\s]+([^\n]+)/i) ||
      chunk.match(/^#+\s*(.+)/m);

    const name = nameMatch?.[1]?.trim() ?? firstLine.slice(0, 80) ?? `Grant Opportunity ${id}`;

    const audienceMatch = chunk.match(/(?:eligible|audience|for)[:\s]+([^\n]+)/i);
    const audience = audienceMatch?.[1]?.toLowerCase().includes("faculty")
      ? "Faculty"
      : audienceMatch?.[1]?.toLowerCase().includes("grad")
      ? "Grad Students"
      : audienceMatch?.[1]?.toLowerCase().includes("under")
      ? "Undergrads"
      : "Faculty";

    const deadlineMatch = chunk.match(/(?:deadline|due date|internal deadline)[:\s]+([^\n]+)/i);
    const amountMatch = chunk.match(/(?:amount|funding|award)[:\s]+([^\n]+)/i);
    const eligibilityMatch = chunk.match(/(?:eligibility|eligible|requirements?)[:\s]+([^\n]+)/i);

    grants.push({
      id: id++,
      name: name.replace(/\*\*/g, "").trim().slice(0, 120),
      targetAudience: audience as Grant["targetAudience"],
      eligibility: eligibilityMatch?.[1]?.trim() ?? chunk.slice(0, 150),
      matchCriteria: amountMatch?.[1]?.trim() ?? chunk.slice(0, 200),
      internalDeadline: deadlineMatch?.[1]?.trim() ?? "Contact grants office",
    });

    if (grants.length >= 12) break;
  }

  return grants;
}

function parseFacultyFromChunks(chunks: string[]): Faculty[] {
  const faculty: Faculty[] = [];
  let id = 1;

  for (const chunk of chunks) {
    if (!chunk || chunk.length < 30) continue;

    const lines = chunk.split("\n").filter((l) => l.trim());
    const nameMatch = chunk.match(/(?:name|faculty|professor|dr\.?)[:\s]+([^\n]+)/i);
    const name = nameMatch?.[1]?.trim() ?? lines[0]?.trim() ?? `Faculty ${id}`;

    const deptMatch = chunk.match(/(?:department|dept|division)[:\s]+([^\n]+)/i);
    const expertiseMatch = chunk.match(/(?:expertise|research|specializ)[:\s]+([^\n]+)/i);
    const emailMatch = chunk.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);

    faculty.push({
      id: id++,
      name: name.replace(/\*\*/g, "").trim().slice(0, 80),
      department: deptMatch?.[1]?.trim() ?? "Research Faculty",
      expertise: expertiseMatch?.[1]?.trim() ?? chunk.slice(0, 150),
      imageUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      bio: chunk.slice(0, 300),
    });

    if (faculty.length >= 10) break;
  }

  return faculty;
}

export interface IStorage {
  getGrants(): Promise<Grant[]>;
  getFaculty(): Promise<Faculty[]>;
}

export class BedrockStorage implements IStorage {
  private _grants: Grant[] | null = null;
  private _faculty: Faculty[] | null = null;
  private _grantsLoadedAt: number = 0;
  private _facultyLoadedAt: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getGrants(): Promise<Grant[]> {
    const now = Date.now();
    if (this._grants && now - this._grantsLoadedAt < this.CACHE_TTL) {
      return this._grants;
    }
    console.log("[Storage] Fetching grants from Bedrock KB...");
    const chunks = await retrieveChunks(KB_GRANTS, "grant opportunities funding programs eligibility deadlines", 20);
    this._grants = parseGrantsFromChunks(chunks);
    this._grantsLoadedAt = now;
    console.log(`[Storage] Loaded ${this._grants.length} grants from KB`);

    // Fallback if KB returns nothing
    if (this._grants.length === 0) {
      this._grants = getFallbackGrants();
    }

    return this._grants;
  }

  async getFaculty(): Promise
