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

st.markdown("")  # small spacing

# ---------------------------------------------------------------------------
# Submit button
# ---------------------------------------------------------------------------
_, col_btn, _ = st.columns([2, 1, 2])
with col_btn:
    submit = st.button(
        "Find Grants & Collaborators",
        type="primary",
        use_container_width=True,
        disabled=(uploaded_file is None),
    )

# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------
if submit:
    # --- PDF extraction ---
    try:
        reader = PdfReader(io.BytesIO(uploaded_file.read()))
        cv_text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    except Exception as e:
        st.error(f"Failed to read the PDF: {e}")
        st.stop()

    if not cv_text:
        st.error(
            "Could not extract any text from this PDF. "
            "Please ensure it is not a scanned image-only file."
        )
        st.stop()

    # --- Agent execution with live progress ---
    result = {}
    called_tools: set = set()
    # Capture Streamlit's script context so the callback can use st.write
    # even when Strands invokes it from a background thread.
    _script_ctx = get_script_run_ctx()

    with st.status("FundingForge agent is working...", expanded=True) as status:
        st.write("Extracting and analyzing CV content...")

        def on_event(**kwargs):
            """Strands streaming callback – updates the status widget in real time."""
            # Re-attach Streamlit's context to whichever thread this runs in.
            add_script_run_ctx(threading.current_thread(), _script_ctx)

            tool_name = None
            for key in ("current_tool_use", "tool_use", "toolUse"):
                val = kwargs.get(key)
                if isinstance(val, dict):
                    tool_name = val.get("name") or val.get("toolName")
                    break

            if tool_name and tool_name not in called_tools:
                called_tools.add(tool_name)
                messages = {
                    "search_grant_opportunities":        "Searching grant opportunities in Knowledge Base...",
                    "search_complementary_collaborators":"Finding complementary collaborators...",
                    "search_institutional_policies":     "Retrieving institutional policies & guidelines...",
                }
                msg = messages.get(tool_name)
                if msg:
                    st.write(msg)

        try:
            result = run_agent(cv_text, callback=on_event)
            st.write("Synthesizing final report...")
            status.update(label="Analysis complete!", state="complete", expanded=False)
        except BaseException as e:
            status.update(label="An error occurred.", state="error", expanded=True)
            st.error(f"Agent error: {type(e).__name__}: {e}")
            st.stop()

    # --- Score metrics ---
    st.markdown("### Match Scores")
    col_m1, col_m2 = st.columns(2)

    grant_score = result.get("grant_match_score", 0)
    collab_score = result.get("collaborator_synergy_score", 0)

    with col_m1:
        st.metric(label="Grant Match Score", value=f"{grant_score}%")
        st.progress(grant_score / 100)

    with col_m2:
        st.metric(label="Collaborator Synergy Score", value=f"{collab_score}%")
        st.progress(collab_score / 100)

    st.divider()

    # --- Synergy analysis summary ---
    if result.get("synergy_analysis"):
        st.info(result["synergy_analysis"])

    # --- Matched grant ---
    st.markdown("### Matched Grant")
    if result.get("matched_grant"):
        st.markdown(result["matched_grant"])
    else:
        st.markdown("_No grant details extracted._")

    # --- Recommended collaborator ---
    st.markdown("### Recommended Collaborator")
    if result.get("recommended_collaborator"):
        st.markdown(result["recommended_collaborator"])
    else:
        st.markdown("_No collaborator details extracted._")

    # --- Draft proposal ---
    st.markdown("### Draft Grant Proposal Abstract")
    with st.expander("View Draft Proposal", expanded=True):
        st.markdown(result.get("draft_proposal") or "_No proposal generated._")

    # --- Draft email ---
    st.markdown("### Draft Outreach Email")
    with st.expander("View Draft Email", expanded=True):
        st.markdown(result.get("draft_email") or "_No email generated._")

    # --- Download ---
    st.divider()
    report_md = f"""# FundingForge Analysis Report

## Grant Match Score: {grant_score}%
## Collaborator Synergy Score: {collab_score}%

---

{result.get("raw", "")}
"""
    st.download_button(
        label="Download Full Report (.md)",
        data=report_md,
        file_name="fundingforge_report.md",
        mime="text/markdown",
        use_container_width=False,
    )
