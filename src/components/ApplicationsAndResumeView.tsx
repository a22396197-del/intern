import React, { useState } from 'react';
import {
  ClipboardList,
  AlertCircle,
  Trash2,
  ExternalLink,
  Upload,
  FileText,
  Sparkles,
  CheckSquare,
  Square,
  Info,
  History,
} from 'lucide-react';
import type {
  ApplicationRecord,
  ApplicationStatus,
  InternshipListing,
  ResumeAnalysisReport,
  StudentProfile,
} from '../types.ts';
import { UNCONFIRMED_REJECTION_DISCLAIMER } from '../utils/logic.ts';

interface ApplicationsAndResumeViewProps {
  pageMode: 'applications' | 'resume-scanner';
  profile: StudentProfile;
  internships: InternshipListing[];
  applications: ApplicationRecord[];
  resumeReports: ResumeAnalysisReport[];
  onUpdateApplication: (
    appId: string,
    payload: {
      status?: ApplicationStatus;
      notes?: string;
      officialRejectionFeedback?: string;
      toggleChecklistTaskId?: string;
    }
  ) => Promise<void>;
  onDeleteApplication: (appId: string) => Promise<void>;
  onRunResumeScan: (payload: {
    resumeText: string;
    fileName: string;
    targetRole: string;
    targetInternshipId?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onNavigate: (page: string) => void;
}

const ALL_STATUSES: ApplicationStatus[] = [
  'Saved',
  'Planning to Apply',
  'Applied',
  'Assessment',
  'Interview',
  'Offer Received',
  'Rejected',
  'Withdrawn',
];

const TARGET_ROLES = [
  'Full-Stack Development Intern',
  'Frontend Development Intern',
  'Backend Development Intern',
  'AI/ML Intern',
  'Data Analyst Intern',
  'Python Developer Intern',
  'Java Developer Intern',
];

export const ApplicationsAndResumeView: React.FC<ApplicationsAndResumeViewProps> = ({
  pageMode,
  profile,
  internships,
  applications,
  resumeReports,
  onUpdateApplication,
  onDeleteApplication,
  onRunResumeScan,
  onNavigate,
}) => {
  // Application Tracker State
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [appSearch, setAppSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState('');

  // Resume Scanner State
  const [resumeText, setResumeText] = useState(profile.uploadedResumeText || '');
  const [fileName, setFileName] = useState(
    profile.uploadedResumeName || 'Aaravishnan_K_Resume_Oct2026.pdf'
  );
  const [targetRole, setTargetRole] = useState(
    profile.targetRoles?.[0] || 'Full-Stack Development Intern'
  );
  const [targetInternshipId, setTargetInternshipId] = useState<string>(internships[0]?.id || '');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedReportIndex, setSelectedReportIndex] = useState(0);

  if (pageMode === 'applications') {
    const filteredApps = applications.filter((app) => {
      if (statusFilter !== 'All' && app.status !== statusFilter) return false;
      if (appSearch.trim()) {
        const q = appSearch.toLowerCase();
        return (
          app.internshipTitle.toLowerCase().includes(q) ||
          app.organization.toLowerCase().includes(q) ||
          app.status.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return (
      <div className="space-y-6">
        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[#292344] flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#6554C0]" />
                <span>My Applications & Rejection Improvement Tracker</span>
              </h1>
              <p className="text-xs text-[#747484]">
                Track every application status, review activity history, and access personalized Rejection Analysis & Improvement Plans.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('discover')}
              className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              Find More Internships
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E8E5EF]">
            <div className="flex flex-wrap items-center gap-1.5">
              {['All', ...ALL_STATUSES].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`h-8 px-3 inline-flex items-center justify-center text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#292344] text-[#FFFFFF]'
                      : 'bg-[#FAF9F6] text-[#292936] border border-[#E8E5EF] hover:bg-[#EEE9FF]/70'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <input
              type="search"
              aria-label="Search tracked applications"
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
              placeholder="Search tracked applications..."
              className="h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] w-full sm:w-64 focus:outline-none focus:border-[#6554C0]"
            />
          </div>
        </section>

        {filteredApps.length === 0 ? (
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-10 text-center space-y-3 shadow-2xs">
            <p className="text-sm font-bold text-[#292344]">No application records found</p>
            <p className="text-xs text-[#747484]">
              Apply to an opportunity in Discover Internships or Government Internships to track your progress here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredApps.map((app) => {
              const linkedListing = internships.find((i) => i.id === app.internshipId);
              return (
                <article
                  key={app.id}
                  className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 shadow-2xs"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#E8E5EF] pb-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#6554C0]">
                        {app.organization} · {app.applicationMode}
                      </p>
                      <h2 className="text-base md:text-lg font-bold text-[#292344]">
                        {app.internshipTitle}
                      </h2>
                      <p className="text-xs text-[#747484] tabular-nums">
                        Applied Date: {app.appliedDate} · Closing Deadline: {app.deadline} · Resume:{' '}
                        <span className="text-[#292936] font-medium">
                          {app.resumeAttachedName || 'Attached'}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <label
                        htmlFor={`status-select-${app.id}`}
                        className="text-xs font-semibold text-[#292344]"
                      >
                        Status:
                      </label>
                      <select
                        id={`status-select-${app.id}`}
                        value={app.status}
                        onChange={(e) =>
                          onUpdateApplication(app.id, {
                            status: e.target.value as ApplicationStatus,
                          })
                        }
                        className="h-9 px-3 text-xs font-semibold rounded-lg border border-[#E8E5EF] bg-[#EEE9FF]/70 text-[#292344]"
                      >
                        {ALL_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>

                      <a
                        href={app.applicationLink}
                        target="_blank"
                        rel="noreferrer"
                        className="h-9 px-3.5 text-xs font-semibold text-[#6554C0] bg-[#FAF9F6] hover:bg-[#EEE9FF]/60 border border-[#E8E5EF] rounded-lg inline-flex items-center justify-center gap-1.5"
                      >
                        <span>Official Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {confirmDeleteId === app.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteApplication(app.id);
                              setConfirmDeleteId(null);
                            }}
                            className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#FFF0E8] border border-[#F28B72] rounded-lg cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="h-8 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#292936] bg-[#FAF9F6] border border-[#E8E5EF] rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Delete application for ${app.internshipTitle}`}
                          onClick={() => setConfirmDeleteId(app.id)}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#E8E5EF] text-[#747484] hover:text-[#F28B72] hover:bg-[#FFF0E8]/50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notes & Status History */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF]">
                      <p className="font-semibold text-[#292344] mb-1">Application Notes:</p>
                      <p className="text-[#292936] leading-relaxed">
                        {app.notes || 'No notes added.'}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF]">
                      <p className="font-semibold text-[#292344] mb-1 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-[#6554C0]" />
                        <span>Status Activity History:</span>
                      </p>
                      <ul className="space-y-1 text-[#747484]">
                        {app.statusHistory.map((h, idx) => (
                          <li key={idx}>
                            <strong className="text-[#292344]">{h.status}</strong> (
                            {h.timestamp.slice(0, 10)}) — {h.note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* DEDICATED REJECTION ANALYSIS AND IMPROVEMENT PLAN (Section 12.A, 12.B, 12.C) */}
                  {app.status === 'Rejected' && app.rejectionAnalysis && (
                    <div className="mt-4 pt-4 border-t border-[#E8E5EF] space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-[#292344] flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#6554C0]" />
                          <span>Rejection Analysis and Improvement Plan</span>
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFeedbackId(editingFeedbackId === app.id ? null : app.id);
                            setFeedbackDraft(app.officialRejectionFeedback || '');
                          }}
                          className="text-xs font-semibold text-[#6554C0] hover:text-[#292344] hover:underline cursor-pointer"
                        >
                          {app.officialRejectionFeedback
                            ? 'Edit Official Employer Feedback'
                            : '+ Add Official Employer Feedback (if received)'}
                        </button>
                      </div>

                      {editingFeedbackId === app.id && (
                        <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2.5">
                          <label
                            htmlFor={`official-fb-${app.id}`}
                            className="block text-xs font-semibold text-[#292344]"
                          >
                            Official Rejection Feedback from Organization (Leave blank if none was provided):
                          </label>
                          <input
                            id={`official-fb-${app.id}`}
                            type="text"
                            value={feedbackDraft}
                            onChange={(e) => setFeedbackDraft(e.target.value)}
                            placeholder="Paste exact feedback email text if the employer shared a reason..."
                            className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              await onUpdateApplication(app.id, {
                                officialRejectionFeedback: feedbackDraft,
                              });
                              setEditingFeedbackId(null);
                            }}
                            className="h-8 px-3.5 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                          >
                            Save Official Feedback
                          </button>
                        </div>
                      )}

                      {/* Mandatory Accuracy Disclaimer when no official feedback exists */}
                      {app.rejectionAnalysis.officialFeedbackProvided ? (
                        <div className="p-3.5 rounded-xl bg-[#FFF0E8] border border-[#F28B72]/40 text-xs text-[#292344] space-y-1">
                          <p className="font-bold">Confirmed Official Feedback Provided by Employer:</p>
                          <p>"{app.rejectionAnalysis.officialFeedbackText}"</p>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-[#EEE9FF]/55 border border-[#E8E5EF] text-xs text-[#292936] flex items-start gap-2.5">
                          <Info className="w-4 h-4 text-[#6554C0] shrink-0 mt-0.5" />
                          <p className="leading-relaxed">{UNCONFIRMED_REJECTION_DISCLAIMER}</p>
                        </div>
                      )}

                      {/* Actionable Improvement Checklist Comparing Profile vs Listing Requirements */}
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold text-[#292344]">
                          Personalized Improvement Checklist (Based on {app.internshipTitle} Requirements)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                          {app.rejectionAnalysis.actionChecklist.map((task) => (
                            <div
                              key={task.id}
                              className="p-4 rounded-xl border border-[#E8E5EF] bg-[#FFFFFF] flex items-start gap-3 text-xs h-full"
                            >
                              <button
                                type="button"
                                aria-label={`Mark ${task.skillOrRequirement} task complete`}
                                onClick={() =>
                                  onUpdateApplication(app.id, { toggleChecklistTaskId: task.id })
                                }
                                className="mt-0.5 text-[#2A9D8F] cursor-pointer"
                              >
                                {task.completed ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4 text-[#6554C0]" />
                                )}
                              </button>
                              <div className="space-y-1">
                                <p
                                  className={`font-bold ${
                                    task.completed ? 'line-through text-[#747484]' : 'text-[#292344]'
                                  }`}
                                >
                                  {task.skillOrRequirement} ·{' '}
                                  <span className="font-semibold text-[#6554C0]">{task.category}</span>
                                </p>
                                <p className="text-[#292936]">{task.whyItMatters}</p>
                                <p className="text-[11px] text-[#747484]">
                                  <strong className="text-[#292344]">Existing Evidence:</strong>{' '}
                                  {task.existingEvidence}
                                </p>
                                <p className="text-[11px] text-[#2A9D8F] font-semibold">
                                  <strong>Next Action:</strong> {task.nextAction}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {linkedListing && (
                        <div className="flex flex-wrap gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => onNavigate('skill-development')}
                            className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                          >
                            Open Skill Development Roadmap
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigate('mock-interview')}
                            className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg cursor-pointer"
                          >
                            Practice 15-Question Interview
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // AI RESUME SCANNER VIEW (Section 13)
  const activeReport = resumeReports[selectedReportIndex] || resumeReports[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setScanError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setScanError('File exceeds maximum allowed size of 5 MB.');
      return;
    }

    setFileName(file.name);
    try {
      const rawBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const rawStr = decoder.decode(rawBuffer);

      // Extract readable ASCII/Unicode text sequences from TXT, MD, or text-layer PDF/DOCX
      const cleaned = rawStr
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s{3,}/g, ' ')
        .trim();

      if (cleaned.length < 30) {
        setScanError(
          'Could not extract readable text from this binary file. Please upload a text-readable document or paste your resume content below — Free Intern never fabricates a report from an unreadable file.'
        );
        return;
      }
      setResumeText(cleaned);
    } catch (_err) {
      setScanError('Failed to read the selected file. Please try another file or paste your resume text.');
    }
  };

  const handleTriggerScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanError(null);
    if (!resumeText || resumeText.trim().length < 25) {
      setScanError(
        'Resume content is empty or too short to extract valid sections. Please upload a valid resume or paste your resume text.'
      );
      return;
    }
    setScanning(true);
    try {
      const res = await onRunResumeScan({
        resumeText,
        fileName,
        targetRole,
        targetInternshipId: targetInternshipId || undefined,
      });
      if (!res.ok) {
        setScanError(res.error || 'Resume analysis failed.');
      } else {
        setSelectedReportIndex(0);
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Header & Upload Form */}
      <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E5EF] pb-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-[#292344] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#6554C0]" />
              <span>AI Resume Scanner — Truthful Keyword & Role Alignment</span>
            </h1>
            <p className="text-xs text-[#747484]">
              Analyzes your actual extracted resume text against your target role and real internship listing requirements. Never invents experience or recommends claiming unlearned skills.
            </p>
          </div>
          {resumeReports.length > 1 && (
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="report-history" className="text-xs font-semibold text-[#292344]">
                Scan History:
              </label>
              <select
                id="report-history"
                value={selectedReportIndex}
                onChange={(e) => setSelectedReportIndex(Number(e.target.value))}
                className="h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FAF9F6] text-[#292344]"
              >
                {resumeReports.map((r, idx) => (
                  <option key={r.id} value={idx}>
                    {r.createdAt.slice(0, 10)} — {r.targetRole} ({r.overallScore}/100)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {scanError && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-[#FFF0E8] border border-[#F28B72]/50 text-[#292344] text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#F28B72]" />
            <span>{scanError}</span>
          </div>
        )}

        <form onSubmit={handleTriggerScan} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="scan-role" className="block text-xs font-semibold text-[#292344] mb-1.5">
                1. Select Target Role *
              </label>
              <select
                id="scan-role"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
              >
                {TARGET_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="scan-listing"
                className="block text-xs font-semibold text-[#292344] mb-1.5"
              >
                2. Compare With Specific Verified Listing (Optional)
              </label>
              <select
                id="scan-listing"
                value={targetInternshipId}
                onChange={(e) => setTargetInternshipId(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
              >
                <option value="">General Role Benchmark ({targetRole})</option>
                {internships.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title} — {i.organization}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="scan-file" className="block text-xs font-semibold text-[#292344] mb-1.5">
                3. Upload Resume File (.txt, .pdf, .docx)
              </label>
              <label
                htmlFor="scan-file"
                className="w-full h-9 px-3 text-xs font-semibold text-[#292344] bg-[#EEE9FF]/70 hover:bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#6554C0] shrink-0" />
                <span className="truncate">{fileName}</span>
                <input
                  id="scan-file"
                  type="file"
                  accept=".txt,.md,.pdf,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="resume-text-area" className="text-xs font-semibold text-[#292344]">
                Extracted Resume Text (Used for Analysis — Editable)
              </label>
              <span className="text-[11px] font-mono text-[#747484]">
                {resumeText.length} characters extracted
              </span>
            </div>
            <textarea
              id="resume-text-area"
              rows={5}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Upload a resume file or paste your complete resume text here..."
              className="w-full p-3 text-xs font-mono rounded-xl border border-[#E8E5EF] bg-[#FAF9F6] text-[#292936] focus:bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-[#747484]">
              Advisory Note: Resume scores follow a documented 100-point rubric and do not guarantee employer shortlisting.
            </p>
            <button
              type="submit"
              disabled={scanning}
              className="h-10 px-5 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
            >
              {scanning ? 'Analyzing Resume Content...' : 'Analyze Resume Now'}
            </button>
          </div>
        </form>
      </section>

      {/* ACTIVE RESUME ANALYSIS REPORT */}
      {activeReport && (
        <div className="space-y-6">
          {/* Score & Section Breakdown */}
          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E5EF] pb-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#6554C0]">
                  Analysis Report for {activeReport.fileName} · Target: {activeReport.targetRole}
                </p>
                <h2 className="text-lg font-bold text-[#292344]">
                  Advisory Resume Score:{' '}
                  <span className="font-mono text-[#2A9D8F]">{activeReport.overallScore}/100</span>
                </h2>
                <p className="text-[11px] text-[#747484]">{activeReport.scoringRubricNote}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0 text-xs tabular-nums">
                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF]">
                  <p className="text-[11px] text-[#747484]">Education & Clarity</p>
                  <p className="font-mono font-bold text-[#292344] mt-0.5">
                    {activeReport.sectionScores.educationAndClarity}/20
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF]">
                  <p className="text-[11px] text-[#747484]">Technical Skills</p>
                  <p className="font-mono font-bold text-[#292344] mt-0.5">
                    {activeReport.sectionScores.technicalSkillsEvidence}/30
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF]">
                  <p className="text-[11px] text-[#747484]">Projects & Links</p>
                  <p className="font-mono font-bold text-[#292344] mt-0.5">
                    {activeReport.sectionScores.projectsAndImpact}/30
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF]">
                  <p className="text-[11px] text-[#747484]">Role Alignment</p>
                  <p className="font-mono font-bold text-[#292344] mt-0.5">
                    {activeReport.sectionScores.roleAlignmentAndKeywords}/20
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs items-stretch">
              <div className="p-4 rounded-xl bg-[#DDF5EA]/45 border border-[#2A9D8F]/30 space-y-2">
                <h3 className="font-bold text-[#292344]">Detected Strengths</h3>
                <ul className="list-disc pl-4 space-y-1 text-[#292936]">
                  {activeReport.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-[#FFF0E8]/55 border border-[#F28B72]/35 space-y-2">
                <h3 className="font-bold text-[#292344]">Areas Needing Attention</h3>
                <ul className="list-disc pl-4 space-y-1 text-[#292936]">
                  {activeReport.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION 13.D: RECOMMENDED KEYWORDS TO ADD (NEVER BLANK!) */}
          <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 shadow-2xs">
            <div>
              <h2 className="text-base font-bold text-[#292344]">
                Recommended Keywords to Add (Categorized by Truthful Evidence)
              </h2>
              <p className="text-xs text-[#747484] mt-0.5">
                Separates keywords you already have evidence for in your profile from skills you must learn before claiming on your resume.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {(
                [
                  'Safe to Include (Evidence Exists)',
                  'Learn Before Claiming',
                  'Already Present',
                  'Relevant (Not Yet Demonstrated)',
                ] as const
              ).map((tier) => {
                const items = activeReport.recommendedKeywords.filter((k) => k.category === tier);
                return (
                  <div
                    key={tier}
                    className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2.5 flex flex-col justify-between h-full"
                  >
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-bold text-[#292344]">
                        {tier} ({items.length})
                      </h3>
                      {items.length === 0 ? (
                        <p className="text-xs text-[#747484]">No keywords in this tier.</p>
                      ) : (
                        <div className="divide-y divide-[#E8E5EF] text-xs">
                          {items.map((item) => (
                            <div key={item.keyword} className="py-2.5 space-y-1">
                              <p className="font-bold text-[#292344]">
                                <span>{item.keyword}</span>
                                <span aria-hidden="true"> · </span>
                                <span className="font-semibold text-[#6554C0]">
                                  {item.relatedRequirement}
                                </span>
                              </p>
                              <p className="text-[#292936]">{item.whyItMatters}</p>
                              <p className="text-[11px] text-[#747484]">
                                <strong className="text-[#292344]">Where it fits:</strong>{' '}
                                {item.whereItFits}
                              </p>
                              <p className="text-[11px] text-[#2A9D8F] font-medium">
                                <strong className="text-[#292344]">Guidance:</strong>{' '}
                                {item.truthfulExample}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 13.E & 13.G: SKILLS I SHOULD DEVELOP + PERSONALIZED RESUME IMPROVEMENT PLAN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 flex flex-col justify-between h-full shadow-2xs">
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-[#292344]">Skills I Should Develop</h2>
                  <p className="text-xs text-[#747484] mt-0.5">
                    Prioritized skills based on your current resume and target internship requirements.
                  </p>
                </div>
                <div className="space-y-3">
                  {activeReport.skillsToDevelop.map((sk) => (
                    <div
                      key={sk.skillName}
                      className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-[#292344]">
                          {sk.learningOrder}. {sk.skillName}
                        </p>
                        <span className="px-2 py-0.5 rounded bg-[#EEE9FF] font-semibold text-[#6554C0]">
                          Priority: {sk.priority} · {sk.requiredLevel}
                        </span>
                      </div>
                      <p className="text-[#292936]">{sk.whyItMatters}</p>
                      <p className="text-[11px] text-[#747484]">
                        <strong className="text-[#292344]">Current Resume Evidence:</strong>{' '}
                        {sk.currentEvidenceInResume}
                      </p>
                      <p className="text-[11px] text-[#2A9D8F] font-medium">
                        <strong className="text-[#292344]">Suggested Project:</strong>{' '}
                        {sk.projectIdea}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 flex flex-col justify-between h-full shadow-2xs">
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-[#292344]">
                    Personalized Resume Improvement Plan
                  </h2>
                  <p className="text-xs text-[#747484] mt-0.5">
                    Structured into Fix First, Improve Next, Learn Before Adding, and Optional Improvements.
                  </p>
                </div>
                <div className="space-y-3">
                  {activeReport.improvementPlan.map((action) => (
                    <div
                      key={action.id}
                      className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] text-xs space-y-1.5"
                    >
                      <p className="font-bold text-[#6554C0]">
                        {action.tier} · <span className="text-[#292344]">{action.section}</span>
                      </p>
                      <p className="text-[#292936]">
                        <strong className="text-[#292344]">Issue:</strong> {action.issue}
                      </p>
                      <p className="text-[#292936]">
                        <strong className="text-[#292344]">How to Improve:</strong>{' '}
                        {action.recommendation}
                      </p>
                      <p className="text-[#2A9D8F] font-semibold pt-0.5">
                        Next Action: {action.nextAction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
