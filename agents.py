import os
import re
import json
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

def _retrieve(kb_id: str, query: str, n: int = 5) -> str:
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
    """Search the grant opportunities Knowledge Base. Returns the top 5 grant opportunities matching the researcher's strengths. Call this once to discover all candidate grants."""
    try:
        return "GRANT OPPORTUNITIES FOUND:\n\n" + _retrieve("KFW7ZEBGMR", researcher_strengths)
    except Exception as e:
        return f"Error searching grant opportunities: {str(e)}"


@tool
def search_complementary_collaborators(researcher_profile_and_specific_grant_requirements: str) -> str:
    """Search the collaborators Knowledge Base. Call this once per grant (3 total calls) with the researcher profile combined with that specific grant's requirements to find the best-fit collaborator for each grant."""
    try:
        return "COMPLEMENTARY COLLABORATORS FOUND:\n\n" + _retrieve(
            "Q89ZCWQSRY", researcher_profile_and_specific_grant_requirements
        )
    except Exception as e:
        return f"Error searching collaborators: {str(e)}"


@tool
def search_institutional_policies(grant_and_proposal_keywords: str) -> str:
    """Search the institutional policies Knowledge Base for submission guidelines and compliance requirements relevant to the grant proposals."""
    try:
        return "INSTITUTIONAL POLICIES & GUIDELINES:\n\n" + _retrieve("LULFPOFCTD", grant_and_proposal_keywords)
    except Exception as e:
        return f"Error searching institutional policies: {str(e)}"


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are FundingForge, an expert academic grant matchmaking agent.

EXECUTION STEPS — follow in this exact order:
1. Analyze the CV to extract the researcher's top strengths, expertise areas, and notable achievements.
2. Call search_grant_opportunities once with a concise description of the researcher's strengths to get candidate grants.
3. Select the TOP 3 most relevant grants from the results.
4. Call search_complementary_collaborators THREE TIMES — once per grant — using the researcher profile combined with each specific grant's requirements. Find a distinct collaborator for each.
5. Call search_institutional_policies once with keywords from the grant types to retrieve submission guidelines.
6. Synthesize all findings and output ONLY the JSON object below.

CRITICAL OUTPUT RULE:
Your entire response must be a single valid JSON object — no preamble, no explanation, no markdown fences.
Start your response with { and end with }.

Required JSON schema (EXACTLY 3 objects in the matches array):
{
  "researcher_summary": "Markdown bullet list of the researcher's top 5-7 key strengths and expertise areas. Use - for bullets.",
  "matches": [
    {
      "grant_title": "Full official name of the grant",
      "grant_agency": "Funding agency name (e.g. NSF, NIH, DOE)",
      "grant_match_score": 88,
      "grant_justification": "2-3 sentences explaining exactly why this grant aligns with the researcher's profile and expertise.",
      "collaborator_name": "Full name and title of the recommended collaborator (e.g. Dr. Jane Smith)",
      "collaborator_department": "Department and institution of the collaborator",
      "collaborator_synergy_score": 95,
      "collaborator_justification": "2-3 sentences on how this collaborator's skills complement the researcher and fill gaps required by this specific grant.",
      "draft_proposal": "A compelling ~200-word abstract for the joint grant proposal. Must reference both researchers and how they address the grant objectives.",
      "draft_email": "A professional outreach email. Format: 'Subject: [subject line]\\n\\nDear [Name],\\n\\n[~150 word body]\\n\\nBest regards,\\n[Researcher Name]'"
    }
  ]
}

Additional rules:
- All score fields must be plain integers 0-100 (no decimals, no % symbol in JSON)
- Scores should reflect genuine fit: grant_match_score for CV-to-grant alignment, collaborator_synergy_score for skill complementarity
- Use different collaborators for each of the 3 grants where possible
- All text must be in English
- Ensure the JSON is syntactically valid: escape internal quotes, no trailing commas"""


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
        Parsed dict with 'researcher_summary', 'matches' list, and '_raw'.
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
        "Analyze this researcher's CV and produce the FundingForge JSON report. "
        "Remember: output ONLY the JSON object, nothing else.\n\n"
        f"--- CV START ---\n{cv_text}\n--- CV END ---"
    )
    response = agent(prompt)
    return _parse_output(str(response))


# ---------------------------------------------------------------------------
# Output parser
# ---------------------------------------------------------------------------

def _parse_output(text: str) -> dict:
    """Extract and parse the JSON payload from the agent's response."""

    # 1. Try to strip ```json ... ``` code fences if the model added them
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    candidate = fenced.group(1).strip() if fenced else text.strip()

    # 2. If still not starting with {, find the outermost {...} block
    if not candidate.startswith("{"):
        brace = re.search(r"\{[\s\S]*\}", candidate)
        candidate = brace.group(0) if brace else candidate

    # 3. Attempt JSON parse
    try:
        data = json.loads(candidate)
        data["_raw"] = text
        # Clamp all scores to [0, 100]
        for match in data.get("matches", []):
            for key in ("grant_match_score", "collaborator_synergy_score"):
                if key in match:
                    match[key] = min(100, max(0, int(match[key])))
        return data
    except (json.JSONDecodeError, ValueError):
        # Graceful fallback so the UI can still show something
        return {
            "_raw": text,
            "_parse_error": True,
            "researcher_summary": "Could not parse structured output from the agent.",
            "matches": [],
        }
