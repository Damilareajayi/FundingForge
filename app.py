import io
import base64
import threading
from pathlib import Path

import streamlit as st
from streamlit.runtime.scriptrunner import add_script_run_ctx, get_script_run_ctx
from pypdf import PdfReader
from agents import run_agent

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="FundingForge · FSU",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ---------------------------------------------------------------------------
# Logo (base64-encoded for inline HTML)
# ---------------------------------------------------------------------------
_LOGO_PATH = Path(__file__).parent / "attached_assets" / "FundingForge_Logo_1772196329334.png"
_LOGO_B64 = base64.b64encode(_LOGO_PATH.read_bytes()).decode() if _LOGO_PATH.exists() else ""

# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------
YEAR_OPTIONS: dict[str, list[str]] = {
    "Faculty": [
        "Assistant Professor", "Associate Professor", "Full Professor",
        "Lecturer / Instructor", "Adjunct Faculty", "Research Faculty / Scientist",
    ],
    "Grad Student": [
        "Master's — Year 1", "Master's — Year 2",
        "PhD — Year 1", "PhD — Year 2", "PhD — Year 3",
        "PhD — Year 4", "PhD — Year 5+",
    ],
    "Undergraduate": [
        "Freshman (Year 1)", "Sophomore (Year 2)",
        "Junior (Year 3)", "Senior (Year 4)",
    ],
}

PROGRAMS = [
    "Biological Science", "Biomedical Sciences", "Chemistry & Biochemistry",
    "Computer Science", "Mathematics", "Physics", "Psychology",
    "Electrical & Computer Engineering", "Mechanical Engineering",
    "Civil & Environmental Engineering", "Chemical & Biomedical Engineering",
    "College of Medicine", "Nursing", "College of Law",
    "Business Administration", "College of Education",
    "Communication & Information", "Social Work",
    "Criminology & Criminal Justice", "Political Science",
    "Economics", "Statistics", "Neuroscience",
    "Environmental Sciences", "Urban & Regional Planning",
    "Art & Art History", "Music", "Film", "Other",
]

# ---------------------------------------------------------------------------
# CSS — FSU Forge Light Theme
# ---------------------------------------------------------------------------
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=IBM+Plex+Sans:wght@300;400;500&display=swap');

