import type {
  StudentProfile,
  InternshipListing,
  EligibilityReport,
  EligibilityOutcome,
  ApplicationRecord,
  RejectionAnalysis,
  ResumeAnalysisReport,
  KeywordRecommendation,
  ResumeSkillToDevelop,
  ResumeImprovementAction,
  InterviewQuestion,
  InterviewAnswer,
  MockInterviewSession,
  InterviewProgressPoint,
  InterviewProgressSummary,
  AiInternshipRecommendation,
} from '../types.ts';

export const UNCONFIRMED_REJECTION_DISCLAIMER =
  'The organization has not provided a confirmed rejection reason. The AI suggestions below identify possible areas for improvement based on your profile, resume, and the internship requirements. They are not confirmed reasons for rejection.';

export function calculateProfileCompletion(profile: StudentProfile): {
  percentage: number;
  completedItems: string[];
  missingItems: string[];
} {
  const checks: { label: string; done: boolean }[] = [
    { label: 'Full Name & Email', done: Boolean(profile.fullName?.trim() && profile.email?.trim()) },
    { label: 'College / University', done: Boolean(profile.college?.trim()) },
    { label: 'Degree & Department', done: Boolean(profile.degree?.trim() && profile.department?.trim()) },
    {
      label: 'Current Year & Graduation Year',
      done: Boolean(profile.currentYear !== null && profile.graduationYear !== null),
    },
    { label: 'Location & Work-Mode Preference', done: Boolean(profile.location?.trim() && profile.preferredWorkMode) },
    {
      label: 'Career Goal & Target Internship Roles',
      done: Boolean(profile.careerGoal?.trim() && profile.targetRoles?.length > 0),
    },
    {
      label: 'Technical Competencies (at least 2)',
      done: Boolean(profile.technicalCompetencies && profile.technicalCompetencies.length >= 2),
    },
    {
      label: 'Domain Competencies (at least 1)',
      done: Boolean(profile.domainCompetencies && profile.domainCompetencies.length >= 1),
    },
    {
      label: 'Student Projects (at least 1)',
      done: Boolean(profile.projects && profile.projects.length >= 1),
    },
    {
      label: 'Resume Uploaded or Extracted',
      done: Boolean(profile.uploadedResumeText && profile.uploadedResumeText.trim().length > 30),
    },
  ];

  const completedItems = checks.filter((c) => c.done).map((c) => c.label);
  const missingItems = checks.filter((c) => !c.done).map((c) => c.label);
  const percentage = Math.round((completedItems.length / checks.length) * 100);

  return { percentage, completedItems, missingItems };
}

const SKILL_SYNONYM_GROUPS: string[][] = [
  ['javascript', 'js', 'ecmascript', 'es6'],
  ['typescript', 'ts'],
  ['react', 'reactjs', 'react.js'],
  ['node.js', 'nodejs', 'node', 'express', 'express.js'],
  ['sql', 'mysql', 'postgresql', 'postgres', 'sqlite', 'relational database', 'dbms'],
  ['python', 'py', 'python3', 'python 3'],
  ['html', 'html5'],
  ['css', 'css3'],
  ['git', 'github', 'gitlab', 'version control'],
  ['machine learning', 'ml', 'supervised learning'],
  ['scikit-learn', 'sklearn', 'scikit learn'],
  ['rest apis', 'rest api', 'restful api', 'restful apis', 'api development'],
  ['tailwind css', 'tailwind', 'tailwindcss'],
];

function normalizeSkill(s: string): string {
  const raw = s.trim().toLowerCase();
  for (const group of SKILL_SYNONYM_GROUPS) {
    if (group.includes(raw)) {
      return group[0];
    }
  }
  return raw;
}

function isDegreeMatch(studentDegree: string, allowedDegrees: string[]): boolean {
  if (allowedDegrees.some((d) => d.toLowerCase().includes('any'))) return true;
  const cleanStudent = studentDegree.toLowerCase().replace(/[^a-z0-9]/g, '');
  const degreeAliases: Record<string, string[]> = {
    be: ['be', 'bachelorofengineering', 'btech'],
    btech: ['btech', 'bacheloroftechnology', 'be'],
    bsc: ['bsc', 'bachelorofscience'],
    bca: ['bca', 'bachelorofcomputerapplications'],
    mca: ['mca', 'masterofcomputerapplications'],
    mtech: ['mtech', 'masteroftechnology', 'me', 'masterofengineering'],
    msc: ['msc', 'masterofscience'],
    ba: ['ba', 'bachelorofarts'],
  };
  const studentExpanded = new Set<string>([cleanStudent]);
  for (const [key, aliases] of Object.entries(degreeAliases)) {
    if (aliases.includes(cleanStudent) || cleanStudent.includes(key)) {
      aliases.forEach((a) => studentExpanded.add(a));
    }
  }
  return allowedDegrees.some((allowed) => {
    const cleanAllowed = allowed.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      studentExpanded.has(cleanAllowed) ||
      cleanStudent.includes(cleanAllowed) ||
      cleanAllowed.includes(cleanStudent)
    );
  });
}

function isDepartmentMatch(studentDept: string, allowedDepartments: string[]): boolean {
  if (allowedDepartments.some((d) => d.toLowerCase().includes('any'))) return true;
  const lowerStudent = studentDept.toLowerCase().trim();
  const deptKeywords: Record<string, string[]> = {
    'computer science': ['computer science', 'cse', 'cs', 'computing', 'software'],
    'information technology': ['information technology', 'it', 'ict', 'information science'],
    'ai & data science': ['ai', 'artificial intelligence', 'data science', 'aids', 'aiml', 'machine learning'],
    'data science': ['data science', 'ai', 'analytics', 'statistics', 'mathematics', 'cse', 'computer science'],
    'electronics': ['electronics', 'ece', 'eee', 'electrical', 'telecommunication'],
    'software engineering': ['software', 'computer science', 'cse', 'it', 'information technology'],
  };

  return allowedDepartments.some((allowed) => {
    const lowerAllowed = allowed.toLowerCase().trim();
    if (lowerStudent.includes(lowerAllowed) || lowerAllowed.includes(lowerStudent)) {
      return true;
    }
    for (const [canonical, synonyms] of Object.entries(deptKeywords)) {
      const allowedMatchesGroup =
        lowerAllowed.includes(canonical) || synonyms.some((syn) => lowerAllowed === syn);
      const studentMatchesGroup =
        lowerStudent.includes(canonical) ||
        synonyms.some(
          (syn) =>
            lowerStudent === syn ||
            lowerStudent.split(/[\s,&/-]+/).includes(syn)
        );
      if (allowedMatchesGroup && studentMatchesGroup) {
        return true;
      }
    }
    return false;
  });
}

export function getStudentSkillSet(profile: StudentProfile): Set<string> {
  const set = new Set<string>();
  const addSkillWithRaw = (s: string) => {
    if (!s || !s.trim()) return;
    set.add(s.trim().toLowerCase());
    set.add(normalizeSkill(s));
  };

  for (const tc of profile.technicalCompetencies || []) {
    addSkillWithRaw(tc.name);
  }
  for (const proj of profile.projects || []) {
    for (const tech of proj.technologies || []) {
      addSkillWithRaw(tech);
    }
    for (const sk of proj.skillsDemonstrated || []) {
      addSkillWithRaw(sk);
    }
  }
  for (const cert of profile.certifications || []) {
    for (const sk of cert.skillsCovered || []) {
      addSkillWithRaw(sk);
    }
  }
  return set;
}

