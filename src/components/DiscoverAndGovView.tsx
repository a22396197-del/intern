import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Building2,
  ShieldCheck,
  X,
  FileCheck,
  Send,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import type {
  InternshipListing,
  StudentProfile,
  EligibilityReport,
  ApplicationRecord,
  AiInternshipRecommendation,
} from '../types.ts';
import {
  evaluateInternshipEligibility,
  generatePersonalizedAiRecommendations,
} from '../utils/logic.ts';

interface DiscoverAndGovViewProps {
  pageMode: 'discover' | 'government' | 'pm-internship' | 'saved';
  internships: InternshipListing[];
  profile: StudentProfile;
  savedInternshipIds: string[];
  applications: ApplicationRecord[];
  aiRecommendations?: AiInternshipRecommendation[];
  refreshingAiRecs?: boolean;
  onRefreshAiRecommendations?: () => Promise<void>;
  onToggleSave: (internshipId: string) => Promise<void>;
  onSubmitApplication: (payload: {
    internshipId: string;
    applicationMode: 'Internal Form' | 'External Official Portal';
    status: ApplicationRecord['status'];
    notes: string;
    coverNote?: string;
    resumeAttachedName?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onNavigate: (page: string) => void;
  pendingInternshipAction?: {
    internshipId: string;
    action: 'details' | 'eligibility' | 'apply';
  } | null;
  onClearPendingInternshipAction?: () => void;
}

type DiscoverCategoryTab =
  | 'ai-recommended'
  | 'eligible'
  | 'not-eligible'
  | 'potentially-eligible'
  | 'online'
  | 'offline'
  | 'paid'
  | 'unpaid'
  | 'all';

export const DiscoverAndGovView: React.FC<DiscoverAndGovViewProps> = ({
  pageMode,
  internships,
  profile,
  savedInternshipIds,
  applications,
  aiRecommendations,
  refreshingAiRecs = false,
  onRefreshAiRecommendations,
  onToggleSave,
  onSubmitApplication,
  onNavigate,
  pendingInternshipAction,
  onClearPendingInternshipAction,
}) => {
  const [activeTab, setActiveTab] = useState<DiscoverCategoryTab>('ai-recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [workModeFilter, setWorkModeFilter] = useState<'All' | 'Online' | 'Offline' | 'Hybrid'>('All');
  const [paidFilter, setPaidFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');
  const [yearFilter, setYearFilter] = useState<'All' | '1' | '2' | '3' | '4'>('All');
  const [sortBy, setSortBy] = useState<'relevance' | 'deadline' | 'stipend'>('relevance');

  // Modals State
  const [detailsInternship, setDetailsInternship] = useState<InternshipListing | null>(null);
  const [eligibilityModalItem, setEligibilityModalItem] = useState<{
    internship: InternshipListing;
    report: EligibilityReport;
  } | null>(null);
  const [applyModalItem, setApplyModalItem] = useState<InternshipListing | null>(null);

  // Apply Form State
  const [applyCoverNote, setApplyCoverNote] = useState('');
  const [applyNotes, setApplyNotes] = useState('');
  const [applyResumeName, setApplyResumeName] = useState(
    profile.uploadedResumeName || 'Aaravishnan_K_Resume_Oct2026.pdf'
  );
  const [applyStatusMessage, setApplyStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [submittingApply, setSubmittingApply] = useState(false);

  // Precompute eligibility report for every listing (deduplicated by internship.id)
  const enrichedListings = useMemo(() => {
    const seen = new Set<string>();
    return internships
      .filter((i) => {
        if (!i?.id || seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      })
      .map((internship) => ({
        internship,
        report: evaluateInternshipEligibility(internship, profile, internships),
      }));
  }, [internships, profile]);

  const resolvedAiRecs = useMemo(() => {
    const raw =
      aiRecommendations && aiRecommendations.length > 0
        ? aiRecommendations
        : generatePersonalizedAiRecommendations(internships, profile);
    const seen = new Set<string>();
    return raw.filter((r) => {
      if (!r?.internshipId || seen.has(r.internshipId)) return false;
      seen.add(r.internshipId);
      return true;
    });
  }, [aiRecommendations, internships, profile]);

  const aiRecById = useMemo(
    () => new Map(resolvedAiRecs.map((r) => [r.internshipId, r])),
    [resolvedAiRecs]
  );

  useEffect(() => {
    if (!pendingInternshipAction) return;
    const match = enrichedListings.find(
      (item) => item.internship.id === pendingInternshipAction.internshipId
    );
    if (match) {
      setActiveTab('all');
      if (pendingInternshipAction.action === 'details') {
        setDetailsInternship(match.internship);
      } else if (pendingInternshipAction.action === 'eligibility') {
        setEligibilityModalItem(match);
      } else if (pendingInternshipAction.action === 'apply') {
        setApplyModalItem(match.internship);
      }
    }
    onClearPendingInternshipAction?.();
  }, [pendingInternshipAction, enrichedListings, onClearPendingInternshipAction]);

  const counts = useMemo(() => {
    const privateAndAll = enrichedListings;
    return {
      aiRecommended: privateAndAll.filter((x) => aiRecById.has(x.internship.id)).length,
      eligible: privateAndAll.filter((x) => x.report.status === 'Eligible').length,
      notEligible: privateAndAll.filter((x) => x.report.status === 'Not Eligible Yet').length,
      potentiallyEligible: privateAndAll.filter(
        (x) => x.report.status === 'Potentially Eligible / More Information Needed'
      ).length,
      online: privateAndAll.filter((x) => x.internship.workMode === 'Online').length,
      offline: privateAndAll.filter((x) => x.internship.workMode === 'Offline').length,
      paid: privateAndAll.filter((x) => x.internship.isPaid).length,
      unpaid: privateAndAll.filter((x) => !x.internship.isPaid).length,
      all: privateAndAll.length,
    };
  }, [enrichedListings, aiRecById]);

  const filteredList = useMemo(() => {
    let base = enrichedListings;

    if (pageMode === 'government') {
      base = base.filter((x) => x.internship.organizationType !== 'Private');
    } else if (pageMode === 'pm-internship') {
      base = base.filter((x) => x.internship.organizationType === 'PM Internship Scheme');
    } else if (pageMode === 'saved') {
      base = base.filter((x) => savedInternshipIds.includes(x.internship.id));
    } else {
      // Discover Internship category tab filtering
      if (activeTab === 'ai-recommended') {
        base = base.filter((x) => aiRecById.has(x.internship.id));
      } else if (activeTab === 'eligible') {
        base = base.filter((x) => x.report.status === 'Eligible');
      } else if (activeTab === 'not-eligible') {
        base = base.filter((x) => x.report.status === 'Not Eligible Yet');
      } else if (activeTab === 'potentially-eligible') {
        base = base.filter(
          (x) => x.report.status === 'Potentially Eligible / More Information Needed'
        );
      } else if (activeTab === 'online') {
        base = base.filter((x) => x.internship.workMode === 'Online');
      } else if (activeTab === 'offline') {
        base = base.filter((x) => x.internship.workMode === 'Offline');
      } else if (activeTab === 'paid') {
        base = base.filter((x) => x.internship.isPaid);
      } else if (activeTab === 'unpaid') {
        base = base.filter((x) => !x.internship.isPaid);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      base = base.filter(
        ({ internship }) =>
          internship.title.toLowerCase().includes(q) ||
          internship.organization.toLowerCase().includes(q) ||
          internship.roleCategory.toLowerCase().includes(q) ||
          internship.location.toLowerCase().includes(q) ||
          internship.mandatoryRequirements.mandatorySkills.some((s) =>
            s.toLowerCase().includes(q)
          ) ||
          internship.preferredSkills.some((s) => s.toLowerCase().includes(q))
      );
    }

    if (workModeFilter !== 'All') {
      base = base.filter((x) => x.internship.workMode === workModeFilter);
    }
    if (paidFilter === 'Paid') {
      base = base.filter((x) => x.internship.isPaid);
    } else if (paidFilter === 'Unpaid') {
      base = base.filter((x) => !x.internship.isPaid);
    }
    if (yearFilter !== 'All') {
      const yr = Number(yearFilter);
      base = base.filter((x) =>
        x.internship.mandatoryRequirements.allowedYearsOfStudy.includes(yr)
      );
    }

    return [...base].sort((a, b) => {
      if (sortBy === 'relevance') {
        const aiA = aiRecById.get(a.internship.id)?.aiMatchScore ?? a.report.relevanceScore;
        const aiB = aiRecById.get(b.internship.id)?.aiMatchScore ?? b.report.relevanceScore;
        return aiB - aiA;
      }
      if (sortBy === 'deadline') {
        return a.internship.deadline.localeCompare(b.internship.deadline);
      }
      return b.internship.stipendAmountMonthly - a.internship.stipendAmountMonthly;
    });
  }, [
    enrichedListings,
    aiRecById,
    pageMode,
    activeTab,
    savedInternshipIds,
    searchQuery,
    workModeFilter,
    paidFilter,
    yearFilter,
    sortBy,
  ]);

  const handleOpenApplyModal = (internship: InternshipListing) => {
    setApplyStatusMessage(null);
    setApplyCoverNote(
      `Applying for ${internship.title} at ${internship.organization}. My projects (${
        (profile.projects || []).map((p) => p.title).join(', ') || 'academic coursework'
      }) align with the published requirements.`
    );
    setApplyNotes('');
    setApplyModalItem(internship);
  };

  const handleConfirmApplication = async (
    mode: 'Internal Form' | 'External Official Portal',
    chosenStatus: ApplicationRecord['status']
  ) => {
    if (!applyModalItem) return;
    setSubmittingApply(true);
    setApplyStatusMessage(null);
    try {
      const res = await onSubmitApplication({
        internshipId: applyModalItem.id,
        applicationMode: mode,
        status: chosenStatus,
        notes:
          applyNotes.trim() ||
          (mode === 'External Official Portal'
            ? `Visited official portal (${applyModalItem.officialSourceUrl}) and recorded status.`
            : 'Submitted internal application with verified student profile.'),
        coverNote: applyCoverNote.trim(),
        resumeAttachedName: applyResumeName,
      });
      if (!res.ok) {
        setApplyStatusMessage({
          type: 'error',
          text: res.error || 'Could not record application.',
        });
      } else {
        setApplyStatusMessage({
          type: 'success',
          text:
            mode === 'Internal Form'
              ? 'Internal application submitted and added to your Application Tracker!'
              : 'External portal application recorded in your Application Tracker!',
        });
      }
    } finally {
      setSubmittingApply(false);
    }
  };

  const pmListings = enrichedListings
    .filter((x) => x.internship.organizationType === 'PM Internship Scheme')
    .sort((a, b) => {
      const rank = (item: typeof a) => {
        if (item.report.status === 'Eligible') return 0;
        if (item.report.unchangeableRequirementsNotMet.length === 0) return 1;
        return 2;
      };
      return rank(a) - rank(b);
    });
  const pmPrimaryListing = pmListings[0];
  const govAlternativeListings = enrichedListings.filter(
    (x) =>
      x.internship.organizationType !== 'Private' &&
      x.internship.organizationType !== 'PM Internship Scheme'
  );

  return (
    <div className="space-y-6">
      {pageMode === 'pm-internship' ? (
        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-5 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E5EF] pb-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#6554C0]">
                Ministry of Corporate Affairs (MCA), Government of India
              </p>
              <h1 className="text-xl md:text-2xl font-bold text-[#292344]">
                Prime Minister’s Internship Scheme (PMIS) — Official Hub & Recommended Tracks
              </h1>
              <p className="text-xs text-[#747484]">
                Official Source: pminternship.mca.gov.in · Last Verified: 2026-10-20 · {pmListings.length} Verified PMIS Partner Tracks
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {onRefreshAiRecommendations && (
                <button
                  type="button"
                  disabled={refreshingAiRecs}
                  onClick={() => onRefreshAiRecommendations()}
                  className="h-10 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#292344] bg-[#EEE9FF] hover:bg-[#6554C0] hover:text-[#FFFFFF] border border-[#6554C0]/30 rounded-xl transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingAiRecs ? 'animate-spin' : ''}`} />
                  <span>{refreshingAiRecs ? 'Refreshing AI Match...' : 'Refresh PM Recommendations'}</span>
                </button>
              )}
              <a
                href="https://pminternship.mca.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="h-10 px-4 inline-flex items-center justify-center gap-2 text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-xl whitespace-nowrap shrink-0 transition-colors"
              >
                <span>Open Official MCA PM Internship Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            <div className="p-4 rounded-xl bg-[#DDF5EA]/60 border border-[#2A9D8F]/30 space-y-1.5 flex flex-col justify-between h-full">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#2A9D8F]">Official Financial Assistance</p>
                <p className="text-sm font-bold text-[#292344] tabular-nums">
                  ₹5,000 / month + ₹6,000 One-Time Grant
                </p>
                <p className="text-xs text-[#292936] leading-relaxed">
                  ₹4,500/month disbursed by Govt. of India via DBT + ₹500/month from partner company CSR funds, plus ₹6,000 for incidentals upon joining.
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#EEE9FF]/60 border border-[#E8E5EF] space-y-1.5 flex flex-col justify-between h-full">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#6554C0]">Duration & Structure</p>
                <p className="text-sm font-bold text-[#292344]">12 Months Full-Time On-The-Job</p>
                <p className="text-xs text-[#292936] leading-relaxed">
                  At least half of the 12-month internship period must be spent in actual real-world job environments across India’s top 500 partner companies.
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-1.5 flex flex-col justify-between h-full">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#292344]">Insurance Coverage</p>
                <p className="text-sm font-bold text-[#292344]">PMJJBY & PMSBY Covered</p>
                <p className="text-xs text-[#292936] leading-relaxed">
                  Every intern is covered under Pradhan Mantri Jeevan Jyoti Bima Yojana and Pradhan Mantri Suraksha Bima Yojana by Government of India.
                </p>
              </div>
            </div>
          </div>

          {/* RECOMMENDED PM INTERNSHIPS — PERSONALIZED FOR YOUR PROFILE */}
          <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-[#6554C0]/30 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E8E5EF] pb-3.5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#6554C0] shrink-0" />
                  <h2 className="text-base font-bold text-[#292344]">
                    Recommended PM Internships — Personalized for {profile.fullName} ({pmListings.length})
                  </h2>
                </div>
                <p className="text-xs text-[#747484] leading-relaxed">
                  Evaluates official Prime Minister’s Internship Scheme (PMIS) partner company tracks against your uploaded resume (
                  <strong className="text-[#292344]">{profile.uploadedResumeName || 'Resume'}</strong>), verified skills (
                  <strong className="text-[#292344]">
                    {(profile.technicalCompetencies || []).map((t) => t.name).slice(0, 5).join(', ')}
                  </strong>
                  ), and target career roles.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate('skill-development')}
                  className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF] hover:bg-[#6554C0] hover:text-[#FFFFFF] border border-[#E8E5EF] rounded-lg transition-colors cursor-pointer"
                >
                  Open PMIS Skill Track →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('skill-badges')}
                  className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#2A9D8F] bg-[#DDF5EA]/80 hover:bg-[#2A9D8F] hover:text-[#FFFFFF] border border-[#2A9D8F]/30 rounded-lg transition-colors cursor-pointer"
                >
                  Verify Skills with Badges →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {pmListings.map(({ internship, report }) => {
                const aiRec = aiRecById.get(internship.id);
                const isEligible = report.status === 'Eligible';
                const existingApp = applications.find((a) => a.internshipId === internship.id);
                const isSaved = savedInternshipIds.includes(internship.id);

                return (
                  <article
                    key={internship.id}
                    className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E8E5EF] hover:border-[#6554C0]/50 transition-colors flex flex-col justify-between gap-3.5 h-full shadow-2xs"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-semibold text-[#6554C0]">
                            {internship.organization} · {internship.roleCategory}
                          </p>
                          <h3 className="text-sm font-bold text-[#292344] leading-snug">
                            {internship.title}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              isEligible
                                ? 'bg-[#DDF5EA] text-[#2A9D8F]'
                                : 'bg-[#FFF0E8] text-[#F28B72]'
                            }`}
                          >
                            {isEligible ? 'Eligible Now' : 'Not Eligible Yet'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[#EEE9FF] text-[11px] font-mono font-bold text-[#6554C0]">
                            AI Fit: {aiRec ? aiRec.aiMatchScore : report.relevanceScore}%
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-[#292936] leading-relaxed">
                        {internship.description}
                      </p>

                      <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E8E5EF] space-y-1.5 text-xs">
                        <p className="font-bold text-[#6554C0] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {aiRec
                              ? aiRec.recommendationCategory
                              : isEligible
                              ? 'Best Immediate PMIS Fit (Eligible Now)'
                              : 'PMIS Partner Track & Skill Alignment'}
                          </span>
                        </p>
                        <p className="text-[#292936] leading-relaxed">
                          {aiRec
                            ? aiRec.personalizedReason
                            : report.summaryReason}
                        </p>
                        <p className="text-[11px] text-[#2A9D8F] font-medium">
                          <strong className="text-[#292344]">Matched Skills:</strong>{' '}
                          {internship.mandatoryRequirements.mandatorySkills.join(', ')} ·{' '}
                          <strong className="text-[#292344]">Stipend:</strong> {internship.stipend}
                        </p>
                        {report.changeableSkillGaps.length > 0 && (
                          <div className="pt-1 border-t border-[#E8E5EF] flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] text-[#F28B72] font-semibold">
                              Learnable Skill Gap: {report.changeableSkillGaps.join(', ')}
                            </span>
                            <button
                              type="button"
                              onClick={() => onNavigate('skill-badges')}
                              className="text-[11px] font-bold text-[#6554C0] hover:underline cursor-pointer"
                            >
                              Pass Skill Assessment to Unlock →
                            </button>
                          </div>
                        )}
                        {report.unchangeableRequirementsNotMet.length > 0 && (
                          <p className="text-[11px] text-[#747484] pt-1 border-t border-[#E8E5EF]">
                            <strong className="text-[#292344]">Scheme Rule Note:</strong>{' '}
                            {report.unchangeableRequirementsNotMet.join(' | ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E8E5EF] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailsInternship(internship)}
                          className="h-8 px-2.5 inline-flex items-center justify-center text-xs font-semibold text-[#292936] bg-[#FAF9F6] hover:bg-[#EEE9FF]/60 border border-[#E8E5EF] rounded-lg cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setEligibilityModalItem({ internship, report })}
                          className="h-8 px-2.5 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF]/80 hover:bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg cursor-pointer"
                        >
                          Check Eligibility
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenApplyModal(internship)}
                          className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                        >
                          {existingApp ? `Applied (${existingApp.status})` : 'Apply / Record'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleSave(internship.id)}
                        className={`h-8 px-2.5 inline-flex items-center justify-center gap-1 text-xs font-semibold rounded-lg border cursor-pointer ${
                          isSaved
                            ? 'bg-[#2A9D8F] text-[#FFFFFF] border-[#2A9D8F]'
                            : 'bg-[#FFFFFF] text-[#292344] border-[#E8E5EF] hover:bg-[#FAF9F6]'
                        }`}
                      >
                        <Bookmark className="w-3 h-3" />
                        <span>{isSaved ? 'Saved' : 'Save'}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Government Semester Alternatives for Regular Full-Time Students */}
            {govAlternativeListings.length > 0 && (
              <div className="p-4 rounded-xl bg-[#DDF5EA]/35 border border-[#2A9D8F]/30 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-[#292344]">
                      Also Recommended for Regular Full-Time B.Tech Students: Short-Term Government Semester Internships
                    </p>
                    <p className="text-[11px] text-[#747484]">
                      If you are attending daytime college classes and need a 6-week to 3-month government internship instead of a 12-month full-time tenure, you are eligible for these verified ministries right now:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('government')}
                    className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#2A9D8F] hover:bg-[#292344] rounded-lg shrink-0 cursor-pointer"
                  >
                    Explore All Govt Internships →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  {govAlternativeListings.map(({ internship, report }) => (
                    <div
                      key={internship.id}
                      className="p-3 rounded-lg bg-[#FFFFFF] border border-[#E8E5EF] flex flex-col justify-between gap-2"
                    >
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded bg-[#DDF5EA] text-[10px] font-bold text-[#2A9D8F] mb-1">
                          {report.status}
                        </span>
                        <p className="font-bold text-[#292344] line-clamp-1">{internship.title}</p>
                        <p className="text-[11px] text-[#747484] truncate">{internship.organization}</p>
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-[#E8E5EF]">
                        <span className="text-[11px] font-mono text-[#6554C0] font-semibold">
                          {internship.duration}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDetailsInternship(internship)}
                          className="text-[11px] font-bold text-[#292344] hover:text-[#6554C0] hover:underline cursor-pointer"
                        >
                          Details →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
            <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-3">
              <h2 className="text-sm font-bold text-[#292344]">
                Official Published Eligibility Rules
              </h2>
              <ul className="space-y-2 text-xs text-[#292936] list-disc pl-5 leading-relaxed">
                <li>
                  <strong className="text-[#292344]">Age Criteria:</strong> Youth aged <strong>21 to 24 years</strong> as on the last date of application submission.
                </li>
                <li>
                  <strong className="text-[#292344]">Enrollment Status:</strong> Must <strong>NOT</strong> be enrolled in a full-time regular academic programme or full-time employment (online/distance learning students are permitted).
                </li>
                <li>
                  <strong className="text-[#292344]">Educational Qualification:</strong> Passed High School, Higher Secondary, ITI, Polytechnic Diploma, or Graduation (B.A., B.Sc, B.Com, BCA, BBA, B.Pharma, etc.).
                </li>
                <li>
                  <strong className="text-[#292344]">Income & Institution Exclusions:</strong> Annual family income must not exceed <strong>₹8 Lakh</strong>, and no family member should be a permanent government employee. Graduates from premier institutes (IITs, IIMs, National Law Universities, IISER, NIDs, IIITs) and holders of CA/CMA/CS/MBBS/BDS/MBA/Master’s degrees are excluded under official scheme rules.
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-[#292344]">
                  Required Documents & Application Process
                </h2>
                <ul className="space-y-2 text-xs text-[#292936] list-disc pl-5 leading-relaxed">
                  <li>
                    <strong className="text-[#292344]">Aadhaar Card</strong> (mandatory for Aadhaar-based e-KYC or DigiLocker verification).
                  </li>
                  <li>
                    <strong className="text-[#292344]">Educational Certificates</strong> (10th, 12th, ITI, Diploma, or Degree completion/marksheet).
                  </li>
                  <li>
                    <strong className="text-[#292344]">Aadhaar-Seeded Bank Account</strong> (for Direct Benefit Transfer of ₹4,500 monthly assistance and ₹6,000 grant).
                  </li>
                  <li>
                    <strong className="text-[#292344]">Self-Declaration</strong> of family income and non-enrollment in full-time regular classes.
                  </li>
                </ul>
              </div>
              {pmPrimaryListing && (
                <div className="pt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setEligibilityModalItem(pmPrimaryListing)}
                    className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                  >
                    Check My Profile Against PMIS Criteria
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenApplyModal(pmPrimaryListing.internship)}
                    className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF] border border-[#E8E5EF] hover:bg-[#EEE9FF]/80 rounded-lg cursor-pointer"
                  >
                    Record PMIS Application in Tracker
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="pt-4 border-t border-[#E8E5EF] space-y-3">
            <h2 className="text-sm font-bold text-[#292344]">
              Frequently Asked Questions (Official Scheme Guidelines)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs items-stretch">
              <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-1">
                <p className="font-bold text-[#292344]">
                  Is there any registration or application fee for PM Internship Scheme?
                </p>
                <p className="text-[#747484] leading-relaxed">
                  No. Registration and application on the official portal (pminternship.mca.gov.in) is 100% free of cost.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-1">
                <p className="font-bold text-[#292344]">
                  Can a 3rd-year regular full-time B.Tech student join PMIS while attending daytime college classes?
                </p>
                <p className="text-[#747484] leading-relaxed">
                  Regular daytime students who cannot commit to a 12-month full-time tenure can either apply for flexible-credit PMIS partner tracks upon graduation or immediately apply to MeitY, NITI Aayog, ISRO, and TNeGA semester internships listed above.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Page Header */}
          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-[#292344]">
                  {pageMode === 'government'
                    ? 'Government Internships — Verified Official Portals'
                    : pageMode === 'saved'
                    ? 'Saved Internships'
                    : 'Discover Internships — AI Recommendations & Complete Eligibility Transparency'}
                </h1>
                <p className="text-xs text-[#747484]">
                  {pageMode === 'government'
                    ? 'Central Government Ministries, State e-Governance Agencies, and National Research Institutions with verified official sources and deadlines.'
                    : pageMode === 'saved'
                    ? 'Your bookmarked opportunities persisted in the database. Check eligibility or apply before deadlines close.'
                    : 'Explore AI-Suggested listings, Internships You Are Eligible For, and Internships You Are Not Eligible For Yet with exact requirement comparisons.'}
                </p>
              </div>
              <div className="h-8 px-3 inline-flex items-center text-xs text-[#292344] bg-[#EEE9FF] rounded-lg border border-[#E8E5EF] font-semibold tabular-nums shrink-0">
                Showing {filteredList.length} Verified Opportunities
              </div>
            </div>

            {/* Category Tabs for Discover Internship */}
            {pageMode === 'discover' && (
              <div
                role="tablist"
                aria-label="Internship Categories"
                className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#FAF9F6] rounded-xl border border-[#E8E5EF]"
              >
                {[
                  {
                    id: 'ai-recommended',
                    label: `AI Recommended Internships — Personalized for You (${counts.aiRecommended})`,
                  },
                  { id: 'eligible', label: `Internships You're Eligible For (${counts.eligible})` },
                  {
                    id: 'not-eligible',
                    label: `Internships You're Not Eligible For Yet (${counts.notEligible})`,
                  },
                  {
                    id: 'potentially-eligible',
                    label: `Potentially Eligible (${counts.potentiallyEligible})`,
                  },
                  { id: 'online', label: `Online Internships (${counts.online})` },
                  { id: 'offline', label: `Offline Internships (${counts.offline})` },
                  { id: 'paid', label: `Paid Internships (${counts.paid})` },
                  { id: 'unpaid', label: `Unpaid Internships (${counts.unpaid})` },
                  { id: 'all', label: `All (${counts.all})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as DiscoverCategoryTab)}
                    className={`h-8 px-3 inline-flex items-center justify-center text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[#292344] text-[#FFFFFF] shadow-2xs'
                        : 'text-[#292936] hover:text-[#292344] hover:bg-[#EEE9FF]/70'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Search & Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-[#747484] absolute left-3 top-2.5" />
                <input
                  type="search"
                  aria-label="Search internships by title, organization, skill, domain, or location"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, company, skill (React, Python, SQL), or city..."
                  className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] text-[#292936] focus:outline-none focus:border-[#6554C0]"
                />
              </div>
              <div>
                <select
                  aria-label="Filter by work mode"
                  value={workModeFilter}
                  onChange={(e) =>
                    setWorkModeFilter(e.target.value as 'All' | 'Online' | 'Offline' | 'Hybrid')
                  }
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] text-[#292936]"
                >
                  <option value="All">All Work Modes (Online/Offline/Hybrid)</option>
                  <option value="Online">Online Only</option>
                  <option value="Offline">Offline / In-Office</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <select
                  aria-label="Filter by stipend status"
                  value={paidFilter}
                  onChange={(e) => setPaidFilter(e.target.value as 'All' | 'Paid' | 'Unpaid')}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] text-[#292936]"
                >
                  <option value="All">Paid & Unpaid</option>
                  <option value="Paid">Paid Internships Only</option>
                  <option value="Unpaid">Unpaid / Academic Credit</option>
                </select>
              </div>
              <div>
                <select
                  aria-label="Sort internships"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'relevance' | 'deadline' | 'stipend')}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] text-[#292936]"
                >
                  <option value="relevance">Sort: AI Relevance Score</option>
                  <option value="deadline">Sort: Closing Soonest</option>
                  <option value="stipend">Sort: Highest Stipend</option>
                </select>
              </div>
            </div>

            {/* Distinct Section Explanatory Banners */}
            {pageMode === 'discover' && activeTab === 'ai-recommended' && (
              <div className="p-4 rounded-xl bg-[#EEE9FF]/55 border border-[#E8E5EF] text-xs text-[#292936] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#6554C0] shrink-0 mt-0.5" />
                  <div className="leading-relaxed space-y-1">
                    <p className="font-bold text-[#292344]">
                      AI Recommended Internships — Personalized for You
                    </p>
                    <p>
                      Generated using your uploaded resume ({profile.uploadedResumeName || 'Profile skills'}), education ({profile.degree || 'Degree'} in {profile.department}, Cohort {profile.graduationYear || 'TBD'}), technical & domain competencies, projects, certifications, target roles ({(profile.targetRoles || []).join(', ')}), and preferences ({profile.preferredWorkMode || 'Any'} · {profile.paidPreference || 'Paid or Unpaid'}). Includes both immediate-fit eligible roles and high-value career-bridge opportunities with their actual eligibility status clearly shown.
                    </p>
                  </div>
                </div>
                {onRefreshAiRecommendations && (
                  <button
                    type="button"
                    disabled={refreshingAiRecs}
                    onClick={() => onRefreshAiRecommendations()}
                    className="h-8 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#292344] bg-[#FFFFFF] hover:bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg transition-colors shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#6554C0] ${refreshingAiRecs ? 'animate-spin' : ''}`} />
                    <span>{refreshingAiRecs ? 'Generating AI Fit...' : 'Refresh AI Recommendations'}</span>
                  </button>
                )}
              </div>
            )}

            {pageMode === 'discover' && activeTab === 'eligible' && (
              <div className="p-3.5 rounded-xl bg-[#DDF5EA]/55 border border-[#2A9D8F]/35 text-xs text-[#292936] flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2A9D8F] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-[#292344]">Internships You&apos;re Eligible For:</strong> Strict rule-by-rule verification confirming your degree ({profile.degree || 'Unspecified'}), department ({profile.department || 'Unspecified'}), academic year (Year {profile.currentYear ?? 'N/A'}), graduation cohort ({profile.graduationYear ?? 'TBD'}), and verified technical skills satisfy 100% of stated mandatory requirements.
                </div>
              </div>
            )}

            {pageMode === 'discover' && activeTab === 'not-eligible' && (
              <div className="p-3.5 rounded-xl bg-[#FFF0E8]/70 border border-[#F28B72]/40 text-xs text-[#292936] flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-[#F28B72] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-[#292344]">Internships You&apos;re Not Eligible For Yet:</strong> Genuine opportunities where your current profile does not meet one or more mandatory criteria. Each card explicitly separates <strong>Learnable Skill Gaps</strong> (which you can unlock via Skill Development) from <strong>Hard Eligibility Restrictions</strong> (such as graduation cohort or full-time non-enrollment rules).
                </div>
              </div>
            )}
          </section>

          {/* Listings Grid */}
          {filteredList.length === 0 ? (
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-10 text-center space-y-3 shadow-2xs">
              <p className="text-sm font-bold text-[#292344]">
                No internships match the current filter criteria
              </p>
              <p className="text-xs text-[#747484] max-w-md mx-auto">
                Try clearing your search query or switching category tabs to view all verified opportunities.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setWorkModeFilter('All');
                  setPaidFilter('All');
                  setYearFilter('All');
                  setActiveTab('all');
                }}
                className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredList.map(({ internship, report }) => {
                const isSaved = savedInternshipIds.includes(internship.id);
                const existingApp = applications.find((a) => a.internshipId === internship.id);
                const aiRec = aiRecById.get(internship.id);

                return (
                  <article
                    key={internship.id}
                    className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-5 md:p-6 hover:border-[#6554C0]/50 transition-colors space-y-4 shadow-2xs"
                  >
                    {/* Top Row: Title, Organization & Eligibility Status */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6554C0] font-semibold">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{internship.organization}</span>
                          <span aria-hidden="true" className="text-[#747484]">
                            ·
                          </span>
                          <span className="text-[#747484] font-medium">{internship.organizationType}</span>
                          <span aria-hidden="true" className="text-[#747484]">
                            ·
                          </span>
                          <span className="text-[#2A9D8F] inline-flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>{internship.verificationStatus}</span>
                          </span>
                        </div>
                        <h2 className="text-base md:text-lg font-bold text-[#292344]">
                          {internship.title}
                        </h2>
                        {/* Clean unboxed metadata with typographic separators */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#747484] tabular-nums">
                          <span className="text-[#292936] font-medium">{internship.roleCategory}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {internship.workMode} ({internship.location})
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#292344]">{internship.stipend}</span>
                          <span aria-hidden="true">·</span>
                          <span>Duration: {internship.duration}</span>
                          <span aria-hidden="true">·</span>
                          <span>Deadline: {internship.deadline}</span>
                        </div>
                      </div>

                      {/* Eligibility Outcome & Relevance Indicator */}
                      <div className="flex flex-col md:items-end gap-1.5 shrink-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {report.status === 'Eligible' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#DDF5EA] text-xs font-bold text-[#2A9D8F]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Eligible</span>
                            </span>
                          )}
                          {report.status === 'Not Eligible Yet' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FFF0E8] text-xs font-bold text-[#F28B72]">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Not Eligible Yet</span>
                            </span>
                          )}
                          {report.status === 'Potentially Eligible / More Information Needed' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EEE9FF] text-xs font-bold text-[#6554C0]">
                              <Info className="w-3.5 h-3.5" />
                              <span>Potentially Eligible (More Info Needed)</span>
                            </span>
                          )}
                          {aiRec && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EEE9FF] text-xs font-mono font-bold text-[#6554C0]">
                              <Sparkles className="w-3 h-3" />
                              <span>AI Fit: {aiRec.aiMatchScore}%</span>
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-lg bg-[#FAF9F6] border border-[#E8E5EF] text-xs font-mono font-semibold text-[#292344]">
                            Eligibility Rubric: {report.relevanceScore}/100
                          </span>
                        </div>
                        <p className="text-[11px] text-[#747484]">
                          Source: {internship.officialSourceName} (Verified {internship.lastVerifiedDate})
                        </p>
                      </div>
                    </div>

                    {/* Personalized AI Recommendation Details Box (when in AI Recommended or matched by AI) */}
                    {aiRec && (activeTab === 'ai-recommended' || activeTab === 'all') && (
                      <div className="p-4 rounded-xl bg-[#EEE9FF]/45 border border-[#6554C0]/25 space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-[#6554C0] flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              AI Personalized Recommendation — {aiRec.recommendationCategory}
                            </span>
                          </span>
                          <span className="text-[11px] font-semibold text-[#292344]">
                            Actual Eligibility: {aiRec.eligibilityStatus}
                          </span>
                        </div>
                        <p className="text-[#292936] leading-relaxed">{aiRec.personalizedReason}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                          {aiRec.resumeAndSkillSignals.length > 0 && (
                            <div className="text-[#292936]">
                              <strong className="text-[#292344]">Resume & Competency Signals:</strong>{' '}
                              {aiRec.resumeAndSkillSignals.join(' · ')}
                            </div>
                          )}
                          {aiRec.projectAndCertConnections.length > 0 && (
                            <div className="text-[#292936]">
                              <strong className="text-[#292344]">Projects & Certifications:</strong>{' '}
                              {aiRec.projectAndCertConnections.join(' · ')}
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-[#747484]">
                          <strong className="text-[#292344]">Career Goal & Preference Alignment:</strong>{' '}
                          {aiRec.careerAndPreferenceFit}
                        </p>
                        <p className="text-[11px] text-[#747484] pt-1.5 border-t border-[#E8E5EF]">
                          <strong className="text-[#292344]">Section Distinction:</strong>{' '}
                          {aiRec.crossSectionExplanation}
                        </p>
                      </div>
                    )}

                    {/* Why Eligible / Why Not Eligible Yet Comparison Summary Box */}
                    <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2 text-xs">
                      <p className="font-bold text-[#292344]">{report.summaryReason}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[#292936]">
                        <div>
                          <strong className="text-[#292344]">Mandatory Skills:</strong>{' '}
                          {internship.mandatoryRequirements.mandatorySkills.length > 0
                            ? internship.mandatoryRequirements.mandatorySkills.join(', ')
                            : 'None (Academic cohort verification only)'}
                        </div>
                        <div>
                          <strong className="text-[#292344]">Eligible Cohort:</strong>{' '}
                          {internship.mandatoryRequirements.allowedDegrees.join('/')} · Year{' '}
                          {internship.mandatoryRequirements.allowedYearsOfStudy.join(', ')} · Class of{' '}
                          {internship.mandatoryRequirements.allowedGraduationYears.join(', ')}
                        </div>
                      </div>
                      {report.changeableSkillGaps.length > 0 && (
                        <div className="text-[#292344] pt-1.5 border-t border-[#E8E5EF]">
                          <strong className="text-[#F28B72]">
                            Learnable Skill Gap (Can Be Unlocked via Skill Development):
                          </strong>{' '}
                          Missing mandatory skill(s): {report.changeableSkillGaps.join(', ')}
                        </div>
                      )}
                      {report.unchangeableRequirementsNotMet.length > 0 && (
                        <div className="text-[#292344] pt-1.5 border-t border-[#E8E5EF]">
                          <strong className="text-[#6554C0]">
                            Hard Eligibility Restriction (Fixed Academic / Cohort Criteria):
                          </strong>{' '}
                          {report.unchangeableRequirementsNotMet.join(' | ')}
                        </div>
                      )}
                    </div>

                    {/* 4 Separate, Distinct Card Actions (Mandatory Requirement 8.I) */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E5EF]">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setDetailsInternship(internship)}
                          className="h-9 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#292936] bg-[#FAF9F6] hover:bg-[#EEE9FF]/60 border border-[#E8E5EF] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => setEligibilityModalItem({ internship, report })}
                          className="h-9 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF]/80 hover:bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Check Eligibility
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenApplyModal(internship)}
                          className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          {existingApp ? `Applied (${existingApp.status})` : 'Apply Now'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleSave(internship.id)}
                        className={`h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isSaved
                            ? 'bg-[#2A9D8F] text-[#FFFFFF] border-[#2A9D8F]'
                            : 'bg-[#FFFFFF] text-[#292344] border-[#E8E5EF] hover:bg-[#FAF9F6]'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>{isSaved ? 'Saved' : 'Save Internship'}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: INDIVIDUAL INTERNSHIP ELIGIBILITY CHECKER & "WHO IS ELIGIBLE?" */}
      {eligibilityModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="elig-modal-title"
          className="fixed inset-0 z-50 bg-[#292344]/45 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] max-w-2xl w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-start justify-between gap-4 border-b border-[#E8E5EF] pb-3.5">
              <div>
                <p className="text-xs font-semibold text-[#6554C0]">
                  Individual Internship Eligibility Checker
                </p>
                <h2 id="elig-modal-title" className="text-lg font-bold text-[#292344]">
                  {eligibilityModalItem.internship.title} — {eligibilityModalItem.internship.organization}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close eligibility report"
                onClick={() => setEligibilityModalItem(null)}
                className="p-1 text-[#747484] hover:text-[#292344] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Outcome Banner */}
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#747484]">Verified Eligibility Status</p>
                <p className="text-base font-bold text-[#292344]">
                  {eligibilityModalItem.report.status}
                </p>
                <p className="text-xs text-[#292936] mt-0.5">
                  {eligibilityModalItem.report.summaryReason}
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <p className="text-xs font-mono font-bold text-[#6554C0]">
                  Relevance Score: {eligibilityModalItem.report.relevanceScore}/100
                </p>
                <p className="text-[11px] text-[#747484]">
                  Indicates profile alignment, not selection probability
                </p>
              </div>
            </div>

            {/* Mandatory Met vs Not Met */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs items-stretch">
              <div className="p-4 rounded-xl bg-[#DDF5EA]/45 border border-[#2A9D8F]/30 space-y-2">
                <h3 className="font-bold text-[#292344] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2A9D8F]" />
                  <span>Mandatory Requirements Met ({eligibilityModalItem.report.mandatoryMet.length})</span>
                </h3>
                <ul className="space-y-1.5 text-[#292936] list-disc pl-4">
                  {eligibilityModalItem.report.mandatoryMet.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#FFF0E8]/55 border border-[#F28B72]/35 space-y-2">
                <h3 className="font-bold text-[#292344] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#F28B72]" />
                  <span>
                    Mandatory Requirements Not Met ({eligibilityModalItem.report.mandatoryNotMet.length})
                  </span>
                </h3>
                {eligibilityModalItem.report.mandatoryNotMet.length === 0 ? (
                  <p className="text-[#2A9D8F] font-semibold">
                    All published mandatory requirements are satisfied!
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-[#292936] list-disc pl-4">
                    {eligibilityModalItem.report.mandatoryNotMet.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Preferred Skills & Missing Profile Info */}
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2 text-xs">
              <p>
                <strong className="text-[#292344]">Preferred Skills Matched:</strong>{' '}
                {eligibilityModalItem.report.preferredMatching.length > 0
                  ? eligibilityModalItem.report.preferredMatching.join(', ')
                  : 'None yet'}
              </p>
              <p>
                <strong className="text-[#292344]">Preferred (Desirable) Skills Missing:</strong>{' '}
                {eligibilityModalItem.report.preferredMissing.length > 0
                  ? `${eligibilityModalItem.report.preferredMissing.join(', ')} (Note: Missing preferred skills do not disqualify you from eligibility)`
                  : 'None'}
              </p>
              {eligibilityModalItem.report.missingProfileInfo.length > 0 && (
                <p className="text-[#F28B72] font-medium">
                  <strong className="text-[#292344]">Missing Profile Information:</strong>{' '}
                  {eligibilityModalItem.report.missingProfileInfo.join(' ')}
                </p>
              )}
            </div>

            {/* Section 8.G: Who is eligible for this internship? */}
            <div className="p-4 rounded-xl border border-[#E8E5EF] space-y-2 text-xs">
              <h3 className="font-bold text-[#6554C0]">
                Who Is Eligible for This Internship? (Published Criteria)
              </h3>
              <p className="text-[#292936]">
                Students meeting the following official criteria published by{' '}
                <strong className="text-[#292344]">{eligibilityModalItem.internship.organization}</strong>:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[#292936] list-disc pl-4">
                <li>
                  <strong className="text-[#292344]">Degrees:</strong>{' '}
                  {eligibilityModalItem.internship.mandatoryRequirements.allowedDegrees.join(', ')}
                </li>
                <li>
                  <strong className="text-[#292344]">Departments:</strong>{' '}
                  {eligibilityModalItem.internship.mandatoryRequirements.allowedDepartments.join(', ')}
                </li>
                <li>
                  <strong className="text-[#292344]">Academic Years:</strong> Year{' '}
                  {eligibilityModalItem.internship.mandatoryRequirements.allowedYearsOfStudy.join(', ')}
                </li>
                <li>
                  <strong className="text-[#292344]">Graduation Cohorts:</strong>{' '}
                  {eligibilityModalItem.internship.mandatoryRequirements.allowedGraduationYears.join(', ')}
                </li>
                <li>
                  <strong className="text-[#292344]">Mandatory Skills:</strong>{' '}
                  {eligibilityModalItem.internship.mandatoryRequirements.mandatorySkills.join(', ')}
                </li>
                <li>
                  <strong className="text-[#292344]">Work Mode & Location:</strong>{' '}
                  {eligibilityModalItem.internship.workMode} (
                  {eligibilityModalItem.internship.location})
                </li>
              </ul>
            </div>

            {/* Practical Next Steps */}
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2 text-xs">
              <h3 className="font-bold text-[#292344]">Practical Next Steps</h3>
              <ul className="space-y-1.5 text-[#292936] list-disc pl-4">
                {eligibilityModalItem.report.nextSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              {eligibilityModalItem.report.changeableSkillGaps.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setEligibilityModalItem(null);
                    onNavigate('skill-development');
                  }}
                  className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg cursor-pointer"
                >
                  Learn Missing Skills in Skill Development
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const target = eligibilityModalItem.internship;
                  setEligibilityModalItem(null);
                  handleOpenApplyModal(target);
                }}
                className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
              >
                Proceed to Application Workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW DETAILS */}
      {detailsInternship && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="details-modal-title"
          className="fixed inset-0 z-50 bg-[#292344]/45 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] max-w-2xl w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-start justify-between gap-4 border-b border-[#E8E5EF] pb-3.5">
              <div>
                <p className="text-xs font-semibold text-[#6554C0]">
                  {detailsInternship.organization} · {detailsInternship.verificationStatus}
                </p>
                <h2 id="details-modal-title" className="text-lg font-bold text-[#292344]">
                  {detailsInternship.title}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close internship details"
                onClick={() => setDetailsInternship(null)}
                className="p-1 text-[#747484] hover:text-[#292344] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#292936] leading-relaxed">
              <p>{detailsInternship.description}</p>
              <div>
                <h3 className="font-bold text-[#292344] mb-1">Key Responsibilities:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {detailsInternship.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF]">
                <div className="space-y-1">
                  <p>
                    <strong className="text-[#292344]">Work Mode & Location:</strong>{' '}
                    {detailsInternship.workMode} ({detailsInternship.location})
                  </p>
                  <p>
                    <strong className="text-[#292344]">Stipend:</strong> {detailsInternship.stipend}
                  </p>
                  <p>
                    <strong className="text-[#292344]">Duration:</strong> {detailsInternship.duration}
                  </p>
                </div>
                <div className="space-y-1">
                  <p>
                    <strong className="text-[#292344]">Opening Date:</strong>{' '}
                    {detailsInternship.openingDate}
                  </p>
                  <p>
                    <strong className="text-[#292344]">Closing Deadline:</strong>{' '}
                    {detailsInternship.deadline}
                  </p>
                  <p>
                    <strong className="text-[#292344]">Official Source:</strong>{' '}
                    {detailsInternship.officialSourceName}
                  </p>
                </div>
              </div>
              {detailsInternship.mandatoryRequirements.requiredDocuments && (
                <div>
                  <h3 className="font-bold text-[#292344] mb-1">Required Official Documents:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {detailsInternship.mandatoryRequirements.requiredDocuments.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="font-bold text-[#292344] mb-1">Selection Process:</h3>
                <p>{detailsInternship.selectionProcess.join(' → ')}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E8E5EF]">
              <a
                href={detailsInternship.officialSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6554C0] hover:text-[#292344] hover:underline"
              >
                <span>Verify on Official Source ({detailsInternship.officialSourceName})</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = detailsInternship;
                    setDetailsInternship(null);
                    handleOpenApplyModal(target);
                  }}
                  className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: INTERNAL & EXTERNAL APPLICATION WORKFLOW (Section 10) */}
      {applyModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-modal-title"
          className="fixed inset-0 z-50 bg-[#292344]/45 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] max-w-lg w-full p-6 space-y-4 shadow-lg">
            <div className="flex items-start justify-between gap-4 border-b border-[#E8E5EF] pb-3.5">
              <div>
                <p className="text-xs font-semibold text-[#6554C0]">
                  {applyModalItem.supportsInternalApply
                    ? 'Verified Internal Application Form'
                    : 'External Official Portal Application Workflow'}
                </p>
                <h2 id="apply-modal-title" className="text-base font-bold text-[#292344]">
                  {applyModalItem.title} — {applyModalItem.organization}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close application modal"
                onClick={() => setApplyModalItem(null)}
                className="p-1 text-[#747484] hover:text-[#292344] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {applyStatusMessage && (
              <div
                role="status"
                className={`p-3.5 rounded-xl border text-xs font-medium ${
                  applyStatusMessage.type === 'success'
                    ? 'bg-[#DDF5EA] border-[#2A9D8F]/40 text-[#292344]'
                    : 'bg-[#FFF0E8] border-[#F28B72]/50 text-[#292344]'
                }`}
              >
                {applyStatusMessage.text}
              </div>
            )}

            {applyModalItem.supportsInternalApply ? (
              <div className="space-y-3.5 text-xs">
                <p className="text-[#747484]">
                  Submit your verified student profile and attached resume directly. Your submission will be stored and tracked in Application Tracker.
                </p>
                <div>
                  <label htmlFor="app-resume" className="block font-semibold text-[#292344] mb-1">
                    Attached Resume File
                  </label>
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                    <input
                      id="app-resume"
                      type="text"
                      value={applyResumeName}
                      onChange={(e) => setApplyResumeName(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="app-cover" className="block font-semibold text-[#292344] mb-1">
                    Project Alignment & Cover Note *
                  </label>
                  <textarea
                    id="app-cover"
                    rows={3}
                    value={applyCoverNote}
                    onChange={(e) => setApplyCoverNote(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={submittingApply}
                    onClick={() => handleConfirmApplication('Internal Form', 'Applied')}
                    className="h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingApply ? 'Submitting...' : 'Submit Internal Application'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2.5">
                  <p className="font-bold text-[#292344]">
                    Important: External Official Application Portal
                  </p>
                  <p className="text-[#292936] leading-relaxed">
                    <strong className="text-[#292344]">{applyModalItem.organization}</strong> accepts applications strictly on its official portal (
                    <code>{applyModalItem.applicationUrl}</code>). Free Intern does not falsely claim that external applications are submitted automatically.
                  </p>
                  <a
                    href={applyModalItem.applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg"
                  >
                    <span>Step 1: Open Official Application Portal</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div>
                  <label htmlFor="ext-notes" className="block font-semibold text-[#292344] mb-1">
                    Step 2: Record Your Application Status in Tracker
                  </label>
                  <input
                    id="ext-notes"
                    type="text"
                    value={applyNotes}
                    onChange={(e) => setApplyNotes(e.target.value)}
                    placeholder="Add reference ID or notes for your tracker..."
                    className="w-full h-9 px-3 rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={submittingApply}
                    onClick={() =>
                      handleConfirmApplication('External Official Portal', 'Planning to Apply')
                    }
                    className="h-9 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg cursor-pointer"
                  >
                    Save as "Planning to Apply"
                  </button>
                  <button
                    type="button"
                    disabled={submittingApply}
                    onClick={() => handleConfirmApplication('External Official Portal', 'Applied')}
                    className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                  >
                    I Applied on Official Portal — Record in Tracker
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