/* ── Base ── */
html, body { background: #F0F2F8 !important; }
.stApp { background: #F0F2F8 !important; }
* { font-family: 'IBM Plex Sans', sans-serif !important; box-sizing: border-box; }
.main .block-container {
    padding-top: 0 !important;
    padding-bottom: 3rem !important;
    max-width: 1320px !important;
}

/* ── Hide Streamlit chrome ── */
#MainMenu, header, footer,
[data-testid="stToolbar"],
[data-testid="stDecoration"] { visibility: hidden !important; height: 0 !important; }

/* ── Typography ── */
h1, h2, h3, h4, h5,
.streamlit-expanderHeader,
[data-testid="stMarkdownContainer"] h1,
[data-testid="stMarkdownContainer"] h2,
[data-testid="stMarkdownContainer"] h3 {
    font-family: 'DM Sans', sans-serif !important;
    color: #1A1D2E !important;
}
p, li, label, span { color: #374151 !important; }
[data-testid="stCaptionContainer"] p,
.stCaption { color: #9CA3AF !important; font-size: 0.8rem !important; }

/* ── Metrics ── */
[data-testid="stMetricValue"] {
    font-family: 'DM Sans', sans-serif !important;
    font-size: 2rem !important; font-weight: 700 !important;
    color: #F5A623 !important;
}
[data-testid="stMetricLabel"] p {
    color: #6B7280 !important; font-size: 0.75rem !important;
    text-transform: uppercase !important; letter-spacing: 0.07em !important;
}

/* ── Progress bars ── */
[data-testid="stProgressBar"] > div {
    background: #E5E7EB !important; border-radius: 6px !important;
}
[data-testid="stProgressBar"] > div > div {
    background: linear-gradient(90deg, #782F40 0%, #A84055 100%) !important;
    border-radius: 6px !important;
}

/* ── Primary button (FSU Garnet) ── */
button[kind="primary"],
[data-testid="baseButton-primary"] {
    background: linear-gradient(135deg, #782F40 0%, #9B3D53 100%) !important;
    color: #FFFFFF !important; border: none !important;
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 700 !important; font-size: 0.95rem !important;
    border-radius: 8px !important; letter-spacing: 0.02em !important;
}
button[kind="primary"]:hover { opacity: 0.88 !important; }

/* ── Secondary button ── */
button[kind="secondary"],
[data-testid="baseButton-secondary"] {
    background: #FFFFFF !important; color: #782F40 !important;
    border: 1.5px solid #782F40 !important;
    font-family: 'DM Sans', sans-serif !important; font-weight: 600 !important;
    border-radius: 8px !important;
}
button[kind="secondary"]:hover {
    background: rgba(120,47,64,0.05) !important;
}

/* ── Expanders ── */
[data-testid="stExpander"] {
    background: #FFFFFF !important;
    border: 1px solid #E5E7EB !important; border-radius: 12px !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important;
    margin-bottom: 12px !important;
}
.streamlit-expanderHeader {
    font-family: 'DM Sans', sans-serif !important; font-weight: 600 !important;
    color: #1A1D2E !important; font-size: 1rem !important;
}
.streamlit-expanderContent { padding: 0 16px 16px !important; }

/* ── Tabs ── */
.stTabs [data-baseweb="tab-list"] {
    background: #F9FAFB !important;
    border-bottom: 1px solid #E5E7EB !important; gap: 0 !important;
}
.stTabs [data-baseweb="tab"] {
    background: transparent !important; color: #9CA3AF !important;
    font-family: 'DM Sans', sans-serif !important; font-weight: 500 !important;
    padding: 10px 20px !important; border-bottom: 2px solid transparent !important;
}
.stTabs [aria-selected="true"] {
    color: #782F40 !important; border-bottom-color: #782F40 !important;
}
.stTabs [data-baseweb="tab-panel"] {
    background: #FFFFFF !important; padding: 20px 0 4px 0 !important;
}

/* ── Text area ── */
.stTextArea textarea {
    background: #F9FAFB !important; color: #1A1D2E !important;
    border: 1.5px solid #E5E7EB !important; border-radius: 8px !important;
    font-size: 0.875rem !important; line-height: 1.65 !important;
}
.stTextArea textarea:focus {
    border-color: #782F40 !important;
    box-shadow: 0 0 0 3px rgba(120,47,64,0.1) !important;
}

/* ── Selectbox ── */
[data-testid="stSelectbox"] > div > div,
.stSelectbox > div > div {
    background: #FFFFFF !important; border: 1.5px solid #E5E7EB !important;
    border-radius: 8px !important; color: #1A1D2E !important;
}

/* ── File uploader ── */
[data-testid="stFileUploadDropzone"] {
    background: #FAFBFF !important;
    border: 1.5px dashed #C4B5C8 !important; border-radius: 10px !important;
}

/* ── Alerts ── */
[data-testid="stAlert"] { border-radius: 8px !important; }

/* ── Status widget ── */
[data-testid="stStatusWidget"], [data-testid="stStatus"] {
    background: #FFFFFF !important;
    border: 1px solid #E5E7EB !important; border-radius: 12px !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important;
}

/* ── Bordered container ── */
[data-testid="stVerticalBlockBorderWrapper"] > div {
    background: #FFFFFF !important;
    border: 1px solid #E5E7EB !important; border-radius: 12px !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important;
}

/* ── Divider ── */
hr { border-color: #E5E7EB !important; margin: 1.2rem 0 !important; }

/* ─────────────────────────────────────────
   Custom HTML component classes
───────────────────────────────────────── */

/* Nav bar */
.ff-nav {
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #E5E7EB;
    padding: 12px 0;
    display: flex; align-items: center; gap: 16px;
    margin-bottom: 0;
}
.ff-logo { height: 42px; width: auto; }
.ff-wordmark {
    font-family: 'DM Sans', sans-serif !important;
    font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em;
    line-height: 1;
}
.ff-wordmark .ff { color: #782F40; }
.ff-wordmark .gg { color: #CEB888; }
.ff-tagline {
    font-size: 0.75rem; color: #9CA3AF;
    font-family: 'IBM Plex Sans', sans-serif !important;
    margin-top: 2px;
}

/* Stepper */
.stepper-wrap {
    display: flex; align-items: center; gap: 0; margin-left: auto;
}
.stepper-step {
    display: flex; align-items: center; gap: 7px;
    padding: 6px 14px; border-radius: 20px;
    font-family: 'DM Sans', sans-serif !important;
    font-size: 0.78rem; font-weight: 600;
    white-space: nowrap;
}
.stepper-step.active {
    background: #782F40; color: #fff;
}
.stepper-step.done {
    background: rgba(120,47,64,0.12); color: #782F40;
}
.stepper-step.pending {
    background: #F3F4F6; color: #9CA3AF;
}
.stepper-step .snum {
    width: 20px; height: 20px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 0.72rem; font-weight: 700; flex-shrink: 0;
    background: rgba(255,255,255,0.3);
}
.stepper-step.done .snum { background: #782F40; color: #fff; }
.stepper-step.pending .snum { background: #D1D5DB; color: #6B7280; }
.stepper-connector {
    width: 28px; height: 2px; background: #E5E7EB; flex-shrink: 0;
}
.stepper-connector.done { background: #782F40; }

/* Hero */
.hero-wrap { padding: 40px 0 24px; }
.hero-kicker {
    font-size: 0.8rem; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; color: #782F40; margin-bottom: 10px;
}
.hero-h1 {
    font-family: 'DM Sans', sans-serif !important;
    font-size: 3rem; font-weight: 700; line-height: 1.12;
    color: #1A1D2E; margin: 0 0 14px;
}
.hero-h1 .acc { color: #782F40; }
.hero-sub {
    font-size: 1.05rem; color: #6B7280; line-height: 1.6;
    max-width: 580px; margin: 0;
}

/* Feature tiles */
.feat-tile {
    background: #FFFFFF;
    border: 1px solid #E5E7EB; border-radius: 12px;
    padding: 18px 20px; margin-bottom: 12px;
    display: flex; align-items: flex-start; gap: 14px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.feat-icon { font-size: 1.4rem; flex-shrink: 0; margin-top: 1px; }
.feat-title {
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 600; font-size: 0.95rem; color: #1A1D2E; margin-bottom: 2px;
}
.feat-desc { font-size: 0.8rem; color: #6B7280; line-height: 1.45; }

/* Role cards */
.role-card {
    background: #FFFFFF;
    border: 2px solid #E5E7EB; border-radius: 14px;
    padding: 22px 18px; text-align: center;
    transition: all 0.15s ease;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    min-height: 190px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.role-card.selected {
    border-color: #782F40;
    background: rgba(120,47,64,0.04);
    box-shadow: 0 0 0 3px rgba(120,47,64,0.12);
}
.role-icon { font-size: 2.2rem; margin-bottom: 10px; }
.role-name {
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 700; font-size: 1.05rem; color: #1A1D2E; margin-bottom: 6px;
}
.role-desc { font-size: 0.8rem; color: #6B7280; line-height: 1.5; }
.role-check {
    margin-top: 10px;
    background: #782F40; color: #fff;
    border-radius: 20px; padding: 2px 12px;
    font-size: 0.72rem; font-weight: 600; display: inline-block;
}

/* Form section header */
.form-section-label {
    font-family: 'DM Sans', sans-serif !important;
    font-size: 0.72rem; font-weight: 600; color: #782F40;
    text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;
}

/* Collaborator card */
.collab-card {
    background: linear-gradient(135deg, #FEF3F5 0%, #FFF8F4 100%);
    border: 1px solid #F3C5CC; border-left: 4px solid #782F40;
    border-radius: 10px; padding: 16px 20px; margin: 12px 0;
}
.collab-name {
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 700; font-size: 1.05rem; color: #1A1D2E;
}
.collab-dept { font-size: 0.82rem; color: #6B7280; margin-top: 2px; }

/* Compliance table */
.comp-row {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 9px 0; border-bottom: 1px solid #F3F4F6;
}
.comp-row:last-child { border-bottom: none; }
.comp-icon { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
.comp-label { font-size: 0.88rem; font-weight: 600; color: #1A1D2E; }
.comp-desc { font-size: 0.78rem; color: #6B7280; margin-top: 1px; }

/* Score chip */
.score-chip {
    display: inline-block;
    background: rgba(245,166,35,0.12);
    color: #B07500; border: 1px solid rgba(245,166,35,0.4);
    border-radius: 6px; padding: 2px 9px;
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 700; font-size: 0.9rem;
}

/* Section header in results */
.results-section-label {
    font-family: 'DM Sans', sans-serif !important;
    font-size: 0.72rem; font-weight: 700; color: #782F40;
    text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;
}

/* FSU divider spear motif */
.spear-divider {
    display: flex; align-items: center; gap: 12px;
    margin: 16px 0; color: #D1D5DB; font-size: 0.75rem;
}
.spear-divider::before, .spear-divider::after {
    content: ''; flex: 1; height: 1px; background: #E5E7EB;
}
</style>
""", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------
_DEFAULTS = {
    "stage": "intake", "results": None,
    "cv_text": "", "profile": {}, "sel_role": "",
}
for _k, _v in _DEFAULTS.items():
    if _k not in st.session_state:
        st.session_state[_k] = _v

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _stepper(stage: str) -> str:
    order   = {"intake": 0, "processing": 1, "results": 2}
    labels  = [("1", "Intake"), ("2", "Discovery"), ("3", "Packet")]
    cur     = order.get(stage, 0)
    html    = '<div class="stepper-wrap">'
    for i, (num, lbl) in enumerate(labels):
        cls = "active" if i == cur else ("done" if i < cur else "pending")
        icon = "✓" if i < cur else num
        html += f'<div class="stepper-step {cls}"><span class="snum">{icon}</span>{lbl}</div>'
        if i < 2:
            conn = "done" if i < cur else ""
            html += f'<div class="stepper-connector {conn}"></div>'
    html += "</div>"
    return html


def _nav(stage: str, right_extra: str = "") -> None:
    logo_img = (f'<img src="data:image/png;base64,{_LOGO_B64}" class="ff-logo" />'
                if _LOGO_B64 else "")
    st.markdown(
        f"""<div class="ff-nav">
            {logo_img}
            <div>
                <div class="ff-wordmark"><span class="ff">Funding</span><span class="gg">Forge</span></div>
                <div class="ff-tagline">AI-Powered Grant Intelligence &nbsp;·&nbsp; FSU Research Office</div>
            </div>
            <div style="margin-left:auto;display:flex;align-items:center;gap:16px">
                {_stepper(stage)}
                {right_extra}
            </div>
        </div>""",
        unsafe_allow_html=True,
    )


def _build_report(result: dict) -> str:
    lines = ["# FundingForge Analysis Report\n", "## Researcher Profile\n",
             result.get("researcher_summary", ""), "\n"]
    for i, m in enumerate(result.get("matches", []), 1):
        lines += [
            f"\n---\n\n## Match {i}: {m.get('grant_title','')} ({m.get('grant_agency','')})\n",
            f"**Grant Match Score:** {m.get('grant_match_score',0)}%  "
            f"|  **Collaborator Synergy Score:** {m.get('collaborator_synergy_score',0)}%\n",
            f"\n### Why This Grant Fits\n{m.get('grant_justification','')}\n",
            f"\n### Collaborator: {m.get('collaborator_name','')}\n",
            f"_{m.get('collaborator_department','')}_\n\n{m.get('collaborator_justification','')}\n",
            f"\n### Draft Proposal\n{m.get('draft_proposal','')}\n",
            f"\n### Outreach Email\n{m.get('draft_email','')}\n",
        ]
    return "\n".join(lines)


def _compliance_items(agency: str) -> list[tuple]:
    a = (agency or "").upper()
    base = [
        ("✅", "Conflict of Interest Disclosure", "Required for all PIs and Co-PIs"),
        ("✅", "Budget Narrative", "Line-item justification required"),
        ("✅", "Data Management Plan", "Must comply with FAIR data principles"),
        ("⚠️", "RAMP System Submission", "FSU pre-award routing required"),
    ]
    if "NIH" in a:
        base += [("⚠️", "IRB Approval", "Required if human subjects are involved"),
                 ("✅", "NIH Biosketch", "5-page format + Other Support page")]
    elif "NSF" in a:
        base += [("✅", "Broader Impacts Statement", "2-page dedicated section required"),
                 ("⚠️", "COA Form", "Collaborators & Other Affiliations required")]
    elif "DOE" in a:
        base += [("⚠️", "NEPA Review", "Environmental assessment may apply"),
                 ("✅", "Technical Volume", "Follow page limits in the solicitation")]
    else:
        base += [("⚠️", "Institutional Sign-Off", "Verify requirements with grants office"),
                 ("✅", "Compliance Certification", "Certify compliance with all program terms")]
    return base


# ---------------------------------------------------------------------------
# Stage 1 — Intake
# ---------------------------------------------------------------------------

def render_intake() -> None:
    _nav("intake")
    st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)

    left, right = st.columns([1, 1], gap="large")

    # ── Left: Hero + feature tiles ─────────────────────────────────────────
    with left:
        st.markdown("""
        <div class="hero-wrap">
            <div class="hero-kicker">FSU AI Maker Challenge · FundingForge</div>
            <h1 class="hero-h1">Turn your research<br>into <span class="acc">funded reality.</span></h1>
            <p class="hero-sub">FundingForge matches your profile to the right grants, checks compliance,
            finds collaborators, and drafts your proposal — powered by AI agents.</p>
        </div>""", unsafe_allow_html=True)

        for icon, title, desc in [
            ("🎯", "Grant Matching",    "AI matches grants to your profile from our curated database"),
            ("📋", "Compliance Check",  "Policy & RAMP checklist verified against FSU requirements"),
            ("✍️", "Proposal Draft",    "Full tailored proposal scaffold ready for your edits"),
        ]:
            st.markdown(
                f'<div class="feat-tile"><span class="feat-icon">{icon}</span>'
                f'<div><div class="feat-title">{title}</div>'
                f'<div class="feat-desc">{desc}</div></div></div>',
                unsafe_allow_html=True,
            )

    # ── Right: Form ──────────────────────────────────────────────────────────
    with right:
        st.markdown("<div style='height:20px'></div>", unsafe_allow_html=True)

        # Role cards
        st.markdown('<div class="form-section-label">Select your role</div>',
                    unsafe_allow_html=True)
        rc1, rc2, rc3 = st.columns(3)
        role_defs = [
            ("Faculty",      "👨‍🏫",
             "Pre-award routing, collaborator mesh, and compliance-aware packet generation."),
            ("Grad Student", "🎓",
             "Fellowship targeting, narrative scaffolding, and mentorship alignment for PhD & MSc."),
            ("Undergraduate","📚",
             "Fast discovery, simplified compliance guidance, and mentorship connection."),
        ]
        for col, (rname, icon, desc) in zip([rc1, rc2, rc3], role_defs):
            with col:
                sel = st.session_state.sel_role == rname
                check = '<span class="role-check">✓ Selected</span>' if sel else ""
                st.markdown(
                    f'<div class="role-card {"selected" if sel else ""}">'
                    f'<div class="role-icon">{icon}</div>'
                    f'<div class="role-name">{rname}</div>'
                    f'<div class="role-desc">{desc}</div>'
                    f'{check}</div>',
                    unsafe_allow_html=True,
                )
                if st.button(
                    "✓" if sel else "Select",
                    key=f"role_{rname}",
                    use_container_width=True,
                    type="primary" if sel else "secondary",
                ):
                    st.session_state.sel_role = rname
                    st.rerun()

        sel_role = st.session_state.sel_role
        st.markdown("<div style='height:6px'></div>", unsafe_allow_html=True)

        if sel_role:
            with st.container(border=True):
                st.markdown(
                    f'<div class="form-section-label">Build Your Profile</div>'
                    f'<p style="font-size:0.82rem;color:#6B7280;margin:0 0 14px">'
                    f'Your answers unlock tailored grant discovery and a compliance-aware proposal.</p>',
                    unsafe_allow_html=True,
                )

                col_lv, col_pg = st.columns(2)
                with col_lv:
                    level = st.selectbox(
                        "Year / Level",
                        options=YEAR_OPTIONS.get(sel_role, []),
                        index=None,
                        placeholder="Select level",
                        key=f"sel_level_{sel_role}",
                    )
                with col_pg:
                    program = st.selectbox(
                        "Program / Department",
                        options=PROGRAMS,
                        index=None,
                        placeholder="Select program",
                        key="sel_program",
                    )

                st.markdown(
                    '<div style="margin-top:4px"><label style="font-size:0.85rem;'
                    'font-weight:500;color:#374151">Research Interests '
                    '<span style="color:#9CA3AF;font-weight:400">(optional but recommended)</span>'
                    '</label></div>',
                    unsafe_allow_html=True,
                )
                interests = st.text_area(
                    "Research Interests",
                    placeholder="e.g. machine learning for protein folding, computational neuroscience, climate modeling…",
                    height=90,
                    key="txt_interests",
                    label_visibility="collapsed",
                )

                st.markdown(
                    '<div style="margin-top:4px"><label style="font-size:0.85rem;'
                    'font-weight:500;color:#374151">Upload CV / Resume '
                    '<span style="color:#9CA3AF;font-weight:400">(optional — improves proposal quality)</span>'
                    '</label></div>',
                    unsafe_allow_html=True,
                )
                uploaded_file = st.file_uploader(
                    "CV",
                    type=["pdf", "doc", "docx", "txt"],
                    help="Drop your CV here — improves match quality.",
                    key="cv_upload",
                    label_visibility="collapsed",
                )
                if not uploaded_file:
                    st.caption("Drop your CV here or browse  ·  PDF, DOC, DOCX, TXT up to 10 MB")

                st.markdown("<div style='height:6px'></div>", unsafe_allow_html=True)

                can_submit = bool(sel_role and level and program)
                forge_btn = st.button(
                    "⚒️  Forge My Grant Profile",
                    type="primary",
                    use_container_width=True,
                    disabled=not can_submit,
                )
                if not can_submit:
                    st.caption("Select your level and program to continue")
        else:
            st.info("👆 Select your role above to reveal the profile form.")

        # Handle submit
        if sel_role and "forge_btn" in dir() and forge_btn:
            cv_raw = ""
            if uploaded_file:
                try:
                    if uploaded_file.name.lower().endswith(".pdf"):
                        reader = PdfReader(io.BytesIO(uploaded_file.read()))
                        cv_raw = "\n".join(p.extract_text() or "" for p in reader.pages).strip()
                    else:
                        cv_raw = uploaded_file.read().decode("utf-8", errors="ignore").strip()
                except Exception as e:
                    st.warning(f"Could not read CV ({e}). Proceeding without it.")

            enriched = (
                f"Researcher Profile:\n- Role: {sel_role}\n"
                f"- Level: {st.session_state.get(f'sel_level_{sel_role}', '')}\n"
                f"- Program/Department: {st.session_state.get('sel_program', '')}\n"
                f"- Research Interests: {interests or 'Not provided'}\n"
            )
            if cv_raw:
                enriched += f"\n--- CV CONTENT ---\n{cv_raw}"
            else:
                enriched += "\n(No CV provided — use researcher profile above for recommendations)"

            st.session_state.cv_text = enriched
            st.session_state.profile = {
                "role": sel_role,
                "level": st.session_state.get(f"sel_level_{sel_role}", ""),
                "program": st.session_state.get("sel_program", ""),
            }
            st.session_state.stage = "processing"
            st.rerun()


# ---------------------------------------------------------------------------
# Stage 2 — Processing
# ---------------------------------------------------------------------------

def render_processing() -> None:
    _nav("processing")
    st.markdown("<div style='height:48px'></div>", unsafe_allow_html=True)

    _, center, _ = st.columns([1, 2, 1])
    with center:
        st.markdown(
            "<h2 style='font-family:DM Sans,sans-serif;text-align:center;"
            "color:#1A1D2E;font-size:1.6rem;margin-bottom:6px'>⚒️ Forging your packet…</h2>"
            "<p style='text-align:center;color:#6B7280;font-size:0.9rem;margin-bottom:28px'>"
            "AI agents are analyzing your profile and querying the grant database.</p>",
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
                    "search_grant_opportunities":         "Querying grant Knowledge Base…",
                    "search_complementary_collaborators": f"Finding collaborator for grant {max(1, len(called_tools)-1)}/3…",
                    "search_institutional_policies":      "Retrieving FSU compliance & policy guidelines…",
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
    result  = st.session_state.results or {}
    matches = result.get("matches", [])

    _nav("results")

    # Reset button (real Streamlit)
    _, rr = st.columns([6, 1])
    with rr:
        if st.button("↺  Reset", type="secondary", use_container_width=True):
            for k in list(_DEFAULTS.keys()):
                st.session_state.pop(k, None)
            # clear proposal/email cache
            for i in range(1, 4):
                st.session_state.pop(f"proposal_{i}", None)
                st.session_state.pop(f"email_{i}", None)
            st.rerun()

    st.markdown("<div style='height:16px'></div>", unsafe_allow_html=True)

    left_col, right_col = st.columns([1, 2], gap="large")

    # ── Left: Profile + top metrics + download ─────────────────────────────
    with left_col:
        st.markdown('<div class="results-section-label">Researcher Profile</div>',
                    unsafe_allow_html=True)
        with st.container(border=True):
            st.markdown(result.get("researcher_summary", "_No profile extracted._"))

        if matches:
            best = matches[0]
            st.markdown("<div style='height:12px'></div>", unsafe_allow_html=True)
            m1, m2 = st.columns(2)
            with m1:
                st.metric("Top Grant Match",  f"{best.get('grant_match_score', 0)}%")
                st.progress(best.get("grant_match_score", 0) / 100)
            with m2:
                st.metric("Top Synergy",      f"{best.get('collaborator_synergy_score', 0)}%")
                st.progress(best.get("collaborator_synergy_score", 0) / 100)

        st.markdown("<div style='height:10px'></div>", unsafe_allow_html=True)
        st.download_button(
            label="⬇  Download Full Report",
            data=_build_report(result),
            file_name="fundingforge_report.md",
            mime="text/markdown",
            use_container_width=True,
            type="primary",
        )

    # ── Right: Grant match expanders ────────────────────────────────────────
    with right_col:
        st.markdown('<div class="results-section-label">Top 3 Grant Matches</div>',
                    unsafe_allow_html=True)
        medals = ["🥇", "🥈", "🥉"]

        for i, match in enumerate(matches[:3], 1):
            grant_score  = match.get("grant_match_score", 0)
            collab_score = match.get("collaborator_synergy_score", 0)
            title        = match.get("grant_title", f"Grant {i}")
            agency       = match.get("grant_agency", "")

            with st.expander(
                f"{medals[i-1]}  {title}  —  {grant_score}% Match",
                expanded=(i == 1),
            ):
                # Scores
                sc1, sc2 = st.columns(2)
                with sc1:
                    st.metric("Grant Match Score", f"{grant_score}%")
                    st.progress(grant_score / 100)
                with sc2:
                    st.metric("Collaborator Synergy", f"{collab_score}%")
                    st.progress(collab_score / 100)

                if agency:
                    st.caption(f"Funding Agency: **{agency}**")

                # Grant justification
                st.markdown("**Why this grant fits your profile**")
                st.info(match.get("grant_justification", ""))

                # Collaborator mesh
                collab_name = match.get("collaborator_name", "Unknown Collaborator")
                collab_dept = match.get("collaborator_department", "")
                collab_just = match.get("collaborator_justification", "")
                st.markdown(
                    f'<div class="collab-card">'
                    f'<div class="collab-name">🤝 &nbsp; {collab_name}</div>'
                    f'<div class="collab-dept">{collab_dept}</div>'
                    f'<p style="margin:10px 0 6px;font-size:0.88rem;color:#374151">{collab_just}</p>'
                    f'<span class="score-chip">{collab_score}% Synergy</span>'
                    f'</div>',
                    unsafe_allow_html=True,
                )

                # RAMP / Compliance checklist
                st.markdown("**RAMP Compliance Checklist**")
                rows_html = "".join(
                    f'<div class="comp-row">'
                    f'<span class="comp-icon">{icon}</span>'
                    f'<div><div class="comp-label">{label}</div>'
                    f'<div class="comp-desc">{desc}</div></div></div>'
                    for icon, label, desc in _compliance_items(agency)
                )
                st.markdown(
                    f'<div style="background:#FAFAFA;border:1px solid #F3F4F6;'
                    f'border-radius:8px;padding:6px 14px 2px;margin-bottom:14px">'
                    f'{rows_html}</div>',
                    unsafe_allow_html=True,
                )

                st.divider()

                # Proposal + Email tabs
                tab_p, tab_e = st.tabs(["📄 Proposal Assistant", "✉️ Outreach Email"])

                with tab_p:
                    pk = f"proposal_{i}"
                    if pk not in st.session_state:
                        st.session_state[pk] = match.get("draft_proposal", "")
                    edited = st.text_area(
                        "proposal",
                        value=st.session_state[pk],
                        height=260,
                        key=f"ta_proposal_{i}",
                        label_visibility="collapsed",
                    )
                    st.download_button(
                        label=f"⬇  Download Proposal",
                        data=edited,
                        file_name=f"proposal_grant_{i}.md",
                        mime="text/markdown",
                        key=f"dl_proposal_{i}",
                        type="primary",
                    )

                with tab_e:
                    ek = f"email_{i}"
                    raw_email = match.get("draft_email", "").replace("\\n", "\n")
                    if ek not in st.session_state:
                        st.session_state[ek] = raw_email
                    st.text_area(
                        "email",
                        value=st.session_state[ek],
                        height=260,
                        key=f"ta_email_{i}",
                        label_visibility="collapsed",
                    )


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------
_STAGES = {"intake": render_intake, "processing": render_processing, "results": render_results}
_STAGES.get(st.session_state.stage, render_intake)()
