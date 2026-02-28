import os
import re
import boto3
from dotenv import load_dotenv

# Disable OpenTelemetry before strands imports it – prevents ContextVar
# token errors when the agent event loop runs inside Streamlit's thread pool.
os.environ.setdefault("OTEL_SDK_DISABLED", "true")

from strands import Agent, tool
from strands.models.bedrock import BedrockModel

load_dotenv()

# ---------------------------------------------------------------------------
# AWS client – used inside every @tool to query Bedrock Knowledge Bases
# ---------------------------------------------------------------------------
_kb_client = boto3.client("bedrock-agent-runtime", region_name="us-east-1")

# ---------------------------------------------------------------------------
# Tool helpers
# ---------------------------------------------------------------------------

def _retrieve(kb_id: str, query: str, n: int = 3) -> str:
    """Run a Knowledge Base retrieve call and return formatted text."""
    response = _kb_client.retrieve(
        knowledgeBaseId=kb_id,
        retrievalQuery={"text": query},
        retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": n}},
    )
    results = response.get("retrievalResults", [])
    if not results:
        return "No results found."
    return "\n\n".join(
        f"Result {i}:\n{r.get('content', {}).get('text', '')}"
        for i, r in enumerate(results, 1)
    )


# ---------------------------------------------------------------------------
# Agent Tools
# ---------------------------------------------------------------------------

@tool
def search_grant_opportunities(researcher_strengths: str) -> str:
    """Search the grant opportunities Knowledge Base for grants that match the researcher's strengths and expertise areas."""
    try:
        return "GRANT OPPORTUNITIES:\n\n" + _retrieve("KFW7ZEBGMR", researcher_strengths)
    except Exception as e:
        return f"Error searching grant opportunities: {str(e)}"


@tool
def search_complementary_collaborators(researcher_profile_and_grant_requirements: str) -> str:
    """Search the collaborators Knowledge Base for researchers whose skills complement the applicant and match grant requirements."""
    try:
        return "COMPLEMENTARY COLLABORATORS:\n\n" + _retrieve(
            "Q89ZCWQSRY", researcher_profile_and_grant_requirements
        )
    except Exception as e:
        return f"Error searching collaborators: {str(e)}"


@tool
def search_institutional_policies(grant_and_proposal_keywords: str) -> str:
    """Search the institutional policies Knowledge Base for relevant submission guidelines and requirements."""
    try:
        return "INSTITUTIONAL POLICIES:\n\n" + _retrieve("LULFPOFCTD", grant_and_proposal_keywords)
    except Exception as e:
        return f"Error searching institutional policies: {str(e)}"


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are FundingForge, an expert academic grant matchmaking agent.

When given a researcher's CV, you MUST execute these steps in order:
1. Extract the researcher's key expertise, research areas, and notable achievements from the CV.
2. Call search_grant_opportunities with a concise summary of the researcher's strengths.
3. Call search_complementary_collaborators with the researcher's profile PLUS the grant requirements you discovered.
4. Call search_institutional_policies with keywords from the grant title and proposal type.
5. Synthesize all findings into the structured final report below.

Your response MUST contain these exact section headers in this order:

## SCORES & SYNERGY ANALYSIS
Grant Match Score: [integer 0-100]%
Collaborator Synergy Score: [integer 0-100]%
[2-3 sentences explaining why this combination is strong]

## MATCHED GRANT
[Grant name, funding agency, approximate amount, deadline if known, key eligibility and requirements]

## RECOMMENDED COLLABORATOR
[Full name, department/institution, expertise highlights, specific skills that fill the researcher's gaps]

## DRAFT GRANT PROPOSAL ABSTRACT
[~250 word compelling abstract for the joint proposal]

## DRAFT OUTREACH EMAIL
Subject: [Subject line]

Dear [Collaborator Name],

[~150 word professional email proposing the collaboration, referencing their expertise and the grant]

Best regards,
[Researcher Name from CV]

Rules:
- Scores must be plain integers (e.g. 87%, not 87.5%)
- Never skip a section
- Be specific, persuasive, and professional throughout
- All output must be in English"""


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def run_agent(cv_text: str, callback=None) -> dict:
    """
    Run the FundingForge agent on the provided CV text.

    Args:
        cv_text:  Extracted plain-text content of the uploaded CV.
        callback: Optional Strands callback_handler for streaming events.

    Returns:
        Parsed result dict with scores, sections, and raw output.
    """
    model = BedrockModel(
        model_id="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        region_name="us-east-1",
    )

    agent_kwargs = dict(
        model=model,
        system_prompt=SYSTEM_PROMPT,
        tools=[
            search_grant_opportunities,
            search_complementary_collaborators,
            search_institutional_policies,
        ],
    )
    if callback is not None:
        agent_kwargs["callback_handler"] = callback

    agent = Agent(**agent_kwargs)

    prompt = (
        "Analyze this researcher's CV and produce a complete FundingForge report.\n\n"
        f"--- CV START ---\n{cv_text}\n--- CV END ---"
    )
    response = agent(prompt)
    return _parse_output(str(response))


# ---------------------------------------------------------------------------
# Output parser
# ---------------------------------------------------------------------------

def _parse_output(text: str) -> dict:
    result = {
        "raw": text,
        "grant_match_score": 0,
        "collaborator_synergy_score": 0,
        "synergy_analysis": "",
        "matched_grant": "",
        "recommended_collaborator": "",
        "draft_proposal": "",
        "draft_email": "",
    }

    # Extract scores
    m = re.search(r"Grant Match Score:\s*(\d+)%", text, re.IGNORECASE)
    if m:
        result["grant_match_score"] = min(100, max(0, int(m.group(1))))

    m = re.search(r"Collaborator Synergy Score:\s*(\d+)%", text, re.IGNORECASE)
    if m:
        result["collaborator_synergy_score"] = min(100, max(0, int(m.group(1))))

    # Extract named sections
    section_patterns = [
        ("synergy_analysis",        r"## SCORES & SYNERGY ANALYSIS\n(.*?)(?=## MATCHED GRANT)"),
        ("matched_grant",           r"## MATCHED GRANT\n(.*?)(?=## RECOMMENDED COLLABORATOR)"),
        ("recommended_collaborator",r"## RECOMMENDED COLLABORATOR\n(.*?)(?=## DRAFT GRANT PROPOSAL ABSTRACT)"),
        ("draft_proposal",          r"## DRAFT GRANT PROPOSAL ABSTRACT\n(.*?)(?=## DRAFT OUTREACH EMAIL)"),
        ("draft_email",             r"## DRAFT OUTREACH EMAIL\n(.*?)$"),
    ]
    for key, pattern in section_patterns:
        m = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
        if m:
            result[key] = m.group(1).strip()

    return result