export function evaluateInternshipEligibility(
  internship: InternshipListing,
  profile: StudentProfile,
  allInternships: InternshipListing[] = [],
  referenceDateStr = '2026-10-20'
): EligibilityReport {
  const mandatoryMet: string[] = [];
  const mandatoryNotMet: string[] = [];
  const unchangeableRequirementsNotMet: string[] = [];
  const changeableSkillGaps: string[] = [];
  const missingProfileInfo: string[] = [];
  const preferredMatching: string[] = [];
  const preferredMissing: string[] = [];
  const nextSteps: string[] = [];

  const isExpired =
    internship.verificationStatus === 'Closed / Expired' ||
    (internship.deadline && internship.deadline < referenceDateStr);

  // 1. Check Missing Profile Info for Mandatory Fields
  if (!profile.degree?.trim()) {
    missingProfileInfo.push('Degree (e.g., B.E., B.Tech, B.Sc, BCA) is missing in your profile.');
  }
  if (!profile.department?.trim()) {
    missingProfileInfo.push('Department or specialization is missing in your profile.');
  }
  if (profile.currentYear === null || profile.currentYear === undefined) {
    missingProfileInfo.push('Current year of study is missing in your profile.');
  }
  if (profile.graduationYear === null || profile.graduationYear === undefined) {
    missingProfileInfo.push('Expected graduation year is missing in your profile.');
  }

  const req = internship.mandatoryRequirements;

  // 2. Check Degree
  if (profile.degree?.trim()) {
    const degAllowed = isDegreeMatch(profile.degree, req.allowedDegrees);
    if (degAllowed) {
      mandatoryMet.push(`Degree requirement met (${profile.degree} matches [${req.allowedDegrees.join(', ')}]).`);
    } else {
      const msg = `Mandatory Degree mismatch: Requires [${req.allowedDegrees.join(', ')}], your profile lists ${profile.degree}.`;
      mandatoryNotMet.push(msg);
      unchangeableRequirementsNotMet.push(msg);
    }
  }

  // 3. Check Department
  if (profile.department?.trim()) {
    const deptAllowed = isDepartmentMatch(profile.department, req.allowedDepartments);
    if (deptAllowed) {
      mandatoryMet.push(`Department requirement met (${profile.department}).`);
    } else {
      const msg = `Mandatory Department mismatch: Requires [${req.allowedDepartments.join(', ')}], your profile lists ${profile.department}.`;
      mandatoryNotMet.push(msg);
      unchangeableRequirementsNotMet.push(msg);
    }
  }

  // 4. Check Academic Year
  if (profile.currentYear !== null && profile.currentYear !== undefined) {
    if (req.allowedYearsOfStudy.includes(Number(profile.currentYear))) {
      mandatoryMet.push(`Year of study requirement met (Year ${profile.currentYear}).`);
    } else {
      const msg = `Academic Year requirement not met: Open to Year [${req.allowedYearsOfStudy.join(', ')}] students; your profile lists Year ${profile.currentYear}.`;
      mandatoryNotMet.push(msg);
      unchangeableRequirementsNotMet.push(msg);
    }
  }

  // 5. Check Graduation Year
  if (profile.graduationYear !== null && profile.graduationYear !== undefined) {
    if (req.allowedGraduationYears.includes(Number(profile.graduationYear))) {
      mandatoryMet.push(`Graduation cohort requirement met (Class of ${profile.graduationYear}).`);
    } else {
      const msg = `Graduation Year requirement not met: Requires graduating cohort [${req.allowedGraduationYears.join(', ')}]; your profile lists ${profile.graduationYear}.`;
      mandatoryNotMet.push(msg);
      unchangeableRequirementsNotMet.push(msg);
    }
  }

  // 6. Check Mandatory Technical Skills
  const studentSkills = getStudentSkillSet(profile);
  const hasAnyRecordedSkills = studentSkills.size > 0;

  if (!hasAnyRecordedSkills && req.mandatorySkills.length > 0) {
    missingProfileInfo.push(
      `Technical skills are not yet added to your profile (needed to verify: ${req.mandatorySkills.join(', ')}).`
    );
    for (const mSkill of req.mandatorySkills) {
      changeableSkillGaps.push(mSkill);
    }
  } else {
    for (const mSkill of req.mandatorySkills) {
      if (studentSkills.has(normalizeSkill(mSkill)) || studentSkills.has(mSkill.trim().toLowerCase())) {
        mandatoryMet.push(`Mandatory skill verified in profile: ${mSkill}`);
      } else {
        const msg = `Missing mandatory technical skill: ${mSkill}`;
        mandatoryNotMet.push(msg);
        changeableSkillGaps.push(mSkill);
      }
    }
  }

  // 7. Check Preferred Skills (Does NOT make student ineligible if missing!)
  for (const pSkill of internship.preferredSkills) {
    if (studentSkills.has(normalizeSkill(pSkill)) || studentSkills.has(pSkill.trim().toLowerCase())) {
      preferredMatching.push(pSkill);
    } else {
      preferredMissing.push(pSkill);
    }
  }

  // Determine Status (Never mark a student Eligible if mandatory requirements are not met or profile info is missing)
  let status: EligibilityOutcome = 'Eligible';
  if (isExpired) {
    status = 'Closed / Expired';
  } else if (mandatoryNotMet.length > 0) {
    status = 'Not Eligible Yet';
  } else if (missingProfileInfo.length > 0) {
    status = 'Potentially Eligible / More Information Needed';
  } else {
    status = 'Eligible';
  }

  // Calculate documented rubric Relevance Score (out of 100)
  // - Mandatory Criteria Alignment: up to 40 pts
  // - Technical Skills Match: up to 35 pts
  // - Domain & Project Evidence: up to 15 pts
  // - Work-Mode, Location & Role Preference: up to 10 pts
  const totalMandatoryChecks = 4 + req.mandatorySkills.length;
  const mandatoryCriteriaScore =
    totalMandatoryChecks > 0
      ? Math.min(40, Math.round((mandatoryMet.length / totalMandatoryChecks) * 40))
      : 40;

  const allTargetSkills = [...req.mandatorySkills, ...internship.preferredSkills];
  const matchedSkillCount =
    req.mandatorySkills.filter((s) => studentSkills.has(normalizeSkill(s))).length +
    preferredMatching.length;
  const technicalSkillsScore =
    allTargetSkills.length > 0
      ? Math.min(35, Math.round((matchedSkillCount / allTargetSkills.length) * 35))
      : 25;

  const hasDomainMatch = (profile.domainCompetencies || []).some(
    (d) =>
      internship.roleCategory.toLowerCase().includes(d.domain.toLowerCase().split(' ')[0]) ||
      d.domain.toLowerCase().includes(internship.roleCategory.toLowerCase().split(' ')[0])
  );
  const hasRelevantProject = (profile.projects || []).some((p) =>
    p.technologies.some((t) => allTargetSkills.some((reqS) => normalizeSkill(reqS) === normalizeSkill(t)))
  );
  const domainAndProjectScore = (hasDomainMatch ? 8 : 3) + (hasRelevantProject ? 7 : 2);

  let preferenceAlignmentScore = 0;
  if (
    profile.preferredWorkMode === 'Any' ||
    profile.preferredWorkMode === internship.workMode
  ) {
    preferenceAlignmentScore += 5;
  }
  if (
    profile.paidPreference === 'Paid or Unpaid' ||
    (profile.paidPreference === 'Paid Only' && internship.isPaid) ||
    (profile.paidPreference === 'Unpaid Acceptable' && !internship.isPaid)
  ) {
    preferenceAlignmentScore += 5;
  }

  const relevanceScore = Math.min(
    100,
    mandatoryCriteriaScore + technicalSkillsScore + domainAndProjectScore + preferenceAlignmentScore
  );

  // Build accurate Next Steps (never suggest learning a skill to fix graduation year mismatch!)
  if (status === 'Closed / Expired') {
    nextSteps.push('This internship deadline has passed. Explore active verified internships in the same role category.');
  } else {
    if (unchangeableRequirementsNotMet.length > 0) {
      nextSteps.push(
        'Note: Academic cohort or degree criteria (such as graduation year or degree branch) cannot be changed through skill development. Focus on internships matching your graduation cohort.'
      );
    }
    if (changeableSkillGaps.length > 0) {
      nextSteps.push(
        `Complete the Skill Development modules and build a demonstrable project using: ${changeableSkillGaps.join(', ')}.`
      );
    }
    if (missingProfileInfo.length > 0) {
      nextSteps.push(
        'Complete the missing education fields in My Profile so Free Intern can verify your exact eligibility.'
      );
    }
    if (status === 'Eligible') {
      if (preferredMissing.length > 0) {
        nextSteps.push(
          `You meet all mandatory requirements! Optionally review preferred skills (${preferredMissing.join(', ')}) before your interview.`
        );
      } else {
        nextSteps.push(
          'You meet all mandatory and preferred requirements. Tailor your resume in AI Resume Scanner and submit your application before the deadline.'
        );
      }
    }
  }

  // Find similar internships the student IS eligible for
  const similarEligibleInternshipIds = allInternships
    .filter((other) => other.id !== internship.id && other.roleCategory === internship.roleCategory)
    .filter((other) => {
      const otherReq = other.mandatoryRequirements;
      const yearOk =
        profile.currentYear !== null && otherReq.allowedYearsOfStudy.includes(profile.currentYear);
      const gradOk =
        profile.graduationYear !== null &&
        otherReq.allowedGraduationYears.includes(profile.graduationYear);
      const skillsOk = otherReq.mandatorySkills.every((s) => studentSkills.has(normalizeSkill(s)));
      return yearOk && gradOk && skillsOk;
    })
    .map((i) => i.id)
    .slice(0, 3);

  let summaryReason = '';
  if (status === 'Eligible') {
    summaryReason = `You satisfy all ${mandatoryMet.length} mandatory requirements for ${internship.title} at ${internship.organization}.`;
  } else if (status === 'Potentially Eligible / More Information Needed') {
    summaryReason = `No mandatory disqualifications found so far, but ${missingProfileInfo.length} profile detail(s) are required to confirm eligibility.`;
  } else if (status === 'Not Eligible Yet') {
    summaryReason = `Currently does not meet ${mandatoryNotMet.length} mandatory requirement(s): ${
      changeableSkillGaps.length > 0
        ? `missing mandatory skill(s) [${changeableSkillGaps.join(', ')}]`
        : 'academic cohort/degree criteria mismatch'
    }.`;
  } else {
    summaryReason = 'Application window for this opportunity has closed.';
  }

  return {
    internshipId: internship.id,
    status,
    relevanceScore,
    scoreBreakdown: {
      mandatoryCriteriaScore,
      technicalSkillsScore,
      domainAndProjectScore,
      preferenceAlignmentScore,
    },
    summaryReason,
    mandatoryMet,
    mandatoryNotMet,
    unchangeableRequirementsNotMet,
    changeableSkillGaps,
    missingProfileInfo,
    preferredMatching,
    preferredMissing,
    nextSteps,
    similarEligibleInternshipIds,
  };
}

export interface RelevantSkillDemandItem {
  skillName: string;
  category: string;
  activeVerifiedListingsCount: number;
  totalActiveListingsAnalyzed: number;
  relatedRoles: string[];
  relevantInternshipIds: string[];
  relevantInternshipTitles: string[];
  requiredLevel: 'Beginner to Intermediate' | 'Intermediate (Project Evidence Expected)';
  whyItMatters: string;
  studentCurrentProficiency: string;
  needsImprovement: boolean;
  learningRoadmapSummary: string;
  practiceTask: string;
  projectSuggestion: string;
  dataSourceNote: string;
  lastUpdatedDate: string;
}

export function computeCurrentRelevantSkills(
  internships: InternshipListing[],
  profile: StudentProfile
): RelevantSkillDemandItem[] {
  const activeVerified = internships.filter(
    (i) =>
      i.verificationStatus === 'Verified Official Source' ||
      i.verificationStatus === 'Partner Verified'
  );

  const skillMap = new Map<
    string,
    {
      displayName: string;
      count: number;
      mandatoryCount: number;
      roles: Set<string>;
      internshipIds: string[];
      internshipTitles: string[];
    }
  >();

  for (const item of activeVerified) {
    const combined = new Set<string>([
      ...item.mandatoryRequirements.mandatorySkills,
      ...item.preferredSkills,
    ]);
    for (const sk of combined) {
      const key = normalizeSkill(sk);
      const existing = skillMap.get(key) || {
        displayName: sk,
        count: 0,
        mandatoryCount: 0,
        roles: new Set<string>(),
        internshipIds: [],
        internshipTitles: [],
      };
      existing.count += 1;
      if (item.mandatoryRequirements.mandatorySkills.some((m) => normalizeSkill(m) === key)) {
        existing.mandatoryCount += 1;
      }
      existing.roles.add(item.roleCategory);
      existing.internshipIds.push(item.id);
      existing.internshipTitles.push(`${item.title} (${item.organization})`);
      skillMap.set(key, existing);
    }
  }

  const studentSkillMap = new Map<string, string>();
  for (const tc of profile.technicalCompetencies || []) {
    studentSkillMap.set(
      normalizeSkill(tc.name),
      `${tc.selfReportedLevel} (${tc.verificationType})`
    );
  }

  const results: RelevantSkillDemandItem[] = [];
  for (const [key, val] of skillMap.entries()) {
    const currentProf = studentSkillMap.get(key) || 'Not recorded in profile';
    const needsImprovement =
      !studentSkillMap.has(key) || currentProf.includes('Beginner') || currentProf.includes('Self-Reported Only');

    results.push({
      skillName: val.displayName,
      category: Array.from(val.roles)[0] || 'Software Engineering',
      activeVerifiedListingsCount: val.count,
      totalActiveListingsAnalyzed: activeVerified.length,
      relatedRoles: Array.from(val.roles),
      relevantInternshipIds: val.internshipIds,
      relevantInternshipTitles: val.internshipTitles,
      requiredLevel:
        val.mandatoryCount >= 2
          ? 'Intermediate (Project Evidence Expected)'
          : 'Beginner to Intermediate',
      whyItMatters: `Requested in ${val.count} of ${activeVerified.length} active verified listings (${val.mandatoryCount} as mandatory criteria).`,
      studentCurrentProficiency: currentProf,
      needsImprovement,
      learningRoadmapSummary: `Stage 1: Core syntax & concepts -> Stage 2: Hands-on coding exercises -> Stage 3: Build a portfolio project demonstrating ${val.displayName} -> Stage 4: Pass the ${val.displayName} Skill Assessment.`,
      practiceTask: `Complete 3 practical problem-solving exercises in ${val.displayName} and push a clean repository with README documentation.`,
      projectSuggestion: `Build an end-to-end mini-project integrating ${val.displayName} with real input validation and automated tests.`,
      dataSourceNote: `Computed directly from ${activeVerified.length} active verified listings in the Free Intern database. Reflects available verified platform listings, not the entire global job market.`,
      lastUpdatedDate: '2026-10-20',
    });
  }

  return results.sort((a, b) => b.activeVerifiedListingsCount - a.activeVerifiedListingsCount);
}

const ROLE_SKILL_BENCHMARKS: Record<
  string,
  { mandatory: string[]; preferred: string[]; domainTerms: string[] }
> = {
  'Full-Stack Development Intern': {
    mandatory: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Git'],
    preferred: ['REST APIs', 'Tailwind CSS', 'PostgreSQL', 'Authentication', 'Unit Testing'],
    domainTerms: ['RESTful API', 'State Management', 'Database Schema', 'Responsive UI', 'JWT Authentication'],
  },
  'Frontend Development Intern': {
    mandatory: ['HTML', 'CSS', 'JavaScript', 'React', 'Git'],
    preferred: ['TypeScript', 'Tailwind CSS', 'Accessibility (WCAG)', 'Responsive Design'],
    domainTerms: ['Component Architecture', 'DOM Manipulation', 'Web Accessibility', 'Core Web Vitals'],
  },
  'Backend Development Intern': {
    mandatory: ['Node.js', 'Python', 'SQL', 'REST APIs', 'Git'],
    preferred: ['PostgreSQL', 'Docker', 'Authentication', 'Redis'],
    domainTerms: ['Query Optimization', 'Middleware', 'Schema Migration', 'Rate Limiting'],
  },
  'AI/ML Intern': {
    mandatory: ['Python', 'NumPy', 'Pandas', 'Machine Learning', 'Statistics'],
    preferred: ['Scikit-Learn', 'PyTorch', 'Data Preprocessing', 'SQL'],
    domainTerms: ['Feature Engineering', 'Cross-Validation', 'Model Evaluation', 'Precision & Recall'],
  },
  'Data Analyst Intern': {
    mandatory: ['SQL', 'Python', 'Data Cleaning', 'Statistics', 'Spreadsheets'],
    preferred: ['Pandas', 'Data Visualization', 'Power BI / Tableau'],
    domainTerms: ['Exploratory Data Analysis', 'Cohort Analysis', 'Data Pipeline', 'KPI Reporting'],
  },
  'Python Developer Intern': {
    mandatory: ['Python', 'SQL', 'Git', 'REST APIs'],
    preferred: ['FastAPI', 'Django', 'Pytest', 'Docker'],
    domainTerms: ['Virtual Environments', 'Type Hints', 'Automated Testing', 'Modular Architecture'],
  },
  'Java Developer Intern': {
    mandatory: ['Java', 'OOP', 'SQL', 'Git'],
    preferred: ['Spring Boot', 'JUnit', 'REST APIs', 'Maven'],
    domainTerms: ['Object-Oriented Design', 'Collections Framework', 'Dependency Injection', 'JDBC'],
  },
};

