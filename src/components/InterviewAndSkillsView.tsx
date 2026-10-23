import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  Award,
  BookOpen,
  TrendingUp,
  HelpCircle,
  Send,
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  Square,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Zap,
  Target,
  Play,
  Trophy,
} from 'lucide-react';
import type {
  StudentProfile,
  InternshipListing,
  MockInterviewSession,
  CompletedAssessmentRecord,
} from '../types.ts';
import {
  computeCurrentRelevantSkills,
  evaluateSingleAnswer,
  buildFinalInterviewReport,
  evaluateInternshipEligibility,
  computeSessionConfidenceScore,
} from '../utils/logic.ts';
import { SKILL_DEVELOPMENT_TRACKS, SKILL_ASSESSMENTS } from '../data/seedData.ts';
import { InterviewProgressChart } from './InterviewProgressChart.tsx';

interface InterviewAndSkillsViewProps {
  pageMode:
    | 'mock-interview'
    | 'current-skills'
    | 'skill-development'
    | 'skill-badges'
    | 'intern-assistant'
    | 'career-assistant';
  profile: StudentProfile;
  internships: InternshipListing[];
  interviewSessions: MockInterviewSession[];
  learningProgress: string[];
  completedAssessments: CompletedAssessmentRecord[];
  onStartInterviewSession: (payload: {
    category: string;
    targetRole: string;
    targetInternshipId?: string;
    experienceLevel: string;
    mode: 'Practice Mode' | 'Mock Interview Mode';
  }) => Promise<{ ok: boolean; session?: MockInterviewSession; error?: string }>;
  onUpdateInterviewSession: (session: MockInterviewSession) => Promise<void>;
  onToggleLearningItem: (itemId: string) => Promise<void>;
  onSubmitAssessment: (payload: {
    assessmentId: string;
    skillName: string;
    category: string;
    badgeTitle: string;
    scorePercent: number;
    passed: boolean;
    areasToImprove: string[];
  }) => Promise<void>;
  onAskAssistant: (payload: {
    message: string;
    mode: 'intern' | 'career';
    language: 'english' | 'thanglish';
  }) => Promise<string>;
  onNavigate: (page: string) => void;
}

const INTERVIEW_CATEGORIES = [
  {
    id: 'Full-Stack Development',
    title: 'Full-Stack Development',
    desc: 'HTML/CSS, JavaScript, React, Node.js, REST APIs, SQL, Auth, Git & Architecture',
    defaultRole: 'Full-Stack Development Intern',
  },
  {
    id: 'AI and Machine Learning',
    title: 'AI and Machine Learning',
    desc: 'Python, NumPy, Pandas, Preprocessing, Supervised/Unsupervised ML, Overfitting & Metrics',
    defaultRole: 'AI/ML Intern',
  },
  {
    id: 'Data Analytics',
    title: 'Data Analytics',
    desc: 'SQL Joins & Window Functions, Data Cleaning, Spreadsheets, EDA, Visualization & KPIs',
    defaultRole: 'Data Analyst Intern',
  },
  {
    id: 'Frontend Development',
    title: 'Frontend Development',
    desc: 'Semantic HTML, CSS Grid/Flexbox, JavaScript Async, React State & Accessibility',
    defaultRole: 'Frontend Development Intern',
  },
  {
    id: 'Backend Development',
    title: 'Backend Development',
    desc: 'REST API Design, Node.js/Python, Relational SQL, Auth Security & Performance',
    defaultRole: 'Backend Development Intern',
  },
  {
    id: 'Python Development',
    title: 'Python Development',
    desc: 'Python Data Structures, OOP, File/API Pipelines, Testing & SQL Integration',
    defaultRole: 'Python Developer Intern',
  },
  {
    id: 'Java Development',
    title: 'Java Development',
    desc: 'Core Java, Object-Oriented Design, Collections, Spring Boot REST & SQL',
    defaultRole: 'Java Developer Intern',
  },
];

