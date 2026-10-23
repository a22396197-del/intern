# Free Intern — Complete Project Documentation & Architecture Guide

**Tagline:** *Discover Internships. Build Skills. Start Your Career.*

---

## 1. Quick Start & Local Setup

### Prerequisites
- **Node.js** v18+ (or **Bun** v1.0+)
- **npm** (or `bun`)

### Installation & Running Locally
```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure Gemini API key for live AI augmentation
cp .env.example .env
# Add GEMINI_API_KEY=your_api_key_here inside .env
# Note: The application includes a full deterministic fallback engine and works 100% offline even without an API key.

# 3. Start the full-stack server (Express API + Vite frontend on port 3000)
npm run dev
```
Open **`http://localhost:3000`** in your browser.
For instant auto-login into the demo student workspace, open **`http://localhost:3000/?autostart=1`**.

### Running Unit Tests
```bash
npx tsx --test src/utils/logic.test.ts
```

### Demo Credentials
- **Student Account:** `student@freeintern.edu` / `Student@123`
- **Admin Account:** `admin@freeintern.edu` / `Admin@123`

---

## 2. Executive Summary & Core Philosophy

**Free Intern** is a full-stack, AI-augmented Student Internship Discovery, Deterministic Eligibility Verification, Skill Readiness, and Career Preparation Platform built for university and college students.

### Ethical & Verifiable Guardrails
1. **Strict Separation of Eligibility vs. AI Recommendations:**
   - **Section A — Internships You're Eligible For:** Strictly verified against mandatory degree, department, year of study, graduation year, and mandatory technical skills.
   - **Section B — Internships You're Not Eligible For Yet:** Transparently separates **Learnable Skill Gaps** (actionable technical skills the student can learn and verify) from **Hard Academic/Graduation Restrictions** (degree, branch, or graduation cohort mismatches).
   - **Section C — AI Recommended Internships — Personalized for You:** Ranked by a hybrid Gemini AI + deterministic 100-point career relevance rubric evaluating demonstrated project alignment, career goals, work-mode preferences, stipend preferences, and skill overlap—while always displaying the honest, unmodified eligibility status alongside each recommendation.
2. **Real, Original Verified Data Only:** Every listing includes its official source name, official portal URL, application URL, verification status badge (`Verified Official Source`, `Verified Partner`, `Admin Reviewed`), and `lastVerifiedDate`.
3. **Honest Application & Rejection Analysis:** Never fabricates employer rejection reasons; distinguishes verified profile/resume gaps from unconfirmed employer internal selection factors.
4. **Ethical Resume Scanner:** Never fabricates skills a student does not possess; separates *Keywords Present in Resume*, *Skills in Profile Missing from Resume*, and *Required Skills to Learn Next*.

---

## 3. Complete Feature Matrix (16 Modules)

### Group 1: Opportunities & Tracking
1. **Dashboard (`DashboardAndAdminView.tsx`)**: Career readiness KPI summary, personalized AI recommendations preview, application status tracker, and notifications.
2. **Discover Internship (`DiscoverAndGovView.tsx`)**: Search and multi-facet filtering across three distinct sections (*AI Recommended Internships*, *Internships You're Eligible For*, and *Internships You're Not Eligible For Yet*), plus interactive *Eligibility Check Modal*, *Full Details Modal*, and *Internal/Official Application Flow*.
3. **Government Internships (`DiscoverAndGovView.tsx`)**: Dedicated portal for public-sector and ministry internships (MeitY Digital India, NITI Aayog, ISRO NRSC, RBI Summer Placement, AICTE Tulip, DRDO) with official `.gov.in` links.
4. **PM Internship Hub (`DiscoverAndGovView.tsx`)**: Dedicated Prime Minister's Internship Scheme workspace featuring financial benefit breakdown (₹5,000/month stipend + ₹6,000 one-time grant + insurance), live interactive **PM Readiness & XP Command Bar**, **Recommended PM Internships**, and three interactive tabs:
   - *Current Relevant Skills* (instant proficiency testing & gap closure)
   - *Skill Development* (interactive micro-tasks that award XP)
   - *Skill Badges & Assessment* (proctored multi-question skill verification quizzes)
5. **My Applications (`ApplicationsAndResumeView.tsx`)**: Application lifecycle tracker (`Applied`, `Under Review`, `Shortlisted`, `Interview Scheduled`, `Selected`, `Rejected`) with expandable **Rejection Root-Cause & Improvement Analysis** cards.
6. **Saved Internships (`DiscoverAndGovView.tsx`)**: Bookmarked opportunities with live deadline countdowns and eligibility badges.