export function analyzeResumeContent(
  resumeText: string,
  fileName: string,
  targetRole: string,
  targetInternship: InternshipListing | undefined,
  profile: StudentProfile,
  allInternships: InternshipListing[] = []
): ResumeAnalysisReport {
  const cleanText = resumeText.trim();
  const lowerText = cleanText.toLowerCase();

  const benchmark = ROLE_SKILL_BENCHMARKS[targetRole] || ROLE_SKILL_BENCHMARKS['Full-Stack Development Intern'];
  const mandatorySkills = targetInternship
    ? targetInternship.mandatoryRequirements.mandatorySkills
    : benchmark.mandatory;
  const preferredSkills = targetInternship ? targetInternship.preferredSkills : benchmark.preferred;
  const allTargetKeywords = Array.from(
    new Set([...mandatorySkills, ...preferredSkills, ...benchmark.domainTerms])
  );

  const studentProfileSkills = getStudentSkillSet(profile);

  // Detect skills present in resume text
  const detectedSkills = allTargetKeywords.filter((kw) =>
    lowerText.includes(kw.toLowerCase())
  );

  // Detect education & projects mentions
  const hasEducationSection =
    /b\.tech|b\.e|b\.sc|bca|mca|college|university|institute|cgpa|gpa|graduation/i.test(cleanText);
  const hasProjectsSection = /project|built|developed|implemented|github|repository|deployed/i.test(cleanText);

  const detectedEducation: string[] = [];
  if (hasEducationSection) {
    detectedEducation.push(
      profile.degree && cleanText.toLowerCase().includes(profile.degree.toLowerCase())
        ? `${profile.degree} in ${profile.department}`
        : 'Academic degree & institution detected in resume text'
    );
  }

  const detectedProjects: string[] = [];
  for (const proj of profile.projects || []) {
    if (lowerText.includes(proj.title.toLowerCase())) {
      detectedProjects.push(proj.title);
    }
  }
  if (detectedProjects.length === 0 && hasProjectsSection) {
    detectedProjects.push('Project descriptions detected in resume text');
  }

  // Build Recommended Keywords to Add (strictly categorized into 4 truthful tiers!)
  const recommendedKeywords: KeywordRecommendation[] = [];

  for (const kw of allTargetKeywords) {
    const inResume = lowerText.includes(kw.toLowerCase());
    const inProfileEvidence = studentProfileSkills.has(normalizeSkill(kw));
    const isMandatory = mandatorySkills.some((m) => normalizeSkill(m) === normalizeSkill(kw));

    if (inResume) {
      recommendedKeywords.push({
        keyword: kw,
        category: 'Already Present',
        whyItMatters: isMandatory
          ? `Core mandatory requirement for ${targetInternship ? targetInternship.title : targetRole}.`
          : `Valuable technical keyword for ${targetRole}.`,
        relatedRequirement: isMandatory ? 'Mandatory Technical Skill' : 'Preferred Skill / Domain Term',
        whereItFits: 'Technical Skills & Project Bullet Points',
        truthfulExample: `Keep "${kw}" linked to a concrete project bullet showing how you used it.`,
      });
    } else if (inProfileEvidence) {
      recommendedKeywords.push({
        keyword: kw,
        category: 'Safe to Include (Evidence Exists)',
        whyItMatters: `You have recorded evidence of ${kw} in your Free Intern profile/projects, but it is missing from your uploaded resume text!`,
        relatedRequirement: isMandatory ? 'Mandatory Technical Skill' : 'Preferred Technical Skill',
        whereItFits: 'Technical Competencies section and the project where you applied it',
        truthfulExample: `Add "${kw}" under Technical Skills and mention how you used ${kw} in your existing project.`,
      });
    } else if (isMandatory) {
      recommendedKeywords.push({
        keyword: kw,
        category: 'Learn Before Claiming',
        whyItMatters: `Required mandatory skill for ${targetInternship ? targetInternship.title : targetRole}, and not yet found in your resume or profile.`,
        relatedRequirement: 'Mandatory Internship Requirement',
        whereItFits: 'Add only AFTER completing a foundational module and mini-project',
        truthfulExample: `Do NOT add "${kw}" yet. First build a verified mini-project using ${kw} in Skill Development, then document that project on your resume.`,
      });
    } else {
      recommendedKeywords.push({
        keyword: kw,
        category: 'Relevant (Not Yet Demonstrated)',
        whyItMatters: `Preferred skill or technical concept that strengthens applications for ${targetRole}.`,
        relatedRequirement: 'Preferred Role Competency',
        whereItFits: 'Relevant Coursework or Future Project section once practiced',
        truthfulExample: `Once you practice ${kw}, describe the specific component or analysis you implemented with it.`,
      });
    }
  }

  // Rubric Section Scores
  const educationAndClarity = Math.min(
    20,
    (hasEducationSection ? 12 : 4) + (cleanText.length > 250 ? 8 : 4)
  );
  const matchedMandatoryCount = mandatorySkills.filter((m) =>
    lowerText.includes(m.toLowerCase())
  ).length;
  const technicalSkillsEvidence = Math.min(
    30,
    Math.round((matchedMandatoryCount / Math.max(1, mandatorySkills.length)) * 22) +
      Math.min(8, detectedSkills.length * 2)
  );
  const projectsAndImpact = Math.min(
    30,
    (hasProjectsSection ? 16 : 5) +
      (/github\.com|gitlab\.com|live|demo/i.test(cleanText) ? 8 : 2) +
      (detectedProjects.length > 0 ? 6 : 2)
  );
  const roleAlignmentAndKeywords = Math.min(
    20,
    Math.round((detectedSkills.length / Math.max(1, allTargetKeywords.length)) * 20)
  );

  const overallScore =
    educationAndClarity + technicalSkillsEvidence + projectsAndImpact + roleAlignmentAndKeywords;

  const missingOrWeakSkills = [...mandatorySkills, ...preferredSkills].filter(
    (s) => !lowerText.includes(s.toLowerCase())
  );

  const skillsToDevelop: ResumeSkillToDevelop[] = missingOrWeakSkills.slice(0, 6).map((sk, idx) => {
    const isMand = mandatorySkills.some((m) => normalizeSkill(m) === normalizeSkill(sk));
    const relatedIds = allInternships
      .filter(
        (i) =>
          i.mandatoryRequirements.mandatorySkills.some((m) => normalizeSkill(m) === normalizeSkill(sk)) ||
          i.preferredSkills.some((p) => normalizeSkill(p) === normalizeSkill(sk))
      )
      .map((i) => i.id);

    return {
      skillName: sk,
      whyItMatters: isMand
        ? `Mandatory requirement for ${targetInternship ? targetInternship.title : targetRole}.`
        : `Preferred skill that differentiates candidates for ${targetRole}.`,
      currentEvidenceInResume: studentProfileSkills.has(normalizeSkill(sk))
        ? 'Present in student profile, but missing from resume text'
        : 'No evidence found in current resume or profile',
      requiredLevel: isMand ? 'Intermediate (Project Demonstrated)' : 'Foundational to Intermediate',
      priority: isMand ? 'High' : idx < 3 ? 'Medium' : 'Foundational',
      learningOrder: idx + 1,
      practiceExercise: `Complete the hands-on ${sk} coding exercises and verification quiz in Skill Development.`,
      projectIdea: `Extend one of your existing projects with a well-documented ${sk} module and link the commit in your resume.`,
      skillDevelopmentTrackId: 'track-fullstack',
      relatedInternshipIds: relatedIds,
    };
  });

  const safeToIncludeList = recommendedKeywords
    .filter((k) => k.category === 'Safe to Include (Evidence Exists)')
    .map((k) => k.keyword);

  const learnFirstList = recommendedKeywords
    .filter((k) => k.category === 'Learn Before Claiming')
    .map((k) => k.keyword);

  const improvementPlan: ResumeImprovementAction[] = [
    {
      id: 'imp-1',
      tier: 'Fix First',
      section: 'Technical Skills & Existing Evidence',
      issue:
        safeToIncludeList.length > 0
          ? `Skills verified in your profile (${safeToIncludeList.join(', ')}) are omitted from your resume.`
          : 'Some technical skills are listed without linking them to specific projects.',
      recommendation:
        safeToIncludeList.length > 0
          ? `Truthfully add ${safeToIncludeList.join(', ')} to your resume and cite the exact project where you used them.`
          : 'Pair every listed programming language or framework with at least one bullet in your Projects section.',
      nextAction: 'Update your resume Technical Skills & Project bullets to reflect your verified profile work.',
      completed: false,
    },
    {
      id: 'imp-2',
      tier: 'Improve Next',
      section: 'Project Descriptions & Technical Contributions',
      issue: 'Project bullets should clearly state the problem solved, technologies used, and your personal implementation.',
      recommendation:
        'Structure each project with: (1) Objective/Problem solved, (2) Architecture & tools used, and (3) Specific module you wrote and tested.',
      nextAction: 'Rewrite your top 2 project descriptions using clear technical action verbs without inventing metrics.',
      completed: false,
    },
    {
      id: 'imp-3',
      tier: 'Learn Before Adding',
      section: 'Missing Mandatory Role Competencies',
      issue:
        learnFirstList.length > 0
          ? `Missing mandatory skills for ${targetRole}: ${learnFirstList.join(', ')}.`
          : `Strengthen deeper domain competencies for ${targetRole}.`,
      recommendation:
        'Never list unlearned skills on your resume. Complete the learning track and build a small demonstrable repository first.',
      nextAction:
        learnFirstList.length > 0
          ? `Start the Skill Development roadmap for ${learnFirstList[0]} and build a starter project.`
          : 'Complete a role-specific Skill Assessment badge to validate your proficiency.',
      completed: false,
    },
    {
      id: 'imp-4',
      tier: 'Optional Improvements',
      section: 'Education, Coursework & Repository Links',
      issue: 'Recruiters verify student capabilities through accessible code repositories and relevant coursework.',
      recommendation:
        'Include graduation year, relevant undergraduate coursework, and working GitHub/live demo links.',
      nextAction: 'Verify all repository links in your resume are public and contain a clear README.',
      completed: false,
    },
  ];

  const strengths: string[] = [];
  if (detectedSkills.length > 0) {
    strengths.push(`Demonstrates ${detectedSkills.length} role-relevant technical keywords (${detectedSkills.slice(0, 5).join(', ')}).`);
  }
  if (hasEducationSection) {
    strengths.push('Includes academic background and degree progression details.');
  }
  if (hasProjectsSection) {
    strengths.push('Contains project implementation context relevant to entry-level engineering interns.');
  }
  if (strengths.length === 0) {
    strengths.push('Resume text extracted successfully; ready for structured alignment with target internship criteria.');
  }

  const weaknesses: string[] = [];
  if (safeToIncludeList.length > 0) {
    weaknesses.push(`Omits ${safeToIncludeList.length} skill(s) that you have already demonstrated in your profile (${safeToIncludeList.join(', ')}).`);
  }
  if (learnFirstList.length > 0) {
    weaknesses.push(`Missing ${learnFirstList.length} mandatory skill(s) required for ${targetRole}: ${learnFirstList.join(', ')}.`);
  }
  if (!/github\.com|gitlab\.com/i.test(cleanText)) {
    weaknesses.push('No GitHub or code repository link detected in the resume text.');
  }

  return {
    id: `res-${Date.now()}`,
    userId: profile.userId,
    fileName,
    extractedCharCount: cleanText.length,
    targetRole,
    targetInternshipId: targetInternship?.id,
    targetInternshipTitle: targetInternship ? `${targetInternship.title} (${targetInternship.organization})` : undefined,
    createdAt: new Date().toISOString(),
    overallScore,
    scoringRubricNote:
      'Advisory AI Rubric (100 pts total): Education & Clarity (20 pts), Technical Skills Evidence (30 pts), Projects & Verifiable Links (30 pts), Role Keyword Alignment (20 pts). This score measures alignment with published requirements and does not guarantee selection.',
    sectionScores: {
      educationAndClarity,
      technicalSkillsEvidence,
      projectsAndImpact,
      roleAlignmentAndKeywords,
    },
    detectedSkills,
    detectedEducation,
    detectedProjects,
    strengths,
    weaknesses,
    missingOrWeakSkills,
    recommendedKeywords,
    skillsToDevelop,
    sectionFeedback: {
      projectDescriptions:
        'Highlight the specific problem your project solves and your exact engineering contribution rather than generic summaries.',
      technicalContributions:
        'Specify how you implemented APIs, state management, data preprocessing, or database queries in each project.',
      skillPresentation:
        'Group skills into clear categories (Languages, Frameworks, Databases, Tools) rather than an unorganized list.',
      educationAndCoursework:
        'Clearly state your Degree, Department, Current Year, Expected Graduation Year, and 3-4 relevant courses.',
      readabilityAndClarity:
        'Use concise single-line bullet points starting with strong technical verbs. Avoid claiming unverifiable percentages.',
      roleAlignment: `Tailored comparison against ${targetInternship ? `${targetInternship.title} at ${targetInternship.organization}` : targetRole}.`,
    },
    improvementPlan,
  };
}

