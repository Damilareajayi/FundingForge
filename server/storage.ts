import { type Grant, type Faculty } from "@shared/schema";
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({ region: "us-east-1" });

const KB_GRANTS  = "KFW7ZEBGMR";
const KB_FACULTY = "Q89ZCWQSRY";

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

    const lines = chunk.split("\n").filter((l) => l.trim());
    const nameMatch = chunk.match(/(?:grant name|title|program)[:\s]+([^\n]+)/i);
    const name = nameMatch?.[1]?.trim() ?? lines[0]?.trim() ?? `Grant Opportunity ${id}`;

    const audienceRaw = chunk.match(/(?:eligible|audience|for)[:\s]+([^\n]+)/i)?.[1]?.toLowerCase() ?? "";
    const audience = audienceRaw.includes("faculty")
      ? "Faculty"
      : audienceRaw.includes("grad")
      ? "Grad Students"
      : audienceRaw.includes("under")
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
  private _grantsLoadedAt = 0;
  private _facultyLoadedAt = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000;

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
    if (this._grants.length === 0) {
      console.log("[Storage] KB returned empty, using fallback grants");
      this._grants = getFallbackGrants();
    }
    return this._grants;
  }

  async getFaculty(): Promise<Faculty[]> {
    const now = Date.now();
    if (this._faculty && now - this._facultyLoadedAt < this.CACHE_TTL) {
      return this._faculty;
    }
    console.log("[Storage] Fetching faculty from Bedrock KB...");
    const chunks = await retrieveChunks(KB_FACULTY, "faculty professor researcher department expertise", 20);
    this._faculty = parseFacultyFromChunks(chunks);
    this._facultyLoadedAt = now;
    console.log(`[Storage] Loaded ${this._faculty.length} faculty from KB`);
    if (this._faculty.length === 0) {
      console.log("[Storage] KB returned empty, using fallback faculty");
      this._faculty = getFallbackFaculty();
    }
    return this._faculty;
  }
}

export const storage = new BedrockStorage();

function getFallbackGrants(): Grant[] {
  return [
    {
      id: 1,
      name: "NSF CAREER Award",
      targetAudience: "Faculty",
      eligibility: "Tenure-track faculty within first 5 years. Must be US citizen or permanent resident.",
      matchCriteria: "Up to $500,000 over 5 years. Supports research and education integration.",
      internalDeadline: "Contact OSP 10 days before sponsor deadline",
    },
    {
      id: 2,
      name: "NIH R01 Research Grant",
      targetAudience: "Faculty",
      eligibility: "Faculty with doctoral degree and institutional affiliation.",
      matchCriteria: "Up to $500,000 direct costs per year. Biomedical and behavioral research.",
      internalDeadline: "Contact OSP 10 days before sponsor deadline",
    },
    {
      id: 3,
      name: "FSU First Year Assistant Professor Award",
      targetAudience: "Faculty",
      eligibility: "First-year tenure-track faculty at FSU.",
      matchCriteria: "$10,000 seed funding for research startup.",
      internalDeadline: "October 1",
    },
    {
      id: 4,
      name: "NSF Graduate Research Fellowship",
      targetAudience: "Grad Students",
      eligibility: "Early-career graduate students in STEM fields. US citizens only.",
      matchCriteria: "$37,000 annual stipend plus $12,000 education allowance for 3 years.",
      internalDeadline: "October 15 internal review",
    },
    {
      id: 5,
      name: "Ford Foundation Fellowship",
      targetAudience: "Grad Students",
      eligibility: "PhD students committed to diversity in higher education.",
      matchCriteria: "$27,000 annual stipend. Predoctoral, dissertation, and postdoctoral levels.",
      internalDeadline: "December 1",
    },
    {
      id: 6,
      name: "FSU Graduate Research Fellowship",
      targetAudience: "Grad Students",
      eligibility: "FSU graduate students in good academic standing.",
      matchCriteria: "$15,000 fellowship plus tuition waiver.",
      internalDeadline: "February 1",
    },
    {
      id: 7,
      name: "Goldwater Scholarship",
      targetAudience: "Undergrads",
      eligibility: "Sophomore or junior STEM undergrads with 3.0+ GPA.",
      matchCriteria: "Up to $7,500 per year for tuition, fees, books, and room and board.",
      internalDeadline: "Internal nomination deadline: December 1",
    },
    {
      id: 8,
      name: "NSF REU Supplement",
      targetAudience: "Undergrads",
      eligibility: "Undergraduates participating in active NSF-funded research.",
      matchCriteria: "$6,000 stipend for summer research experience.",
      internalDeadline: "Rolling — contact PI directly",
    },
  ];
}

function getFallbackFaculty(): Faculty[] {
  return [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      department: "Computer Science",
      expertise: "Machine Learning, AI Ethics, Natural Language Processing",
      imageUrl: "https://api.dicebear.com/7.x/initials/svg?seed=SarahChen",
      bio: "Dr. Chen's research focuses on ethical AI systems and NLP applications in healthcare.",
    },
    {
      id: 2,
      name: "Dr. Marcus Williams",
      department: "Biology",
      expertise: "Computational Biology, Genomics, Bioinformatics",
      imageUrl: "https://api.dicebear.com/7.x/initials/svg?seed=MarcusWilliams",
      bio: "Dr. Williams leads the computational genomics lab with active NIH funding.",
    },
    {
      id: 3,
      name: "Dr. Priya Patel",
      department: "Psychology",
      expertise: "Cognitive Neuroscience, Brain-Computer Interfaces, Mental Health",
      imageUrl: "https://api.dicebear.com/7.x/initials/svg?seed=PriyaPatel",
      bio: "Dr. Patel studies neural correlates of decision-making and mental health interventions.",
    },
  ];
}
