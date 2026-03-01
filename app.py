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
# CSS — "Refined Dark Forge" theme
# ---------------------------------------------------------------------------
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=IBM+Plex+Sans:wght@300;400;500&display=swap');

/* ── Base ── */
html, body { background-color: #0D1117 !important; }
.stApp { background-color: #0D1117 !important; color: #EAECEF !important; }
.main .block-container {
    padding-top: 0.5rem !important;
    padding-bottom: 3rem !important;
    max-width: 1360px !important;
}
* { font-family: 'IBM Plex Sans', sans-serif !important; }

/* ── Hide Streamlit chrome ── */
#MainMenu, header, footer,
[data-testid="stToolbar"],
[data-testid="stDecoration"] { visibility: hidden !important; height: 0 !important; }

/* ── Typography ── */
h1, h2, h3, h4, h5, .streamlit-expanderHeader,
[data-testid="stMarkdownContainer"] h1,
[data-testid="stMarkdownContainer"] h2,
[data-testid="stMarkdownContainer"] h3 {
    font-family: 'DM Sans', sans-serif !important;
    color: #EAECEF !important;
}
p, li, label, span { color: #EAECEF !important; }
[data-testid="stCaptionContainer"] p,
.stCaption { color: #8B949E !important; font-size: 0.82rem !important; }

/* ── Metrics ── */
[data-testid="stMetricValue"] {
    font-family: 'DM Sans', sans-serif !important;
    font-size: 2.2rem !important;
    font-weight: 700 !important;
    color: #F5A623 !important;
}
[data-testid="stMetricLabel"] p {
    color: #8B949E !important;
    font-size: 0.78rem !important;
    text-transform: uppercase !important;
    letter-spacing: 0.07em !important;
}

/* ── Progress ── */
[data-testid="stProgressBar"] > div {
    background-color: #21262D !important; border-radius: 4px !important;
}
[data-testid="stProgressBar"] > div > div {
    background: linear-gradient(90deg, #F5A623 0%, #ffcc55 100%) !important;
    border-radius: 4px !important;
}

/* ── Primary button ── */
button[kind="primary"],
[data-testid="baseButton-primary"] {
    background: linear-gradient(135deg, #F5A623 0%, #CC8800 100%) !important;
    color: #0D1117 !important; border: none !important;
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 700 !important; font-size: 0.95rem !important;
    border-radius: 8px !important; letter-spacing: 0.02em !important;
}
button[kind="primary"]:hover,
[data-testid="baseButton-primary"]:hover { opacity: 0.85 !important; }

/* ── Secondary button ── */
button[kind="secondary"],
[data-testid="baseButton-secondary"] {
    background: transparent !important; color: #F5A623 !important;
    border: 1px solid rgba(245,166,35,0.5) !important;
    font-family: 'DM Sans', sans-serif !important; font-weight: 600 !important;
    border-radius: 8px !important;
}
button[kind="secondary"]:hover { border-color: #F5A623 !important; }

/* ── Expanders ── */
[data-testid="stExpander"] {
    background-color: #161B22 !important;
    border: 1px solid #30363D !important; border-radius: 10px !important;
    margin-bottom: 10px !important;
}
.streamlit-expanderHeader {
    font-family: 'DM Sans', sans-serif !important; font-weight: 600 !important;
    color: #EAECEF !important; font-size: 1rem !important;
}
.streamlit-expanderContent { padding: 0 16px 16px 16px !important; }

/* ── Tabs ── */
.stTabs [data-baseweb="tab-list"] {
    background-color: #0D1117 !important;
    border-bottom: 1px solid #30363D !important; gap: 0 !important;
}
.stTabs [data-baseweb="tab"] {
    background: transparent !important; color: #8B949E !important;
    font-family: 'DM Sans', sans-serif !important; font-weight: 500 !important;
    padding: 10px 20px !important; border-bottom: 2px solid transparent !important;
}
.stTabs [aria-selected="true"] {
    color: #F5A623 !important; border-bottom-color: #F5A623 !important;
}
.stTabs [data-baseweb="tab-panel"] {
    background-color: #161B22 !important; padding: 20px 0 4px 0 !important;
}

/* ── Text area ── */
.stTextArea textarea {
    background-color: #0D1117 !important; color: #EAECEF !important;
    border: 1px solid #30363D !important; border-radius: 8px !important;
    font-family: 'IBM Plex Sans', sans-serif !important;
    font-size: 0.875rem !important; line-height: 1.65 !important;
}
.stTextArea textarea:focus {
    border-color: #F5A623 !important;
    box-shadow: 0 0 0 2px rgba(245,166,35,0.18) !important;
}

/* ── Selectbox / dropdowns ── */
[data-testid="stSelectbox"] > div > div,
.stSelectbox > div > div {
    background-color: #161B22 !important; border: 1px solid #30363D !important;
    border-radius: 8px !important; color: #EAECEF !important;
}

/* ── File uploader ── */
[data-testid="stFileUploadDropzone"] {
    background-color: #161B22 !important;
    border: 1.5px dashed rgba(245,166,35,0.45) !important;
    border-radius: 8px !important;
}

/* ── Alerts ── */
[data-testid="stAlert"] { border-radius: 8px !important; }

/* ── Status widget ── */
[data-testid="stStatusWidget"],
[data-testid="stStatus"] {
    background-color: #161B22 !important;
    border: 1px solid #30363D !important; border-radius: 10px !important;
}

/* ── Bordered container ── */
[data-testid="stVerticalBlockBorderWrapper"] > div {
    background-color: #161B22 !important;
    border: 1px solid #30363D !important; border-radius: 10px !important;
}

/* ── Divider ── */
hr { border-color: #30363D !important; margin: 1.2rem 0 !important; }

/* ─────────────────────────────────────────
   Custom component classes
───────────────────────────────────────── */
.brand-bar {
    background: rgba(22,27,34,0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #30363D;
    padding: 13px 0 13px 0;
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 0;
}
.wordmark {
    font-family: 'DM Sans', sans-serif !important;
    font-size: 1.35rem; font-weight: 700; letter-spacing: -0.02em;
}
.wordmark .f { color: #F5A623; }
.wordmark .g { color: #EAECEF; }

.stage-badge {
    background: rgba(245,166,35,0.12);
    color: #F5A623; border: 1px solid rgba(245,166,35,0.35);
    border-radius: 20px; padding: 2px 11px;
    font-size: 0.7rem; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    font-family: 'DM Sans', sans-serif !important;
}

.hero-headline {
    font-family: 'DM Sans', sans-serif !important;
    font-size: 3.2rem; font-weight: 700;
    line-height: 1.15; color: #EAECEF;
    margin: 0 0 12px 0;
}
.hero-sub {
    font-size: 1.1rem; color: #8B949E; margin: 0;
    font-family: 'IBM Plex Sans', sans-serif !important;
}

.feature-pill {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(245,166,35,0.08);
    border: 1px solid rgba(245,166,35,0.25);
    border-radius: 20px; padding: 8px 16px;
    font-size: 0.9rem; color: #D4A017; margin: 5px 4px 5px 0;
    font-family: 'IBM Plex Sans', sans-serif !important;
}

.collab-card {
    background: linear-gradient(135deg, #161B22 0%, #1A2033 100%);
    border: 1px solid #30363D; border-left: 3px solid #F5A623;
    border-radius: 8px; padding: 16px 20px; margin: 12px 0;
}
.collab-card .name {
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 600; font-size: 1.05rem; color: #EAECEF;
}
.collab-card .dept { font-size: 0.82rem; color: #8B949E; margin-top: 2px; }

.compliance-row {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 9px 0; border-bottom: 1px solid #21262D;
}
.compliance-row:last-child { border-bottom: none; }
.compliance-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
.compliance-label {
    font-size: 0.88rem; font-weight: 500; color: #EAECEF;
    font-family: 'IBM Plex Sans', sans-serif !important;
}
.compliance-desc { font-size: 0.78rem; color: #8B949E; margin-top: 1px; }

.score-chip {
    display: inline-block;
    background: rgba(245,166,35,0.15);
    color: #F5A623; border: 1px solid rgba(245,166,35,0.35);
    border-radius: 6px; padding: 2px 8px;
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 700; font-size: 0.95rem;
}
</style>
""", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Session state initialization
# ---------------------------------------------------------------------------
_DEFAULTS = {"stage": "intake", "results": None, "cv_text": "", "profile": {}}
for _k, _v in _DEFAULTS.items():
    if _k not in st.session_state:
        st.session_state[_k] = _v

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_report(result: dict) -> str:
    lines = ["# FundingForge Analysis Report\n", "## Researcher Profile\n",
             result.get("researcher_summary", ""), "\n"]
    for i, m in enumerate(result.get("matches", []), 1):
        lines += [
            f"\n---\n\n## Match {i}: {m.get('grant_title', '')} ({m.get('grant_agency', '')})\n",
            f"**Grant Match Score:** {m.get('grant_match_score', 0)}%  "
            f"|  **Collaborator Synergy Score:** {m.get('collaborator_synergy_score', 0)}%\n",
            f"\n### Why This Grant Fits\n{m.get('grant_justification', '')}\n",
            f"\n### Collaborator: {m.get('collaborator_name', '')}\n",
            f"_{m.get('collaborator_department', '')}_\n\n{m.get('collaborator_justification', '')}\n",
            f"\n### Draft Proposal\n{m.get('draft_proposal', '')}\n",
            f"\n### Outreach Email\n{m.get('draft_email', '')}\n",
        ]
    return "\n".join(lines)


def _compliance_items(agency: str) -> list[tuple]:
    """Return (icon, label, description) tuples for the compliance checklist."""
    agency_up = (agency or "").upper()
    base = [
        ("✅", "Conflict of Interest Disclosure", "Required for all PIs and Co-PIs"),
        ("✅", "Budget Narrative",                "Line-item justification required"),
        ("✅", "Data Management Plan",            "Must follow FAIR data principles"),
    ]
    if "NIH" in agency_up:
        base += [
            ("⚠️", "IRB Approval",         "Required if human subjects involved"),
            ("✅", "NIH Biosketch",          "5-page format, Other Support page"),
        ]
    elif "NSF" in agency_up:
        base += [
            ("✅", "Broader Impacts",        "2-page dedicated section required"),
            ("⚠️", "COA Form",              "Collaborators & Affiliations form"),
        ]
    elif "DOE" in agency_up:
        base += [
            ("⚠️", "NEPA Review",            "Environmental assessment may apply"),
            ("✅", "Technical Volume",        "Follow page limits in solicitation"),
        ]
    else:
        base += [
            ("⚠️", "Institutional Sign-Off", "Check with your grants office"),
            ("✅", "Compliance Certification","Certify compliance with all terms"),
        ]
    return base


def _brand_bar(badge: str) -> None:
    st.markdown(
        f"""<div class="brand-bar">
            <span class="wordmark"><span class="f">Funding</span><span class="g">Forge</span></span>
            <span class="stage-badge">{badge}</span>
        </div>""",
        unsafe_allow_html=True,
    )


# ---------------------------------------------------------------------------
# Stage 1 — Intake
# ---------------------------------------------------------------------------

def render_intake() -> None:
    _brand_bar("Intake")

    st.markdown("<div style='height:32px'></div>", unsafe_allow_html=True)

    # Hero
    st.markdown(
        """<div class="forge-hero">
            <p class="hero-headline">Turn your research<br>into <span style="color:#F5A623">funded reality.</span></p>
            <p class="hero-sub">Upload your CV and let AI match you with grants, collaborators, and a ready-to-submit proposal.</p>
        </div>""",
        unsafe_allow_html=True,
    )

    st.markdown("<div style='height:16px'></div>", unsafe_allow_html=True)
    left, right = st.columns([1, 1], gap="large")

    # Left — feature highlights
    with left:
        st.markdown("<div style='padding-top:12px'>", unsafe_allow_html=True)
        for pill in [
            "🎯 &nbsp; Intelligent Grant Matching",
            "🤝 &nbsp; Collaborator Discovery",
            "📋 &nbsp; Compliance Verification",
            "✍️ &nbsp; AI Proposal Drafting",
            "✉️ &nbsp; Outreach Email Generation",
        ]:
            st.markdown(f'<div class="feature-pill">{pill}</div>', unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

    # Right — intake form card
    with right:
        with st.container(border=True):
            st.markdown(
                "<p style='font-family:DM Sans,sans-serif;font-weight:700;"
                "font-size:1.15rem;margin:0 0 16px 0;color:#EAECEF'>Build Your Profile</p>",
                unsafe_allow_html=True,
            )

            col_r, col_y = st.columns(2)
            with col_r:
                role = st.selectbox("Role", ["Faculty", "Postdoc", "PhD Student", "Graduate Student", "Researcher"], key="sel_role")
            with col_y:
                year = st.selectbox("Career Stage", ["Early Career (0–3 yrs)", "Mid Career (4–10 yrs)", "Senior (10+ yrs)"], key="sel_year")

            interests = st.text_area(
                "Research Interests",
                placeholder="e.g. machine learning for protein folding, computational neuroscience…",
                height=90,
                key="txt_interests",
            )

            uploaded_file = st.file_uploader(
                "Upload CV (PDF)",
                type=["pdf"],
                help="Upload your academic CV as a PDF.",
                key="cv_upload",
            )

            st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)

            forge_btn = st.button(
                "✨  Forge My Profile",
                type="primary",
                use_container_width=True,
                disabled=(uploaded_file is None),
            )

        if forge_btn and uploaded_file:
            try:
                reader = PdfReader(io.BytesIO(uploaded_file.read()))
                cv_raw = "\n".join(p.extract_text() or "" for p in reader.pages).strip()
            except Exception as e:
                st.error(f"Failed to read PDF: {e}")
                st.stop()

            if not cv_raw:
                st.error("No extractable text found. Please use a non-scanned PDF.")
                st.stop()

            # Enrich with intake form context
            enriched = (
                f"Researcher Profile from intake form:\n"
                f"- Role: {role}\n"
                f"- Career Stage: {year}\n"
                f"- Stated Research Interests: {interests or 'Not provided'}\n\n"
                f"--- CV CONTENT ---\n{cv_raw}"
            )
            st.session_state.cv_text = enriched
            st.session_state.profile = {"role": role, "year": year, "interests": interests}
            st.session_state.stage = "processing"
            st.rerun()


# ---------------------------------------------------------------------------
# Stage 2 — Processing
# ---------------------------------------------------------------------------

def render_processing() -> None:
    _brand_bar("Forging")

    st.markdown("<div style='height:40px'></div>", unsafe_allow_html=True)
    _, center, _ = st.columns([1, 2, 1])

    with center:
        st.markdown(
            "<p style='font-family:DM Sans,sans-serif;font-size:1.5rem;"
            "font-weight:700;text-align:center;color:#EAECEF;margin-bottom:24px'>"
            "⚒️ Forging your packet…</p>",
            unsafe_allow_html=True,
        )

        called_tools: set = set()
        _script_ctx = get_script_run_ctx()

        with st.status("Agent pipeline running…", expanded=True) as status:
            st.write("Analyzing CV and extracting researcher profile…")

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
                msgs = {
                    "search_grant_opportunities":        "Querying grant Knowledge Base…",
                    "search_complementary_collaborators": f"Finding collaborator for grant {max(1, len(called_tools) - 1)}/3…",
                    "search_institutional_policies":     "Retrieving compliance & policy guidelines…",
                }
                msg = msgs.get(tool_name)
                if msg:
                    st.write(msg)

            try:
                result = run_agent(st.session_state.cv_text, callback=on_event)
                st.write("Synthesizing final packet…")
                status.update(label="Packet forged successfully!", state="complete", expanded=False)
            except BaseException as e:
                status.update(label="An error occurred.", state="error", expanded=True)
                st.error(f"Agent error — {type(e).__name__}: {e}")
                if st.button("↩ Back to Start"):
                    st.session_state.stage = "intake"
                    st.rerun()
                st.stop()

        if result.get("_parse_error") or not result.get("matches"):
            st.error("The agent did not return structured results.")
            with st.expander("Raw agent output"):
                st.code(result.get("_raw", ""), language=None)
            if st.button("↩ Back to Start", key="back_parse"):
                st.session_state.stage = "intake"
                st.rerun()
            st.stop()

        st.session_state.results = result
        st.session_state.stage = "results"
        st.rerun()


# ---------------------------------------------------------------------------
# Stage 3 — Results Dashboard
# ---------------------------------------------------------------------------

def render_results() -> None:
    result = st.session_state.results or {}

    # Top bar with reset
    bar_left, bar_right = st.columns([5, 1])
    with bar_left:
        _brand_bar("Results")
    with bar_right:
        st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)
        if st.button("↺  Reset", type="secondary"):
            for k in list(_DEFAULTS.keys()):
                st.session_state.pop(k, None)
            st.rerun()

    st.markdown("<div style='height:20px'></div>", unsafe_allow_html=True)

    # ── Researcher profile + top metrics ──────────────────────────────────
    left_col, right_col = st.columns([1, 2], gap="large")

    with left_col:
        st.markdown(
            "<p style='font-family:DM Sans,sans-serif;font-size:1.1rem;"
            "font-weight:700;color:#F5A623;letter-spacing:0.04em;"
            "text-transform:uppercase;margin-bottom:10px'>Researcher Profile</p>",
            unsafe_allow_html=True,
        )
        with st.container(border=True):
            st.markdown(result.get("researcher_summary", "_No profile extracted._"))

        # Aggregate scores from best match
        matches = result.get("matches", [])
        if matches:
            best = matches[0]
            st.markdown("<div style='height:16px'></div>", unsafe_allow_html=True)
            m1, m2 = st.columns(2)
            with m1:
                st.metric("Top Grant Match", f"{best.get('grant_match_score', 0)}%")
                st.progress(best.get("grant_match_score", 0) / 100)
            with m2:
                st.metric("Top Synergy Score", f"{best.get('collaborator_synergy_score', 0)}%")
                st.progress(best.get("collaborator_synergy_score", 0) / 100)

        # Full report download
        st.markdown("<div style='height:12px'></div>", unsafe_allow_html=True)
        st.download_button(
            label="⬇ Download Full Report",
            data=_build_report(result),
            file_name="fundingforge_report.md",
            mime="text/markdown",
            use_container_width=True,
        )

    # ── Grant Matches ──────────────────────────────────────────────────────
    with right_col:
        st.markdown(
            "<p style='font-family:DM Sans,sans-serif;font-size:1.1rem;"
            "font-weight:700;color:#F5A623;letter-spacing:0.04em;"
            "text-transform:uppercase;margin-bottom:10px'>Top 3 Grant Matches</p>",
            unsafe_allow_html=True,
        )

        medals = ["🥇", "🥈", "🥉"]

        for i, match in enumerate(matches[:3], 1):
            grant_score  = match.get("grant_match_score", 0)
            collab_score = match.get("collaborator_synergy_score", 0)
            title        = match.get("grant_title", f"Grant {i}")
            agency       = match.get("grant_agency", "")
            medal        = medals[i - 1]

            with st.expander(
                f"{medal}  {title}  —  {grant_score}% Match",
                expanded=(i == 1),
            ):
                # Score row
                sc1, sc2 = st.columns(2)
                with sc1:
                    st.metric("Grant Match", f"{grant_score}%")
                    st.progress(grant_score / 100)
                with sc2:
                    st.metric("Collaborator Synergy", f"{collab_score}%")
                    st.progress(collab_score / 100)

                if agency:
                    st.caption(f"Funding Agency: **{agency}**")

                st.markdown("**Why this grant fits your profile**")
                st.info(match.get("grant_justification", ""))

                # Collaborator mesh card
                collab_name = match.get("collaborator_name", "Unknown Collaborator")
                collab_dept = match.get("collaborator_department", "")
                collab_just = match.get("collaborator_justification", "")
                st.markdown(
                    f"""<div class="collab-card">
                        <div class="name">🤝 &nbsp; {collab_name}</div>
                        <div class="dept">{collab_dept}</div>
                        <p style="margin-top:10px;font-size:0.9rem;color:#C9D1D9">{collab_just}</p>
                        <div style="margin-top:6px">
                            <span class="score-chip">{collab_score}% Synergy</span>
                        </div>
                    </div>""",
                    unsafe_allow_html=True,
                )

                # Compliance checklist
                st.markdown("**Compliance Checklist**")
                items_html = "".join(
                    f"""<div class="compliance-row">
                        <span class="compliance-icon">{icon}</span>
                        <div>
                            <div class="compliance-label">{label}</div>
                            <div class="compliance-desc">{desc}</div>
                        </div>
                    </div>"""
                    for icon, label, desc in _compliance_items(agency)
                )
                st.markdown(
                    f'<div style="background:#0D1117;border:1px solid #21262D;'
                    f'border-radius:8px;padding:8px 14px;margin-bottom:12px">{items_html}</div>',
                    unsafe_allow_html=True,
                )

                st.divider()

                # Proposal + Email tabs
                tab_proposal, tab_email = st.tabs(["📄 Proposal Assistant", "✉️ Outreach Email"])

                with tab_proposal:
                    proposal_key = f"proposal_{i}"
                    if proposal_key not in st.session_state:
                        st.session_state[proposal_key] = match.get("draft_proposal", "")
                    edited = st.text_area(
                        "Edit the proposal draft below:",
                        value=st.session_state[proposal_key],
                        height=260,
                        key=f"ta_proposal_{i}",
                        label_visibility="collapsed",
                    )
                    st.download_button(
                        label=f"⬇ Download Proposal — {title[:40]}",
                        data=edited,
                        file_name=f"proposal_grant_{i}.md",
                        mime="text/markdown",
                        key=f"dl_proposal_{i}",
                    )

                with tab_email:
                    raw_email = match.get("draft_email", "_No email generated._").replace("\\n", "\n")
                    email_key = f"email_{i}"
                    if email_key not in st.session_state:
                        st.session_state[email_key] = raw_email
                    st.text_area(
                        "Edit the outreach email below:",
                        value=st.session_state[email_key],
                        height=260,
                        key=f"ta_email_{i}",
                        label_visibility="collapsed",
                    )


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------
_STAGES = {
    "intake":     render_intake,
    "processing": render_processing,
    "results":    render_results,
}
_STAGES.get(st.session_state.stage, render_intake)()
