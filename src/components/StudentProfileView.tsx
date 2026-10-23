import React, { useState } from 'react';
import {
  GraduationCap,
  Code2,
  Layers,
  FolderGit2,
  Award,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Save,
} from 'lucide-react';
import type {
  StudentProfile,
  TechnicalCompetency,
  SkillCategory,
  DomainCompetency,
  StudentProject,
  CertificationAchievement,
  ResumeAnalysisReport,
} from '../types.ts';
import { calculateProfileCompletion } from '../utils/logic.ts';

interface StudentProfileViewProps {
  profile: StudentProfile;
  latestResumeReport?: ResumeAnalysisReport;
  onSaveProfile: (updated: StudentProfile) => Promise<void>;
  onNavigate: (page: string) => void;
}

const SKILL_CATEGORIES: SkillCategory[] = [
  'Programming Languages',
  'Frameworks and Libraries',
  'Databases',
  'Development Tools',
  'Cloud and Deployment',
  'Testing Tools',
  'Other Technical Technologies',
];

const DOMAIN_OPTIONS: DomainCompetency['domain'][] = [
  'Full-Stack Development',
  'Web Development',
  'Artificial Intelligence and Machine Learning',
  'Data Analytics',
  'Software Engineering',
  'Cloud Computing',
  'Cybersecurity',
  'UI/UX and Product Design',
];

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  profile,
  latestResumeReport,
  onSaveProfile,
  onNavigate,
}) => {
  const [editingBasic, setEditingBasic] = useState(!profile.onboardingCompleted);
  const [saving, setSaving] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Basic & Education Form State
  const [fullName, setFullName] = useState(profile.fullName);
  const [college, setCollege] = useState(profile.college);
  const [degree, setDegree] = useState(profile.degree);
  const [department, setDepartment] = useState(profile.department);
  const [currentYear, setCurrentYear] = useState(profile.currentYear ? String(profile.currentYear) : '');
  const [currentSemester] = useState(
    profile.currentSemester ? String(profile.currentSemester) : ''
  );
  const [graduationYear, setGraduationYear] = useState(
    profile.graduationYear ? String(profile.graduationYear) : ''
  );
  const [gpa, setGpa] = useState(profile.gpa || '');
  const [location, setLocation] = useState(profile.location || '');
  const [careerGoal, setCareerGoal] = useState(profile.careerGoal || '');
  const [targetRolesText, setTargetRolesText] = useState((profile.targetRoles || []).join(', '));
  const [skillsLearningText, setSkillsLearningText] = useState(
    (profile.skillsLearningNow || []).join(', ')
  );
  const [courseworkText, setCourseworkText] = useState(
    (profile.relevantCoursework || []).join(', ')
  );
  const [preferredWorkMode, setPreferredWorkMode] = useState<StudentProfile['preferredWorkMode']>(
    profile.preferredWorkMode || 'Any'
  );
  const [paidPreference, setPaidPreference] = useState<StudentProfile['paidPreference']>(
    profile.paidPreference || 'Paid or Unpaid'
  );

  // New Technical Competency Form
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>('Programming Languages');
  const [newSkillLevel, setNewSkillLevel] = useState<TechnicalCompetency['selfReportedLevel']>('Intermediate');
  const [newSkillVerification, setNewSkillVerification] =
    useState<TechnicalCompetency['verificationType']>('Self-Reported Only');
  const [newSkillEvidence, setNewSkillEvidence] = useState('');

  // New Domain Competency Form
  const [newDomain, setNewDomain] = useState<DomainCompetency['domain']>('Full-Stack Development');
  const [newDomainLevel, setNewDomainLevel] = useState<DomainCompetency['learningLevel']>('Foundational');
  const [newDomainProjects, setNewDomainProjects] = useState('');
  const [newDomainNote, setNewDomainNote] = useState('');

  // New Project Form
  const [showAddProject, setShowAddProject] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projProblem, setProjProblem] = useState('');
  const [projTech, setProjTech] = useState('');
  const [projContrib, setProjContrib] = useState('');
  const [projStatus, setProjStatus] = useState<StudentProject['status']>('Completed');
  const [projRepo, setProjRepo] = useState('');
  const [projLive, setProjLive] = useState('');

  // New Certification Form
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certDate] = useState('2026-09-01');
  const [certType] = useState<CertificationAchievement['type']>('Certification');
  const [certSkills, setCertSkills] = useState('');

  const completion = calculateProfileCompletion(profile);

  const showSavedFeedback = (msg: string) => {
    setSaveBanner(msg);
    setTimeout(() => setSaveBanner(null), 3500);
  };

  const handleSaveBasicAndEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated: StudentProfile = {
        ...profile,
        fullName: fullName.trim() || profile.fullName,
        college: college.trim(),
        degree: degree.trim(),
        department: department.trim(),
        currentYear: currentYear ? Number(currentYear) : null,
        currentSemester: currentSemester ? Number(currentSemester) : null,
        graduationYear: graduationYear ? Number(graduationYear) : null,
        gpa: gpa.trim() || undefined,
        location: location.trim(),
        careerGoal: careerGoal.trim(),
        targetRoles: targetRolesText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        skillsLearningNow: skillsLearningText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        relevantCoursework: courseworkText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        preferredWorkMode,
        paidPreference,
        onboardingCompleted: true,
      };
      await onSaveProfile(updated);
      setEditingBasic(false);
      showSavedFeedback('Student profile and education details saved to database.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTechnicalSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    const effectiveVerification: TechnicalCompetency['verificationType'] =
      newSkillEvidence.trim().length > 0 ? newSkillVerification : 'Self-Reported Only';

    const newItem: TechnicalCompetency = {
      id: `tc-${Date.now()}`,
      name: newSkillName.trim(),
      category: newSkillCategory,
      selfReportedLevel: newSkillLevel,
      verificationType: effectiveVerification,
      evidenceTitle:
        newSkillEvidence.trim() || 'Self-reported by student (add project or pass assessment to verify)',
      lastUpdated: new Date().toISOString().slice(0, 10),
    };

    const updated: StudentProfile = {
      ...profile,
      technicalCompetencies: [...(profile.technicalCompetencies || []), newItem],
    };
    await onSaveProfile(updated);
    setNewSkillName('');
    setNewSkillEvidence('');
    showSavedFeedback(`Added technical competency: ${newItem.name}`);
  };

  const handleRemoveTechnicalSkill = async (id: string) => {
    const updated: StudentProfile = {
      ...profile,
      technicalCompetencies: (profile.technicalCompetencies || []).filter((t) => t.id !== id),
    };
    await onSaveProfile(updated);
    showSavedFeedback('Removed technical competency.');
  };

  const handleAddDomainCompetency = async (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: DomainCompetency = {
      id: `dc-${Date.now()}`,
      domain: newDomain,
      learningLevel: newDomainLevel,
      relevantProjects: newDomainProjects
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      interestNote: newDomainNote.trim() || `Building foundational and project experience in ${newDomain}.`,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    const filtered = (profile.domainCompetencies || []).filter((d) => d.domain !== newDomain);
    const updated: StudentProfile = {
      ...profile,
      domainCompetencies: [...filtered, newItem],
    };
    await onSaveProfile(updated);
    setNewDomainProjects('');
    setNewDomainNote('');
    showSavedFeedback(`Saved domain competency: ${newDomain}`);
  };

  const handleRemoveDomain = async (id: string) => {
    const updated: StudentProfile = {
      ...profile,
      domainCompetencies: (profile.domainCompetencies || []).filter((d) => d.id !== id),
    };
    await onSaveProfile(updated);
    showSavedFeedback('Removed domain competency.');
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim() || !projDesc.trim()) return;
    const techs = projTech
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const newProj: StudentProject = {
      id: `proj-${Date.now()}`,
      title: projTitle.trim(),
      description: projDesc.trim(),
      problemSolved: projProblem.trim() || 'Addressed student workflow efficiency requirement.',
      technologies: techs.length > 0 ? techs : ['JavaScript'],
      studentContribution: projContrib.trim() || 'Designed and implemented core modules.',
      skillsDemonstrated: techs.length > 0 ? techs : ['JavaScript'],
      status: projStatus,
      repoUrl: projRepo.trim() || undefined,
      liveUrl: projLive.trim() || undefined,
    };
    const updated: StudentProfile = {
      ...profile,
      projects: [newProj, ...(profile.projects || [])],
    };
    await onSaveProfile(updated);
    setProjTitle('');
    setProjDesc('');
    setProjProblem('');
    setProjTech('');
    setProjContrib('');
    setProjRepo('');
    setProjLive('');
    setShowAddProject(false);
    showSavedFeedback(`Added student project: ${newProj.title}`);
  };

  const handleDeleteProject = async (id: string) => {
    const updated: StudentProfile = {
      ...profile,
      projects: (profile.projects || []).filter((p) => p.id !== id),
    };
    await onSaveProfile(updated);
    showSavedFeedback('Removed project from profile.');
  };

  const handleAddCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certTitle.trim() || !certIssuer.trim()) return;
    const newCert: CertificationAchievement = {
      id: `cert-${Date.now()}`,
      title: certTitle.trim(),
      issuer: certIssuer.trim(),
      issueDate: certDate,
      type: certType,
      skillsCovered: certSkills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const updated: StudentProfile = {
      ...profile,
      certifications: [newCert, ...(profile.certifications || [])],
    };
    await onSaveProfile(updated);
    setCertTitle('');
    setCertIssuer('');
    setCertSkills('');
    showSavedFeedback(`Added certification/achievement: ${newCert.title}`);
  };

  const handleRemoveCertification = async (id: string) => {
    const updated: StudentProfile = {
      ...profile,
      certifications: (profile.certifications || []).filter((c) => c.id !== id),
    };
    await onSaveProfile(updated);
  };

  return (
    <div className="space-y-6">
      {saveBanner && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-[#DDF5EA] border border-[#2A9D8F]/40 text-[#292344] text-xs font-medium flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-[#2A9D8F] shrink-0" />
          <span>{saveBanner}</span>
        </div>
      )}

      {/* A. PROFILE HEADER */}
      <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#292344] via-[#6554C0] to-[#2A9D8F] text-[#FFFFFF] flex items-center justify-center text-xl font-bold shrink-0 shadow-xs">
              {profile.fullName
                ? profile.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                : 'ST'}
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[#292344]">{profile.fullName}</h1>
              <p className="text-xs text-[#292936]">
                <span>{profile.college || 'College not specified yet'}</span>
                <span aria-hidden="true"> · </span>
                <span>
                  {profile.degree || 'Degree pending'} {profile.department ? `in ${profile.department}` : ''}
                </span>
              </p>
              <p className="text-xs text-[#747484] tabular-nums">
                <span>
                  Current Year: {profile.currentYear ? `Year ${profile.currentYear}` : 'Unspecified'}
                </span>
                <span aria-hidden="true"> · </span>
                <span>
                  Graduation Cohort: {profile.graduationYear || 'Unspecified'}
                </span>
                <span aria-hidden="true"> · </span>
                <span>Location: {profile.location || 'Unspecified'}</span>
              </p>
              {profile.careerGoal && (
                <p className="text-xs text-[#6554C0] font-semibold pt-1">
                  Career Goal: {profile.careerGoal}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[#292344]">
                Profile Completion:{' '}
                <span className="font-mono font-bold text-[#2A9D8F]">{completion.percentage}%</span>
              </span>
              <button
                type="button"
                onClick={() => setEditingBasic((prev) => !prev)}
                className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{editingBasic ? 'Close Editor' : 'Edit Profile & Education'}</span>
              </button>
            </div>
            <div className="w-full sm:w-56 h-2 rounded-full bg-[#FAF9F6] border border-[#E8E5EF] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6554C0] to-[#2A9D8F] transition-all"
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
            {completion.missingItems.length > 0 && (
              <p className="text-[11px] text-[#F28B72] font-medium">
                Missing for 100%: {completion.missingItems.slice(0, 2).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* B. EDITABLE EDUCATION & ONBOARDING FORM */}
        {editingBasic && (
          <form
            onSubmit={handleSaveBasicAndEducation}
            className="mt-6 pt-6 border-t border-[#E8E5EF] space-y-4"
          >
            <h2 className="text-sm font-bold text-[#292344] flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#6554C0]" />
              <span>Edit Student Onboarding, Education & Career Preferences</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="prof-name" className="block text-xs font-semibold text-[#292344] mb-1.5">
                  Full Name
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label htmlFor="prof-college" className="block text-xs font-semibold text-[#292344] mb-1.5">
                  College or University
                </label>
                <input
                  id="prof-college"
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g., Anna University, Chennai"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label htmlFor="prof-location" className="block text-xs font-semibold text-[#292344] mb-1.5">
                  Current City & State
                </label>
                <input
                  id="prof-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Chennai, Tamil Nadu"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label htmlFor="prof-degree" className="block text-xs font-semibold text-[#292344] mb-1.5">
                  Degree
                </label>
                <input
                  id="prof-degree"
                  type="text"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="B.Tech / B.E. / B.Sc"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label htmlFor="prof-dept" className="block text-xs font-semibold text-[#292344] mb-1.5">
                  Department
                </label>
                <input
                  id="prof-dept"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Computer Science"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label htmlFor="prof-year" className="block text-xs font-semibold text-[#292344] mb-1.5">
                  Current Year
                </label>
                <select
                  id="prof-year"
                  value={currentYear}
                  onChange={(e) => setCurrentYear(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                >
                  <option value="">Select Year</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
              <div>
                <label htmlFor="prof-grad" className="block text-xs font-semibold text-[#292344] mb-1.5">
                  Graduation Year
                </label>
                <select
                  id="prof-grad"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                >
                  <option value="">Select Cohort</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                </select>
              </div>
              <div>
                <label htmlFor="prof-gpa" className="block text-xs font-semibold text-[#292344] mb-1.5">
                  GPA / CGPA (Optional)
                </label>
                <input
                  id="prof-gpa"
                  type="text"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  placeholder="8.64 / 10.0"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-goal" className="block text-xs font-semibold text-[#292344] mb-1.5">
                  Career Goal
                </label>
                <input
                  id="prof-goal"
                  type="text"
                  value={careerGoal}
                  onChange={(e) => setCareerGoal(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label htmlFor="prof-roles" className="block text-xs font-semibold text-[#292344] mb-1.5">
                  Target Internship Roles (comma-separated)
                </label>
                <input
                  id="prof-roles"
                  type="text"
                  value={targetRolesText}
                  onChange={(e) => setTargetRolesText(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="prof-coursework" className="block text-xs font-semibold text-[#292344] mb-1.5">
                  Relevant Coursework (comma-separated)
                </label>
                <input
                  id="prof-coursework"
                  type="text"
                  value={courseworkText}
                  onChange={(e) => setCourseworkText(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label htmlFor="prof-learning" className="block text-xs font-semibold text-[#292344] mb-1.5">
                  Skills Currently Learning (comma-separated)
                </label>
                <input
                  id="prof-learning"
                  type="text"
                  value={skillsLearningText}
                  onChange={(e) => setSkillsLearningText(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="prof-mode" className="block text-xs font-semibold text-[#292344] mb-1.5">
                    Preferred Mode
                  </label>
                  <select
                    id="prof-mode"
                    value={preferredWorkMode}
                    onChange={(e) => setPreferredWorkMode(e.target.value as StudentProfile['preferredWorkMode'])}
                    className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                  >
                    <option value="Any">Any Mode</option>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="prof-paid" className="block text-xs font-semibold text-[#292344] mb-1.5">
                    Stipend Pref.
                  </label>
                  <select
                    id="prof-paid"
                    value={paidPreference}
                    onChange={(e) => setPaidPreference(e.target.value as StudentProfile['paidPreference'])}
                    className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                  >
                    <option value="Paid or Unpaid">Paid or Unpaid</option>
                    <option value="Paid Only">Paid Only</option>
                    <option value="Unpaid Acceptable">Unpaid Acceptable</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* C. TECHNICAL COMPETENCIES */}
      <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E5EF] pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#292344] flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#6554C0]" />
              <span>Technical Competencies</span>
            </h2>
            <p className="text-xs text-[#747484]">
              Categorized technical skills. Self-reported skills are explicitly distinguished from skills demonstrated via projects or verified assessments.
            </p>
          </div>
          <span className="h-7 px-2.5 inline-flex items-center text-xs font-mono text-[#292344] bg-[#EEE9FF] rounded-lg border border-[#E8E5EF] font-semibold shrink-0">
            {(profile.technicalCompetencies || []).length} Recorded Skills
          </span>
        </div>

        {/* Add Skill Form */}
        <form
          onSubmit={handleAddTechnicalSkill}
          className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
        >
          <div>
            <label htmlFor="tc-name" className="block text-[11px] font-semibold text-[#292344] mb-1">
              Skill Name *
            </label>
            <input
              id="tc-name"
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="e.g., TypeScript, Docker"
              required
              className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
            />
          </div>
          <div>
            <label htmlFor="tc-cat" className="block text-[11px] font-semibold text-[#292344] mb-1">
              Category
            </label>
            <select
              id="tc-cat"
              value={newSkillCategory}
              onChange={(e) => setNewSkillCategory(e.target.value as SkillCategory)}
              className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
            >
              {SKILL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tc-level" className="block text-[11px] font-semibold text-[#292344] mb-1">
              Self-Reported Level
            </label>
            <select
              id="tc-level"
              value={newSkillLevel}
              onChange={(e) => setNewSkillLevel(e.target.value as TechnicalCompetency['selfReportedLevel'])}
              className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced (Self-Reported)">Advanced (Self-Reported)</option>
            </select>
          </div>
          <div>
            <label htmlFor="tc-evidence" className="block text-[11px] font-semibold text-[#292344] mb-1">
              Project or Course Evidence
            </label>
            <input
              id="tc-evidence"
              type="text"
              value={newSkillEvidence}
              onChange={(e) => {
                setNewSkillEvidence(e.target.value);
                if (e.target.value.trim()) {
                  setNewSkillVerification('Project Evidence');
                } else {
                  setNewSkillVerification('Self-Reported Only');
                }
              }}
              placeholder="e.g., CampusConnect Portal"
              className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
            />
          </div>
          <button
            type="submit"
            className="h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Competency</span>
          </button>
        </form>

        {/* Grouped Skills by Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {SKILL_CATEGORIES.map((cat) => {
            const items = (profile.technicalCompetencies || []).filter((t) => t.category === cat);
            if (items.length === 0) return null;
            return (
              <div
                key={cat}
                className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2.5 h-full"
              >
                <h3 className="text-xs font-bold text-[#6554C0]">{cat}</h3>
                <div className="divide-y divide-[#E8E5EF]">
                  {items.map((sk) => (
                    <div key={sk.id} className="py-2.5 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-[#292344]">
                          <span>{sk.name}</span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-normal text-[#747484]">{sk.selfReportedLevel}</span>
                          <span aria-hidden="true"> · </span>
                          <span
                            className={
                              sk.verificationType === 'Self-Reported Only'
                                ? 'text-[#F28B72] font-medium'
                                : 'text-[#2A9D8F] font-semibold'
                            }
                          >
                            {sk.verificationType}
                          </span>
                        </p>
                        <p className="text-[11px] text-[#747484]">
                          Evidence: {sk.evidenceTitle} · Updated {sk.lastUpdated}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${sk.name}`}
                        onClick={() => handleRemoveTechnicalSkill(sk.id)}
                        className="p-1 text-[#747484] hover:text-[#F28B72] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* D. DOMAIN COMPETENCIES */}
      <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-5 shadow-2xs">
        <div className="border-b border-[#E8E5EF] pb-4 space-y-1">
          <h2 className="text-base font-bold text-[#292344] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#6554C0]" />
            <span>Domain Competencies</span>
          </h2>
          <p className="text-xs text-[#747484]">
            Record your learning level, relevant projects, and focus areas across engineering domains. Domain mastery is never assumed from your degree alone.
          </p>
        </div>

        <form
          onSubmit={handleAddDomainCompetency}
          className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label htmlFor="dc-domain" className="block text-[11px] font-semibold text-[#292344] mb-1">
              Domain
            </label>
            <select
              id="dc-domain"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value as DomainCompetency['domain'])}
              className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
            >
              {DOMAIN_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dc-level" className="block text-[11px] font-semibold text-[#292344] mb-1">
              Current Learning Level
            </label>
            <select
              id="dc-level"
              value={newDomainLevel}
              onChange={(e) => setNewDomainLevel(e.target.value as DomainCompetency['learningLevel'])}
              className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
            >
              <option value="Exploring">Exploring</option>
              <option value="Foundational">Foundational</option>
              <option value="Project-Tested">Project-Tested</option>
              <option value="Internship-Ready">Internship-Ready</option>
            </select>
          </div>
          <div>
            <label htmlFor="dc-proj" className="block text-[11px] font-semibold text-[#292344] mb-1">
              Relevant Projects / Notes
            </label>
            <input
              id="dc-proj"
              type="text"
              value={newDomainProjects}
              onChange={(e) => setNewDomainProjects(e.target.value)}
              placeholder="e.g., CampusConnect Portal"
              className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
            />
          </div>
          <button
            type="submit"
            className="h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Domain</span>
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {(profile.domainCompetencies || []).map((dc) => (
            <div
              key={dc.id}
              className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] flex flex-col justify-between gap-2 h-full"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-bold text-[#292344]">{dc.domain}</h3>
                  <button
                    type="button"
                    aria-label={`Remove ${dc.domain}`}
                    onClick={() => handleRemoveDomain(dc.id)}
                    className="text-[#747484] hover:text-[#F28B72] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-[#6554C0] font-semibold mt-0.5">
                  Level: {dc.learningLevel}
                </p>
                <p className="text-xs text-[#292936] mt-1 leading-relaxed">{dc.interestNote}</p>
              </div>
              <p className="text-[11px] text-[#747484] pt-2 border-t border-[#E8E5EF]">
                Projects:{' '}
                {dc.relevantProjects.length > 0 ? dc.relevantProjects.join(', ') : 'None linked yet'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* E. STUDENT PROJECTS */}
      <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E5EF] pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#292344] flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-[#6554C0]" />
              <span>Student Projects & Technical Contributions</span>
            </h2>
            <p className="text-xs text-[#747484]">
              Document the problem solved, technologies used, and your personal implementation for eligibility & interview personalization.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddProject((prev) => !prev)}
            className="h-9 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddProject ? 'Cancel' : 'Add Project'}</span>
          </button>
        </div>

        {showAddProject && (
          <form
            onSubmit={handleAddProject}
            className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="pr-title" className="block text-xs font-semibold text-[#292344] mb-1">
                  Project Title *
                </label>
                <input
                  id="pr-title"
                  type="text"
                  value={projTitle}
                  onChange={(e) => setProjTitle(e.target.value)}
                  required
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label htmlFor="pr-tech" className="block text-xs font-semibold text-[#292344] mb-1">
                  Technologies Used (comma-separated) *
                </label>
                <input
                  id="pr-tech"
                  type="text"
                  value={projTech}
                  onChange={(e) => setProjTech(e.target.value)}
                  placeholder="React, TypeScript, Node.js, SQL"
                  required
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label htmlFor="pr-status" className="block text-xs font-semibold text-[#292344] mb-1">
                  Status
                </label>
                <select
                  id="pr-status"
                  value={projStatus}
                  onChange={(e) => setProjStatus(e.target.value as StudentProject['status'])}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                >
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Maintained">Maintained</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="pr-desc" className="block text-xs font-semibold text-[#292344] mb-1">
                  Project Description *
                </label>
                <input
                  id="pr-desc"
                  type="text"
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  required
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div>
                <label htmlFor="pr-prob" className="block text-xs font-semibold text-[#292344] mb-1">
                  Problem Solved & Your Contribution
                </label>
                <input
                  id="pr-prob"
                  type="text"
                  value={projContrib}
                  onChange={(e) => setProjContrib(e.target.value)}
                  placeholder="Built REST endpoints and React state forms"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="pr-repo" className="block text-xs font-semibold text-[#292344] mb-1">
                  GitHub Repository Link (Optional)
                </label>
                <input
                  id="pr-repo"
                  type="url"
                  value={projRepo}
                  onChange={(e) => setProjRepo(e.target.value)}
                  placeholder="https://github.com/username/project"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
                />
              </div>
              <div className="flex items-end justify-end">
                <button
                  type="submit"
                  className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
                >
                  Save Project to Profile
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {(profile.projects || []).map((proj) => (
            <div
              key={proj.id}
              className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] flex flex-col justify-between gap-2.5 h-full"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#292344]">{proj.title}</h3>
                    <p className="text-xs font-medium text-[#6554C0]">
                      <span className="text-[#2A9D8F] font-semibold">{proj.status}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{proj.technologies.join(', ')}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete project ${proj.title}`}
                    onClick={() => handleDeleteProject(proj.id)}
                    className="text-[#747484] hover:text-[#F28B72] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-[#292936] leading-relaxed">{proj.description}</p>
                <p className="text-xs text-[#747484]">
                  <strong className="text-[#292344]">Problem Solved:</strong> {proj.problemSolved}
                </p>
                <p className="text-xs text-[#747484]">
                  <strong className="text-[#292344]">Your Contribution:</strong>{' '}
                  {proj.studentContribution}
                </p>
              </div>
              {proj.repoUrl && (
                <div className="pt-2 border-t border-[#E8E5EF]">
                  <a
                    href={proj.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#6554C0] hover:text-[#292344] hover:underline"
                  >
                    <span>Repository Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* F. CERTIFICATIONS & G. RESUME AND CAREER GOALS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 flex flex-col justify-between h-full shadow-2xs">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#292344] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#6554C0]" />
              <span>Certifications & Achievements</span>
            </h2>
            <form onSubmit={handleAddCertification} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                aria-label="Certification Title"
                value={certTitle}
                onChange={(e) => setCertTitle(e.target.value)}
                placeholder="Course / Hackathon Title"
                className="h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
              />
              <input
                type="text"
                aria-label="Issuing Organization"
                value={certIssuer}
                onChange={(e) => setCertIssuer(e.target.value)}
                placeholder="Issuer (e.g., NPTEL)"
                className="h-9 px-3 text-xs rounded-lg border border-[#E8E5EF] bg-[#FFFFFF]"
              />
              <button
                type="submit"
                className="h-9 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
              >
                Add Record
              </button>
            </form>
            <div className="divide-y divide-[#E8E5EF]">
              {(profile.certifications || []).map((c) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-[#292344]">{c.title}</p>
                    <p className="text-[11px] text-[#747484]">
                      {c.issuer} · {c.type} · {c.issueDate}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${c.title}`}
                    onClick={() => handleRemoveCertification(c.id)}
                    className="text-[#747484] hover:text-[#F28B72] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 space-y-4 flex flex-col justify-between h-full shadow-2xs">
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#292344] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#6554C0]" />
              <span>Resume & Career Alignment Summary</span>
            </h2>
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E5EF] space-y-2 text-xs">
              <p>
                <strong className="text-[#292344]">Current Uploaded Resume:</strong>{' '}
                {profile.uploadedResumeName || 'No resume uploaded yet'}
              </p>
              <p>
                <strong className="text-[#292344]">Latest Advisory Resume Score:</strong>{' '}
                {latestResumeReport ? (
                  <span className="font-mono font-bold text-[#2A9D8F]">
                    {latestResumeReport.overallScore}/100 ({latestResumeReport.targetRole})
                  </span>
                ) : (
                  'Not analyzed yet'
                )}
              </p>
              <p>
                <strong className="text-[#292344]">Target Internship Roles:</strong>{' '}
                {(profile.targetRoles || []).join(' · ') || 'None specified'}
              </p>
              <p>
                <strong className="text-[#292344]">Skills Currently Being Learned:</strong>{' '}
                {(profile.skillsLearningNow || []).join(' · ') || 'None specified'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('resume-scanner')}
              className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg cursor-pointer"
            >
              Open AI Resume Scanner
            </button>
            <button
              type="button"
              onClick={() => onNavigate('skill-development')}
              className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF] border border-[#E8E5EF] hover:bg-[#EEE9FF]/80 rounded-lg cursor-pointer"
            >
              Open Skill Development
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