export function buildRejectionAnalysis(
  application: ApplicationRecord,
  internship: InternshipListing | undefined,
  profile: StudentProfile,
  allInternships: InternshipListing[] = []
): RejectionAnalysis {
  const officialProvided = Boolean(
    application.officialRejectionFeedback && application.officialRejectionFeedback.trim().length > 0
  );

  const studentSkills = getStudentSkillSet(profile);
  const missingMandatory = internship
    ? internship.mandatoryRequirements.mandatorySkills.filter((s) => !studentSkills.has(normalizeSkill(s)))
    : [];
  const missingPreferred = internship
    ? internship.preferredSkills.filter((s) => !studentSkills.has(normalizeSkill(s)))
    : [];

  const skillsToImprove = Array.from(new Set([...missingMandatory, ...missingPreferred])).slice(0, 5);
  if (skillsToImprove.length === 0 && internship) {
    skillsToImprove.push(...internship.mandatoryRequirements.mandatorySkills.slice(0, 2));
  }

  const alternativeInternshipIds = internship
    ? allInternships
        .filter((i) => i.id !== internship.id && i.roleCategory === internship.roleCategory)
        .map((i) => i.id)
        .slice(0, 3)
    : [];

  const actionChecklist = skillsToImprove.map((sk, idx) => ({
    id: `rej-task-${application.id}-${idx}`,
    skillOrRequirement: sk,
    category: (missingMandatory.includes(sk) ? 'Skill Gap' : 'Project Evidence') as
      | 'Skill Gap'
      | 'Academic Eligibility'
      | 'Resume Quality'
      | 'Interview Preparation'
      | 'Project Evidence',
    whyItMatters: internship
      ? `Listed in ${internship.title} requirements at ${internship.organization}.`
      : 'Core technical competency for this internship role.',
    existingEvidence: studentSkills.has(normalizeSkill(sk))
      ? 'Listed in profile; needs stronger project demonstration in resume.'
      : 'Not yet demonstrated in your Technical Competencies or Projects.',
    learningRoadmap: `Complete the ${sk} module in Skill Development (Learn -> Practice -> Build).`,
    practiceTask: `Solve 2 practical implementation tasks using ${sk} and verify with a Skill Assessment.`,
    suggestedProject: `Build or upgrade a portfolio project showcasing ${sk} with a documented README.`,
    nextAction: `Open Skill Development and complete Stage 1 & 2 for ${sk}.`,
    completed: false,
  }));

  actionChecklist.push({
    id: `rej-task-${application.id}-resume`,
    skillOrRequirement: 'Resume & Interview Readiness',
    category: 'Resume Quality',
    whyItMatters: 'Clear evidence of projects and strong technical explanations improve screening and interview outcomes.',
    existingEvidence: profile.uploadedResumeName
      ? `Current resume: ${profile.uploadedResumeName}`
      : 'No resume uploaded yet',
    learningRoadmap: 'Run AI Resume Scanner against this role and complete a 15-question AI Mock Interview session.',
    practiceTask: 'Address all "Fix First" items in AI Resume Scanner.',
    suggestedProject: 'Document architecture and testing in your flagship student project.',
    nextAction: 'Run a 15-question AI Mock Interview for this category.',
    completed: false,
  });

  return {
    applicationId: application.id,
    internshipId: application.internshipId,
    rejectionDate: new Date().toISOString().slice(0, 10),
    officialFeedbackProvided: officialProvided,
    officialFeedbackText: officialProvided ? application.officialRejectionFeedback : undefined,
    disclaimerText: UNCONFIRMED_REJECTION_DISCLAIMER,
    skillsToImprove,
    resumeImprovements: [
      'Ensure every required skill you possess is explicitly backed by a project bullet point.',
      'Include direct links to working code repositories and live demonstrations.',
      'Highlight relevant coursework and problem-solving outcomes truthfully.',
    ],
    projectSuggestions: [
      `Build a clean, well-tested project targeting ${internship?.roleCategory || 'your target domain'} requirements.`,
      'Add automated unit tests and clear setup instructions to your primary GitHub repository.',
    ],
    interviewPrepRecommendations: [
      `Complete a 15-question AI Mock Interview session in ${internship?.roleCategory || 'Full-Stack Development'}.`,
      'Practice explaining the architecture, trade-offs, and debugging challenges of your student projects.',
    ],
    alternativeInternshipIds,
    actionChecklist,
    updatedAt: new Date().toISOString(),
  };
}

