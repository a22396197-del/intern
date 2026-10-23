import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Bell,
  Settings,
  ShieldAlert,
  PlusCircle,
  Building2,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  StudentProfile,
  InternshipListing,
  ApplicationRecord,
  ResumeAnalysisReport,
  AppNotification,
  AiInternshipRecommendation,
} from '../types.ts';
import {
  calculateProfileCompletion,
  evaluateInternshipEligibility,
  computeCurrentRelevantSkills,
  generatePersonalizedAiRecommendations,
} from '../utils/logic.ts';

interface DashboardAndAdminViewProps {
  pageMode: 'dashboard' | 'notifications' | 'settings' | 'post-internship' | 'admin';
  profile: StudentProfile;
  internships: InternshipListing[];
  savedInternshipIds: string[];
  applications: ApplicationRecord[];
  resumeReports: ResumeAnalysisReport[];
  learningProgress: string[];
  notifications: AppNotification[];
  aiRecommendations?: AiInternshipRecommendation[];
  refreshingAiRecs?: boolean;
  onRefreshAiRecommendations?: () => Promise<void>;
  onNavigate: (page: string) => void;
  onOpenInternship?: (internshipId: string, action: 'details' | 'eligibility' | 'apply') => void;
  onMarkNotificationsRead: (id?: string) => Promise<void>;
  onCreateInternshipListing: (payload: Partial<InternshipListing> & Record<string, unknown>) => Promise<{
    ok: boolean;
    error?: string;
  }>;
  onUpdateInternshipStatus: (
    id: string,
    verificationStatus: InternshipListing['verificationStatus']
  ) => Promise<void>;
  onLogout: () => void;
}