### Group 2: AI Career & Interview Lab
7. **AI Resume Scanner (`ApplicationsAndResumeView.tsx`)**: Upload `.pdf`/`.docx`/`.txt` or paste resume text to compute a deterministic + AI **Resume Match Score (0–100%)**, 6-category section breakdown, 3-way keyword gap analysis, and ethical bullet improvements.
8. **AI Mock Interview (`InterviewAndSkillsView.tsx` + `InterviewProgressChart.tsx`)**:
   - **D3.js Multi-Series Trajectory Chart**: Plots **Confidence & Readiness Score (`#2A9D8F`)** and **Technical Progress Score (`#6554C0`)** across consecutive interview sessions (`S1..Sn`) against a dashed **75% Interview Readiness Benchmark**, with category filters, series toggles, and interactive session drill-down.
   - **Role-First 15-Question Simulator**: Generates 15 structured questions (5 Technical, 3 Project & Resume Deep-Dive, 4 Problem-Solving/Scenario, 3 Behavioral/HR) with instant per-answer evaluation (`Strong` / `Moderate` / `Needs Improvement`) and a comprehensive Final Interview Report.
9. **AI Intern Assistant (`InterviewAndSkillsView.tsx`)**: Interactive assistant for eligibility queries, portal comparisons, and application guidance.
10. **AI Career Assistant (`InterviewAndSkillsView.tsx`)**: Personalized 4-week learning roadmaps, portfolio project architectures, and certification plans.

### Group 3: Skills & Verified Profile
11. **Current Relevant Skills (`InterviewAndSkillsView.tsx`)**: Live skill matrix comparing verified student skills against market demand across all active internships.
12. **Skill Development (`InterviewAndSkillsView.tsx`)**: Curated learning modules (`LEARNING_ROADMAPS`) with hands-on project deliverables and persistent checklist tracking.
13. **Skill Badges & Assessment (`InterviewAndSkillsView.tsx`)**: Interactive multi-question technical assessments (`SKILL_ASSESSMENTS`) that award verified profile badges and automatically promote newly verified skills into `profile.technicalSkills`.
14. **My Profile (`StudentProfileView.tsx`)**: Complete academic, skill, project, certification, resume, and preference editor with live **Profile Completeness Meter** and auto-refresh of AI recommendations.

### Group 4: System & Administration
15. **Notifications & Settings (`DashboardAndAdminView.tsx`)**: Real-time alerts for deadlines, badge awards, and application updates.
16. **Post Internship & Admin Panel (`DashboardAndAdminView.tsx`)**: Role-protected administrative console to publish and verify official internship listings.

---

## 4. Project Directory Structure

```text
free-intern/
├── .data/
│   └── freeintern-db.json          # Persistent JSON database with seeded profiles, listings, and 5 interview sessions
├── public/
│   └── assets/                     # Visual assets and illustrations
├── src/
│   ├── components/
│   │   ├── ApplicationsAndResumeView.tsx
│   │   ├── DashboardAndAdminView.tsx
│   │   ├── DiscoverAndGovView.tsx
│   │   ├── EntryAndAuthView.tsx
│   │   ├── InterviewAndSkillsView.tsx
│   │   ├── InterviewProgressChart.tsx   # D3 v7 SVG line & area trajectory chart
│   │   └── StudentProfileView.tsx
│   ├── data/
│   │   └── seedData.ts             # Verified internships, student/admin profiles, assessments, and roadmaps
│   ├── utils/
│   │   ├── logic.ts                # Core eligibility, AI recommendation scoring, resume scanner, & D3 series builders
│   │   └── logic.test.ts           # 12 Node test runner unit tests covering core algorithms
│   ├── App.tsx                     # Root application shell, state management, and navigation
│   ├── index.css                   # Tailwind v4 stylesheet & editorial color tokens
│   ├── main.tsx                    # React DOM entry point
│   └── types.ts                    # Complete TypeScript interfaces for the entire platform
├── .env.example                    # Environment variable template
├── index.html                      # HTML entry point with Plus Jakarta Sans, Inter, and JetBrains Mono fonts
├── metadata.json                   # Application metadata
├── package.json                    # Scripts and dependencies (React 19, Express, D3 v7, @google/genai, Lucide)
├── PROJECT_DOCUMENTATION.md        # Complete project architecture and documentation guide
├── README.md                       # Quick start guide
├── server.ts                       # Full-stack Express + Vite server & REST API endpoints
├── tsconfig.json                   # TypeScript configuration
└── vite.config.ts                  # Vite bundler configuration
```