export function generateRoleSpecific15Questions(
  category: string,
  targetRole: string,
  internship: InternshipListing | undefined,
  profile: StudentProfile,
  experienceLevel: string
): InterviewQuestion[] {
  const projectTitle = profile.projects?.[0]?.title || 'your recent academic software project';
  const projectTech = profile.projects?.[0]?.technologies?.join(', ') || 'your chosen tech stack';
  const orgContext = internship ? `${internship.title} at ${internship.organization}` : targetRole;
  const reqSkills = internship
    ? [...internship.mandatoryRequirements.mandatorySkills, ...internship.preferredSkills]
    : [];

  if (category.toLowerCase().includes('ai') || category.toLowerCase().includes('machine learning')) {
    const raw = [
      {
        topic: 'Python for Data Science',
        difficulty: 'Beginner' as const,
        question: `In Python, how do list comprehensions and NumPy vectorized arrays differ in memory layout and execution speed when preprocessing datasets for ${orgContext}?`,
        whyAsked: 'Tests core Python efficiency and numerical computing fundamentals.',
        hint: 'Consider contiguous C-arrays in NumPy vs pointer arrays of Python objects.',
        expectedKeyPoints: ['Vectorization', 'Contiguous memory', 'Loop overhead in Python', 'NumPy broadcasting'],
      },
      {
        topic: 'Data Preprocessing & Missing Values',
        difficulty: 'Beginner' as const,
        question: 'When preparing a real-world tabular dataset with missing values and outliers, how do you decide between median imputation, mean imputation, or dropping rows?',
        whyAsked: 'Evaluates practical data cleaning judgment before model training.',
        hint: 'Think about skewed distributions and data leakage between train and test splits.',
        expectedKeyPoints: ['Skewness sensitivity of mean vs median', 'Fitting imputer only on training set', 'Preventing data leakage'],
      },
      {
        topic: 'Pandas Data Manipulation',
        difficulty: 'Beginner' as const,
        question: 'How would you use Pandas to group time-series user records, compute rolling averages, and merge feature tables without introducing duplicate rows?',
        whyAsked: 'Checks hands-on Pandas fluency required in day-to-day AI/ML internships.',
        hint: 'Mention groupby(), rolling(), and validating join keys in merge().',
        expectedKeyPoints: ['groupby aggregation', 'rolling window functions', 'merge key cardinality validation'],
      },
      {
        topic: 'Supervised vs Unsupervised Learning',
        difficulty: 'Beginner' as const,
        question: 'Explain the core difference between supervised and unsupervised learning with one concrete use case for each.',
        whyAsked: 'Verifies foundational machine learning taxonomy.',
        hint: 'Contrast labeled target variables (classification/regression) with pattern discovery (clustering/PCA).',
        expectedKeyPoints: ['Labeled training data', 'Classification vs Regression', 'Clustering & dimensionality reduction'],
      },
      {
        topic: 'Overfitting & Underfitting',
        difficulty: 'Intermediate' as const,
        question: 'How can you diagnose whether a machine learning model is overfitting or underfitting using training and validation learning curves, and what steps fix each?',
        whyAsked: 'Core diagnostic skill for model development.',
        hint: 'Compare training error vs validation error gap, regularization, and feature complexity.',
        expectedKeyPoints: ['Bias-variance tradeoff', 'Regularization (L1/L2, Dropout)', 'Cross-validation', 'Training vs validation gap'],
      },
      {
        topic: 'Classification Evaluation Metrics',
        difficulty: 'Intermediate' as const,
        question: 'Why is accuracy misleading on a 98%-to-2% imbalanced dataset, and how do Precision, Recall, F1-score, and ROC-AUC help?',
        whyAsked: 'Tests ability to evaluate models realistically on skewed real-world data.',
        hint: 'Consider false positives vs false negatives and the minority class.',
        expectedKeyPoints: ['Class imbalance paradox', 'Precision vs Recall trade-off', 'F1 harmonic mean', 'Threshold tuning'],
      },
      {
        topic: 'Train / Validation / Test Split & Data Leakage',
        difficulty: 'Intermediate' as const,
        question: 'What is data leakage during feature scaling or encoding, and how do Scikit-Learn Pipelines prevent it during cross-validation?',
        whyAsked: 'Ensures the intern can write reproducible, leakage-free evaluation pipelines.',
        hint: 'Never call fit_transform() on the full dataset before splitting.',
        expectedKeyPoints: ['Fitting transformers on training fold only', 'Scikit-Learn Pipeline encapsulation', 'Target leakage'],
      },
      {
        topic: 'Linear & Logistic Regression Fundamentals',
        difficulty: 'Beginner' as const,
        question: 'How does Logistic Regression transform a linear combination of features into a probability, and why do we optimize log-loss (binary cross-entropy) instead of MSE?',
        whyAsked: 'Checks mathematical intuition behind foundational classifiers.',
        hint: 'Discuss the sigmoid function and convexity of log-loss.',
        expectedKeyPoints: ['Sigmoid activation', 'Probability output [0,1]', 'Convexity of cross-entropy loss'],
      },
      {
        topic: 'Tree-Based Models & Ensembles',
        difficulty: 'Intermediate' as const,
        question: 'How do Random Forests and Gradient Boosted Trees differ in how they combine individual decision trees to reduce variance or bias?',
        whyAsked: 'Tree ensembles are the most common baseline models in tabular ML internships.',
        hint: 'Contrast parallel bagging with bootstrap samples vs sequential residual fitting.',
        expectedKeyPoints: ['Bagging reduces variance', 'Boosting reduces bias sequentially', 'Feature subsampling'],
      },
      {
        topic: 'Feature Engineering & Encoding',
        difficulty: 'Intermediate' as const,
        question: 'When handling high-cardinality categorical variables, what are the trade-offs between One-Hot Encoding, Ordinal Encoding, and Target Encoding?',
        whyAsked: 'Evaluates practical feature representation skills.',
        hint: 'Think about dimensionality explosion and artificial ordering assumptions.',
        expectedKeyPoints: ['Dimensionality curse in one-hot', 'False ordering in label encoding', 'Smoothing in target encoding'],
      },
      {
        topic: 'Statistics & Hypothesis Testing',
        difficulty: 'Intermediate' as const,
        question: 'If a new model improves validation F1-score by 1.2%, how would you verify whether this improvement is statistically significant rather than random variance?',
        whyAsked: 'Tests statistical rigor and analytical thinking.',
        hint: 'Mention k-fold variance, confidence intervals, or paired significance tests.',
        expectedKeyPoints: ['K-fold standard deviation', 'Confidence intervals', 'Random seed sensitivity'],
      },
      {
        topic: 'Gradient Descent & Hyperparameters',
        difficulty: 'Intermediate' as const,
        question: 'What happens during model training if the learning rate is set too high versus too low, and how does mini-batch gradient descent balance stability and speed?',
        whyAsked: 'Tests optimization fundamentals.',
        hint: 'Discuss divergence/oscillation vs slow convergence and local minima.',
        expectedKeyPoints: ['Loss divergence', 'Convergence speed', 'Batch size memory vs gradient noise'],
      },
      {
        topic: 'Student Project Deep-Dive',
        difficulty: 'Practical Scenario' as const,
        question: `In ${projectTitle} (built with ${projectTech}), how did you validate your data pipeline or output accuracy, and what would you improve next?`,
        whyAsked: 'Evaluates authentic ownership of the student’s own project.',
        hint: 'Describe the dataset/inputs, validation steps, and one concrete engineering limitation you overcame.',
        expectedKeyPoints: ['Problem statement clarity', 'Data/input validation', 'Honest limitation and next iteration'],
      },
      {
        topic: 'Model Deployment & Inference API',
        difficulty: 'Practical Scenario' as const,
        question: `If asked to expose a trained model as a lightweight REST endpoint for ${orgContext}, how would you validate incoming JSON payloads and handle malformed inputs?`,
        whyAsked: 'Connects ML modeling to real software engineering production readiness.',
        hint: 'Think about schema validation, missing feature defaults, and HTTP 400 error responses.',
        expectedKeyPoints: ['Input schema validation', 'Serialization of model artifact', 'Graceful error handling'],
      },
      {
        topic: 'Debugging Degraded Model Performance',
        difficulty: 'Practical Scenario' as const,
        question: 'Suppose a model performs well in your notebook but produces poor predictions on newly collected student records. Walk through your step-by-step debugging checklist.',
        whyAsked: 'Tests practical troubleshooting and distribution-shift awareness.',
        hint: 'Check feature distribution drift, preprocessing mismatch, null values, and unit scale changes.',
        expectedKeyPoints: ['Feature drift inspection', 'Preprocessing parity check', 'Null/missing value handling'],
      },
    ];
    return raw.map((q, idx) => ({
      id: `q-aiml-${idx + 1}`,
      index: idx + 1,
      ...q,
      sampleStrongStructure: '1. Core concept definition -> 2. Concrete technical mechanism -> 3. Practical example from your code or dataset.',
    }));
  }

  if (category.toLowerCase().includes('data analytics') || targetRole.toLowerCase().includes('data analyst')) {
    const raw = [
      {
        topic: 'SQL Joins & Filtering',
        difficulty: 'Beginner' as const,
        question: `Explain the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN when analyzing student application records for ${orgContext}.`,
        whyAsked: 'SQL joins are foundational for every data analytics internship.',
        hint: 'Explain how unmatched rows in the right table behave in a LEFT JOIN.',
        expectedKeyPoints: ['Unmatched row retention', 'NULL handling in WHERE vs ON clause', 'Cardinality awareness'],
      },
      {
        topic: 'SQL Aggregations: WHERE vs HAVING',
        difficulty: 'Beginner' as const,
        question: 'How does filtering with WHERE differ from HAVING in a GROUP BY query, and in what order does SQL execute them?',
        whyAsked: 'Tests SQL query execution order and aggregation accuracy.',
        hint: 'WHERE filters raw rows before grouping; HAVING filters aggregated groups.',
        expectedKeyPoints: ['Pre-aggregation filtering', 'Post-aggregation filtering', 'Execution order (FROM -> WHERE -> GROUP BY -> HAVING -> SELECT)'],
      },
      {
        topic: 'SQL Window Functions',
        difficulty: 'Intermediate' as const,
        question: 'How do ROW_NUMBER(), RANK(), and DENSE_RANK() differ when ranking top internship applicants by assessment score within each department?',
        whyAsked: 'Assesses intermediate analytical SQL proficiency.',
        hint: 'Consider how ties are numbered and whether ranks are skipped.',
        expectedKeyPoints: ['PARTITION BY department', 'Tie handling in RANK vs DENSE_RANK', 'Unique numbering in ROW_NUMBER'],
      },
      {
        topic: 'Data Cleaning & Deduplication',
        difficulty: 'Beginner' as const,
        question: 'When importing a CSV dataset with inconsistent date formats, trailing spaces, and duplicate email rows, what systematic cleaning steps do you apply first?',
        whyAsked: 'Evaluates real-world data hygiene habits.',
        hint: 'Audit schema types, standardize formats, and define deterministic deduplication rules.',
        expectedKeyPoints: ['String trimming & normalization', 'ISO date parsing', 'Primary key deduplication rule'],
      },
      {
        topic: 'Spreadsheets & Lookup Logic',
        difficulty: 'Beginner' as const,
        question: 'In spreadsheet analysis, why is INDEX/MATCH or XLOOKUP preferred over VLOOKUP on large multi-column workbooks?',
        whyAsked: 'Tests practical spreadsheet modeling efficiency.',
        hint: 'Think about left-ward lookups and column insertion resilience.',
        expectedKeyPoints: ['Column index fragility in VLOOKUP', 'Bidirectional lookup', 'Performance on large ranges'],
      },
      {
        topic: 'Descriptive Statistics: Mean vs Median',
        difficulty: 'Beginner' as const,
        question: 'When reporting internship stipend distributions, why should you present both the median and interquartile range (IQR) alongside the mean?',
        whyAsked: 'Checks statistical literacy when summarizing skewed real-world metrics.',
        hint: 'High outliers skew the arithmetic mean upward.',
        expectedKeyPoints: ['Outlier robustness of median', 'Spread measurement via IQR', 'Skewed distribution interpretation'],
      },
      {
        topic: 'Exploratory Data Analysis (EDA)',
        difficulty: 'Intermediate' as const,
        question: 'Walk through the first 5 checks you run in Python (Pandas) or SQL when handed an unfamiliar dataset.',
        whyAsked: 'Tests structured analytical workflow.',
        hint: 'Check row/column counts, data types, missing value percentages, summary stats, and primary key uniqueness.',
        expectedKeyPoints: ['Schema & dtype inspection', 'Null value audit', 'Distribution & outlier check'],
      },
      {
        topic: 'Data Visualization Selection',
        difficulty: 'Beginner' as const,
        question: 'How do you choose between a line chart, bar chart, scatter plot, and box plot when presenting findings to non-technical stakeholders?',
        whyAsked: 'Evaluates visual communication clarity.',
        hint: 'Match temporal trends, categorical comparisons, bivariate correlations, and distributions to the right chart.',
        expectedKeyPoints: ['Time-series -> line chart', 'Category comparison -> bar chart', 'Correlation -> scatter plot', 'Distribution -> box/histogram'],
      },
      {
        topic: 'Cohort & Funnel Analysis',
        difficulty: 'Intermediate' as const,
        question: 'Suppose 1,000 students view an internship listing, 300 check eligibility, and 45 submit an application. How would you analyze where the biggest drop-off occurs and why?',
        whyAsked: 'Tests product & funnel analytics reasoning.',
        hint: 'Segment conversion rates by student year, department, or device type.',
        expectedKeyPoints: ['Stage-by-stage conversion rate', 'Segmentation by user attributes', 'Actionable hypothesis generation'],
      },
      {
        topic: 'Correlation vs Causation',
        difficulty: 'Intermediate' as const,
        question: 'Why does a strong positive correlation between two variables not prove causation, and what is a confounding variable?',
        whyAsked: 'Prevents flawed analytical conclusions.',
        hint: 'Give a simple example where a third hidden factor drives both metrics.',
        expectedKeyPoints: ['Confounding variables', 'Spurious correlation', 'Controlled comparison / A/B testing'],
      },
      {
        topic: 'Handling Missing & Anomalous Data',
        difficulty: 'Intermediate' as const,
        question: 'If 18% of records in a regional survey are missing income data, why could simply deleting those rows bias your final report?',
        whyAsked: 'Tests understanding of survivorship and non-response bias.',
        hint: 'Consider Missing Not At Random (MNAR) vs Missing Completely At Random (MCAR).',
        expectedKeyPoints: ['Non-response bias', 'MNAR vs MCAR', 'Documenting assumptions in the report'],
      },
      {
        topic: 'Python Pandas GroupBy & Pivot Tables',
        difficulty: 'Intermediate' as const,
        question: 'How do you transform a long event log table into a monthly summary matrix by category using Pandas pivot_table() or SQL CASE statements?',
        whyAsked: 'Tests data reshaping skills for dashboard reporting.',
        hint: 'Explain index, columns, values, aggfunc, and fill_value=0.',
        expectedKeyPoints: ['Long-to-wide reshaping', 'Aggregation function specification', 'Handling sparse NULL cells'],
      },
      {
        topic: 'Student Project Deep-Dive',
        difficulty: 'Practical Scenario' as const,
        question: `In ${projectTitle}, how did you structure, query, or validate the data, and what was the most useful insight or outcome?`,
        whyAsked: 'Verifies authentic project experience.',
        hint: 'Describe your data source, validation checks, and how users interacted with the output.',
        expectedKeyPoints: ['Data pipeline/schema clarity', 'Validation accuracy', 'Measurable utility'],
      },
      {
        topic: 'Dashboard KPI Design',
        difficulty: 'Practical Scenario' as const,
        question: `If designing an operational dashboard for ${orgContext}, how do you distinguish actionable KPIs from vanity metrics?`,
        whyAsked: 'Evaluates business and product metric judgment.',
        hint: 'Actionable metrics have clear denominators, timeframes, and decision thresholds.',
        expectedKeyPoints: ['Rates/ratios over raw totals', 'Timeframe context', 'Clear decision linkage'],
      },
      {
        topic: 'Reconciling Mismatched Numbers',
        difficulty: 'Practical Scenario' as const,
        question: 'Suppose your SQL query total differs from a stakeholder’s spreadsheet summary by 8%. How do you systematically trace and resolve the discrepancy?',
        whyAsked: 'Tests attention to detail and debugging under real analytical scenarios.',
        hint: 'Compare date filters, timezone boundaries, NULL exclusions, and duplicate join inflation.',
        expectedKeyPoints: ['Filter & date boundary check', 'Join fan-out inspection', 'Row-level diff sample'],
      },
    ];
    return raw.map((q, idx) => ({
      id: `q-data-${idx + 1}`,
      index: idx + 1,
      ...q,
      sampleStrongStructure: '1. Analytical concept -> 2. Concrete SQL/Python step -> 3. Edge case or data quality check.',
    }));
  }

  // Default / Full-Stack / Frontend / Backend / Python / Java (tailored to selected category & role)
  const skillHighlight = reqSkills.slice(0, 3).join(', ') || 'HTML, CSS, JavaScript, React, Node.js, and SQL';
  const raw = [
    {
      topic: 'Semantic HTML & Accessibility',
      difficulty: 'Beginner' as const,
      question: `Why is using semantic HTML elements (<button>, <nav>, <main>, <label>) critical for keyboard navigation and screen readers in web applications like ${orgContext}?`,
      whyAsked: 'Tests core web standards and accessibility fundamentals.',
      hint: 'Contrast native focus/keyboard handling of <button> against a generic <div>.',
      expectedKeyPoints: ['Accessibility tree roles', 'Built-in keyboard Enter/Space support', 'Form label association'],
    },
    {
      topic: 'CSS Layout: Flexbox vs CSS Grid',
      difficulty: 'Beginner' as const,
      question: 'When building a responsive dashboard layout for desktop and mobile viewports, how do you decide between Flexbox and CSS Grid?',
      whyAsked: 'Evaluates practical responsive layout engineering.',
      hint: 'Compare 1D content-driven alignment (Flexbox) with 2D row-and-column grid tracks (Grid).',
      expectedKeyPoints: ['1D vs 2D layout control', 'Responsive breakpoints', 'Preventing horizontal overflow'],
    },
    {
      topic: 'JavaScript Asynchronous Execution & Promises',
      difficulty: 'Beginner' as const,
      question: 'Explain how the JavaScript Event Loop handles async/await and Promise.all(), and how you properly catch network errors in a frontend data fetch.',
      whyAsked: 'Asynchronous data fetching is used in almost every web internship.',
      hint: 'Discuss microtask queue, try/catch blocks, and checking response.ok.',
      expectedKeyPoints: ['Call stack & microtask queue', 'try/catch error handling', 'HTTP status checking (response.ok)'],
    },
    {
      topic: 'Frontend Component State & Lifecycle',
      difficulty: 'Intermediate' as const,
      question: 'In React, what causes unnecessary component re-renders or stale state closures, and how do you structure state cleanly across parent and child components?',
      whyAsked: 'Checks practical frontend framework understanding.',
      hint: 'Think about immutable state updates, lifting state up, and derived values.',
      expectedKeyPoints: ['Immutable state updates', 'Single source of truth', 'Avoiding redundant state'],
    },
    {
      topic: 'REST API Design & HTTP Semantics',
      difficulty: 'Beginner' as const,
      question: 'When designing a RESTful API for internship applications, how do GET, POST, PUT/PATCH, and DELETE map to resources, and when should you return 400 vs 401 vs 403 vs 404?',
      whyAsked: 'Tests foundational client-server communication standards.',
      hint: 'Distinguish unauthenticated (401) from unauthorized/forbidden (403) and validation errors (400).',
      expectedKeyPoints: ['Idempotency of GET/PUT/DELETE', 'Status code semantics (400, 401, 403, 404)', 'Clean resource nouns'],
    },
    {
      topic: 'Backend Input Validation & Security',
      difficulty: 'Intermediate' as const,
      question: 'Why is client-side form validation alone insufficient for security, and how do you prevent SQL Injection and Cross-Site Scripting (XSS) on the backend?',
      whyAsked: 'Verifies secure coding awareness expected of full-stack interns.',
      hint: 'Anyone can bypass browser forms using curl/Postman; mention parameterized queries.',
      expectedKeyPoints: ['Server-side schema validation', 'Parameterized queries / prepared statements', 'Output encoding & sanitization'],
    },
    {
      topic: 'Relational Databases & Normalization',
      difficulty: 'Intermediate' as const,
      question: 'How would you design the database tables and foreign key relationships for Students, Internships, and Applications so that a student cannot submit duplicate applications?',
      whyAsked: 'Tests practical relational data modeling.',
      hint: 'Consider primary keys, foreign keys, and a composite UNIQUE(user_id, internship_id) constraint.',
      expectedKeyPoints: ['Foreign key referential integrity', 'Composite unique constraint', 'Indexing foreign keys'],
    },
    {
      topic: 'Authentication & Session Management',
      difficulty: 'Intermediate' as const,
      question: 'Walk through how user authentication works from login submission to protecting private API routes so one student cannot view another student’s records.',
      whyAsked: 'Tests understanding of authentication vs authorization (IDOR prevention).',
      hint: 'Discuss password hashing, session tokens/cookies, auth middleware, and ownership checks.',
      expectedKeyPoints: ['Password hashing (bcrypt/argon2)', 'Token/session verification middleware', 'Resource ownership authorization'],
    },
    {
      topic: 'Frontend-Backend Integration & CORS',
      difficulty: 'Intermediate' as const,
      question: 'What is Cross-Origin Resource Sharing (CORS), why does the browser block cross-origin requests by default, and how do you handle loading and error states during API calls?',
      whyAsked: 'Common real-world integration hurdle in full-stack development.',
      hint: 'Explain origin (protocol + host + port), preflight OPTIONS, and UI feedback states.',
      expectedKeyPoints: ['Same-Origin Policy', 'Access-Control-Allow-Origin headers', 'Loading, success, and error UI states'],
    },
    {
      topic: 'Git Version Control Workflow',
      difficulty: 'Beginner' as const,
      question: 'When collaborating on a team repository, how do feature branches, pull requests, and resolving merge conflicts work in Git?',
      whyAsked: 'Every engineering intern works with Git daily.',
      hint: 'Explain branching off main, atomic commits, pulling latest changes, and conflict markers.',
      expectedKeyPoints: ['Feature branch isolation', 'Descriptive commit messages', 'Inspecting conflict markers before committing'],
    },
    {
      topic: 'Debugging Full-Stack Issues',
      difficulty: 'Practical Scenario' as const,
      question: 'If clicking "Save Profile" on the frontend does not update the database, walk through how you use Browser DevTools Network tab and backend logs to isolate the bug.',
      whyAsked: 'Evaluates systematic debugging methodology.',
      hint: 'Trace the request payload, HTTP status code, route handler, and database query.',
      expectedKeyPoints: ['Inspecting Network payload & status', 'Checking console/server error logs', 'Verifying DB write and response'],
    },
    {
      topic: `Role-Specific Stack (${skillHighlight})`,
      difficulty: 'Intermediate' as const,
      question: `How do the core technologies required for ${orgContext} (${skillHighlight}) work together in a modular application architecture?`,
      whyAsked: 'Directly tests alignment with the selected internship’s technical stack.',
      hint: 'Describe the data flow from user interaction to business logic and persistent storage.',
      expectedKeyPoints: ['Separation of concerns', 'Type safety / data contracts', 'Clean error propagation'],
    },
    {
      topic: 'Student Project Architecture Deep-Dive',
      difficulty: 'Practical Scenario' as const,
      question: `In your project "${projectTitle}" (built with ${projectTech}), what was the hardest technical bug or design trade-off you encountered, and how did you solve it?`,
      whyAsked: 'Assesses authentic depth in the student’s own portfolio project.',
      hint: 'Explain the root cause of the issue, the alternatives you considered, and how you verified the fix.',
      expectedKeyPoints: ['Clear architecture overview', 'Root-cause diagnosis', 'Verification of the fix'],
    },
    {
      topic: 'Automated Unit Testing',
      difficulty: 'Intermediate' as const,
      question: 'Why is decoupling pure business logic (such as eligibility calculation or form validation) from UI components helpful for writing fast, reliable unit tests?',
      whyAsked: 'Tests software engineering craftsmanship and testability mindset.',
      hint: 'Pure functions take deterministic inputs and return outputs without needing a DOM or network.',
      expectedKeyPoints: ['Deterministic input/output', 'Fast execution without DOM overhead', 'Edge-case coverage'],
    },
    {
      topic: 'Performance & Edge-Case Handling',
      difficulty: 'Practical Scenario' as const,
      question: 'How do you prevent duplicate form submissions when a user double-clicks a "Submit Application" button on a slow mobile connection?',
      whyAsked: 'Tests practical UX resilience and backend idempotency.',
      hint: 'Combine disabling the button while pending on the frontend with duplicate checks on the backend.',
      expectedKeyPoints: ['In-flight loading state / disabled button', 'Idempotency / unique constraint on server', 'Clear user feedback'],
    },
  ];

  return raw.map((q, idx) => ({
    id: `q-fs-${idx + 1}`,
    index: idx + 1,
    ...q,
    sampleStrongStructure: '1. Direct answer -> 2. How it works under the hood -> 3. Example from your own code.',
  }));
}