export const DashboardAndAdminView: React.FC<DashboardAndAdminViewProps> = ({
  pageMode,
  profile,
  internships,
  savedInternshipIds,
  applications,
  resumeReports,
  learningProgress,
  notifications,
  aiRecommendations,
  refreshingAiRecs = false,
  onRefreshAiRecommendations,
  onNavigate,
  onOpenInternship,
  onMarkNotificationsRead,
  onCreateInternshipListing,
  onUpdateInternshipStatus,
  onLogout,
}) => {
  // Admin Form State
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizationType, setOrganizationType] =
    useState<InternshipListing['organizationType']>('Private');
  const [roleCategory, setRoleCategory] =
    useState<InternshipListing['roleCategory']>('Full-Stack Development');
  const [workMode, setWorkMode] = useState<InternshipListing['workMode']>('Online');
  const [location, setLocation] = useState('Remote / Chennai');
  const [isPaid] = useState(true);
  const [stipend, setStipend] = useState('₹20,000 / month');
  const [duration] = useState('3 Months');
  const [deadline, setDeadline] = useState('2026-12-10');
  const [mandatorySkillsText, setMandatorySkillsText] = useState('JavaScript, React, SQL');
  const [officialSourceUrl, setOfficialSourceUrl] = useState('https://example.org/careers');
  const [applicationUrl, setApplicationUrl] = useState('https://example.org/careers/apply');
  const [description, setDescription] = useState('');
  const [adminFeedback, setAdminFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  // Settings Consent State
  const [emailAlertsConsent, setEmailAlertsConsent] = useState(false);
  const [deadlineRemindersConsent, setDeadlineRemindersConsent] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Expand/collapse state for AI Recommended cards
  const [expandedRecIds, setExpandedRecIds] = useState<Record<string, boolean>>({});

  const toggleRecExpanded = (id: string) => {
    setExpandedRecIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completion = useMemo(() => calculateProfileCompletion(profile), [profile]);
  const evaluated = useMemo(
    () =>
      internships.map((internship) => ({
        internship,
        report: evaluateInternshipEligibility(internship, profile, internships),
      })),
    [internships, profile]
  );

  const eligibleListings = evaluated.filter((x) => x.report.status === 'Eligible');
  const potentiallyEligibleListings = evaluated.filter(
    (x) => x.report.status === 'Potentially Eligible / More Information Needed'
  );
  const notEligibleListings = evaluated.filter((x) => x.report.status === 'Not Eligible Yet');

  const resolvedAiRecommendations = useMemo(() => {
    const raw =
      aiRecommendations && aiRecommendations.length > 0
        ? aiRecommendations
        : generatePersonalizedAiRecommendations(internships, profile);
    const seen = new Set<string>();
    return raw
      .map((rec) => {
        const match = evaluated.find((e) => e.internship.id === rec.internshipId);
        if (!match || seen.has(rec.internshipId)) return null;
        seen.add(rec.internshipId);
        return {
          rec,
          internship: match.internship,
          report: match.report,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [aiRecommendations, internships, profile, evaluated]);

  const govListings = evaluated.filter((x) => x.internship.organizationType !== 'Private');
  const closingSoonListings = [...evaluated]
    .filter((x) => x.report.status !== 'Closed / Expired')
    .sort((a, b) => a.internship.deadline.localeCompare(b.internship.deadline))
    .slice(0, 4);

  const latestResume = resumeReports[0];
  const skillGaps = useMemo(
    () =>
      computeCurrentRelevantSkills(internships, profile)
        .filter((s) => s.needsImprovement)
        .slice(0, 5),
    [internships, profile]
  );

  // PAGE 1: PERSONALIZED STUDENT DASHBOARD (Section 7)
  if (pageMode === 'dashboard') {
    return (
      <div className="space-y-6">
        {/* Welcome & Profile Completion Header */}
        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#6554C0]">
                Personalized Student Career Workspace
              </p>
              <h1 className="text-xl md:text-2xl font-bold text-[#292344]">
                Welcome back, {profile.fullName}
              </h1>
              <p className="text-xs text-[#747484]">
                <span>{profile.college || 'Complete college in profile'}</span>
                <span aria-hidden="true"> · </span>
                <span>
                  {profile.degree || 'Degree'} {profile.department ? `in ${profile.department}` : ''}
                </span>
                <span aria-hidden="true"> · </span>
                <span>Class of {profile.graduationYear || 'TBD'}</span>
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#292936]">
                  Profile Completion:{' '}
                  <span className="font-mono font-bold text-[#2A9D8F]">{completion.percentage}%</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('profile')}
                  className="h-9 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg transition-colors cursor-pointer"
                >
                  Update Profile
                </button>
              </div>
              <div className="w-full sm:w-56 h-2 rounded-full bg-[#FAF9F6] border border-[#E8E5EF] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#6554C0] to-[#2A9D8F]"
                  style={{ width: `${completion.percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* 7 Required Dashboard Metric Cards (Section 7) — All Calculated from Real Database Records */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mt-6 pt-5 border-t border-[#E8E5EF] tabular-nums items-stretch">
            <button
              type="button"
              onClick={() => onNavigate('discover')}
              className="p-3 rounded-xl bg-[#FAF9F6] hover:bg-[#EEE9FF]/50 border border-[#E8E5EF] text-left transition-colors flex flex-col justify-between h-full cursor-pointer"
            >
              <p className="text-[11px] font-medium tracking-tight text-[#747484] leading-snug">
                Verified Internships
              </p>
              <p className="text-xl font-mono font-bold text-[#292344] mt-1">
                {internships.length}
              </p>
              <p className="text-[11px] font-semibold text-[#2A9D8F] mt-1">
                {eligibleListings.length} Eligible now →
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('discover')}
              className="p-3 rounded-xl bg-[#EEE9FF]/50 hover:bg-[#EEE9FF] border border-[#E8E5EF] text-left transition-colors flex flex-col justify-between h-full cursor-pointer"
            >
              <p className="text-[11px] font-medium tracking-tight text-[#747484] leading-snug">
                AI Recommended
              </p>
              <p className="text-xl font-mono font-bold text-[#6554C0] mt-1">
                {resolvedAiRecommendations.length}
              </p>
              <p className="text-[11px] font-medium text-[#292344] mt-1">Personalized fit →</p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('applications')}
              className="p-3 rounded-xl bg-[#FAF9F6] hover:bg-[#EEE9FF]/50 border border-[#E8E5EF] text-left transition-colors flex flex-col justify-between h-full cursor-pointer"
            >
              <p className="text-[11px] font-medium tracking-tight text-[#747484] leading-snug">
                My Applications
              </p>
              <p className="text-xl font-mono font-bold text-[#292344] mt-1">
                {applications.length}
              </p>
              <p className="text-[11px] font-semibold text-[#6554C0] mt-1">Track statuses →</p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('saved')}
              className="p-3 rounded-xl bg-[#FAF9F6] hover:bg-[#EEE9FF]/50 border border-[#E8E5EF] text-left transition-colors flex flex-col justify-between h-full cursor-pointer"
            >
              <p className="text-[11px] font-medium tracking-tight text-[#747484] leading-snug">
                Saved Internships
              </p>
              <p className="text-xl font-mono font-bold text-[#292344] mt-1">
                {savedInternshipIds.length}
              </p>
              <p className="text-[11px] font-semibold text-[#6554C0] mt-1">View saved →</p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('discover')}
              className="p-3 rounded-xl bg-[#FFF0E8]/70 hover:bg-[#FFF0E8] border border-[#F28B72]/35 text-left transition-colors flex flex-col justify-between h-full cursor-pointer"
            >
              <p className="text-[11px] font-medium tracking-tight text-[#747484] leading-snug">
                Closing Soon
              </p>
              <p className="text-xl font-mono font-bold text-[#F28B72] mt-1">
                {closingSoonListings.length}
              </p>
              <p className="text-[11px] text-[#292936] mt-1">
                Due {closingSoonListings[0]?.internship.deadline || 'N/A'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('resume-scanner')}
              className="p-3 rounded-xl bg-[#FAF9F6] hover:bg-[#EEE9FF]/50 border border-[#E8E5EF] text-left transition-colors flex flex-col justify-between h-full cursor-pointer"
            >
              <p className="text-[11px] font-medium tracking-tight text-[#747484] leading-snug">
                Resume Analysis
              </p>
              <p className="text-xl font-mono font-bold text-[#292344] mt-1">
                {latestResume ? `${latestResume.overallScore}/100` : 'Scan'}
              </p>
              <p className="text-[11px] font-semibold text-[#6554C0] mt-1">Keyword check →</p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('skill-development')}
              className="p-3 rounded-xl bg-[#DDF5EA]/65 hover:bg-[#DDF5EA] border border-[#2A9D8F]/30 text-left transition-colors flex flex-col justify-between h-full cursor-pointer"
            >
              <p className="text-[11px] font-medium tracking-tight text-[#747484] leading-snug">
                Skill Development
              </p>
              <p className="text-xl font-mono font-bold text-[#2A9D8F] mt-1">
                {learningProgress.length}
              </p>
              <p className="text-[11px] font-semibold text-[#292344] mt-1">Tasks done →</p>
            </button>
          </div>
        </section>

        {/* SECTION C: AI RECOMMENDED INTERNSHIPS — PERSONALIZED FOR YOU */}
        <section
          aria-labelledby="dash-ai-recommended-heading"
          className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 shadow-2xs"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E8E5EF] pb-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6554C0] shrink-0" />
                <h2
                  id="dash-ai-recommended-heading"
                  className="text-base md:text-lg font-bold text-[#292344]"
                >
                  AI Recommended Internships — Personalized for You ({resolvedAiRecommendations.length})
                </h2>
              </div>
              <p className="text-xs text-[#747484] leading-relaxed">
                Selected by AI using your uploaded resume ({profile.uploadedResumeName || 'Profile skills'}), education ({profile.degree || 'Degree'} {profile.department}, Class of {profile.graduationYear || 'TBD'}), projects, certifications, target roles ({(profile.targetRoles || []).join(', ') || 'Software Engineering'}), and {profile.preferredWorkMode || 'Any'}/{profile.paidPreference || 'Paid or Unpaid'} preferences — distinct from the strict eligibility filter.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {onRefreshAiRecommendations && (
                <button
                  type="button"
                  disabled={refreshingAiRecs}
                  onClick={() => onRefreshAiRecommendations()}
                  className="h-8 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#292344] bg-[#EEE9FF] hover:bg-[#EEE9FF]/80 border border-[#E8E5EF] rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#6554C0] ${refreshingAiRecs ? 'animate-spin' : ''}`} />
                  <span>{refreshingAiRecs ? 'Generating AI Fit...' : 'Refresh AI Recommendations'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate('discover')}
                className="h-8 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#6554C0] hover:bg-[#292344] rounded-lg transition-colors cursor-pointer"
              >
                Explore All AI Recommendations →
              </button>
            </div>
          </div>

          {resolvedAiRecommendations.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {resolvedAiRecommendations.slice(0, 4).map(({ rec, internship }) => (
                <article
                  key={internship.id}
                  className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] flex flex-col justify-between gap-3 h-full"
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-semibold text-[#6554C0]">
                          {internship.organization} · {internship.workMode} ({internship.location})
                        </p>
                        <h3 className="text-sm font-bold text-[#292344] leading-snug">
                          {internship.title}
                        </h3>
                        <p className="text-[11px] text-[#747484] tabular-nums">
                          <span className="font-semibold text-[#292936]">{internship.stipend}</span> ·{' '}
                          {internship.duration} · Closes: {internship.deadline}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {rec.eligibilityStatus === 'Eligible' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#DDF5EA] text-[11px] font-bold text-[#2A9D8F]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Eligible</span>
                          </span>
                        ) : rec.eligibilityStatus === 'Not Eligible Yet' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFF0E8] text-[11px] font-bold text-[#F28B72]">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Not Eligible Yet (Skill-Bridge)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EEE9FF] text-[11px] font-bold text-[#6554C0]">
                            <span>More Info Needed</span>
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#E8E5EF] font-mono text-[11px] font-bold text-[#292344]">
                          AI Fit: {rec.aiMatchScore}%
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E8E5EF] space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#EEE9FF] text-[11px] font-bold text-[#6554C0]">
                          {rec.recommendationCategory}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRecExpanded(internship.id)}
                          className="text-[11px] font-semibold text-[#6554C0] hover:text-[#292344] inline-flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{expandedRecIds[internship.id] ? 'Hide Full Rationale' : 'View Full AI Fit Details'}</span>
                          {expandedRecIds[internship.id] ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <p className="text-[#292936] leading-relaxed line-clamp-3">
                        {rec.personalizedReason}
                      </p>

                      {rec.resumeAndSkillSignals.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {rec.resumeAndSkillSignals.map((signal, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#DDF5EA] text-[10.5px] font-medium text-[#2A9D8F]"
                            >
                              {signal}
                            </span>
                          ))}
                        </div>
                      )}

                      {expandedRecIds[internship.id] && (
                        <div className="pt-2 border-t border-[#E8E5EF] space-y-2 text-[11px] animate-fade-slide-up">
                          {rec.projectAndCertConnections.length > 0 && (
                            <p className="text-[#292344] leading-relaxed">
                              <strong>Portfolio Connection:</strong> {rec.projectAndCertConnections.join(' · ')}
                            </p>
                          )}
                          <p className="text-[#747484] leading-relaxed">
                            <strong className="text-[#292344]">Preferences & Goal Fit:</strong>{' '}
                            {rec.careerAndPreferenceFit}
                          </p>
                          <p className="text-[#747484] pt-1.5 border-t border-[#E8E5EF] leading-relaxed">
                            <strong className="text-[#292344]">Why in AI Recommended:</strong>{' '}
                            {rec.crossSectionExplanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-[#E8E5EF] flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[#747484]">
                      {rec.skillGapOrNextAction}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenInternship
                            ? onOpenInternship(internship.id, 'eligibility')
                            : onNavigate('discover')
                        }
                        className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#FFFFFF] hover:bg-[#EEE9FF]/70 border border-[#E8E5EF] rounded-lg transition-colors cursor-pointer"
                      >
                        Check Eligibility
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenInternship
                            ? onOpenInternship(internship.id, 'details')
                            : onNavigate('discover')
                        }
                        className="h-8 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg transition-colors cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] text-xs text-[#747484]">
              Complete your student profile, career goals, and skills to generate personalized AI internship recommendations.
            </div>
          )}
        </section>

        {/* SECTION A vs SECTION B: ELIGIBLE INTERNSHIPS vs NOT ELIGIBLE YET */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* SECTION A: INTERNSHIPS YOU'RE ELIGIBLE FOR */}
          <section
            aria-labelledby="dash-eligible-heading"
            className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 flex flex-col justify-between h-full shadow-2xs"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-[#E8E5EF] pb-3.5">
                <div className="space-y-0.5">
                  <h2
                    id="dash-eligible-heading"
                    className="text-base font-bold text-[#292344] flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                    <span>Internships You&apos;re Eligible For ({eligibleListings.length})</span>
                  </h2>
                  <p className="text-[11px] text-[#747484]">
                    Verified listings where your profile satisfies 100% of mandatory academic & skill rules.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('discover')}
                  className="text-xs font-semibold text-[#6554C0] hover:text-[#292344] hover:underline shrink-0 cursor-pointer"
                >
                  View All →
                </button>
              </div>

              {eligibleListings.length > 0 ? (
                <div className="divide-y divide-[#E8E5EF] text-xs">
                  {eligibleListings.slice(0, 4).map(({ internship, report }) => (
                    <div
                      key={internship.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="font-bold text-[#292344] leading-snug">{internship.title}</p>
                        <p className="text-[#747484]">
                          {internship.organization} · {internship.workMode} ·{' '}
                          <span className="font-semibold text-[#292936]">{internship.stipend}</span>
                        </p>
                        <p className="text-[11px] font-medium text-[#2A9D8F]">
                          Eligibility Verified: Meets all {report.mandatoryMet.length} mandatory requirements · Deadline:{' '}
                          {internship.deadline}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenInternship
                              ? onOpenInternship(internship.id, 'eligibility')
                              : onNavigate('discover')
                          }
                          className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#FAF9F6] hover:bg-[#EEE9FF]/70 border border-[#E8E5EF] rounded-lg transition-colors cursor-pointer"
                        >
                          Check Eligibility
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenInternship
                              ? onOpenInternship(internship.id, 'details')
                              : onNavigate('discover')
                          }
                          className="h-8 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2.5 text-xs">
                  <p className="font-bold text-[#292344]">
                    No verified internships match all mandatory criteria yet
                  </p>
                  <p className="text-[#747484] leading-relaxed">
                    {potentiallyEligibleListings.length > 0
                      ? `You meet the academic cohort criteria for ${potentiallyEligibleListings.length} internships, but your profile is missing required details (such as Technical Skills or Degree info) to confirm full eligibility.`
                      : 'Complete your education details and add your verified technical skills and projects in My Profile to unlock eligible internships.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigate('profile')}
                      className="h-8 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg transition-colors cursor-pointer"
                    >
                      Complete My Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('skill-development')}
                      className="h-8 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#FFFFFF] hover:bg-[#EEE9FF]/60 border border-[#E8E5EF] rounded-lg transition-colors cursor-pointer"
                    >
                      Explore Skill Development
                    </button>
                  </div>
                </div>
              )}

              {potentiallyEligibleListings.length > 0 && (
                <div className="p-3.5 rounded-xl bg-[#EEE9FF]/55 border border-[#E8E5EF] space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-[#292344]">
                      More Information Needed ({potentiallyEligibleListings.length} Internships)
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate('profile')}
                      className="text-[11px] font-semibold text-[#6554C0] hover:underline shrink-0 cursor-pointer"
                    >
                      Add Skills in Profile →
                    </button>
                  </div>
                  <p className="text-[11px] text-[#747484] leading-relaxed">
                    Your academic profile matches these listings, but technical skills or education fields are needed to confirm mandatory eligibility:
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {potentiallyEligibleListings.slice(0, 2).map(({ internship }) => (
                      <div
                        key={internship.id}
                        className="flex items-center justify-between gap-2 bg-[#FFFFFF] px-3 py-2 rounded-lg border border-[#E8E5EF]"
                      >
                        <span className="font-semibold text-[#292344] truncate">
                          {internship.title} ({internship.organization})
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenInternship
                              ? onOpenInternship(internship.id, 'eligibility')
                              : onNavigate('discover')
                          }
                          className="text-[11px] font-semibold text-[#6554C0] hover:text-[#292344] shrink-0 cursor-pointer"
                        >
                          Check Eligibility →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SECTION B: INTERNSHIPS YOU'RE NOT ELIGIBLE FOR YET */}
          <section
            aria-labelledby="dash-not-eligible-heading"
            className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 flex flex-col justify-between h-full shadow-2xs"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-[#E8E5EF] pb-3.5">
                <div className="space-y-0.5">
                  <h2
                    id="dash-not-eligible-heading"
                    className="text-base font-bold text-[#292344] flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#F28B72] shrink-0" />
                    <span>
                      Internships You&apos;re Not Eligible For Yet ({notEligibleListings.length})
                    </span>
                  </h2>
                  <p className="text-[11px] text-[#747484]">
                    Distinguishes learnable skill gaps from hard academic/cohort eligibility restrictions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('skill-development')}
                  className="text-xs font-semibold text-[#6554C0] hover:text-[#292344] hover:underline shrink-0 cursor-pointer"
                >
                  Build Skills →
                </button>
              </div>
              <div className="divide-y divide-[#E8E5EF] text-xs">
                {notEligibleListings.slice(0, 4).map(({ internship, report }) => {
                  const hasHardRestriction = report.unchangeableRequirementsNotMet.length > 0;
                  const hasLearnableSkills = report.changeableSkillGaps.length > 0;
                  return (
                    <div
                      key={internship.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="font-bold text-[#292344] leading-snug">{internship.title}</p>
                        <p className="text-[#747484]">
                          {internship.organization} · {internship.workMode} ·{' '}
                          <span className="font-semibold text-[#292936]">{internship.stipend}</span>
                        </p>
                        {hasLearnableSkills && (
                          <p className="text-[11px] font-medium text-[#F28B72]">
                            <strong>Learnable Skill Gap:</strong> Missing mandatory skill(s) [
                            {report.changeableSkillGaps.join(', ')}] — Unlockable via Skill Development
                          </p>
                        )}
                        {hasHardRestriction && (
                          <p className="text-[11px] font-medium text-[#6554C0]">
                            <strong>Hard Eligibility Restriction:</strong>{' '}
                            {report.unchangeableRequirementsNotMet[0]}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenInternship
                              ? onOpenInternship(internship.id, 'eligibility')
                              : onNavigate('discover')
                          }
                          className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#FFF0E8] hover:bg-[#F28B72]/25 border border-[#F28B72]/40 rounded-lg shrink-0 transition-colors cursor-pointer"
                        >
                          Check Eligibility
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onOpenInternship
                              ? onOpenInternship(internship.id, 'details')
                              : onNavigate('discover')
                          }
                          className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#FAF9F6] hover:bg-[#EEE9FF]/70 border border-[#E8E5EF] rounded-lg shrink-0 transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Government Internships & Personalized Next Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-3.5 flex flex-col justify-between h-full shadow-2xs">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2 border-b border-[#E8E5EF] pb-3">
                <h2 className="text-sm font-bold text-[#292344] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#6554C0] shrink-0" />
                  <span>Verified Government Programs</span>
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('government')}
                  className="text-xs font-semibold text-[#6554C0] hover:text-[#292344] hover:underline shrink-0 cursor-pointer"
                >
                  Explore All
                </button>
              </div>
              <div className="space-y-2.5 text-xs">
                {govListings.slice(0, 3).map(({ internship, report }) => (
                  <div
                    key={internship.id}
                    className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-1"
                  >
                    <p className="font-bold text-[#292344]">{internship.title}</p>
                    <p className="text-[11px] text-[#747484]">
                      {internship.organizationType} · Closes {internship.deadline} ·{' '}
                      <span
                        className={`font-semibold ${
                          report.status === 'Eligible' ? 'text-[#2A9D8F]' : 'text-[#6554C0]'
                        }`}
                      >
                        {report.status}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-3.5 flex flex-col justify-between h-full shadow-2xs">
            <div className="space-y-3.5">
              <div className="border-b border-[#E8E5EF] pb-3">
                <h2 className="text-sm font-bold text-[#292344]">Current Skill Gaps to Address</h2>
              </div>
              <div className="space-y-2.5 text-xs">
                {skillGaps.map((sk) => (
                  <div
                    key={sk.skillName}
                    className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#292344] truncate">{sk.skillName}</p>
                      <p className="text-[11px] text-[#747484] truncate">
                        {sk.studentCurrentProficiency}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#EEE9FF] font-mono text-xs font-semibold text-[#6554C0] shrink-0">
                      {sk.activeVerifiedListingsCount} listings
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-3.5 flex flex-col justify-between h-full shadow-2xs">
            <div className="space-y-3.5">
              <div className="border-b border-[#E8E5EF] pb-3">
                <h2 className="text-sm font-bold text-[#292344]">
                  Personalized Next Actions & Notifications
                </h2>
              </div>
              <ul className="space-y-2.5 text-xs text-[#292936]">
                {notifications.slice(0, 3).map((n) => (
                  <li
                    key={n.id}
                    className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-1"
                  >
                    <p className="font-bold text-[#292344]">{n.title}</p>
                    <p className="text-[11px] text-[#747484] leading-relaxed">{n.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // PAGE 2: NOTIFICATIONS (Section 21)
  if (pageMode === 'notifications') {
    return (
      <div className="space-y-6">
        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E5EF] pb-4">
            <div>
              <h1 className="text-xl font-bold text-[#292344] flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#6554C0]" />
                <span>Notifications & Deadline Reminders</span>
              </h1>
              <p className="text-xs text-[#747484] mt-1">
                Generated from your real tracked applications, upcoming closing deadlines, and skill milestones.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onMarkNotificationsRead()}
              className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF] hover:bg-[#EEE9FF]/80 border border-[#E8E5EF] rounded-lg shrink-0 cursor-pointer"
            >
              Mark All as Read
            </button>
          </div>

          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  n.read ? 'bg-[#FFFFFF] border-[#E8E5EF]' : 'bg-[#FAF9F6] border-[#6554C0]/40'
                }`}
              >
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-[#292344]">
                    {n.title} · <span className="font-semibold text-[#6554C0]">{n.category}</span>
                  </p>
                  <p className="text-[#292936]">{n.message}</p>
                  <p className="text-[11px] text-[#747484] font-mono">{n.createdAt.slice(0, 10)}</p>
                </div>
                {n.linkPage && (
                  <button
                    type="button"
                    onClick={() => {
                      onMarkNotificationsRead(n.id);
                      onNavigate(n.linkPage!);
                    }}
                    className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg shrink-0 cursor-pointer"
                  >
                    Open Destination
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // PAGE 3: SETTINGS (Section 21)
  if (pageMode === 'settings') {
    return (
      <div className="space-y-6">
        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-5 shadow-2xs">
          <div className="border-b border-[#E8E5EF] pb-4">
            <h1 className="text-xl font-bold text-[#292344] flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#6554C0]" />
              <span>Account, Privacy & Notification Settings</span>
            </h1>
            <p className="text-xs text-[#747484] mt-1">
              Manage your authenticated student session, external notification consent, and resume records.
            </p>
          </div>

          {settingsSaved && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-[#DDF5EA] border border-[#2A9D8F]/40 text-[#292344] text-xs font-medium"
            >
              Notification and privacy preferences updated.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs items-stretch">
            <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2.5">
                <h2 className="font-bold text-[#292344] text-sm">Authenticated Account Details</h2>
                <p>
                  <strong className="text-[#292344]">Name:</strong> {profile.fullName}
                </p>
                <p>
                  <strong className="text-[#292344]">Email:</strong> {profile.email}
                </p>
                <p>
                  <strong className="text-[#292344]">Account Role:</strong>{' '}
                  <span className="uppercase font-mono text-[#6554C0] font-semibold">
                    {profile.role}
                  </span>
                </p>
                <p>
                  <strong className="text-[#292344]">Stored Resume:</strong>{' '}
                  {profile.uploadedResumeName || 'None'}
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-[#E8E5EF] space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <h2 className="font-bold text-[#292344] text-sm">
                  External Notification Consent (Opt-In Required)
                </h2>
                <label className="flex items-start gap-2.5 cursor-pointer text-[#292936]">
                  <input
                    type="checkbox"
                    checked={deadlineRemindersConsent}
                    onChange={(e) => setDeadlineRemindersConsent(e.target.checked)}
                    className="mt-0.5 accent-[#292344]"
                  />
                  <span>
                    Enable in-app closing deadline reminders for Saved Internships and Government Schemes.
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer text-[#292936]">
                  <input
                    type="checkbox"
                    checked={emailAlertsConsent}
                    onChange={(e) => setEmailAlertsConsent(e.target.checked)}
                    className="mt-0.5 accent-[#292344]"
                  />
                  <span>
                    I consent to receive external email notifications when an application status changes.
                  </span>
                </label>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsSaved(true);
                    setTimeout(() => setSettingsSaved(false), 3000);
                  }}
                  className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8E5EF] flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF] hover:bg-[#EEE9FF]/80 border border-[#E8E5EF] rounded-lg cursor-pointer"
            >
              Edit Student Profile
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#FFF0E8] hover:bg-[#F28B72]/30 border border-[#F28B72]/50 rounded-lg cursor-pointer"
            >
              Sign Out of Current Session
            </button>
          </div>
        </section>
      </div>
    );
  }

  // PAGE 4: POST INTERNSHIP & ADMIN PANEL (Section 20)
  const isAdmin = profile.role === 'admin';

  const handlePublishListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFeedback(null);
    const res = await onCreateInternshipListing({
      title,
      organization,
      organizationType,
      roleCategory,
      workMode,
      location,
      isPaid,
      stipend,
      stipendAmountMonthly: isPaid ? 20000 : 0,
      duration,
      deadline,
      mandatorySkills: mandatorySkillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      officialSourceUrl,
      applicationUrl,
      description,
      supportsInternalApply: true,
      verificationStatus: 'Verified Official Source',
    });
    if (!res.ok) {
      setAdminFeedback({ type: 'err', text: res.error || 'Failed to publish listing.' });
    } else {
      setAdminFeedback({
        type: 'ok',
        text: 'Verified internship listing published and added to Discover Internships!',
      });
      setTitle('');
      setOrganization('');
      setDescription('');
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E5EF] pb-4">
          <div>
            <h1 className="text-xl font-bold text-[#292344] flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#6554C0]" />
              <span>
                {pageMode === 'admin'
                  ? 'Administrator Verification & Listing Management Panel'
                  : 'Post Verified Internship Opportunity'}
              </span>
            </h1>
            <p className="text-xs text-[#747484] mt-1">
              All internship listings require verified source URLs and administrator authorization on the backend.
            </p>
          </div>
          <span className="h-8 px-3 inline-flex items-center text-xs font-mono font-semibold text-[#292344] bg-[#EEE9FF] rounded-lg border border-[#E8E5EF] shrink-0">
            Your Role: {profile.role.toUpperCase()}
          </span>
        </div>

        {!isAdmin ? (
          <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-3 text-xs">
            <div className="flex items-start gap-2.5 text-[#292344] font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#F28B72]" />
              <span>
                Administrator Role Required to Publish Directly (Enforced on Backend API)
              </span>
            </div>
            <p className="text-[#292936]">
              You are currently signed in as a <strong>Student</strong> ({profile.email}). To protect students from unverified or fraudulent listings, only authorized administrators (<code>admin@freeintern.edu</code>) can publish or verify internship listings.
            </p>
            <p className="text-[#747484]">
              To test administrator publishing and verification workflows, sign out and click <strong>Admin Account</strong> on the Login screen.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePublishListing} className="space-y-4 text-xs">
            {adminFeedback && (
              <div
                role="status"
                className={`p-3.5 rounded-xl border ${
                  adminFeedback.type === 'ok'
                    ? 'bg-[#DDF5EA] border-[#2A9D8F]/40 text-[#292344]'
                    : 'bg-[#FFF0E8] border-[#F28B72]/50 text-[#292344]'
                }`}
              >
                {adminFeedback.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="adm-title" className="block font-semibold text-[#292344] mb-1">
                  Internship Title *
                </label>
                <input
                  id="adm-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Backend Systems Intern"
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label htmlFor="adm-org" className="block font-semibold text-[#292344] mb-1">
                  Organization Name *
                </label>
                <input
                  id="adm-org"
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  required
                  placeholder="e.g., Chargebee Technologies"
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label htmlFor="adm-type" className="block font-semibold text-[#292344] mb-1">
                  Organization Type
                </label>
                <select
                  id="adm-type"
                  value={organizationType}
                  onChange={(e) =>
                    setOrganizationType(e.target.value as InternshipListing['organizationType'])
                  }
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                >
                  <option value="Private">Private</option>
                  <option value="Central Government">Central Government</option>
                  <option value="State Government">State Government</option>
                  <option value="Government Research Institution">
                    Government Research Institution
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label htmlFor="adm-cat" className="block font-semibold text-[#292344] mb-1">
                  Role Category
                </label>
                <select
                  id="adm-cat"
                  value={roleCategory}
                  onChange={(e) =>
                    setRoleCategory(e.target.value as InternshipListing['roleCategory'])
                  }
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                >
                  <option value="Full-Stack Development">Full-Stack Development</option>
                  <option value="Frontend Development">Frontend Development</option>
                  <option value="Backend Development">Backend Development</option>
                  <option value="AI and Machine Learning">AI and Machine Learning</option>
                  <option value="Data Analytics">Data Analytics</option>
                </select>
              </div>
              <div>
                <label htmlFor="adm-mode" className="block font-semibold text-[#292344] mb-1">
                  Work Mode
                </label>
                <select
                  id="adm-mode"
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value as InternshipListing['workMode'])}
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                >
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label htmlFor="adm-stipend" className="block font-semibold text-[#292344] mb-1">
                  Stipend
                </label>
                <input
                  id="adm-stipend"
                  type="text"
                  value={stipend}
                  onChange={(e) => setStipend(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label htmlFor="adm-deadline" className="block font-semibold text-[#292344] mb-1">
                  Closing Date
                </label>
                <input
                  id="adm-deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="adm-skills" className="block font-semibold text-[#292344] mb-1">
                  Mandatory Skills (comma-separated)
                </label>
                <input
                  id="adm-skills"
                  type="text"
                  value={mandatorySkillsText}
                  onChange={(e) => setMandatorySkillsText(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label htmlFor="adm-source" className="block font-semibold text-[#292344] mb-1">
                  Official Source URL *
                </label>
                <input
                  id="adm-source"
                  type="url"
                  value={officialSourceUrl}
                  onChange={(e) => setOfficialSourceUrl(e.target.value)}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label htmlFor="adm-apply" className="block font-semibold text-[#292344] mb-1">
                  Application Portal URL *
                </label>
                <input
                  id="adm-apply"
                  type="url"
                  value={applicationUrl}
                  onChange={(e) => setApplicationUrl(e.target.value)}
                  required
                  className="w-full h-9 px-3 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="adm-desc" className="block font-semibold text-[#292344] mb-1">
                Verified Opportunity Description *
              </label>
              <textarea
                id="adm-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full p-2.5 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
              />
            </div>

            <button
              type="submit"
              className="h-10 px-5 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-xl cursor-pointer"
            >
              Publish Verified Listing
            </button>
          </form>
        )}

        {/* Existing Listings Audit Table */}
        <div className="pt-4 border-t border-[#E8E5EF] space-y-3">
          <h2 className="text-sm font-bold text-[#292344]">
            Verified Platform Listings ({internships.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E8E5EF] text-[#747484]">
                  <th className="py-2.5 pr-3">Title & Organization</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Deadline</th>
                  <th className="py-2.5 px-3">Verification Status</th>
                  {isAdmin && <th className="py-2.5 pl-3 text-right">Admin Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5EF] tabular-nums">
                {internships.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-3 font-medium text-[#292344]">
                      {item.title} — <span className="text-[#6554C0]">{item.organization}</span>
                    </td>
                    <td className="py-3 px-3 text-[#747484]">{item.organizationType}</td>
                    <td className="py-3 px-3 font-mono text-[#292936]">{item.deadline}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#DDF5EA] text-[#2A9D8F] font-semibold">
                        {item.verificationStatus}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 pl-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateInternshipStatus(
                              item.id,
                              item.verificationStatus === 'Closed / Expired'
                                ? 'Verified Official Source'
                                : 'Closed / Expired'
                            )
                          }
                          className="h-8 px-3 inline-flex items-center justify-center text-[11px] font-semibold text-[#292344] bg-[#FAF9F6] hover:bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg cursor-pointer"
                        >
                          {item.verificationStatus === 'Closed / Expired'
                            ? 'Re-open Verified'
                            : 'Mark Closed'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