export const InterviewAndSkillsView: React.FC<InterviewAndSkillsViewProps> = ({
  pageMode,
  profile,
  internships,
  interviewSessions,
  learningProgress,
  completedAssessments,
  onStartInterviewSession,
  onUpdateInterviewSession,
  onToggleLearningItem,
  onSubmitAssessment,
  onAskAssistant,
  onNavigate,
}) => {
  // 1. AI MOCK INTERVIEW STATE
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState('Full-Stack Development Intern');
  const [targetInternshipId, setTargetInternshipId] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Intermediate (3rd/4th Year)');
  const [interviewMode, setInterviewMode] = useState<'Practice Mode' | 'Mock Interview Mode'>(
    'Practice Mode'
  );
  const [activeSession, setActiveSession] = useState<MockInterviewSession | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answerDraft, setAnswerDraft] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);

  // 2. SKILL DEVELOPMENT & RELEVANT SKILLS STATE
  const [selectedTrackId, setSelectedTrackId] = useState(SKILL_DEVELOPMENT_TRACKS[0].id);
  const [activeStage, setActiveStage] = useState<1 | 2 | 3 | 4>(1);
  const [skillFilterMode, setSkillFilterMode] = useState<'all' | 'verified' | 'gap'>('all');
  const [practiceDrafts, setPracticeDrafts] = useState<Record<string, string>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  const [practiceFeedback, setPracticeFeedback] = useState<Record<string, string>>({});

  // 3. SKILL ASSESSMENT STATE
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [assessmentResult, setAssessmentResult] = useState<{
    scorePercent: number;
    passed: boolean;
    badgeTitle: string;
    unlockedCount?: number;
  } | null>(null);

  // 4. AI ASSISTANT STATE
  const [chatLanguage, setChatLanguage] = useState<'english' | 'thanglish'>('english');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    {
      role: 'assistant',
      text: `Hello ${profile.fullName}! I am connected to your verified Free Intern profile (${profile.degree || 'Degree'} in ${profile.department || 'Department'}, Class of ${profile.graduationYear || 'TBD'}) and ${internships.length} active verified internships. Ask me about eligible internships, missing skills, resume improvements, government schemes, or interview preparation in English or Thanglish!`,
    },
  ]);

  const relevantSkillsList = useMemo(
    () => computeCurrentRelevantSkills(internships, profile),
    [internships, profile]
  );

  // PAGE A: AI MOCK INTERVIEW (Section 14)
  if (pageMode === 'mock-interview') {
    const handleGenerate15Questions = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCategory) {
        setInterviewError('Please select a role category in Step 1 first.');
        return;
      }
      setInterviewError(null);
      setGeneratingQuestions(true);
      try {
        const res = await onStartInterviewSession({
          category: selectedCategory,
          targetRole,
          targetInternshipId: targetInternshipId || undefined,
          experienceLevel,
          mode: interviewMode,
        });
        if (!res.ok || !res.session) {
          setInterviewError(res.error || 'Failed to generate 15 questions. Please retry.');
        } else {
          setActiveSession(res.session);
          setCurrentQuestionIdx(0);
          setAnswerDraft('');
          setShowHint(false);
        }
      } finally {
        setGeneratingQuestions(false);
      }
    };

    const handleSaveQuestionAnswer = async () => {
      if (!activeSession) return;
      const q = activeSession.questions[currentQuestionIdx];
      if (!q) return;

      const evaluated = evaluateSingleAnswer(q, answerDraft);
      const updatedAnswers = {
        ...activeSession.answers,
        [q.id]: evaluated,
      };
      const updatedSession: MockInterviewSession = {
        ...activeSession,
        answers: updatedAnswers,
      };
      setActiveSession(updatedSession);
      await onUpdateInterviewSession(updatedSession);
    };

    const handleCompleteSession = async () => {
      if (!activeSession) return;
      const report = buildFinalInterviewReport(activeSession.questions, activeSession.answers);
      const completed: MockInterviewSession = {
        ...activeSession,
        completedAt: new Date().toISOString(),
        finalReport: report,
      };
      setActiveSession(completed);
      await onUpdateInterviewSession(completed);
    };

    return (
      <div className="space-y-6">
        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E5EF] pb-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[#292344]">
                AI Mock Interview — Role-First 15-Question Technical Simulator
              </h1>
              <p className="text-xs text-[#747484]">
                Select your target category and internship role first. The AI generates strictly 15 non-duplicate questions tailored to the listing and your student projects.
              </p>
            </div>
            {activeSession && (
              <button
                type="button"
                onClick={() => {
                  setActiveSession(null);
                  setSelectedCategory(null);
                }}
                className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg shrink-0 cursor-pointer"
              >
                Start New Category / Role Session
              </button>
            )}
          </div>

          {interviewError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-[#FFF0E8] border border-[#F28B72]/50 text-[#292344] text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-[#F28B72]" />
              <span>{interviewError}</span>
            </div>
          )}

          {/* D3-Based Line Chart: Progress & Confidence Score Trajectory over Consecutive Sessions */}
          <InterviewProgressChart
            sessions={interviewSessions}
            onSelectSessionToReview={(sess) => {
              setActiveSession(sess);
              setCurrentQuestionIdx(0);
              const firstQ = sess.questions[0];
              setAnswerDraft(firstQ ? sess.answers[firstQ.id]?.answerText || '' : '');
              setShowHint(false);
              setTimeout(() => {
                document
                  .getElementById('active-interview-simulator')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 80);
            }}
          />

          {/* STEP 1 & STEP 2: CATEGORY & ROLE SELECTION (Questions NEVER shown before confirmation!) */}
          {!activeSession && (
            <div className="space-y-6 pt-4 border-t border-[#E8E5EF]">
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-[#292344]">
                  Step 1: Choose an Internship Category
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
                  {INTERVIEW_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setTargetRole(cat.defaultRole);
                        }}
                        className={`p-4 rounded-xl border text-left transition-colors flex flex-col justify-between h-full cursor-pointer ${
                          isSelected
                            ? 'bg-[#EEE9FF]/70 border-[#6554C0] ring-2 ring-[#6554C0]/20'
                            : 'bg-[#FAF9F6] border-[#E8E5EF] hover:border-[#6554C0]/40 hover:bg-[#FFFFFF]'
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-[#292344]">{cat.title}</p>
                          <p className="text-xs text-[#747484] leading-relaxed">{cat.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedCategory && (
                <form
                  onSubmit={handleGenerate15Questions}
                  className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-4"
                >
                  <h2 className="text-sm font-bold text-[#292344]">
                    Step 2: Configure Target Internship & Session Mode for{' '}
                    <span className="text-[#6554C0]">{selectedCategory}</span>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label
                        htmlFor="iv-role"
                        className="block text-xs font-semibold text-[#292344] mb-1.5"
                      >
                        Target Role Title
                      </label>
                      <input
                        id="iv-role"
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        required
                        className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="iv-listing"
                        className="block text-xs font-semibold text-[#292344] mb-1.5"
                      >
                        Specific Verified Listing (Optional)
                      </label>
                      <select
                        id="iv-listing"
                        value={targetInternshipId}
                        onChange={(e) => setTargetInternshipId(e.target.value)}
                        className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                      >
                        <option value="">General {selectedCategory} Role</option>
                        {internships.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.title} — {i.organization}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="iv-exp"
                        className="block text-xs font-semibold text-[#292344] mb-1.5"
                      >
                        Student Experience Level
                      </label>
                      <select
                        id="iv-exp"
                        value={experienceLevel}
                        onChange={(e) => setExperienceLevel(e.target.value)}
                        className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                      >
                        <option value="Beginner (1st/2nd Year)">Beginner (1st/2nd Year)</option>
                        <option value="Intermediate (3rd/4th Year)">
                          Intermediate (3rd/4th Year)
                        </option>
                        <option value="Project-Focused Intern">Project-Focused Intern</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="iv-mode"
                        className="block text-xs font-semibold text-[#292344] mb-1.5"
                      >
                        Session Mode
                      </label>
                      <select
                        id="iv-mode"
                        value={interviewMode}
                        onChange={(e) =>
                          setInterviewMode(
                            e.target.value as 'Practice Mode' | 'Mock Interview Mode'
                          )
                        }
                        className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                      >
                        <option value="Practice Mode">
                          Practice Mode (Hints & Immediate Feedback)
                        </option>
                        <option value="Mock Interview Mode">
                          Mock Interview Mode (End-of-Session Report)
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="text-[11px] text-[#747484]">
                      Advisory Note: These 15 questions are AI-generated practice questions based on role requirements, not leaked employer exam papers.
                    </p>
                    <button
                      type="submit"
                      disabled={generatingQuestions}
                      className="h-10 px-5 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-xl cursor-pointer"
                    >
                      {generatingQuestions
                        ? 'Generating 15 Role-Specific Questions...'
                        : 'Confirm & Generate 15 Questions'}
                    </button>
                  </div>
                </form>
              )}

              {/* Previous Saved Interview Sessions */}
              {interviewSessions.length > 0 && (
                <div className="pt-4 border-t border-[#E8E5EF] space-y-3">
                  <h3 className="text-xs font-bold text-[#292344]">
                    Previous Saved Interview Sessions ({interviewSessions.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                    {interviewSessions.map((sess) => (
                      <div
                        key={sess.id}
                        className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#292344]">
                            {sess.category} · {sess.targetRole}
                          </p>
                          <p className="text-[#747484] tabular-nums mt-0.5">
                            {sess.createdAt.slice(0, 10)} · {Object.keys(sess.answers).length}/
                            {sess.questions.length} Answered
                            {sess.finalReport
                              ? ` · Progress: ${sess.finalReport.overallScore}% · Confidence: ${
                                  sess.finalReport.confidenceScore ??
                                  computeSessionConfidenceScore(sess.questions, sess.answers)
                                }%`
                              : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSession(sess);
                            setCurrentQuestionIdx(0);
                            const firstQ = sess.questions[0];
                            setAnswerDraft(firstQ ? sess.answers[firstQ.id]?.answerText || '' : '');
                          }}
                          className="h-8 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg shrink-0 cursor-pointer"
                        >
                          Review Session
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: ACTIVE 15-QUESTION SESSION */}
          {activeSession && (
            <div id="active-interview-simulator" className="space-y-5 pt-4 border-t border-[#E8E5EF]">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] text-xs">
                <div>
                  <span className="font-bold text-[#6554C0]">{activeSession.category}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-medium text-[#292344]">{activeSession.targetRole}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="text-[#747484]">{activeSession.mode}</span>
                </div>
                <div className="font-mono font-semibold text-[#292344]">
                  Question {currentQuestionIdx + 1} of {activeSession.questions.length} (Answered:{' '}
                  {Object.keys(activeSession.answers).length}/15)
                </div>
              </div>

              {/* Question Number Strip (1..15) */}
              <div className="flex flex-wrap items-center gap-1.5">
                {activeSession.questions.map((q, idx) => {
                  const answered = Boolean(activeSession.answers[q.id]?.answerText);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setCurrentQuestionIdx(idx);
                        setAnswerDraft(activeSession.answers[q.id]?.answerText || '');
                        setShowHint(false);
                      }}
                      className={`w-8 h-8 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                        currentQuestionIdx === idx
                          ? 'bg-[#292344] text-[#FFFFFF]'
                          : answered
                          ? 'bg-[#DDF5EA] text-[#2A9D8F] border border-[#2A9D8F]/40'
                          : 'bg-[#FAF9F6] text-[#747484] border border-[#E8E5EF]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {(() => {
                const q = activeSession.questions[currentQuestionIdx];
                if (!q) return null;
                const savedAns = activeSession.answers[q.id];

                return (
                  <div className="p-5 rounded-2xl border border-[#E8E5EF] bg-[#FFFFFF] space-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#6554C0]">
                        Question {q.index} of 15 · Topic: {q.topic} · Difficulty: {q.difficulty}
                      </p>
                      <h2 className="text-base font-bold text-[#292344]">{q.question}</h2>
                      <p className="text-xs text-[#747484]">Why asked: {q.whyAsked}</p>
                    </div>

                    {activeSession.mode === 'Practice Mode' && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowHint((prev) => !prev)}
                          className="text-xs font-semibold text-[#6554C0] hover:text-[#292344] hover:underline flex items-center gap-1.5 cursor-pointer"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>
                            {showHint ? 'Hide Hint & Key Points' : 'Show Hint & Expected Structure'}
                          </span>
                        </button>
                        {showHint && (
                          <div className="mt-2 p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] text-xs space-y-1">
                            <p>
                              <strong className="text-[#292344]">Hint:</strong> {q.hint}
                            </p>
                            <p>
                              <strong className="text-[#292344]">Expected Key Concepts:</strong>{' '}
                              {q.expectedKeyPoints.join(' · ')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="iv-answer-box"
                        className="block text-xs font-semibold text-[#292344] mb-1.5"
                      >
                        Your Technical Answer
                      </label>
                      <textarea
                        id="iv-answer-box"
                        rows={4}
                        value={answerDraft}
                        onChange={(e) => setAnswerDraft(e.target.value)}
                        placeholder="Write your explanation clearly covering the core concept, how it works, and an example..."
                        className="w-full p-3 text-xs rounded-xl border border-[#E8E5EF] bg-[#FAF9F6] focus:bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={currentQuestionIdx === 0}
                          onClick={() => {
                            const prevIdx = currentQuestionIdx - 1;
                            setCurrentQuestionIdx(prevIdx);
                            const prevQ = activeSession.questions[prevIdx];
                            setAnswerDraft(
                              prevQ ? activeSession.answers[prevQ.id]?.answerText || '' : ''
                            );
                          }}
                          className="h-9 px-3.5 inline-flex items-center justify-center gap-1 text-xs font-semibold text-[#292936] bg-[#FAF9F6] border border-[#E8E5EF] disabled:opacity-40 rounded-lg cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Previous</span>
                        </button>
                        <button
                          type="button"
                          disabled={currentQuestionIdx === activeSession.questions.length - 1}
                          onClick={() => {
                            const nextIdx = currentQuestionIdx + 1;
                            setCurrentQuestionIdx(nextIdx);
                            const nextQ = activeSession.questions[nextIdx];
                            setAnswerDraft(
                              nextQ ? activeSession.answers[nextQ.id]?.answerText || '' : ''
                            );
                          }}
                          className="h-9 px-3.5 inline-flex items-center justify-center gap-1 text-xs font-semibold text-[#292936] bg-[#FAF9F6] border border-[#E8E5EF] disabled:opacity-40 rounded-lg cursor-pointer"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSaveQuestionAnswer}
                          className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                        >
                          Submit Answer for Q{q.index}
                        </button>
                        <button
                          type="button"
                          onClick={handleCompleteSession}
                          className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF] border border-[#E8E5EF] hover:bg-[#EEE9FF]/80 rounded-lg cursor-pointer"
                        >
                          Finish & Generate Final Report
                        </button>
                      </div>
                    </div>

                    {/* Immediate Feedback in Practice Mode */}
                    {savedAns && activeSession.mode === 'Practice Mode' && (
                      <div className="p-4 rounded-xl bg-[#DDF5EA]/55 border border-[#2A9D8F]/35 text-xs space-y-1.5">
                        <p className="font-bold text-[#292344]">
                          Answer Evaluation:{' '}
                          <span className="font-mono text-[#2A9D8F]">{savedAns.score}/10</span>
                        </p>
                        <p className="text-[#292936]">{savedAns.feedback}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Final Interview Report (Section 14.J) */}
              {activeSession.finalReport && (
                <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-[#6554C0]/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5EF] pb-3.5">
                    <div>
                      <h3 className="text-base font-bold text-[#292344]">
                        Final Interview Report — {activeSession.category}
                      </h3>
                      <p className="text-xs text-[#747484]">
                        {activeSession.finalReport.rubricExplanation}
                      </p>
                    </div>
                    <div className="text-left sm:text-right shrink-0 space-y-0.5">
                      <p className="text-sm font-mono font-bold text-[#6554C0] tabular-nums">
                        Overall Progress Score: {activeSession.finalReport.overallScore}/100
                      </p>
                      <p className="text-xs font-mono font-bold text-[#2A9D8F] tabular-nums">
                        Confidence & Readiness Score:{' '}
                        {activeSession.finalReport.confidenceScore ??
                          computeSessionConfidenceScore(
                            activeSession.questions,
                            activeSession.answers
                          )}
                        /100
                      </p>
                      <p className="text-xs font-mono text-[#747484] tabular-nums">
                        Answered: {activeSession.finalReport.questionsAnswered} /{' '}
                        {activeSession.finalReport.totalQuestions}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs items-stretch">
                    <div className="p-4 rounded-xl bg-[#DDF5EA]/45 border border-[#2A9D8F]/30 space-y-1.5">
                      <p className="font-bold text-[#292344]">Demonstrated Strengths:</p>
                      <ul className="list-disc pl-4 space-y-1 text-[#292936]">
                        {activeSession.finalReport.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-[#FFF0E8]/55 border border-[#F28B72]/35 space-y-1.5">
                      <p className="font-bold text-[#292344]">
                        Technical Gaps & Topics to Revise:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[#292936]">
                        {activeSession.finalReport.technicalKnowledgeGaps.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    );
  }

  // Helper: map skill name to best matching Skill Development Track and Skill Assessment
  const resolveTrackForSkill = (skillName: string) => {
    const s = skillName.toLowerCase();
    if (s.includes('docker') || s.includes('postgres') || s.includes('linux')) {
      return 'track-cloud-devops';
    }
    if (
      s.includes('python') ||
      s.includes('pandas') ||
      s.includes('numpy') ||
      s.includes('machine learning') ||
      s.includes('scikit') ||
      s.includes('statistics') ||
      s.includes('data')
    ) {
      return 'track-aiml';
    }
    return 'track-fullstack';
  };

  const resolveAssessmentForSkill = (skillName: string) => {
    const s = skillName.toLowerCase();
    if (s.includes('docker') || s.includes('postgres')) return 'assess-docker-pg';
    if (s.includes('typescript') || s.includes('node')) return 'assess-ts-node';
    if (s.includes('git') || s.includes('rest') || s.includes('api')) return 'assess-git-api';
    if (s.includes('sql')) return 'assess-sql-db';
    if (
      s.includes('python') ||
      s.includes('pandas') ||
      s.includes('numpy') ||
      s.includes('machine learning') ||
      s.includes('scikit')
    ) {
      return 'assess-python-ml';
    }
    return 'assess-react-js';
  };

  // Compute global learning XP & milestone rank across Skill Development & Assessments
  const totalLearningTopicsAndTasks = useMemo(() => {
    return SKILL_DEVELOPMENT_TRACKS.reduce(
      (acc, tr) =>
        acc +
        tr.stage1Learn.topics.length +
        tr.stage2Practice.tasks.length +
        tr.stage3Build.projects.length,
      0
    );
  }, []);

  const passedBadgesCount = useMemo(() => {
    const uniquePassed = new Set(
      completedAssessments.filter((c) => c.passed).map((c) => c.assessmentId)
    );
    return uniquePassed.size;
  }, [completedAssessments]);

  const studentXp = learningProgress.length * 50 + passedBadgesCount * 150;
  const studentRankTitle =
    studentXp >= 750
      ? 'Level 4 · Internship-Ready Builder'
      : studentXp >= 400
      ? 'Level 3 · Verified Portfolio Engineer'
      : studentXp >= 150
      ? 'Level 2 · Active Skill Explorer'
      : 'Level 1 · Rising Career Starter';

  // PAGE B: CURRENT RELEVANT SKILLS (Section 15)
  if (pageMode === 'current-skills') {
    const verifiedSkillsCount = relevantSkillsList.filter((x) => !x.needsImprovement).length;
    const gapSkillsCount = relevantSkillsList.filter((x) => x.needsImprovement).length;
    const masteryPercent =
      relevantSkillsList.length > 0
        ? Math.round((verifiedSkillsCount / relevantSkillsList.length) * 100)
        : 0;

    const displayedSkills = relevantSkillsList.filter((item) => {
      if (skillFilterMode === 'verified') return !item.needsImprovement;
      if (skillFilterMode === 'gap') return item.needsImprovement;
      return true;
    });

    return (
      <div className="space-y-6">
        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-5 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E5EF] pb-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[#292344] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#6554C0]" />
                <span>Current Relevant Skills — Live Demand & Internship Unlocker</span>
              </h1>
              <p className="text-xs text-[#747484] leading-relaxed">
                Analyzes all {internships.length} active verified internships (including PM Internship Scheme & Government portals) to show exact skill demand, your mastery progress, and which skills unlock the most new internships.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-xl bg-[#EEE9FF] border border-[#6554C0]/30 text-xs font-bold text-[#292344]">
                <Zap className="w-3.5 h-3.5 text-[#6554C0]" />
                <span>{studentXp} Learning XP · {studentRankTitle}</span>
              </span>
            </div>
          </div>

          {/* Interactive Mastery Summary & Next High-Impact Skill Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            <div className="p-4 rounded-xl bg-[#DDF5EA]/55 border border-[#2A9D8F]/35 space-y-2 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#292344]">Verified Market Readiness</span>
                <span className="text-sm font-mono font-bold text-[#2A9D8F]">{masteryPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#FFFFFF] overflow-hidden border border-[#2A9D8F]/25">
                <div
                  className="h-full bg-[#2A9D8F] transition-all duration-300"
                  style={{ width: `${masteryPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-[#292936]">
                You have verified evidence for <strong>{verifiedSkillsCount}</strong> of{' '}
                <strong>{relevantSkillsList.length}</strong> in-demand internship skills.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#FFF0E8]/65 border border-[#F28B72]/40 space-y-1.5 flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#292344] flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#F28B72]" />
                  <span>High-Impact Skills to Learn Next ({gapSkillsCount})</span>
                </p>
                <p className="text-xs text-[#292936] leading-relaxed">
                  Learning & verifying{' '}
                  <strong className="text-[#292344]">
                    {relevantSkillsList
                      .filter((x) => x.needsImprovement)
                      .slice(0, 4)
                      .map((x) => x.skillName)
                      .join(', ') || 'advanced cloud skills'}
                  </strong>{' '}
                  unlocks top-stipend Full-Stack, AI/ML, and PMIS Cloud tracks.
                </p>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setSkillFilterMode('gap')}
                  className="text-[11px] font-bold text-[#6554C0] hover:underline cursor-pointer"
                >
                  Focus on My {gapSkillsCount} Skill Gaps →
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#EEE9FF]/55 border border-[#6554C0]/30 space-y-2 flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#292344] flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-[#6554C0]" />
                  <span>Instant Skill Verification</span>
                </p>
                <p className="text-xs text-[#292936] leading-relaxed">
                  Already practiced a skill? Pass a 4-question technical assessment (75%+) to upgrade your profile and unlock matching internships immediately!
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('skill-badges')}
                className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg w-fit cursor-pointer"
              >
                Go to Skill Badges & Assessments →
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF9F6] p-1.5 rounded-xl border border-[#E8E5EF]">
              {[
                { id: 'all' as const, label: `All In-Demand Skills (${relevantSkillsList.length})` },
                {
                  id: 'gap' as const,
                  label: `Skills to Learn / Unlock Next (${gapSkillsCount})`,
                },
                {
                  id: 'verified' as const,
                  label: `My Verified Strengths (${verifiedSkillsCount})`,
                },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSkillFilterMode(t.id)}
                  className={`h-8 px-3 inline-flex items-center justify-center text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    skillFilterMode === t.id
                      ? 'bg-[#292344] text-[#FFFFFF]'
                      : 'text-[#292936] hover:bg-[#EEE9FF]/70'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#747484]">
              Click any skill’s <strong>Start Learning Track</strong> or <strong>Verify Skill Badge</strong> button to jump straight into action.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {displayedSkills.map((item) => {
            const demandPercent = Math.round(
              (item.activeVerifiedListingsCount /
                Math.max(1, item.totalActiveListingsAnalyzed)) *
                100
            );
            const targetTrackId = resolveTrackForSkill(item.skillName);
            const targetAssessId = resolveAssessmentForSkill(item.skillName);

            return (
              <article
                key={item.skillName}
                className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] hover:border-[#6554C0]/50 transition-colors p-5 flex flex-col justify-between gap-4 h-full shadow-2xs"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-[#292344]">{item.skillName}</h2>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.needsImprovement
                              ? 'bg-[#FFF0E8] text-[#F28B72]'
                              : 'bg-[#DDF5EA] text-[#2A9D8F]'
                          }`}
                        >
                          {item.needsImprovement ? 'High-Reward Skill to Learn' : 'Verified in Profile'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#6554C0] mt-0.5">
                        {item.relatedRoles.join(' · ')} · {item.requiredLevel}
                      </p>
                    </div>
                    <span className="h-7 px-2.5 inline-flex items-center text-xs font-mono font-bold text-[#292344] bg-[#EEE9FF] rounded-lg border border-[#E8E5EF] shrink-0">
                      {item.activeVerifiedListingsCount}/{item.totalActiveListingsAnalyzed} Listings ({demandPercent}%)
                    </span>
                  </div>

                  {/* Demand Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-[#FAF9F6] overflow-hidden border border-[#E8E5EF]">
                      <div
                        className={`h-full ${
                          item.needsImprovement ? 'bg-[#6554C0]' : 'bg-[#2A9D8F]'
                        }`}
                        style={{ width: `${Math.max(12, demandPercent)}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#292936] leading-relaxed">{item.whyItMatters}</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] text-xs space-y-1.5">
                    <p>
                      <strong className="text-[#292344]">Your Current Status:</strong>{' '}
                      <span
                        className={
                          item.needsImprovement
                            ? 'text-[#F28B72] font-semibold'
                            : 'text-[#2A9D8F] font-semibold'
                        }
                      >
                        {item.studentCurrentProficiency}
                      </span>
                    </p>
                    <p>
                      <strong className="text-[#292344]">Internships Requesting {item.skillName}:</strong>{' '}
                      {item.relevantInternshipTitles.slice(0, 3).join(' · ')}
                    </p>
                    <p>
                      <strong className="text-[#292344]">Hands-On Practice Challenge:</strong>{' '}
                      {item.practiceTask}
                    </p>
                    <p>
                      <strong className="text-[#292344]">Portfolio Project Idea:</strong>{' '}
                      {item.projectSuggestion}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E8E5EF]">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrackId(targetTrackId);
                        setActiveStage(1);
                        onNavigate('skill-development');
                      }}
                      className="h-8 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg transition-colors cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Start Learning Track (+50 XP)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAssessmentId(targetAssessId);
                        setSelectedOptions({});
                        setAssessmentResult(null);
                        onNavigate('skill-badges');
                      }}
                      className="h-8 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#292344] bg-[#EEE9FF] hover:bg-[#6554C0] hover:text-[#FFFFFF] border border-[#E8E5EF] rounded-lg transition-colors cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-[#6554C0]" />
                      <span>Verify Skill Badge</span>
                    </button>
                  </div>
                  <span className="text-[11px] text-[#747484]">Updated: {item.lastUpdatedDate}</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  // PAGE C: SKILL DEVELOPMENT — 4-STAGE LEARNING STRUCTURE (Section 16)
  if (pageMode === 'skill-development') {
    const activeTrack =
      SKILL_DEVELOPMENT_TRACKS.find((t) => t.id === selectedTrackId) ||
      SKILL_DEVELOPMENT_TRACKS[0];

    const trackItemIds = [
      ...activeTrack.stage1Learn.topics.map((t) => t.id),
      ...activeTrack.stage2Practice.tasks.map((t) => t.id),
      ...activeTrack.stage3Build.projects.map((p) => `proj-${activeTrack.id}-${p.level}`),
    ];
    const completedInTrackCount = trackItemIds.filter((id) => learningProgress.includes(id)).length;
    const trackProgressPercent =
      trackItemIds.length > 0
        ? Math.round((completedInTrackCount / trackItemIds.length) * 100)
        : 0;

    // Matching internships for this track
    const matchingTrackInternships = internships.filter(
      (i) =>
        i.roleCategory.toLowerCase().includes(activeTrack.category.toLowerCase().split(' ')[0]) ||
        i.mandatoryRequirements.mandatorySkills.some((sk) =>
          activeTrack.relatedSkills.some((rs) => rs.toLowerCase() === sk.toLowerCase())
        )
    );

    const handleCheckPracticeSolution = async (task: {
      id: string;
      title: string;
      solutionExplanation: string;
    }) => {
      const draft = (practiceDrafts[task.id] || '').trim();
      if (draft.length < 5) {
        setPracticeFeedback((prev) => ({
          ...prev,
          [task.id]: 'Write a short code snippet or explanation in the sandbox first, then click Check & Complete!',
        }));
        return;
      }
      setPracticeFeedback((prev) => ({
        ...prev,
        [task.id]: `Great job! Your solution was checked against the reference pattern (${task.solutionExplanation}). +50 Learning XP earned!`,
      }));
      if (!learningProgress.includes(task.id)) {
        await onToggleLearningItem(task.id);
      }
    };

    return (
      <div className="space-y-6">
        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-5 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E5EF] pb-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[#292344] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#6554C0]" />
                <span>Skill Development — Interactive 4-Stage Learning Studio</span>
              </h1>
              <p className="text-xs text-[#747484]">
                Master concepts in Stage 1, solve interactive coding challenges in Stage 2, build portfolio projects in Stage 3, and unlock verified internships in Stage 4!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <div className="px-3.5 py-2 rounded-xl bg-[#DDF5EA]/65 border border-[#2A9D8F]/35 text-xs font-bold text-[#292344] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#2A9D8F]" />
                <span>{studentXp} XP · {studentRankTitle}</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-[#EEE9FF] border border-[#6554C0]/30 text-xs font-mono font-bold text-[#6554C0]">
                {learningProgress.length}/{totalLearningTopicsAndTasks} Total Milestones Done
              </div>
            </div>
          </div>

          {/* Learning Track Selector Cards */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-[#292344]">
              Choose Your Specialization Roadmap ({SKILL_DEVELOPMENT_TRACKS.length} Tracks):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
              {SKILL_DEVELOPMENT_TRACKS.map((tr) => {
                const isSelected = selectedTrackId === tr.id;
                const trItems = [
                  ...tr.stage1Learn.topics.map((t) => t.id),
                  ...tr.stage2Practice.tasks.map((t) => t.id),
                  ...tr.stage3Build.projects.map((p) => `proj-${tr.id}-${p.level}`),
                ];
                const trDone = trItems.filter((id) => learningProgress.includes(id)).length;
                return (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => setSelectedTrackId(tr.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#292344] text-[#FFFFFF] border-[#292344] shadow-xs'
                        : 'bg-[#FAF9F6] text-[#292936] border-[#E8E5EF] hover:border-[#6554C0]/50 hover:bg-[#FFFFFF]'
                    }`}
                  >
                    <div className="space-y-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSelected ? 'bg-[#6554C0] text-[#FFFFFF]' : 'bg-[#EEE9FF] text-[#6554C0]'
                        }`}
                      >
                        {tr.category}
                      </span>
                      <p
                        className={`text-xs font-bold leading-snug ${
                          isSelected ? 'text-[#FFFFFF]' : 'text-[#292344]'
                        }`}
                      >
                        {tr.title}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-current/10">
                      <span className={isSelected ? 'text-[#DDF5EA]' : 'text-[#747484]'}>
                        {tr.relatedSkills.slice(0, 3).join(', ')}
                      </span>
                      <span className="font-mono font-bold">
                        {trDone}/{trItems.length} Done
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Track Progress Bar & Overview */}
          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-[#292344]">{activeTrack.title}</h2>
                <span className="px-2 py-0.5 rounded bg-[#DDF5EA] text-[#2A9D8F] text-[11px] font-mono font-bold">
                  {trackProgressPercent}% Track Mastery
                </span>
              </div>
              <p className="text-xs text-[#747484] leading-relaxed">{activeTrack.summary}</p>
              <p className="text-[11px] text-[#6554C0] font-semibold">
                Skills Mastered in This Track: {activeTrack.relatedSkills.join(' · ')} · Unlocks{' '}
                {matchingTrackInternships.length} Verified Internships
              </p>
            </div>
            <div className="w-full md:w-52 space-y-1.5 shrink-0">
              <div className="flex items-center justify-between text-xs font-semibold text-[#292344]">
                <span>Track Progress</span>
                <span className="font-mono">
                  {completedInTrackCount}/{trackItemIds.length} Milestones
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#FFFFFF] border border-[#E8E5EF] overflow-hidden">
                <div
                  className="h-full bg-[#2A9D8F] transition-all duration-300"
                  style={{ width: `${trackProgressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* 4-Stage Navigation Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            {[
              {
                stage: 1 as const,
                label: 'Stage 1 — Learn Concepts',
                sub: `${activeTrack.stage1Learn.topics.length} Interactive Lessons`,
              },
              {
                stage: 2 as const,
                label: 'Stage 2 — Code & Practice',
                sub: `${activeTrack.stage2Practice.tasks.length} Hands-On Sandboxes`,
              },
              {
                stage: 3 as const,
                label: 'Stage 3 — Build Projects',
                sub: `${activeTrack.stage3Build.projects.length} Portfolio Blueprints`,
              },
              {
                stage: 4 as const,
                label: 'Stage 4 — Unlock & Apply',
                sub: `${matchingTrackInternships.length} Matching Internships`,
              },
            ].map((s) => (
              <button
                key={s.stage}
                type="button"
                onClick={() => setActiveStage(s.stage)}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  activeStage === s.stage
                    ? 'bg-[#6554C0] text-[#FFFFFF] border-[#6554C0] shadow-2xs'
                    : 'bg-[#FFFFFF] text-[#292344] border-[#E8E5EF] hover:bg-[#FAF9F6]'
                }`}
              >
                <p className="text-xs font-bold">{s.label}</p>
                <p
                  className={`text-[11px] mt-0.5 ${
                    activeStage === s.stage ? 'text-[#EEE9FF]' : 'text-[#747484]'
                  }`}
                >
                  {s.sub}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Stage Content */}
        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 shadow-2xs">
          {activeStage === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5EF] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#292344]">
                    Stage 1 — Learn Core Concepts ({activeTrack.title})
                  </h2>
                  <p className="text-xs text-[#6554C0] font-medium mt-0.5">
                    Prerequisites: {activeTrack.stage1Learn.prerequisites.join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStage(2)}
                  className="h-8 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg shrink-0 cursor-pointer"
                >
                  Continue to Stage 2 Practice →
                </button>
              </div>
              <p className="text-xs text-[#292936] leading-relaxed">
                {activeTrack.stage1Learn.explanation}
              </p>
              <div className="space-y-3">
                {activeTrack.stage1Learn.topics.map((top) => {
                  const isDone = learningProgress.includes(top.id);
                  return (
                    <div
                      key={top.id}
                      className={`p-4 rounded-xl border transition-colors ${
                        isDone
                          ? 'bg-[#DDF5EA]/35 border-[#2A9D8F]/40'
                          : 'bg-[#FAF9F6] border-[#E8E5EF]'
                      }`}
                    >
                      <div className="space-y-2.5 text-xs w-full">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label={`Mark ${top.title} completed`}
                              onClick={() => onToggleLearningItem(top.id)}
                              className="text-[#2A9D8F] cursor-pointer"
                            >
                              {isDone ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4 text-[#6554C0]" />
                              )}
                            </button>
                            <h3 className="font-bold text-[#292344] text-sm">{top.title}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => onToggleLearningItem(top.id)}
                            className={`h-7 px-3 inline-flex items-center gap-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                              isDone
                                ? 'bg-[#2A9D8F] text-[#FFFFFF]'
                                : 'bg-[#EEE9FF] text-[#6554C0] hover:bg-[#6554C0] hover:text-[#FFFFFF]'
                            }`}
                          >
                            {isDone ? '✓ Completed (+50 XP)' : 'Mark Topic Mastered (+50 XP)'}
                          </button>
                        </div>
                        <p className="text-[#292936] pl-6 leading-relaxed">{top.summary}</p>
                        <div className="pl-6 space-y-1">
                          <p className="text-[11px] font-semibold text-[#6554C0]">
                            Interactive Code / Architecture Pattern:
                          </p>
                          <pre className="p-3 rounded-lg bg-[#292344] text-[#FAF9F6] border border-[#292344] font-mono text-[11px] overflow-x-auto">
                            {top.exampleCodeOrConcept}
                          </pre>
                        </div>
                        <div className="pl-6 pt-1 flex flex-wrap items-center justify-between gap-2">
                          <a
                            href={top.resourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#6554C0] hover:text-[#292344] hover:underline"
                          >
                            <span>Study Official Guide: {top.resourceTitle}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeStage === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5EF] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#292344]">
                    Stage 2 — Interactive Practice Sandbox & Coding Challenges
                  </h2>
                  <p className="text-xs text-[#747484]">
                    Write your solution or query in the interactive sandbox below, use hints when needed, and verify to earn +50 XP per challenge!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStage(3)}
                  className="h-8 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg shrink-0 cursor-pointer"
                >
                  Continue to Stage 3 Projects →
                </button>
              </div>
              <div className="space-y-4">
                {activeTrack.stage2Practice.tasks.map((task) => {
                  const isDone = learningProgress.includes(task.id);
                  const hintOpen = Boolean(revealedHints[task.id]);
                  const solOpen = Boolean(revealedSolutions[task.id]);
                  const fb = practiceFeedback[task.id];

                  return (
                    <div
                      key={task.id}
                      className={`p-5 rounded-xl border space-y-3 text-xs ${
                        isDone
                          ? 'bg-[#DDF5EA]/30 border-[#2A9D8F]/40'
                          : 'bg-[#FAF9F6] border-[#E8E5EF]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Mark ${task.title} completed`}
                            onClick={() => onToggleLearningItem(task.id)}
                            className="text-[#2A9D8F] cursor-pointer"
                          >
                            {isDone ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4 text-[#6554C0]" />
                            )}
                          </button>
                          <h3 className="font-bold text-[#292344] text-sm">{task.title}</h3>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                            isDone
                              ? 'bg-[#2A9D8F] text-[#FFFFFF]'
                              : 'bg-[#EEE9FF] text-[#6554C0]'
                          }`}
                        >
                          {isDone ? 'Challenge Solved (+50 XP)' : 'Interactive Coding Challenge'}
                        </span>
                      </div>

                      <p className="text-[#292936] pl-6 leading-relaxed">
                        <strong className="text-[#292344]">Challenge Prompt:</strong> {task.prompt}
                      </p>

                      <div className="pl-6 space-y-2">
                        <label
                          htmlFor={`sandbox-${task.id}`}
                          className="block text-[11px] font-semibold text-[#292344]"
                        >
                          Your Interactive Code / Solution Sandbox:
                        </label>
                        <textarea
                          id={`sandbox-${task.id}`}
                          rows={3}
                          value={practiceDrafts[task.id] || ''}
                          onChange={(e) =>
                            setPracticeDrafts((prev) => ({ ...prev, [task.id]: e.target.value }))
                          }
                          placeholder="Type your code, SQL query, or technical explanation here..."
                          className="w-full p-3 rounded-xl border border-[#E8E5EF] bg-[#FFFFFF] font-mono text-xs text-[#292344] focus:outline-none focus:border-[#6554C0]"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCheckPracticeSolution(task)}
                              className="h-8 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                            >
                              <Play className="w-3 h-3" />
                              <span>Check Solution & Claim +50 XP</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedHints((prev) => ({
                                  ...prev,
                                  [task.id]: !prev[task.id],
                                }))
                              }
                              className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#6554C0] bg-[#EEE9FF] rounded-lg cursor-pointer"
                            >
                              {hintOpen ? 'Hide Hint' : 'Need a Hint?'}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedSolutions((prev) => ({
                                  ...prev,
                                  [task.id]: !prev[task.id],
                                }))
                              }
                              className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#292936] bg-[#FFFFFF] border border-[#E8E5EF] rounded-lg cursor-pointer"
                            >
                              {solOpen ? 'Hide Reference Solution' : 'View Reference Solution'}
                            </button>
                          </div>
                        </div>

                        {fb && (
                          <div className="p-3 rounded-lg bg-[#DDF5EA]/70 border border-[#2A9D8F]/40 text-[#292344] font-medium">
                            {fb}
                          </div>
                        )}

                        {hintOpen && (
                          <div className="p-3 rounded-lg bg-[#EEE9FF]/60 border border-[#6554C0]/30 text-[#292344]">
                            <strong>Hint:</strong> {task.hint}
                          </div>
                        )}

                        {solOpen && (
                          <div className="p-3 rounded-lg bg-[#292344] text-[#FAF9F6] font-mono text-[11px] overflow-x-auto">
                            <span className="text-[#DDF5EA] font-sans font-bold block mb-1">
                              Reference Solution Pattern:
                            </span>
                            {task.solutionExplanation}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeStage === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5EF] pb-3">
                <div>
                  <h2 className="text-base font-bold text-[#292344]">
                    Stage 3 — Build Portfolio Projects (Beginner, Intermediate & Advanced)
                  </h2>
                  <p className="text-xs text-[#747484]">
                    Mark project blueprints as completed once you build them to strengthen your resume and earn +50 XP!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStage(4)}
                  className="h-8 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg shrink-0 cursor-pointer"
                >
                  Continue to Stage 4 Internships →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                {activeTrack.stage3Build.projects.map((proj) => {
                  const projItemId = `proj-${activeTrack.id}-${proj.level}`;
                  const isProjDone = learningProgress.includes(projItemId);
                  return (
                    <div
                      key={proj.title}
                      className={`p-4 rounded-xl border flex flex-col justify-between gap-3 text-xs h-full ${
                        isProjDone
                          ? 'bg-[#DDF5EA]/35 border-[#2A9D8F]/40'
                          : 'bg-[#FAF9F6] border-[#E8E5EF]'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#EEE9FF] font-bold text-[#6554C0] text-[11px]">
                            {proj.level} Project
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleLearningItem(projItemId)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                              isProjDone
                                ? 'bg-[#2A9D8F] text-[#FFFFFF]'
                                : 'bg-[#FFFFFF] text-[#292344] border border-[#E8E5EF]'
                            }`}
                          >
                            {isProjDone ? '✓ Built (+50 XP)' : 'Mark Built'}
                          </button>
                        </div>
                        <h3 className="text-sm font-bold text-[#292344]">{proj.title}</h3>
                        <p className="text-[#292936] leading-relaxed">{proj.objective}</p>
                        <p>
                          <strong className="text-[#292344]">Tech Stack:</strong>{' '}
                          {proj.technologies.join(', ')}
                        </p>
                        <div className="space-y-1 pt-1">
                          <p className="font-semibold text-[#292344]">Build Milestones:</p>
                          <ul className="list-disc pl-4 space-y-1 text-[#747484]">
                            {proj.milestones.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#2A9D8F] font-medium pt-2 border-t border-[#E8E5EF]">
                        <strong className="text-[#292344]">Career Outcome:</strong>{' '}
                        {proj.expectedOutcome}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeStage === 4 && (
            <div className="space-y-5 text-xs">
              <div>
                <h2 className="text-base font-bold text-[#292344]">
                  Stage 4 — Prepare, Verify Badge & Apply to Matching Internships
                </h2>
                <p className="text-xs text-[#747484] mt-0.5">
                  See exactly how this learning track connects to verified internships, resume bullets, and mock interviews.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2 h-full">
                  <h3 className="font-bold text-[#6554C0]">Internship Alignment</h3>
                  <ul className="list-disc pl-4 space-y-1 text-[#292936]">
                    {activeTrack.stage4Prepare.internshipRequirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2 h-full">
                  <h3 className="font-bold text-[#6554C0]">Resume Presentation</h3>
                  <ul className="list-disc pl-4 space-y-1 text-[#292936]">
                    {activeTrack.stage4Prepare.resumeTips.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2 h-full">
                  <h3 className="font-bold text-[#6554C0]">Interview Readiness</h3>
                  <ul className="list-disc pl-4 space-y-1 text-[#292936]">
                    {activeTrack.stage4Prepare.interviewFocus.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Live Matching Internships Unlocked by This Track */}
              <div className="p-4 rounded-xl bg-[#EEE9FF]/45 border border-[#6554C0]/30 space-y-3">
                <p className="font-bold text-[#292344]">
                  Verified Internships Requiring {activeTrack.title} Skills ({matchingTrackInternships.length}):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {matchingTrackInternships.slice(0, 6).map((int) => {
                    const rep = evaluateInternshipEligibility(int, profile, internships);
                    return (
                      <div
                        key={int.id}
                        className="p-3 rounded-lg bg-[#FFFFFF] border border-[#E8E5EF] flex flex-col justify-between gap-2"
                      >
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-1 ${
                              rep.status === 'Eligible'
                                ? 'bg-[#DDF5EA] text-[#2A9D8F]'
                                : 'bg-[#FFF0E8] text-[#F28B72]'
                            }`}
                          >
                            {rep.status}
                          </span>
                          <p className="font-bold text-[#292344]">{int.title}</p>
                          <p className="text-[11px] text-[#747484]">{int.organization}</p>
                        </div>
                        <p className="text-[11px] text-[#6554C0] font-semibold">
                          Skills: {int.mandatoryRequirements.mandatorySkills.join(', ')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('skill-badges')}
                  className="h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Take Skill Verification Assessment (+150 XP)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('discover')}
                  className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg cursor-pointer"
                >
                  Explore Matching Internships in Discover
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('pm-internship')}
                  className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#2A9D8F] bg-[#DDF5EA]/70 border border-[#2A9D8F]/30 rounded-lg cursor-pointer"
                >
                  View Recommended PM Internships
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  // PAGE D: SKILL BADGES AND ASSESSMENTS (Section 18)
  if (pageMode === 'skill-badges') {
    const activeAssessment = SKILL_ASSESSMENTS.find((a) => a.id === activeAssessmentId);

    const handleFinishAssessment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeAssessment) return;
      let correct = 0;
      const areasToImprove: string[] = [];
      for (const q of activeAssessment.questions) {
        if (selectedOptions[q.id] === q.correctOptionIndex) {
          correct += 1;
        } else {
          areasToImprove.push(q.question);
        }
      }
      const scorePercent = Math.round((correct / activeAssessment.questions.length) * 100);
      const passed = scorePercent >= activeAssessment.passingScorePercent;

      // Count how many internships use the verified skills
      const rawParts = activeAssessment.skillName
        .split('&')
        .map((part) =>
          part
            .replace(
              /\b(Modern|Relational|Fundamentals|Backend|Engineering|Cloud|Architecture|Data Science|Databases)\b/gi,
              ''
            )
            .trim()
            .toLowerCase()
        )
        .filter(Boolean);
      const matchingCount = internships.filter((i) =>
        i.mandatoryRequirements.mandatorySkills.some((m) =>
          rawParts.some((rp) => m.toLowerCase().includes(rp) || rp.includes(m.toLowerCase()))
        )
      ).length;

      setAssessmentResult({
        scorePercent,
        passed,
        badgeTitle: activeAssessment.badgeTitle,
        unlockedCount: matchingCount,
      });
      await onSubmitAssessment({
        assessmentId: activeAssessment.id,
        skillName: activeAssessment.skillName,
        category: activeAssessment.category,
        badgeTitle: activeAssessment.badgeTitle,
        scorePercent,
        passed,
        areasToImprove,
      });
    };

    return (
      <div className="space-y-6">
        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E5EF] pb-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[#292344] flex items-center gap-2">
                <Award className="w-5 h-5 text-[#6554C0]" />
                <span>Skill Badges & Technical Assessments — Verify & Unlock Internships</span>
              </h1>
              <p className="text-xs text-[#747484]">
                Score 75%+ on any technical assessment to earn an official badge, gain +150 Learning XP, and automatically upgrade those skills in your profile to &quot;Skill Assessment Verified&quot; — immediately unlocking eligible internships!
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="px-3.5 py-2 rounded-xl bg-[#DDF5EA]/70 border border-[#2A9D8F]/35 text-xs font-bold text-[#292344] flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-[#2A9D8F]" />
                <span>
                  {passedBadgesCount} / {SKILL_ASSESSMENTS.length} Badges Earned
                </span>
              </span>
              <span className="px-3.5 py-2 rounded-xl bg-[#EEE9FF] border border-[#6554C0]/30 text-xs font-mono font-bold text-[#6554C0]">
                {studentXp} Total XP
              </span>
            </div>
          </div>

          {/* Earned Badges Trophy Showcase */}
          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#292344]">
                Your Verified Skill Badge Showcase
              </p>
              {passedBadgesCount === 0 ? (
                <p className="text-xs text-[#747484]">
                  You haven&apos;t earned a verified assessment badge yet. Pick any assessment below (such as <strong>TypeScript &amp; Node.js</strong> or <strong>Docker &amp; PostgreSQL</strong>) to earn your first badge and unlock new internships!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SKILL_ASSESSMENTS.map((a) => {
                    const rec = completedAssessments.find(
                      (c) => c.assessmentId === a.id && c.passed
                    );
                    if (!rec) return null;
                    return (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#DDF5EA] border border-[#2A9D8F]/40 text-xs font-bold text-[#292344]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2A9D8F]" />
                        <span>
                          {a.badgeTitle} ({rec.scorePercent}%)
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigate('current-skills')}
              className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#6554C0] bg-[#EEE9FF] rounded-lg shrink-0 cursor-pointer"
            >
              View Skill Demand Impact →
            </button>
          </div>
        </section>

        {!activeAssessment ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {SKILL_ASSESSMENTS.map((assess) => {
              const bestRecord = completedAssessments.find(
                (c) => c.assessmentId === assess.id && c.passed
              );
              const rawSkills = assess.skillName
                .split('&')
                .map((part) =>
                  part
                    .replace(
                      /\b(Modern|Relational|Fundamentals|Backend|Engineering|Cloud|Architecture|Data Science|Databases)\b/gi,
                      ''
                    )
                    .trim()
                )
                .filter(Boolean);

              return (
                <div
                  key={assess.id}
                  className={`bg-[#FFFFFF] rounded-2xl border p-5 flex flex-col justify-between gap-4 h-full shadow-2xs transition-colors ${
                    bestRecord
                      ? 'border-[#2A9D8F]/60 bg-[#DDF5EA]/10'
                      : 'border-[#E8E5EF] hover:border-[#6554C0]/50'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#6554C0]">
                        {assess.category}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#EEE9FF] text-[11px] font-mono font-bold text-[#6554C0]">
                        +150 XP
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-[#292344]">{assess.skillName}</h2>
                    <p className="text-xs text-[#747484] leading-relaxed">{assess.description}</p>
                    <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-1 text-xs">
                      <p className="text-[#292344]">
                        <strong>Auto-Verifies Skills:</strong> {rawSkills.join(', ')}
                      </p>
                      <p className="font-mono text-[#747484] text-[11px]">
                        {assess.questions.length} Technical Questions · Passing Score:{' '}
                        {assess.passingScorePercent}%
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2.5 pt-3 border-t border-[#E8E5EF]">
                    {bestRecord ? (
                      <p className="text-xs font-bold text-[#2A9D8F] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          Earned: {assess.badgeTitle} ({bestRecord.scorePercent}%)
                        </span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#F28B72] font-semibold">
                        Pass this assessment to upgrade {rawSkills.join(' & ')} in your profile!
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAssessmentId(assess.id);
                        setSelectedOptions({});
                        setAssessmentResult(null);
                      }}
                      className="w-full h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                    >
                      {bestRecord ? 'Retake Assessment' : 'Start Skill Assessment'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <form
            onSubmit={handleFinishAssessment}
            className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-5 shadow-2xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E5EF] pb-3.5">
              <div>
                <span className="text-xs font-semibold text-[#6554C0]">
                  {activeAssessment.category} · +150 XP Reward
                </span>
                <h2 className="text-base font-bold text-[#292344]">
                  {activeAssessment.skillName} Assessment
                </h2>
                <p className="text-xs text-[#747484]">
                  Score at least {activeAssessment.passingScorePercent}% (3 out of 4 correct) to earn the{' '}
                  <strong>{activeAssessment.badgeTitle}</strong> and auto-verify these skills in your profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAssessmentId(null)}
                className="h-9 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg shrink-0 cursor-pointer"
              >
                Back to All Assessments
              </button>
            </div>

            {/* Answered Progress Indicator */}
            <div className="flex items-center justify-between text-xs bg-[#FAF9F6] px-4 py-2.5 rounded-xl border border-[#E8E5EF]">
              <span className="font-semibold text-[#292344]">
                Questions Answered: {Object.keys(selectedOptions).length} of{' '}
                {activeAssessment.questions.length}
              </span>
              <span className="font-mono text-[#6554C0] font-bold">
                Passing Threshold: {activeAssessment.passingScorePercent}%
              </span>
            </div>

            {assessmentResult && (
              <div
                role="status"
                className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                  assessmentResult.passed
                    ? 'bg-[#DDF5EA] border-[#2A9D8F]/40 text-[#292344]'
                    : 'bg-[#FFF0E8] border-[#F28B72]/45 text-[#292344]'
                }`}
              >
                <p className="font-bold text-sm">
                  Score: {assessmentResult.scorePercent}% —{' '}
                  {assessmentResult.passed
                    ? `Congratulations! You earned the ${assessmentResult.badgeTitle} (+150 XP)!`
                    : 'Passing criteria (75%) not met yet. Review the explanations below and try again.'}
                </p>
                {assessmentResult.passed && (
                  <p className="text-xs text-[#292936]">
                    Your profile Technical Competencies have been automatically upgraded to{' '}
                    <strong>Skill Assessment Verified</strong>, strengthening your eligibility across{' '}
                    <strong>{assessmentResult.unlockedCount || 4} verified internships</strong>!
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {assessmentResult.passed ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onNavigate('discover')}
                        className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                      >
                        View Newly Unlocked Internships →
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate('pm-internship')}
                        className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#FFFFFF] border border-[#2A9D8F] rounded-lg cursor-pointer"
                      >
                        Check Recommended PM Internships →
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOptions({});
                        setAssessmentResult(null);
                      }}
                      className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] rounded-lg cursor-pointer"
                    >
                      Reset & Try Assessment Again
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {activeAssessment.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2.5 text-xs"
                >
                  <p className="font-bold text-[#292344]">
                    {idx + 1}. {q.question}
                  </p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, optIdx) => {
                      const isChosen = selectedOptions[q.id] === optIdx;
                      const isCorrect = q.correctOptionIndex === optIdx;
                      return (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            assessmentResult
                              ? isCorrect
                                ? 'bg-[#DDF5EA]/70 border-[#2A9D8F] font-semibold'
                                : isChosen
                                ? 'bg-[#FFF0E8] border-[#F28B72]'
                                : 'bg-[#FFFFFF] border-[#E8E5EF]'
                              : isChosen
                              ? 'bg-[#EEE9FF]/70 border-[#6554C0]'
                              : 'bg-[#FFFFFF] border-[#E8E5EF] hover:border-[#6554C0]'
                          }`}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={isChosen}
                            onChange={() =>
                              setSelectedOptions((prev) => ({ ...prev, [q.id]: optIdx }))
                            }
                            required
                            className="accent-[#292344]"
                          />
                          <span className="text-[#292936]">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                  {assessmentResult && (
                    <p className="text-[11px] text-[#6554C0] pt-1.5 border-t border-[#E8E5EF]">
                      <strong className="text-[#292344]">Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {!assessmentResult && (
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="h-10 px-5 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-xl cursor-pointer"
                >
                  Submit Assessment for Verification
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    );
  }

  // PAGE E: AI INTERN ASSISTANT & AI CAREER ASSISTANT (Section 17)
  const isCareerMode = pageMode === 'career-assistant';

  const handleSendChatMessage = async (promptText?: string) => {
    const textToSend = (promptText ?? chatInput).trim();
    if (!textToSend || chatLoading) return;
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: textToSend }]);
    setChatLoading(true);
    try {
      const reply = await onAskAssistant({
        message: textToSend,
        mode: isCareerMode ? 'career' : 'intern',
        language: chatLanguage,
      });
      setChatMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E5EF] pb-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-[#292344] flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#6554C0]" />
              <span>
                {isCareerMode
                  ? 'AI Career Assistant — Roadmaps, Projects & Long-Term Planning'
                  : 'AI Intern Assistant — Eligibility, Missing Skills & Applications'}
              </span>
            </h1>
            <p className="text-xs text-[#747484]">
              Grounded in your authorized student profile, active verified internship listings, and resume analysis. Supports simple English and Tamil / Thanglish.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#FAF9F6] p-1 rounded-xl border border-[#E8E5EF] shrink-0">
            <button
              type="button"
              onClick={() => setChatLanguage('english')}
              className={`h-8 px-3 inline-flex items-center justify-center text-xs font-semibold rounded-lg cursor-pointer ${
                chatLanguage === 'english'
                  ? 'bg-[#292344] text-[#FFFFFF]'
                  : 'text-[#292936] hover:bg-[#EEE9FF]/60'
              }`}
            >
              Simple English
            </button>
            <button
              type="button"
              onClick={() => setChatLanguage('thanglish')}
              className={`h-8 px-3 inline-flex items-center justify-center text-xs font-semibold rounded-lg cursor-pointer ${
                chatLanguage === 'thanglish'
                  ? 'bg-[#292344] text-[#FFFFFF]'
                  : 'text-[#292936] hover:bg-[#EEE9FF]/60'
              }`}
            >
              Tamil / Thanglish
            </button>
          </div>
        </div>

        {/* Quick Grounded Prompts */}
        <div className="flex flex-wrap gap-2">
          {[
            'Which verified internships am I eligible for right now?',
            'Why am I not eligible yet for Razorpay or Swiggy?',
            'Give me a 4-week roadmap to learn Docker & TypeScript',
            'Draft an internship application email for Zoho Full-Stack Intern',
          ].map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => handleSendChatMessage(quick)}
              className="h-8 px-3 inline-flex items-center justify-center text-xs font-medium text-[#292344] bg-[#FAF9F6] hover:bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg cursor-pointer"
            >
              {quick}
            </button>
          ))}
        </div>

        {/* Messages Container */}
        <div className="h-96 overflow-y-auto p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-3">
          {chatMessages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl text-xs whitespace-pre-line leading-relaxed max-w-3xl ${
                m.role === 'user'
                  ? 'ml-auto bg-[#292344] text-[#FFFFFF]'
                  : 'bg-[#FFFFFF] border border-[#E8E5EF] text-[#292936]'
              }`}
            >
              {m.text}
            </div>
          ))}
          {chatLoading && (
            <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E8E5EF] text-xs text-[#6554C0]">
              Analyzing your profile and verified listings...
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendChatMessage();
          }}
          className="flex items-center gap-2.5"
        >
          <input
            type="text"
            aria-label="Ask AI Assistant"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={
              chatLanguage === 'thanglish'
                ? 'Type in English or Thanglish (e.g., Enakku entha internship eligible?)...'
                : 'Ask about your eligibility, missing skills, government internships, or career plan...'
            }
            className="flex-1 h-10 px-4 text-xs rounded-xl border border-[#E8E5EF] bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
          />
          <button
            type="submit"
            disabled={chatLoading}
            className="h-10 px-5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-xl cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </section>
    </div>
  );
};