export function evaluateSingleAnswer(
  question: InterviewQuestion,
  answerText: string
): InterviewAnswer {
  const clean = answerText.trim();
  const lower = clean.toLowerCase();
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length < 5) {
    return {
      questionId: question.id,
      answerText: clean,
      submittedAt: new Date().toISOString(),
      score: 1,
      feedback:
        'Your answer is too brief to demonstrate technical understanding. Aim for 3–5 clear sentences covering the core concept, mechanism, and a practical example.',
      matchedPoints: [],
      missedPoints: question.expectedKeyPoints,
    };
  }

  const matchedPoints: string[] = [];
  const missedPoints: string[] = [];

  for (const pt of question.expectedKeyPoints) {
    const tokens = pt
      .toLowerCase()
      .split(/[\s/()-]+/)
      .filter((t) => t.length > 3);
    const hit = tokens.some((t) => lower.includes(t));
    if (hit) {
      matchedPoints.push(pt);
    } else {
      missedPoints.push(pt);
    }
  }

  const lengthScore = Math.min(4, Math.floor(words.length / 12));
  const keyPointScore = Math.round(
    (matchedPoints.length / Math.max(1, question.expectedKeyPoints.length)) * 6
  );
  const score = Math.max(2, Math.min(10, lengthScore + keyPointScore));

  const feedback =
    score >= 8
      ? `Strong, well-structured explanation covering ${matchedPoints.join(', ')}.`
      : score >= 5
      ? `Good foundational answer. To make it stronger in an interview, explicitly mention: ${missedPoints.join(', ')}.`
      : `Covers initial thoughts, but misses key technical points (${missedPoints.join(', ')}). Review the sample structure and try expanding with a concrete example.`;

  return {
    questionId: question.id,
    answerText: clean,
    submittedAt: new Date().toISOString(),
    score,
    feedback,
    matchedPoints,
    missedPoints,
  };
}

export function computeSessionConfidenceScore(
  questions: InterviewQuestion[],
  answers: Record<string, InterviewAnswer>
): number {
  const totalQuestions = Math.max(1, questions.length);
  const answeredList = questions
    .map((q) => ({ question: q, answer: answers[q.id] }))
    .filter((item) => item.answer && item.answer.answerText.trim().length > 0);

  if (answeredList.length === 0) {
    return 0;
  }

  // 1. Completion Consistency (up to 30 pts)
  const completionRatio = answeredList.length / totalQuestions;
  const completionPoints = completionRatio * 30;

  // 2. Technical Key-Point Coverage across answered questions (up to 40 pts)
  let totalExpectedPts = 0;
  let totalMatchedPts = 0;
  for (const item of answeredList) {
    const expLen = Math.max(1, item.question.expectedKeyPoints.length);
    totalExpectedPts += expLen;
    totalMatchedPts += Math.min(expLen, item.answer.matchedPoints.length);
  }
  const keyPointRatio = totalExpectedPts > 0 ? totalMatchedPts / totalExpectedPts : 0;
  const keyPointPoints = keyPointRatio * (0.35 + 0.65 * completionRatio) * 40;

  // 3. Explanation Depth & Scenario Mastery (up to 30 pts)
  const avgAnswerScore =
    answeredList.reduce((sum, item) => sum + item.answer.score, 0) / answeredList.length;
  const scenarioItems = answeredList.filter(
    (item) =>
      item.question.difficulty === 'Practical Scenario' ||
      item.question.difficulty === 'Intermediate'
  );
  const scenarioAvg =
    scenarioItems.length > 0
      ? scenarioItems.reduce((sum, item) => sum + item.answer.score, 0) / scenarioItems.length
      : avgAnswerScore;

  const depthPoints = ((avgAnswerScore * 0.6 + scenarioAvg * 0.4) / 10) * (0.4 + 0.6 * completionRatio) * 30;

  return Math.max(5, Math.min(100, Math.round(completionPoints + keyPointPoints + depthPoints)));
}

