import io
import threading
import streamlit as st
from streamlit.runtime.scriptrunner import add_script_run_ctx, get_script_run_ctx
from pypdf import PdfReader
from agents import run_agent

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="FundingForge",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
st.markdown(
    """
    <h1 style='margin-bottom:0'>
        <span style='color:#4A90D9'>Funding</span><span style='color:#E8531A'>Forge</span>
    </h1>
    <p style='color:#888; font-size:1.1rem; margin-top:4px'>
        AI-powered grant matching &amp; collaborator discovery for researchers
    </p>
    """,
    unsafe_allow_html=True,
)
st.divider()

# ---------------------------------------------------------------------------
# Upload section
# ---------------------------------------------------------------------------
col_upload, col_spacer = st.columns([2, 1])
with col_upload:
    uploaded_file = st.file_uploader(
        "Upload your CV (PDF)",
        type=["pdf"],
        help="Upload a PDF version of your academic CV or resume.",
    )

st.markdown("")

_, col_btn, _ = st.columns([2, 1, 2])
with col_btn:
    submit = st.button(
        "Find Grants & Collaborators",
        type="primary",
        use_container_width=True,
        disabled=(uploaded_file is None),
    )

# ---------------------------------------------------------------------------
# Helper: build the downloadable markdown report
# ---------------------------------------------------------------------------
def _build_report(result: dict) -> str:
    lines = ["# FundingForge Analysis Report\n", "## Researcher Profile\n",
             result.get("researcher_summary", ""), "\n"]
    for i, m in enumerate(result.get("matches", []), 1):
        lines += [
            f"\n---\n\n## Match {i}: {m.get('grant_title', '')} ({m.get('grant_agency', '')})\n",
            f"**Grant Match Score:** {m.get('grant_match_score', 0)}%  |  "
            f"**Collaborator Synergy Score:** {m.get('collaborator_synergy_score', 0)}%\n",
            f"\n### Why This Grant Fits\n{m.get('grant_justification', '')}\n",
            f"\n### Recommended Collaborator: {m.get('collaborator_name', '')}\n",
            f"_{m.get('collaborator_department', '')}_\n\n{m.get('collaborator_justification', '')}\n",
            f"\n### Draft Proposal Abstract\n{m.get('draft_proposal', '')}\n",
            f"\n### Outreach Email\n{m.get('draft_email', '')}\n",
        ]
    return "\n".join(lines)

# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------
if submit:
    # PDF extraction
    try:
        reader = PdfReader(io.BytesIO(uploaded_file.read()))
        cv_text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    except Exception as e:
        st.error(f"Failed to read the PDF: {e}")
        st.stop()

    if not cv_text:
        st.error("Could not extract text from this PDF. Ensure it is not a scanned image-only file.")
        st.stop()

    # ---- Agent execution with live progress --------------------------------
    called_tools: set = set()
    _script_ctx = get_script_run_ctx()

    with st.status("FundingForge agent is working...", expanded=True) as status:
        st.write("Analyzing CV content and extracting researcher profile...")

        def on_event(**kwargs):
            add_script_run_ctx(threading.current_thread(), _script_ctx)
            tool_name = None
            for key in ("current_tool_use", "tool_use", "toolUse"):
                val = kwargs.get(key)
                if isinstance(val, dict):
                    tool_name = val.get("name") or val.get("toolName")
                    break
            if not tool_name or tool_name in called_tools:
                return
            called_tools.add(tool_name)
            # Show a distinct message for each tool invocation index
            call_index = len(called_tools)
            msgs = {
                "search_grant_opportunities":        "Searching grant opportunities in Knowledge Base...",
                "search_complementary_collaborators": f"Finding collaborator for grant {call_index - 1}/3...",
                "search_institutional_policies":     "Retrieving institutional policies & guidelines...",
            }
            msg = msgs.get(tool_name)
            if msg:
                st.write(msg)

        try:
            result = run_agent(cv_text, callback=on_event)
            st.write("Synthesizing final report...")
            status.update(label="Analysis complete!", state="complete", expanded=False)
        except BaseException as e:
            status.update(label="An error occurred.", state="error", expanded=True)
            st.error(f"Agent error — {type(e).__name__}: {e}")
            st.stop()

    # ---- Error / parse fallback --------------------------------------------
    if result.get("_parse_error") or not result.get("matches"):
        st.error("The agent did not return structured results. Raw output shown below.")
        with st.expander("Raw agent output"):
            st.text(result.get("_raw", ""))
        st.stop()

    # ========================================================================
    # DASHBOARD LAYOUT
    # ========================================================================
    left_col, right_col = st.columns([1, 2], gap="large")

    # ---- Left: Researcher Profile ------------------------------------------
    with left_col:
        st.subheader("Researcher Profile")
        st.markdown(result.get("researcher_summary", "_No profile extracted._"))

    # ---- Right: Grant Matches ----------------------------------------------
    with right_col:
        st.subheader("Top 3 Grant Matches")

        for i, match in enumerate(result.get("matches", []), 1):
            grant_score  = match.get("grant_match_score", 0)
            collab_score = match.get("collaborator_synergy_score", 0)
            title        = match.get("grant_title", f"Grant {i}")
            agency       = match.get("grant_agency", "")

            # One expander per grant; auto-expand the first result
            with st.expander(
                f"{'🥇' if i == 1 else '🥈' if i == 2 else '🥉'}  {title}  —  {grant_score}% Match",
                expanded=(i == 1),
            ):
                # Score row
                col_s1, col_s2 = st.columns(2)
                with col_s1:
                    st.metric("Grant Match Score", f"{grant_score}%")
                    st.progress(grant_score / 100)
                with col_s2:
                    st.metric("Collaborator Synergy Score", f"{collab_score}%")
                    st.progress(collab_score / 100)

                st.caption(f"Funding agency: **{agency}**" if agency else "")

                # Grant justification
                st.markdown("**Why this grant fits your profile**")
                st.info(match.get("grant_justification", ""))

                # Collaborator card
                collab_name = match.get("collaborator_name", "Unknown Collaborator")
                collab_dept = match.get("collaborator_department", "")
                st.markdown(f"**Recommended Collaborator: {collab_name}**")
                if collab_dept:
                    st.caption(collab_dept)
                st.markdown(match.get("collaborator_justification", ""))

                st.divider()

                # Proposal + Email as tabs
                tab_proposal, tab_email = st.tabs(["📄 Proposal Assistant", "✉️ Outreach Email"])
                with tab_proposal:
                    st.markdown(match.get("draft_proposal") or "_No proposal generated._")
                with tab_email:
                    raw_email = match.get("draft_email", "_No email generated._")
                    # Render newline escapes that may come back as literal \n from JSON
                    st.markdown(raw_email.replace("\\n", "\n"))

    # ---- Download ----------------------------------------------------------
    st.divider()
    st.download_button(
        label="Download Full Report (.md)",
        data=_build_report(result),
        file_name="fundingforge_report.md",
        mime="text/markdown",
    )
