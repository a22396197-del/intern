/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Compass,
  Building2,
  ClipboardList,
  Bookmark,
  FileSearch,
  Bot,
  Briefcase,
  Mic,
  TrendingUp,
  BookOpen,
  Award,
  Landmark,
  UserCheck,
  Bell,
  Settings,
  PlusCircle,
  Shield,
  LogOut,
  Menu,
  X,
  Download,
} from 'lucide-react';
import type {
  StudentProfile,
  InternshipListing,
  ApplicationRecord,
  ResumeAnalysisReport,
  MockInterviewSession,
  CompletedAssessmentRecord,
  AppNotification,
  AiInternshipRecommendation,
} from './types.ts';
import { EntryAndAuthView, FreeInternLogo } from './components/EntryAndAuthView.tsx';
import { StudentProfileView } from './components/StudentProfileView.tsx';
import { DiscoverAndGovView } from './components/DiscoverAndGovView.tsx';
import { ApplicationsAndResumeView } from './components/ApplicationsAndResumeView.tsx';
import { InterviewAndSkillsView } from './components/InterviewAndSkillsView.tsx';
import { DashboardAndAdminView } from './components/DashboardAndAdminView.tsx';

const TOKEN_STORAGE_KEY = 'freeintern_session_token';

export default function App() {
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return 'demo-student-session-token';
    }
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  });

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [internships, setInternships] = useState<InternshipListing[]>([]);
  const [savedInternshipIds, setSavedInternshipIds] = useState<string[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [resumeReports, setResumeReports] = useState<ResumeAnalysisReport[]>([]);
  const [interviewSessions, setInterviewSessions] = useState<MockInterviewSession[]>([]);
  const [completedAssessments, setCompletedAssessments] = useState<CompletedAssessmentRecord[]>([]);
  const [learningProgress, setLearningProgress] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<AiInternshipRecommendation[]>([]);
  const [refreshingAiRecs, setRefreshingAiRecs] = useState<boolean>(false);

  const [activePage, setActivePage] = useState<string>('dashboard');
  const [pendingInternshipAction, setPendingInternshipAction] = useState<{
    internshipId: string;
    action: 'details' | 'eligibility' | 'apply';
  } | null>(null);
  const [loadingBootstrap, setLoadingBootstrap] = useState<boolean>(Boolean(sessionToken));
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const handleOpenInternship = useCallback(
    (internshipId: string, action: 'details' | 'eligibility' | 'apply' = 'details') => {
      setPendingInternshipAction({ internshipId, action });
      setActivePage('discover');
    },
    []
  );

  const fetchBootstrapData = useCallback(async (token: string) => {
    setLoadingBootstrap(true);
    try {
      const res = await fetch('/api/bootstrap', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setSessionToken(null);
        setProfile(null);
        return;
      }
      const data = await res.json();
      setProfile(data.profile);
      setInternships(data.internships || []);
      setSavedInternshipIds(data.savedInternshipIds || []);
      setApplications(data.applications || []);
      setResumeReports(data.resumeReports || []);
      setInterviewSessions(data.interviewSessions || []);
      setCompletedAssessments(data.completedAssessments || []);
      setLearningProgress(data.learningProgress || []);
      setNotifications(data.notifications || []);
      setAiRecommendations(data.aiRecommendations || []);
    } catch (_err) {
      // Keep current state if transient network hiccup
    } finally {
      setLoadingBootstrap(false);
    }
  }, []);

  useEffect(() => {
    if (sessionToken && !profile) {
      fetchBootstrapData(sessionToken);
    } else if (!sessionToken) {
      setLoadingBootstrap(false);
    }
  }, [sessionToken, profile, fetchBootstrapData]);

  const handleAuthenticated = (
    token: string,
    userProfile: StudentProfile,
    bootstrapPayload?: {
      profile?: StudentProfile;
      internships?: InternshipListing[];
      savedInternshipIds?: string[];
      applications?: ApplicationRecord[];
      resumeReports?: ResumeAnalysisReport[];
      interviewSessions?: MockInterviewSession[];
      completedAssessments?: CompletedAssessmentRecord[];
      learningProgress?: string[];
      notifications?: AppNotification[];
      aiRecommendations?: AiInternshipRecommendation[];
    }
  ) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    if (bootstrapPayload && bootstrapPayload.internships) {
      setProfile(userProfile);
      setInternships(bootstrapPayload.internships || []);
      setSavedInternshipIds(bootstrapPayload.savedInternshipIds || []);
      setApplications(bootstrapPayload.applications || []);
      setResumeReports(bootstrapPayload.resumeReports || []);
      setInterviewSessions(bootstrapPayload.interviewSessions || []);
      setCompletedAssessments(bootstrapPayload.completedAssessments || []);
      setLearningProgress(bootstrapPayload.learningProgress || []);
      setNotifications(bootstrapPayload.notifications || []);
      setAiRecommendations(bootstrapPayload.aiRecommendations || []);
      setLoadingBootstrap(false);
      setSessionToken(token);
    } else {
      setLoadingBootstrap(true);
      setProfile(userProfile);
      setSessionToken(token);
      fetchBootstrapData(token);
    }
    setActivePage('dashboard');
  };

  const handleLogout = async () => {
    if (sessionToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
      } catch (_e) {
        // Ignore network error on logout
      }
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setSessionToken(null);
    setProfile(null);
    setActivePage('dashboard');
  };

  // API Handlers
  const handleSaveProfile = async (updated: StudentProfile) => {
    if (!sessionToken) return;
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(updated),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      if (data.aiRecommendations) {
        setAiRecommendations(data.aiRecommendations);
      }
    }
  };

  const handleRefreshAiRecommendations = async () => {
    if (!sessionToken) return;
    setRefreshingAiRecs(true);
    try {
      const res = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.recommendations) {
          setAiRecommendations(data.recommendations);
        }
      }
    } catch (_err) {
      // Keep existing recommendations if network error
    } finally {
      setRefreshingAiRecs(false);
    }
  };

  const handleToggleSaveInternship = async (internshipId: string) => {
    if (!sessionToken) return;
    const res = await fetch('/api/saved-internships/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ internshipId }),
    });
    if (res.ok) {
      const data = await res.json();
      setSavedInternshipIds(data.savedInternshipIds);
    }
  };

  const handleSubmitApplication = async (payload: {
    internshipId: string;
    applicationMode: 'Internal Form' | 'External Official Portal';
    status: ApplicationRecord['status'];
    notes: string;
    coverNote?: string;
    resumeAttachedName?: string;
  }) => {
    if (!sessionToken) return { ok: false, error: 'Unauthorized' };
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error };
    }
    setApplications(data.applications);
    return { ok: true };
  };

  const handleUpdateApplication = async (
    appId: string,
    payload: {
      status?: ApplicationRecord['status'];
      notes?: string;
      officialRejectionFeedback?: string;
      toggleChecklistTaskId?: string;
    }
  ) => {
    if (!sessionToken) return;
    const res = await fetch(`/api/applications/${appId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setApplications(data.applications);
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    if (!sessionToken) return;
    const res = await fetch(`/api/applications/${appId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setApplications(data.applications);
    }
  };

  const handleRunResumeScan = async (payload: {
    resumeText: string;
    fileName: string;
    targetRole: string;
    targetInternshipId?: string;
  }) => {
    if (!sessionToken) return { ok: false, error: 'Unauthorized' };
    const res = await fetch('/api/ai/resume-scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error };
    }
    setResumeReports(data.reports);
    if (data.profile) setProfile(data.profile);
    return { ok: true };
  };

  const handleStartInterviewSession = async (payload: {
    category: string;
    targetRole: string;
    targetInternshipId?: string;
    experienceLevel: string;
    mode: 'Practice Mode' | 'Mock Interview Mode';
  }) => {
    if (!sessionToken) return { ok: false, error: 'Unauthorized' };
    const res = await fetch('/api/ai/mock-interview/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error };
    }
    setInterviewSessions(data.sessions);
    return { ok: true, session: data.session };
  };

  const handleUpdateInterviewSession = async (session: MockInterviewSession) => {
    if (!sessionToken) return;
    const res = await fetch(`/api/ai/mock-interview/${session.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(session),
    });
    if (res.ok) {
      const data = await res.json();
      setInterviewSessions(data.sessions);
    }
  };

  const handleToggleLearningItem = async (itemId: string) => {
    if (!sessionToken) return;
    const res = await fetch('/api/skills/progress/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ itemId }),
    });
    if (res.ok) {
      const data = await res.json();
      setLearningProgress(data.learningProgress);
    }
  };

  const handleSubmitAssessment = async (payload: {
    assessmentId: string;
    skillName: string;
    category: string;
    badgeTitle: string;
    scorePercent: number;
    passed: boolean;
    areasToImprove: string[];
  }) => {
    if (!sessionToken) return;
    const res = await fetch('/api/assessments/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setCompletedAssessments(data.completedAssessments);
      if (data.profile) setProfile(data.profile);
      if (Array.isArray(data.aiRecommendations)) {
        setAiRecommendations(data.aiRecommendations);
      }
    }
  };

  const handleAskAssistant = async (payload: {
    message: string;
    mode: 'intern' | 'career';
    language: 'english' | 'thanglish';
  }) => {
    if (!sessionToken) return 'Please sign in to use the AI Assistant.';
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.reply || data.error || 'Could not generate response.';
  };

  const handleMarkNotificationsRead = async (notificationId?: string) => {
    if (!sessionToken) return;
    const res = await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ notificationId }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
    }
  };

  const handleCreateInternshipListing = async (
    payload: Partial<InternshipListing> & Record<string, unknown>
  ) => {
    if (!sessionToken) return { ok: false, error: 'Unauthorized' };
    const res = await fetch('/api/admin/internships', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error };
    }
    setInternships(data.internships);
    return { ok: true };
  };

  const handleUpdateInternshipStatus = async (
    id: string,
    verificationStatus: InternshipListing['verificationStatus']
  ) => {
    if (!sessionToken) return;
    const res = await fetch(`/api/admin/internships/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ verificationStatus }),
    });
    if (res.ok) {
      const data = await res.json();
      setInternships(data.internships);
    }
  };

  // Unauthenticated Guard (Mandatory Requirement 3)
  if (!sessionToken || (!profile && !loadingBootstrap)) {
    return <EntryAndAuthView onAuthenticated={handleAuthenticated} />;
  }

  if (loadingBootstrap || !profile) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 text-center space-y-2 max-w-sm w-full shadow-xs">
          <p className="text-sm font-bold text-[#292344]">Loading Free Intern Workspace...</p>
          <p className="text-xs text-[#747484]">
            Restoring your student profile, eligibility reports, and application tracker.
          </p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const navGroups = [
    {
      heading: 'Opportunities & Tracking',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'discover', label: 'Discover Internship', icon: Compass },
        { id: 'government', label: 'Government Internships', icon: Landmark },
        { id: 'pm-internship', label: 'PM Internship', icon: Building2 },
        { id: 'applications', label: 'My Applications', icon: ClipboardList },
        { id: 'saved', label: 'Saved Internships', icon: Bookmark },
      ],
    },
    {
      heading: 'AI Career & Interview Lab',
      items: [
        { id: 'resume-scanner', label: 'AI Resume Scanner', icon: FileSearch },
        { id: 'mock-interview', label: 'AI Mock Interview', icon: Mic },
        { id: 'intern-assistant', label: 'AI Intern Assistant', icon: Bot },
        { id: 'career-assistant', label: 'AI Career Assistant', icon: Briefcase },
      ],
    },
    {
      heading: 'Skills & Verified Profile',
      items: [
        { id: 'current-skills', label: 'Current Relevant Skills', icon: TrendingUp },
        { id: 'skill-development', label: 'Skill Development', icon: BookOpen },
        { id: 'skill-badges', label: 'Skill Badges & Assessment', icon: Award },
        { id: 'profile', label: 'My Profile', icon: UserCheck },
      ],
    },
    {
      heading: 'System & Administration',
      items: [
        {
          id: 'notifications',
          label: unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications',
          icon: Bell,
        },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'post-internship', label: 'Post Internship', icon: PlusCircle },
        ...(profile?.role === 'admin'
          ? [{ id: 'admin', label: 'Admin Panel', icon: Shield }]
          : []),
      ],
    },
  ];

  const currentNavLabel =
    navGroups.flatMap((g) => g.items).find((i) => i.id === activePage)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#292936] flex">
      {/* Desktop Sidebar (264px) - Fixed/Sticky full height with independent internal scrolling */}
      <aside className="hidden lg:flex flex-col w-[264px] h-screen sticky top-0 bg-[#FFFFFF] border-r border-[#E8E5EF] shrink-0 justify-between overflow-hidden z-30">
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          <div className="flex items-center gap-3 px-2.5 py-1.5">
            <FreeInternLogo size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#292344] leading-tight truncate">Free Intern</p>
              <p className="text-[11px] text-[#747484] leading-tight truncate mt-0.5">
                Career & Internship Platform
              </p>
            </div>
          </div>

          <nav aria-label="Main Sidebar Navigation" className="space-y-5">
            {navGroups.map((group) => (
              <div key={group.heading} className="space-y-1">
                <p className="px-3 text-[11px] font-semibold tracking-wide text-[#747484]">
                  {group.heading}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePage(item.id)}
                      className={`w-full h-9 flex items-center gap-2.5 px-3 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-[#292344] text-[#FFFFFF] shadow-xs'
                          : 'text-[#292936] hover:bg-[#EEE9FF]/70 hover:text-[#292344]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#2A9D8F]' : 'text-[#6554C0]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-[#E8E5EF] space-y-2 bg-[#FAF9F6]/60 shrink-0">
          <div className="px-2.5">
            <p className="text-xs font-bold text-[#292344] truncate">{profile?.fullName || 'Student'}</p>
            <p className="text-[11px] text-[#747484] truncate">{profile?.email || ''}</p>
          </div>
          <a
            href="/api/download-project-zip"
            download="free-intern-complete-project.zip"
            className="w-full h-9 flex items-center gap-2.5 px-3 rounded-xl text-xs font-semibold text-[#292344] bg-[#DDF5EA] hover:bg-[#2A9D8F]/25 border border-[#2A9D8F]/40 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0 text-[#2A9D8F]" />
            <span>Download Project (.zip)</span>
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-9 flex items-center gap-2.5 px-3 rounded-xl text-xs font-semibold text-[#292344] bg-[#FFF0E8] hover:bg-[#F28B72]/25 border border-[#F28B72]/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0 text-[#F28B72]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar following SaaS Dashboard 3-zone contract */}
        <header className="h-16 bg-[#FFFFFF]/95 backdrop-blur-xs border-b border-[#E8E5EF] px-4 md:px-8 flex items-center justify-between gap-4 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Toggle mobile navigation menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#E8E5EF] text-[#292344] hover:bg-[#FAF9F6] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-[#292936] truncate">
              <span className="text-[#747484]">Free Intern</span>
              <span aria-hidden="true" className="text-[#747484]">
                /
              </span>
              <span className="text-[#292344] font-bold truncate">{currentNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="/api/download-project-zip"
              download="free-intern-complete-project.zip"
              className="inline-flex items-center gap-1.5 justify-center h-9 px-3.5 text-xs font-semibold text-[#292344] bg-[#DDF5EA] hover:bg-[#2A9D8F]/25 border border-[#2A9D8F]/40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#2A9D8F]" />
              <span>Download ZIP</span>
            </a>
            <button
              type="button"
              onClick={() => setActivePage('discover')}
              className="hidden sm:inline-flex items-center justify-center h-9 px-4 text-xs font-semibold text-[#FFFFFF] bg-[#6554C0] hover:bg-[#292344] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Discover Internships
            </button>
            <button
              type="button"
              onClick={() => setActivePage('profile')}
              className="inline-flex items-center justify-center h-9 px-3.5 text-xs font-semibold text-[#292344] bg-[#EEE9FF] hover:bg-[#EEE9FF]/80 border border-[#E8E5EF] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {(profile?.fullName ? profile.fullName.split(' ')[0] : 'Student')} ({profile?.graduationYear || 'Student'})
            </button>
          </div>
        </header>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile Navigation"
            className="lg:hidden bg-[#FFFFFF] border-b border-[#E8E5EF] p-4 space-y-3"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {navGroups.flatMap((g) => g.items).map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActivePage(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`h-9 flex items-center gap-2 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                      isActive
                        ? 'bg-[#292344] text-[#FFFFFF]'
                        : 'bg-[#FAF9F6] text-[#292936] border border-[#E8E5EF]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleLogout}
                className="h-9 flex items-center gap-2 px-3 rounded-lg text-xs font-semibold text-[#292344] bg-[#FFF0E8] border border-[#F28B72]/40 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0 text-[#F28B72]" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        )}

        {/* Active Page Viewport */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto pb-24">
          {(activePage === 'dashboard' ||
            activePage === 'notifications' ||
            activePage === 'settings' ||
            activePage === 'post-internship' ||
            activePage === 'admin') && (
            <DashboardAndAdminView
              pageMode={
                activePage as
                  | 'dashboard'
                  | 'notifications'
                  | 'settings'
                  | 'post-internship'
                  | 'admin'
              }
              profile={profile}
              internships={internships}
              savedInternshipIds={savedInternshipIds}
              applications={applications}
              resumeReports={resumeReports}
              learningProgress={learningProgress}
              notifications={notifications}
              aiRecommendations={aiRecommendations}
              refreshingAiRecs={refreshingAiRecs}
              onRefreshAiRecommendations={handleRefreshAiRecommendations}
              onNavigate={setActivePage}
              onOpenInternship={handleOpenInternship}
              onMarkNotificationsRead={handleMarkNotificationsRead}
              onCreateInternshipListing={handleCreateInternshipListing}
              onUpdateInternshipStatus={handleUpdateInternshipStatus}
              onLogout={handleLogout}
            />
          )}

          {(activePage === 'discover' ||
            activePage === 'government' ||
            activePage === 'pm-internship' ||
            activePage === 'saved') && (
            <DiscoverAndGovView
              pageMode={
                activePage as 'discover' | 'government' | 'pm-internship' | 'saved'
              }
              internships={internships}
              profile={profile}
              savedInternshipIds={savedInternshipIds}
              applications={applications}
              aiRecommendations={aiRecommendations}
              refreshingAiRecs={refreshingAiRecs}
              onRefreshAiRecommendations={handleRefreshAiRecommendations}
              onToggleSave={handleToggleSaveInternship}
              onSubmitApplication={handleSubmitApplication}
              onNavigate={setActivePage}
              pendingInternshipAction={pendingInternshipAction}
              onClearPendingInternshipAction={() => setPendingInternshipAction(null)}
            />
          )}

          {(activePage === 'applications' || activePage === 'resume-scanner') && (
            <ApplicationsAndResumeView
              pageMode={activePage as 'applications' | 'resume-scanner'}
              profile={profile}
              internships={internships}
              applications={applications}
              resumeReports={resumeReports}
              onUpdateApplication={handleUpdateApplication}
              onDeleteApplication={handleDeleteApplication}
              onRunResumeScan={handleRunResumeScan}
              onNavigate={setActivePage}
            />
          )}

          {(activePage === 'mock-interview' ||
            activePage === 'current-skills' ||
            activePage === 'skill-development' ||
            activePage === 'skill-badges' ||
            activePage === 'intern-assistant' ||
            activePage === 'career-assistant') && (
            <InterviewAndSkillsView
              pageMode={
                activePage as
                  | 'mock-interview'
                  | 'current-skills'
                  | 'skill-development'
                  | 'skill-badges'
                  | 'intern-assistant'
                  | 'career-assistant'
              }
              profile={profile}
              internships={internships}
              interviewSessions={interviewSessions}
              learningProgress={learningProgress}
              completedAssessments={completedAssessments}
              onStartInterviewSession={handleStartInterviewSession}
              onUpdateInterviewSession={handleUpdateInterviewSession}
              onToggleLearningItem={handleToggleLearningItem}
              onSubmitAssessment={handleSubmitAssessment}
              onAskAssistant={handleAskAssistant}
              onNavigate={setActivePage}
            />
          )}

          {activePage === 'profile' && (
            <StudentProfileView
              profile={profile}
              latestResumeReport={resumeReports[0]}
              onSaveProfile={handleSaveProfile}
              onNavigate={setActivePage}
            />
          )}
        </main>
      </div>
    </div>
  );
}