export function buildFinalInterviewReport(
  questions: InterviewQuestion[],
  answers: Record<string, InterviewAnswer>
): NonNullable<import('../types.ts').MockInterviewSession['finalReport']> {
  const answeredList = questions
    .map((q) => ({ question: q, answer: answers[q.id] }))
    .filter((item) => item.answer && item.answer.answerText.trim().length > 0);

  const questionsAnswered = answeredList.length;
  const totalQuestions = questions.length; // 15

  // Unanswered questions receive 0 points! Never score unanswered questions as correct.
  const totalPointsEarned = answeredList.reduce((sum, item) => sum + item.answer.score, 0);
  const maxPossiblePoints = Math.max(1, totalQuestions * 10); // 150
  const overallScore = Math.round((totalPointsEarned / maxPossiblePoints) * 100);
  const confidenceScore = computeSessionConfidenceScore(questions, answers);

  const strengths: string[] = [];
  const areasToImprove: string[] = [];
  const technicalKnowledgeGaps: string[] = [];
  const topicsToRevise: string[] = [];

  for (const item of answeredList) {
    if (item.answer.score >= 7) {
      strengths.push(`${item.question.topic}: Clear technical explanation (${item.answer.score}/10).`);
    } else {
      areasToImprove.push(`${item.question.topic}: Expand on ${item.answer.missedPoints.slice(0, 2).join(', ')}.`);
      topicsToRevise.push(item.question.topic);
    }
  }

  const unansweredTopics = questions
    .filter((q) => !answers[q.id] || !answers[q.id].answerText.trim())
    .map((q) => q.topic);

  if (unansweredTopics.length > 0) {
    technicalKnowledgeGaps.push(
      `${unansweredTopics.length} question(s) were left unanswered (${unansweredTopics.slice(0, 4).join(', ')}). Unanswered questions are scored 0/10.`
    );
    topicsToRevise.push(...unansweredTopics.slice(0, 4));
  }

  if (strengths.length === 0) {
    strengths.push('Started the role-specific session; complete more detailed answers to benchmark your strengths.');
  }
  if (areasToImprove.length === 0 && unansweredTopics.length === 0) {
    areasToImprove.push('Continue practicing concise architectural trade-offs and edge-case analysis.');
  }

  return {
    questionsAnswered,
    totalQuestions,
    overallScore,
    confidenceScore,
    rubricExplanation:
      'Documented Rubric: Each of the 15 role-specific questions is scored out of 10 (up to 4 pts for explanation depth & structure + up to 6 pts for covering expected technical key points). Unanswered questions receive 0/10.',
    strengths: strengths.slice(0, 5),
    areasToImprove: areasToImprove.slice(0, 5),
    technicalKnowledgeGaps:
      technicalKnowledgeGaps.length > 0
        ? technicalKnowledgeGaps
        : ['Review missed key points in intermediate scenario questions.'],
    communicationFeedback:
      questionsAnswered > 0
        ? 'Structure each answer with: (1) Direct definition, (2) Underlying technical mechanism, and (3) A real example from your student projects.'
        : 'Submit written responses to receive communication structure feedback.',
    topicsToRevise: Array.from(new Set(topicsToRevise)).slice(0, 6),
    recommendedExercises: [
      'Complete the Stage 2 Practice tasks in Skill Development for your revise topics.',
      'Re-answer any question where you scored below 7/10 using the Sample Strong Structure.',
    ],
    nextSessionSuggestion:
      questionsAnswered < 15
        ? `Complete all 15 questions in your next session (you answered ${questionsAnswered} of 15).`
        : 'Try Mock Interview Mode for a different verified internship listing to broaden your readiness.',
  };
}

