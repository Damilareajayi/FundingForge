import { type Grant, type Faculty } from "@shared/schema";
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrieveAndGenerateCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({ region: "us-east-1" });

const KB_ID = "QXPZVFHFV1";
const MODEL_ARN = "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0";

async function retrieveAndGenerate(query: string): Promise<string> {
  try {
    const cmd = new RetrieveAndGenerateCommand({
      input: { text: query },
      retrieveAndGenerateConfiguration: {
        type: "KNOWLEDGE_BASE",
        knowledgeBaseConfiguration: {
          knowledgeBaseId: KB_ID,
          modelArn: MODEL_ARN,
        },
      },
    });
    const resp = await client.send(cmd);
    return resp.output?.text ?? "";
  } catch (e) {
    console.error("[KB] RetrieveAndGenerate failed:", e);
    return "";
  }
}

async function extractGrantsFromKB(): Promise<Grant[]> {
  const query = `List all grant programs and funding opportunities available to FSU faculty, graduate students, and undergraduate students. 
For each grant provide: name, who is eligible (faculty/grad students/undergrads), eligibility requirements, funding amount, and deadline.`;

  const answer = await retrieveAndGenerate(query);
  if (!answer || answer.length < 50) return [];

  console.log("[Storage] KB grant answer:", answer.slice(0, 300));

  const grants: Grant[] = [];
  let id = 1;

  const blocks = answer
    .split(/\n(?=\d+\.|#{1,3}\s|\*\*[A-Z]|-\s[A-Z])/g)
    .filter((b) => b.trim().length > 30);

  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (lines.length < 1) continue;

    const nameLine = lines[0].replace(/^[\d\.\*#\-\s]+/, "").replace(/\*\*/g, "").trim();
    if (!nameLine || nameLine.length < 5) continue;

    const blockLower = block.toLowerCase();
    const audience =
      blockLower.includes("undergraduate") || blockLower.includes("undergrad")
        ? "Undergrads"
        : blockLower.includes("graduate") || blockLower.includes("phd") || blockLower.includes("grad student")
        ? "Grad Students"
        : "Faculty";

    const eligibilityMatch = block.match(/(?:eligible|eligibility|who can apply|requirements?)[:\s]+([^\n]+)/i);
    const amountMatch = block.match(/(?:amount|funding|award|stipend|up to)[:\s]+([^\n]+)/i);
    const deadlineMatch = block.match(/(?:deadline|due|submit by)[:\s]+([^\n]+)/i);

    grants.push({
      id: id++,
      name: nameLine.slice(0, 120),
      targetAudience: audience as Grant["targetAudience"],
      eligibility: eligibilityMatch?.[1]?.trim() ?? lines.slice(1).join(" ").slice(0, 200),
      matchCriteria: amountMatch?.[1]?.trim() ?? block.slice(0, 200),
      internalDeadline: deadlineMatch?.[1]?.trim() ?? "Contact grants office for deadline",
    });

    if (grants.length >= 12) break;
  }

  return grants;
}

async function extractFacultyFromKB(): Promise<Faculty[]> {
  const query = `List FSU faculty members from the faculty directory. 
For each faculty member provide: full name, department, research expertise and interests, email if available, and current research projects.`;

  const answer = await retrieveAndGenerate(query);
  if (!answer || answer.length < 50) return [];

  const faculty: Faculty[] = [];
  let id = 1;

  const blocks = answer
    .split(/\n(?=\d+\.|#{1,3}\s|\*\*[A-Z]|-\s[A-Z])/g)
    .filter((b) => b.trim().length > 30);

  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (lines.length < 1) continue;

    const nameLine = lines[0].replace(/^[\d\.\*#\-\s]+/, "").replace(/\*\*/g, "").trim();
    if (!nameLine || nameLine.length < 3) continue;

    const deptMatch = block.match(/(?:department|dept|division|college)[:\s]+([^\n]+)/i);
    const expertiseMatch = block.match(/(?:expertise|research|specializ|interests?)[:\s]+([^\n]+)/i);

    faculty.push({
      id: id++,
      name: nameLine.slice(0, 80),
      department: deptMatch?.[1]?.trim() ?? "FSU Faculty",
      expertise: expertiseMatch?.[1]?.trim() ?? lines.slice(1).join(" ").slice(0, 150),
      imageUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(nameLine)}`,
      bio: block.slice(0, 300),
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
  private readonly CACHE_TTL = 10 * 60 * 1000;

  async getGrants(): Promise<Grant[]> {
    const now = Date.now();
    if (this._grants && now - this._grantsLoadedAt < this.CACHE_TTL) {
      return this._grants;
    }
    console.log("[Storage] Fetching grants from Bedrock KB...");
    try {
      this._grants = await extractGrantsFromKB();
      this._grantsLoadedAt = now;
      console.log(`[Storage] Loaded ${this._grants.length} grants from KB`);
    } catch (e) {
      console.error("[Storage] Grant extraction failed:", e);
      this._grants = [];
    }
    if (this._grants.length === 0) {
      console.log("[Storage] Using fallback grants");
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
    try {
      this._faculty = await extractFacultyFromKB();
      this._facultyLoadedAt = now;
      console.log(`[Storage] Loaded ${this._faculty.length} faculty from KB`);
    } catch (e) {
      console.error("[Storage] Faculty extraction failed:", e);
      this._faculty = [];
    }
    if (this._faculty.length === 0) {
      console.log("[Storage] Using fallback faculty");
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
      name: "FSU CRC Seed Grant",
      targetAudience: "Faculty",
      eligibility: "FSU faculty paid by FSU. Up to five Co-PIs per proposal.",
      matchCriteria: "Awards average $50,000, max $100,000. Student stipends and project materials allowed.",
      internalDeadline: "Two competition rounds per academic year",
    },
    {
      id: 4,
      name: "FSU First Year Assistant Professor Award",
      targetAudience: "Faculty",
      eligibility: "First-year tenure-track faculty at FSU.",
      matchCriteria: "$10,000 seed funding for research startup.",
      internalDeadline: "October 1",
    },
    {
      id: 5,
      name: "NSF Graduate Research Fellowship",
      targetAudience: "Grad Students",
      eligibility: "Early-career graduate students in STEM fields. US citizens only.",
      matchCriteria: "$37,000 annual stipend plus $12,000 education allowance for 3 years.",
      internalDeadline: "October 15 internal review",
    },
    {
      id: 6,
      name: "Ford Foundation Fellowship",
      targetAudience: "Grad Students",
      eligibility: "PhD students committed to diversity in higher education.",
      matchCriteria: "$27,000 annual stipend. Predoctoral, dissertation, and postdoctoral levels.",
      internalDeadline: "December 1",
    },
    {
      id: 7,
      name: "FSU Graduate Research Fellowship",
      targetAudience: "Grad Students",
      eligibility: "FSU graduate students in good academic standing.",
      matchCriteria: "$15,000 fellowship plus tuition waiver.",
      internalDeadline: "February 1",
    },
    {
      id: 8,
      name: "Goldwater Scholarship",
      targetAudience: "Undergrads",
      eligibility: "Sophomore or junior STEM undergrads with 3.0+ GPA.",
      matchCriteria: "Up to $7,500 per year for tuition, fees, books, and room and board.",
      internalDeadline: "Internal nomination deadline: December 1",
    },
    {
      id: 9,
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