export function buildInterviewProgressSeries(
  sessions: MockInterviewSession[],
  categoryFilter = 'All'
): InterviewProgressSummary {
  const filtered = (sessions || []).filter((s) =>
    !categoryFilter || categoryFilter === 'All' ? true : s.category === categoryFilter
  );

  // Sort chronologically from earliest session to most recent consecutive session
  const sorted = [...filtered].sort((a, b) => {
    const tA = new Date(a.createdAt).getTime();
    const tB = new Date(b.createdAt).getTime();
    if (tA !== tB) return tA - tB;
    return a.id.localeCompare(b.id);
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const points: InterviewProgressPoint[] = sorted.map((sess, idx) => {
    const totalQuestions = Math.max(1, sess.questions?.length || 15);
    const answeredEntries = Object.values(sess.answers || {}).filter(
      (a) => a && a.answerText && a.answerText.trim().length > 0
    );
    const questionsAnswered = sess.finalReport?.questionsAnswered ?? answeredEntries.length;

    const computedLiveProgress = Math.round(
      (answeredEntries.reduce((sum, a) => sum + (a.score || 0), 0) / (totalQuestions * 10)) * 100
    );
    const progressScore = sess.finalReport?.overallScore ?? computedLiveProgress;

    const confidenceScore =
      sess.finalReport?.confidenceScore ??
      computeSessionConfidenceScore(sess.questions || [], sess.answers || {});

    const dt = new Date(sess.createdAt);
    const dateLabel = !Number.isNaN(dt.getTime())
      ? `${monthNames[dt.getUTCMonth()]} ${String(dt.getUTCDate()).padStart(2, '0')}`
      : sess.createdAt.slice(5, 10);

    const topStrength =
      sess.finalReport?.strengths?.[0] ||
      (answeredEntries.length > 0
        ? `Answered ${questionsAnswered}/${totalQuestions} technical questions`
        : 'Session initialized — submit answers to record strengths');

    const keyFocusArea =
      sess.finalReport?.topicsToRevise?.[0] ||
      sess.finalReport?.areasToImprove?.[0] ||
      'Complete remaining scenario questions';

    return {
      sessionId: sess.id,
      sessionIndex: idx + 1,
      sessionLabel: `S${idx + 1}`,
      createdAt: sess.createdAt,
      dateLabel,
      category: sess.category,
      targetRole: sess.targetRole,
      targetInternshipTitle: sess.targetInternshipTitle,
      mode: sess.mode,
      questionsAnswered,
      totalQuestions,
      progressScore,
      confidenceScore,
      progressDelta: 0,
      confidenceDelta: 0,
      isCompleted: Boolean(sess.completedAt || sess.finalReport),
      topStrength,
      keyFocusArea,
    };
  });

  // Compute session-over-session deltas
  for (let i = 1; i < points.length; i++) {
    points[i].progressDelta = points[i].progressScore - points[i - 1].progressScore;
    points[i].confidenceDelta = points[i].confidenceScore - points[i - 1].confidenceScore;
  }

  if (points.length === 0) {
    return {
      points: [],
      totalSessions: 0,
      latestProgressScore: 0,
      latestConfidenceScore: 0,
      progressImprovement: 0,
      confidenceImprovement: 0,
      averageProgressScore: 0,
      averageConfidenceScore: 0,
      peakConfidenceScore: 0,
      consecutiveImprovementStreak: 0,
    };
  }

  const first = points[0];
  const latest = points[points.length - 1];
  const progressImprovement = latest.progressScore - first.progressScore;
  const confidenceImprovement = latest.confidenceScore - first.confidenceScore;

  const averageProgressScore = Math.round(
    points.reduce((sum, p) => sum + p.progressScore, 0) / points.length
  );
  const averageConfidenceScore = Math.round(
    points.reduce((sum, p) => sum + p.confidenceScore, 0) / points.length
  );
  const peakConfidenceScore = Math.max(...points.map((p) => p.confidenceScore));

  let streak = 0;
  for (let i = points.length - 1; i >= 1; i--) {
    if (points[i].confidenceScore >= points[i - 1].confidenceScore) {
      streak++;
    } else {
      break;
    }
  }

  return {
    points,
    totalSessions: points.length,
    latestProgressScore: latest.progressScore,
    latestConfidenceScore: latest.confidenceScore,
    progressImprovement,
    confidenceImprovement,
    averageProgressScore,
    averageConfidenceScore,
    peakConfidenceScore,
    consecutiveImprovementStreak: streak,
  };
}

export function generatePersonalizedAiRecommendations(
  internships: InternshipListing[],
  profile: StudentProfile,
  referenceDateStr = '2026-10-20'
): AiInternshipRecommendation[] {
  const resumeTextLower = (profile.uploadedResumeText || '').toLowerCase();
  const hasResume = resumeTextLower.trim().length > 25;
  const studentSkills = getStudentSkillSet(profile);
  const targetRolesLower = (profile.targetRoles || []).map((r) => r.toLowerCase());
  const careerInterestsLower = (profile.careerInterests || []).map((c) => c.toLowerCase());
  const careerGoalLower = (profile.careerGoal || '').toLowerCase();
  const preferredLocsLower = [
    ...(profile.preferredLocations || []),
    ...(profile.location ? [profile.location] : []),
  ]
    .map((l) => l.toLowerCase().trim())
    .filter(Boolean);

  const seenIds = new Set<string>();
  const candidates: {
    rec: AiInternshipRecommendation;
    isEligible: boolean;
    hasHardRestriction: boolean;
  }[] = [];

  for (const internship of internships) {
    if (!internship?.id || seenIds.has(internship.id)) continue;
    seenIds.add(internship.id);

    const report = evaluateInternshipEligibility(
      internship,
      profile,
      internships,
      referenceDateStr
    );

    if (report.status === 'Closed / Expired') {
      continue;
    }

    const hasHardRestriction = report.unchangeableRequirementsNotMet.length > 0;
    // Skip listings with unchangeable academic cohort/enrollment restrictions so AI recommendations remain genuinely actionable for this student
    if (hasHardRestriction) {
      continue;
    }

    const allListingSkills = [
      ...internship.mandatoryRequirements.mandatorySkills,
      ...internship.preferredSkills,
    ];

    // 1. Resume & Demonstrated Skills Signal (up to 25 pts)
    const matchedProfileSkills = allListingSkills.filter(
      (sk) =>
        studentSkills.has(normalizeSkill(sk)) || studentSkills.has(sk.trim().toLowerCase())
    );
    const matchedResumeSkills = hasResume
      ? allListingSkills.filter((sk) => resumeTextLower.includes(sk.toLowerCase()))
      : [];
    const combinedMatchedSkills = Array.from(
      new Set([...matchedProfileSkills, ...matchedResumeSkills])
    );

    const skillCoverageRatio =
      allListingSkills.length > 0
        ? combinedMatchedSkills.length / allListingSkills.length
        : 0.75;
    const resumeAndSkillPts = Math.min(
      25,
      Math.round(skillCoverageRatio * 20) + (matchedResumeSkills.length > 0 ? 5 : 2)
    );

    // 2. Career Goal, Target Roles & Domain Competency Fit (up to 25 pts)
    const roleCatLower = internship.roleCategory.toLowerCase();
    const titleLower = internship.title.toLowerCase();
    const descLower = `${internship.description} ${internship.responsibilities.join(' ')}`.toLowerCase();

    const matchesTargetRole = targetRolesLower.some(
      (tr) =>
        titleLower.includes(tr.replace(' intern', '').trim()) ||
        tr.includes(roleCatLower.split(' ')[0]) ||
        roleCatLower.includes(tr.split(' ')[0])
    );
    const matchesInterest = careerInterestsLower.some(
      (ci) =>
        roleCatLower.includes(ci.split(' ')[0]) ||
        ci.includes(roleCatLower.split(' ')[0]) ||
        descLower.includes(ci)
    );
    const matchesDomainComp = (profile.domainCompetencies || []).some(
      (dc) =>
        roleCatLower.includes(dc.domain.toLowerCase().split(' ')[0]) ||
        dc.domain.toLowerCase().includes(roleCatLower.split(' ')[0])
    );
    const matchesCareerGoalKeywords =
      careerGoalLower.length > 10 &&
      allListingSkills.some((sk) => careerGoalLower.includes(sk.toLowerCase()));

    let careerGoalPts = 8;
    if (matchesTargetRole) careerGoalPts += 9;
    if (matchesInterest) careerGoalPts += 4;
    if (matchesDomainComp) careerGoalPts += 4;
    if (matchesCareerGoalKeywords) careerGoalPts += 3;
    careerGoalPts = Math.min(25, careerGoalPts);

    // 3. Projects & Certifications Relevance (up to 20 pts)
    const matchingProjects = (profile.projects || []).filter((proj) => {
      const projTechs = [...(proj.technologies || []), ...(proj.skillsDemonstrated || [])];
      return projTechs.some((pt) =>
        allListingSkills.some((ls) => normalizeSkill(ls) === normalizeSkill(pt))
      );
    });
    const matchingCerts = (profile.certifications || []).filter((cert) =>
      (cert.skillsCovered || []).some((cs) =>
        allListingSkills.some((ls) => normalizeSkill(ls) === normalizeSkill(cs))
      )
    );
    const projectAndCertPts = Math.min(
      20,
      (matchingProjects.length > 0 ? 13 : 4) + (matchingCerts.length > 0 ? 7 : 2)
    );

    // 4. Location, Work Mode & Paid/Unpaid Preference Fit (up to 15 pts)
    let prefPts = 0;
    const workModeAligned =
      !profile.preferredWorkMode ||
      profile.preferredWorkMode === 'Any' ||
      profile.preferredWorkMode === internship.workMode ||
      (profile.preferredWorkMode === 'Online' && internship.workMode === 'Hybrid');
    if (workModeAligned) prefPts += 6;
    else prefPts += 2;

    const locationAligned =
      internship.workMode === 'Online' ||
      preferredLocsLower.some(
        (loc) =>
          internship.location.toLowerCase().includes(loc.split(',')[0].trim()) ||
          loc.includes(internship.location.toLowerCase().split('/')[0].trim())
      );
    if (locationAligned) prefPts += 5;
    else prefPts += 2;

    const paidAligned =
      !profile.paidPreference ||
      profile.paidPreference === 'Paid or Unpaid' ||
      (profile.paidPreference === 'Paid Only' && internship.isPaid) ||
      (profile.paidPreference === 'Unpaid Acceptable' && !internship.isPaid);
    if (paidAligned) prefPts += 4;
    else prefPts += 1;
    prefPts = Math.min(15, prefPts);

    // 5. Academic Cohort & Eligibility Readiness (up to 15 pts)
    const cohortAndDeadlinePts =
      report.status === 'Eligible'
        ? 15
        : report.changeableSkillGaps.length <= 2
        ? 11
        : 8;

    const aiMatchScore = Math.min(
      99,
      Math.max(
        58,
        resumeAndSkillPts + careerGoalPts + projectAndCertPts + prefPts + cohortAndDeadlinePts
      )
    );

    const resumeAndSkillSignals: string[] = [];
    if (combinedMatchedSkills.length > 0) {
      resumeAndSkillSignals.push(
        `Matched Skills: ${combinedMatchedSkills.slice(0, 5).join(', ')}`
      );
    }
    if (hasResume && matchedResumeSkills.length > 0) {
      resumeAndSkillSignals.push(
        `Resume Evidence (${profile.uploadedResumeName || 'Uploaded Resume'}): ${matchedResumeSkills
          .slice(0, 4)
          .join(', ')}`
      );
    }
    if (profile.degree && profile.department) {
      resumeAndSkillSignals.push(
        `Academic Fit: ${profile.degree} in ${profile.department} (Class of ${
          profile.graduationYear || 'TBD'
        })`
      );
    }

    const projectAndCertConnections: string[] = [];
    for (const proj of matchingProjects.slice(0, 2)) {
      projectAndCertConnections.push(
        `Project "${proj.title}" demonstrates ${proj.technologies.slice(0, 3).join(', ')}`
      );
    }
    for (const cert of matchingCerts.slice(0, 2)) {
      projectAndCertConnections.push(
        `Certification "${cert.title}" (${cert.issuer})`
      );
    }
    if (projectAndCertConnections.length === 0 && (profile.projects || []).length > 0) {
      projectAndCertConnections.push(
        `Portfolio project "${profile.projects[0].title}" provides transferable engineering evidence`
      );
    }

    const prefSummaryParts: string[] = [];
    if (matchesTargetRole || matchesInterest) {
      prefSummaryParts.push(
        `Aligns with your target role & interest in ${internship.roleCategory}`
      );
    }
    prefSummaryParts.push(
      `${internship.workMode} mode in ${internship.location} (${
        workModeAligned ? 'matches your work-mode preference' : 'alternative work mode'
      })`
    );
    prefSummaryParts.push(
      `${internship.isPaid ? `Paid (${internship.stipend})` : 'Unpaid / Academic Credit'} (${
        paidAligned ? 'fits your stipend preference' : 'note stipend structure'
      })`
    );
    const careerAndPreferenceFit = prefSummaryParts.join(' · ');

    const isEligible = report.status === 'Eligible';
    const recommendationCategory: AiInternshipRecommendation['recommendationCategory'] = isEligible
      ? 'Best Immediate Fit (Eligible Now)'
      : 'Career Goal & Project Match (Skill-Bridge Opportunity)';

    const personalizedReason = isEligible
      ? `Recommended for ${profile.fullName} because your ${
          hasResume ? `uploaded resume (${profile.uploadedResumeName || 'Resume'}) and ` : ''
        }verified competencies in ${
          combinedMatchedSkills.slice(0, 4).join(', ') || internship.roleCategory
        }${
          matchingProjects[0] ? ` — backed by your "${matchingProjects[0].title}" project —` : ''
        } directly align with ${internship.organization}'s ${internship.title} responsibilities and your ${
          (profile.targetRoles || [])[0] || internship.roleCategory
        } career goal.`
      : `Selected by AI as a high-value ${internship.roleCategory} growth opportunity for your ${
          (profile.targetRoles || [])[0] || 'career'
        } trajectory: you already meet ${internship.organization}'s academic cohort criteria (${
          profile.degree || 'Degree'
        }, Class of ${profile.graduationYear || 'TBD'})${
          combinedMatchedSkills.length > 0
            ? ` and demonstrate ${combinedMatchedSkills.slice(0, 3).join(', ')}`
            : ''
        }, needing only ${
          report.changeableSkillGaps.join(', ') || 'profile skill verification'
        } to unlock full eligibility before ${internship.deadline}.`;

    const skillGapOrNextAction = isEligible
      ? `You meet all mandatory eligibility rules. Apply before ${internship.deadline}${
          report.preferredMissing.length > 0
            ? ` and optionally highlight or brush up on preferred skills (${report.preferredMissing
                .slice(0, 2)
                .join(', ')})`
            : ''
        }.`
      : report.changeableSkillGaps.length > 0
      ? `Bridge learnable skill gap (${report.changeableSkillGaps.join(
          ', '
        )}) in Skill Development to convert this AI career match into Eligible status before ${
          internship.deadline
        }.`
      : `Update your missing profile fields in My Profile to verify full eligibility before ${internship.deadline}.`;

    const crossSectionExplanation = isEligible
      ? 'Appears in "Internships You\'re Eligible For" because you satisfy 100% of mandatory rules, and ALSO in "AI Recommended Internships" because your resume, projects, career goal, and work-mode/stipend preferences score high on holistic career fit.'
      : 'Appears in "Internships You\'re Not Eligible For Yet" due to a learnable skill gap, AND in "AI Recommended Internships" because its domain, projects, and career trajectory strongly match your long-term goals.';

    candidates.push({
      isEligible,
      hasHardRestriction,
      rec: {
        internshipId: internship.id,
        aiMatchScore,
        recommendationCategory,
        eligibilityStatus: report.status,
        personalizedReason,
        resumeAndSkillSignals,
        projectAndCertConnections,
        careerAndPreferenceFit,
        skillGapOrNextAction,
        crossSectionExplanation,
        generatedBy: 'profile-ai-engine',
        generatedAt: referenceDateStr,
      },
    });
  }

  // Sort by aiMatchScore descending
  candidates.sort((a, b) => b.rec.aiMatchScore - a.rec.aiMatchScore);

  // Ensure a balanced, personalized mix: include top Eligible matches AND top Growth/Skill-Bridge matches
  // so AI Recommended is never an identical copy of the Eligible section!
  const eligibleMatches = candidates.filter((c) => c.isEligible);
  const growthMatches = candidates.filter((c) => !c.isEligible);

  const selected: AiInternshipRecommendation[] = [];
  const selectedIds = new Set<string>();

  for (const item of eligibleMatches.slice(0, 2)) {
    selected.push(item.rec);
    selectedIds.add(item.rec.internshipId);
  }
  for (const item of growthMatches.slice(0, 2)) {
    if (!selectedIds.has(item.rec.internshipId)) {
      selected.push(item.rec);
      selectedIds.add(item.rec.internshipId);
    }
  }
  for (const item of eligibleMatches.slice(2, 4)) {
    if (!selectedIds.has(item.rec.internshipId)) {
      selected.push(item.rec);
      selectedIds.add(item.rec.internshipId);
    }
  }
  for (const item of candidates) {
    if (selected.length >= 6) break;
    if (!selectedIds.has(item.rec.internshipId)) {
      selected.push(item.rec);
      selectedIds.add(item.rec.internshipId);
    }
  }

  return selected;
}

export function createDefaultInterviewSessions(
  profile: StudentProfile,
  internships: InternshipListing[]
): MockInterviewSession[] {
  const zohoListing = internships.find((i) => i.id === 'int-fs-zoho') || internships[0];
  const freshworksListing = internships.find((i) => i.id === 'int-fe-freshworks') || internships[1] || internships[0];
  const meityListing = internships.find((i) => i.id === 'gov-meity-digital-india') || internships[2] || internships[0];

  const buildSession = (opts: {
    id: string;
    category: string;
    targetRole: string;
    listing?: InternshipListing;
    mode: 'Practice Mode' | 'Mock Interview Mode';
    createdAt: string;
    answeredCount: number;
    targetScorePerAnswer: number;
    keyPointsToMatchPerQuestion: number;
  }): MockInterviewSession => {
    const questions = generateRoleSpecific15Questions(
      opts.category,
      opts.targetRole,
      opts.listing,
      profile,
      'Intermediate (3rd/4th Year)'
    );

    const answers: Record<string, InterviewAnswer> = {};
    for (let i = 0; i < Math.min(opts.answeredCount, questions.length); i++) {
      const q = questions[i];
      const matched = q.expectedKeyPoints.slice(0, opts.keyPointsToMatchPerQuestion);
      const missed = q.expectedKeyPoints.slice(opts.keyPointsToMatchPerQuestion);
      const answerWords =
        opts.targetScorePerAnswer >= 8
          ? `In ${q.topic}, our architecture ensures ${matched.join(', ')} through clean modular boundaries, strict input validation, and automated verification in our Campus Placement & Internship Tracker project.`
          : opts.targetScorePerAnswer >= 7
          ? `For ${q.topic}, I apply ${matched.join(' and ')} to maintain reliable data flow and handle edge cases cleanly during student project implementation.`
          : `Basic overview of ${q.topic} covering ${matched[0] || 'core concept'} in web development.`;

      answers[q.id] = {
        questionId: q.id,
        answerText: answerWords,
        submittedAt: opts.createdAt,
        score: opts.targetScorePerAnswer,
        feedback:
          opts.targetScorePerAnswer >= 8
            ? `Strong, well-structured explanation covering ${matched.join(', ')}.`
            : `Good foundational answer. To make it stronger, also cover: ${missed.join(', ') || 'edge-case trade-offs'}.`,
        matchedPoints: matched,
        missedPoints: missed,
      };
    }

    const finalReport = buildFinalInterviewReport(questions, answers);

    return {
      id: opts.id,
      userId: profile.userId,
      category: opts.category,
      targetRole: opts.targetRole,
      targetInternshipId: opts.listing?.id,
      targetInternshipTitle: opts.listing
        ? `${opts.listing.title} (${opts.listing.organization})`
        : undefined,
      experienceLevel: 'Intermediate (3rd/4th Year)',
      mode: opts.mode,
      createdAt: opts.createdAt,
      completedAt: opts.createdAt,
      questions,
      answers,
      finalReport,
    };
  };

  // Return in reverse-chronological order for the session list (buildInterviewProgressSeries sorts chronologically S1..S5)
  return [
    buildSession({
      id: 'iv-seed-5',
      category: 'Full-Stack Development',
      targetRole: 'Full-Stack Web Engineering Intern',
      listing: zohoListing,
      mode: 'Mock Interview Mode',
      createdAt: '2026-10-19T16:30:00Z',
      answeredCount: 15,
      targetScorePerAnswer: 9,
      keyPointsToMatchPerQuestion: 3,
    }),
    buildSession({
      id: 'iv-seed-4',
      category: 'Frontend Development',
      targetRole: 'Frontend & React Product Intern',
      listing: freshworksListing,
      mode: 'Mock Interview Mode',
      createdAt: '2026-10-15T15:00:00Z',
      answeredCount: 14,
      targetScorePerAnswer: 8,
      keyPointsToMatchPerQuestion: 3,
    }),
    buildSession({
      id: 'iv-seed-3',
      category: 'Backend Development',
      targetRole: 'Backend & API Engineering Intern',
      listing: meityListing,
      mode: 'Practice Mode',
      createdAt: '2026-10-11T14:20:00Z',
      answeredCount: 13,
      targetScorePerAnswer: 8,
      keyPointsToMatchPerQuestion: 2,
    }),
    buildSession({
      id: 'iv-seed-2',
      category: 'Full-Stack Development',
      targetRole: 'Full-Stack Development Intern',
      listing: zohoListing,
      mode: 'Practice Mode',
      createdAt: '2026-10-07T11:45:00Z',
      answeredCount: 11,
      targetScorePerAnswer: 7,
      keyPointsToMatchPerQuestion: 2,
    }),
    buildSession({
      id: 'iv-seed-1',
      category: 'Full-Stack Development',
      targetRole: 'Full-Stack Development Intern',
      mode: 'Practice Mode',
      createdAt: '2026-10-03T10:15:00Z',
      answeredCount: 9,
      targetScorePerAnswer: 6,
      keyPointsToMatchPerQuestion: 1,
    }),
  ];
}



