import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProfileCompletion,
  evaluateInternshipEligibility,
  computeCurrentRelevantSkills,
  analyzeResumeContent,
  buildRejectionAnalysis,
  generateRoleSpecific15Questions,
  buildFinalInterviewReport,
  computeSessionConfidenceScore,
  buildInterviewProgressSeries,
  createDefaultInterviewSessions,
  generatePersonalizedAiRecommendations,
  UNCONFIRMED_REJECTION_DISCLAIMER,
} from './logic.ts';
import type { StudentProfile, InternshipListing, ApplicationRecord } from '../types.ts';

const sampleStudent: StudentProfile = {
  userId: 'stu-1',
  fullName: 'Aaravishnan K',
  email: 'aarav@student.edu',
  role: 'student',
  college: 'Anna University, Chennai',
  degree: 'B.Tech',
  department: 'Computer Science and Engineering',
  currentYear: 3,
  currentSemester: 5,
  graduationYear: 2027,
  relevantCoursework: ['Data Structures', 'Database Management', 'Web Development'],
  academicAchievements: ['Merit Scholarship 2025'],
  location: 'Chennai, Tamil Nadu',
  careerGoal: 'Become a Full-Stack Software Engineer building scalable web applications.',
  careerInterests: ['Full-Stack Development', 'AI and Machine Learning'],
  targetRoles: ['Full-Stack Development Intern', 'Frontend Development Intern'],
  skillsLearningNow: ['Docker', 'PostgreSQL'],
  preferredWorkMode: 'Any',
  preferredLocations: ['Chennai', 'Bengaluru', 'Remote'],
  paidPreference: 'Paid or Unpaid',
  preferredDuration: '2-3 Months',
  availability: 'Immediate',
  technicalCompetencies: [
    {
      id: 'tc-1',
      name: 'JavaScript',
      category: 'Programming Languages',
      selfReportedLevel: 'Intermediate',
      verificationType: 'Project Evidence',
      evidenceTitle: 'Campus Event Portal',
      lastUpdated: '2026-10-01',
    },
    {
      id: 'tc-2',
      name: 'React',
      category: 'Frameworks and Libraries',
      selfReportedLevel: 'Intermediate',
      verificationType: 'Project Evidence',
      evidenceTitle: 'Campus Event Portal',
      lastUpdated: '2026-10-01',
    },
    {
      id: 'tc-3',
      name: 'SQL',
      category: 'Databases',
      selfReportedLevel: 'Beginner',
      verificationType: 'Course / Certification',
      evidenceTitle: 'Database Systems Course',
      lastUpdated: '2026-09-20',
    },
  ],
  domainCompetencies: [
    {
      id: 'dc-1',
      domain: 'Full-Stack Development',
      learningLevel: 'Project-Tested',
      relevantProjects: ['Campus Event Portal'],
      interestNote: 'Building REST APIs and responsive React frontends.',
      lastUpdated: '2026-10-01',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      title: 'Campus Event Portal',
      description: 'Full-stack portal for college club registrations and attendance.',
      problemSolved: 'Replaced manual spreadsheet event signups for 600+ students.',
      technologies: ['React', 'JavaScript', 'Node.js', 'Git'],
      studentContribution: 'Built the React registration UI and Express REST endpoints.',
      skillsDemonstrated: ['React', 'JavaScript', 'Node.js', 'Git'],
      status: 'Completed',
      repoUrl: 'https://github.com/aarav/campus-events',
    },
  ],
  certifications: [],
  uploadedResumeName: 'Aarav_Resume_2026.pdf',
  uploadedResumeText:
    'Aaravishnan K | B.Tech Computer Science and Engineering, Anna University (2027). Skills: JavaScript, React, Git. Project: Campus Event Portal built with React and JavaScript (https://github.com/aarav/campus-events).',
  onboardingCompleted: true,
};

const sampleEligibleInternship: InternshipListing = {
  id: 'int-1',
  title: 'Frontend & Full-Stack Web Intern',
  organization: 'Zoho Corporation (Verified Campus Feed)',
  organizationType: 'Private',
  roleCategory: 'Full-Stack Development',
  description: 'Build modular web interfaces and REST integrations.',
  responsibilities: ['Develop React components', 'Write unit tests'],
  workMode: 'Hybrid',
  location: 'Chennai',
  isPaid: true,
  stipend: '₹20,000 / month',
  stipendAmountMonthly: 20000,
  duration: '3 Months',
  openingDate: '2026-10-01',
  deadline: '2026-11-30',
  mandatoryRequirements: {
    allowedDegrees: ['B.E.', 'B.Tech', 'B.Sc', 'BCA', 'MCA'],
    allowedDepartments: ['Computer Science', 'Information Technology', 'Software'],
    allowedYearsOfStudy: [3, 4],
    allowedGraduationYears: [2026, 2027],
    mandatorySkills: ['JavaScript', 'React'],
  },
  preferredSkills: ['TypeScript', 'Docker'],
  selectionProcess: ['Online Coding Round', 'Technical Interview'],
  officialSourceName: 'Zoho Careers Official Portal',
  officialSourceUrl: 'https://www.zoho.com/careers/',
  applicationUrl: 'https://www.zoho.com/careers/',
  supportsInternalApply: true,
  verificationStatus: 'Verified Official Source',
  lastVerifiedDate: '2026-10-18',
};

test('calculateProfileCompletion computes accurate 100% completion when all 10 criteria exist', () => {
  const res = calculateProfileCompletion(sampleStudent);
  assert.equal(res.percentage, 100);
  assert.equal(res.missingItems.length, 0);
});

test('evaluateInternshipEligibility returns Eligible even if preferred skills are missing when mandatory requirements are met', () => {
  const report = evaluateInternshipEligibility(sampleEligibleInternship, sampleStudent, [sampleEligibleInternship]);
  assert.equal(report.status, 'Eligible');
  assert.equal(report.mandatoryNotMet.length, 0);
  assert.ok(report.preferredMissing.includes('TypeScript'));
});

test('evaluateInternshipEligibility distinguishes unchangeable graduation year mismatch from skill gaps', () => {
  const grad2026OnlyListing: InternshipListing = {
    ...sampleEligibleInternship,
    id: 'int-2',
    mandatoryRequirements: {
      ...sampleEligibleInternship.mandatoryRequirements,
      allowedGraduationYears: [2026],
      mandatorySkills: ['JavaScript', 'Python'],
    },
  };
  const report = evaluateInternshipEligibility(grad2026OnlyListing, sampleStudent, []);
  assert.equal(report.status, 'Not Eligible Yet');
  assert.equal(report.unchangeableRequirementsNotMet.length, 1);
  assert.ok(report.changeableSkillGaps.includes('Python'));
  assert.ok(
    report.nextSteps.some((step) => step.includes('cannot be changed through skill development'))
  );
});

test('evaluateInternshipEligibility returns Potentially Eligible when profile fields are missing without failing mandatory checks', () => {
  const incompleteProfile: StudentProfile = {
    ...sampleStudent,
    graduationYear: null,
  };
  const report = evaluateInternshipEligibility(sampleEligibleInternship, incompleteProfile, []);
  assert.equal(report.status, 'Potentially Eligible / More Information Needed');
  assert.equal(report.missingProfileInfo.length, 1);
});

test('evaluateInternshipEligibility distinguishes More Information Needed when technicalCompetencies are empty and matches degree/skill aliases', () => {
  const newSignupProfile: StudentProfile = {
    ...sampleStudent,
    degree: 'BE',
    department: 'CSE',
    technicalCompetencies: [],
    projects: [],
    certifications: [],
  };
  // Skill-requiring internship should be Potentially Eligible / More Information Needed (NOT Not Eligible Yet, and NOT Eligible)
  const skillReqReport = evaluateInternshipEligibility(sampleEligibleInternship, newSignupProfile, []);
  assert.equal(skillReqReport.status, 'Potentially Eligible / More Information Needed');
  assert.ok(skillReqReport.missingProfileInfo.some((m) => m.includes('Technical skills')));

  // Academic-only internship should be Eligible because BE + CSE + Year 3 + 2027 meets all mandatory requirements
  const academicOnlyListing: InternshipListing = {
    ...sampleEligibleInternship,
    id: 'int-academic-only',
    mandatoryRequirements: {
      ...sampleEligibleInternship.mandatoryRequirements,
      mandatorySkills: [],
    },
    preferredSkills: ['Python', 'SQL'],
  };
  const academicReport = evaluateInternshipEligibility(academicOnlyListing, newSignupProfile, []);
  assert.equal(academicReport.status, 'Eligible');
});

test('analyzeResumeContent populates Recommended Keywords to Add and separates Safe to Include vs Learn Before Claiming', () => {
  const report = analyzeResumeContent(
    sampleStudent.uploadedResumeText!,
    'Aarav_Resume_2026.pdf',
    'Full-Stack Development Intern',
    undefined,
    sampleStudent,
    [sampleEligibleInternship]
  );
  assert.ok(report.recommendedKeywords.length > 0);
  // SQL and Node.js are in sampleStudent profile/project evidence, but NOT in uploadedResumeText!
  const safeKeywords = report.recommendedKeywords
    .filter((k) => k.category === 'Safe to Include (Evidence Exists)')
    .map((k) => k.keyword);
  assert.ok(safeKeywords.includes('SQL') || safeKeywords.includes('Node.js'));

  const learnBeforeClaiming = report.recommendedKeywords
    .filter((k) => k.category === 'Learn Before Claiming')
    .map((k) => k.keyword);
  assert.ok(learnBeforeClaiming.includes('TypeScript'));
});

test('buildRejectionAnalysis never invents a rejection reason when official feedback is empty', () => {
  const rejectedApp: ApplicationRecord = {
    id: 'app-1',
    userId: 'stu-1',
    internshipId: 'int-1',
    internshipTitle: sampleEligibleInternship.title,
    organization: sampleEligibleInternship.organization,
    appliedDate: '2026-10-05',
    status: 'Rejected',
    applicationMode: 'Internal Form',
    applicationLink: sampleEligibleInternship.applicationUrl,
    deadline: sampleEligibleInternship.deadline,
    notes: 'Completed online assessment.',
    statusHistory: [{ status: 'Rejected', timestamp: '2026-10-15', note: 'Status updated' }],
  };
  const analysis = buildRejectionAnalysis(rejectedApp, sampleEligibleInternship, sampleStudent, []);
  assert.equal(analysis.officialFeedbackProvided, false);
  assert.equal(analysis.disclaimerText, UNCONFIRMED_REJECTION_DISCLAIMER);
  assert.ok(analysis.actionChecklist.length > 0);
});

test('generateRoleSpecific15Questions generates strictly 15 questions tailored to Full-Stack vs AI/ML', () => {
  const fsQuestions = generateRoleSpecific15Questions(
    'Full-Stack Development',
    'Full-Stack Development Intern',
    sampleEligibleInternship,
    sampleStudent,
    'Intermediate (3rd/4th Year)'
  );
  const aiQuestions = generateRoleSpecific15Questions(
    'AI and Machine Learning',
    'AI/ML Intern',
    undefined,
    sampleStudent,
    'Beginner (1st/2nd Year)'
  );
  assert.equal(fsQuestions.length, 15);
  assert.equal(aiQuestions.length, 15);
  assert.notEqual(fsQuestions[0].question, aiQuestions[0].question);

  // Unanswered questions must receive 0 score in final report
  const emptyReport = buildFinalInterviewReport(fsQuestions, {});
  assert.equal(emptyReport.questionsAnswered, 0);
  assert.equal(emptyReport.overallScore, 0);
});

test('computeCurrentRelevantSkills aggregates active verified internship listings accurately', () => {
  const demand = computeCurrentRelevantSkills([sampleEligibleInternship], sampleStudent);
  const reactItem = demand.find((d) => d.skillName === 'React');
  assert.ok(reactItem);
  assert.equal(reactItem.activeVerifiedListingsCount, 1);
});

test('generatePersonalizedAiRecommendations generates deduplicated recommendations including both eligible and skill-bridge career matches with actual eligibility status', () => {
  const growthInternship: InternshipListing = {
    ...sampleEligibleInternship,
    id: 'int-growth-1',
    title: 'Full-Stack & TypeScript Cloud Intern',
    organization: 'Razorpay Software',
    mandatoryRequirements: {
      ...sampleEligibleInternship.mandatoryRequirements,
      mandatorySkills: ['JavaScript', 'React', 'TypeScript'],
    },
  };
  const wrongCohortInternship: InternshipListing = {
    ...sampleEligibleInternship,
    id: 'int-wrong-cohort',
    title: '2025 Cohort Only Intern',
    mandatoryRequirements: {
      ...sampleEligibleInternship.mandatoryRequirements,
      allowedGraduationYears: [2025],
    },
  };

  const recs = generatePersonalizedAiRecommendations(
    [sampleEligibleInternship, growthInternship, sampleEligibleInternship, wrongCohortInternship],
    sampleStudent
  );

  // Must deduplicate sampleEligibleInternship and exclude wrongCohortInternship (hard restriction)
  assert.equal(recs.length, 2);
  const ids = recs.map((r) => r.internshipId);
  assert.ok(ids.includes('int-1'));
  assert.ok(ids.includes('int-growth-1'));
  assert.ok(!ids.includes('int-wrong-cohort'));

  const eligibleRec = recs.find((r) => r.internshipId === 'int-1')!;
  assert.equal(eligibleRec.eligibilityStatus, 'Eligible');
  assert.equal(eligibleRec.recommendationCategory, 'Best Immediate Fit (Eligible Now)');
  assert.ok(eligibleRec.personalizedReason.includes('Aaravishnan K'));

  const growthRec = recs.find((r) => r.internshipId === 'int-growth-1')!;
  assert.equal(growthRec.eligibilityStatus, 'Not Eligible Yet');
  assert.equal(
    growthRec.recommendationCategory,
    'Career Goal & Project Match (Skill-Bridge Opportunity)'
  );
  assert.ok(growthRec.skillGapOrNextAction.includes('TypeScript'));
});

test('PM Internship Scheme partner tracks and Skill Assessments integrate with eligibility and demand analysis', async () => {
  const { INITIAL_INTERNSHIPS, SKILL_DEVELOPMENT_TRACKS, SKILL_ASSESSMENTS } = await import('../data/seedData.ts');
  const pmTracks = INITIAL_INTERNSHIPS.filter((i) => i.organizationType === 'PM Internship Scheme');
  assert.ok(pmTracks.length >= 4, 'Should have at least 4 PM Internship Scheme tracks');
  assert.ok(SKILL_DEVELOPMENT_TRACKS.length >= 4, 'Should have at least 4 Skill Development Tracks');
  assert.ok(SKILL_ASSESSMENTS.length >= 6, 'Should have at least 6 Skill Assessments');

  const demand = computeCurrentRelevantSkills(INITIAL_INTERNSHIPS, sampleStudent);
  assert.ok(demand.length > 0);
  // Every assessment should have at least 4 questions and a valid passing score
  for (const quiz of SKILL_ASSESSMENTS) {
    assert.ok(quiz.questions.length >= 4);
    assert.ok(quiz.passingScorePercent >= 60);
  }
});

test('buildInterviewProgressSeries orders consecutive sessions chronologically and tracks progress & confidence improvements', async () => {
  const { INITIAL_INTERNSHIPS } = await import('../data/seedData.ts');
  const sessions = createDefaultInterviewSessions(sampleStudent, INITIAL_INTERNSHIPS);
  assert.equal(sessions.length, 5);

  const summary = buildInterviewProgressSeries(sessions, 'All');
  assert.equal(summary.totalSessions, 5);
  assert.equal(summary.points[0].sessionLabel, 'S1');
  assert.equal(summary.points[4].sessionLabel, 'S5');

  // Verify chronological ordering from S1 (Oct 03) to S5 (Oct 19)
  assert.ok(
    new Date(summary.points[0].createdAt).getTime() <
      new Date(summary.points[4].createdAt).getTime()
  );

  // Verify positive progress & confidence score trajectory over consecutive sessions
  assert.ok(summary.progressImprovement > 0, 'Progress score should improve from S1 to S5');
  assert.ok(summary.confidenceImprovement > 0, 'Confidence score should improve from S1 to S5');
  assert.ok(summary.consecutiveImprovementStreak >= 3);
  assert.ok(summary.latestConfidenceScore >= 80);

  // Verify category filter works accurately
  const fsOnly = buildInterviewProgressSeries(sessions, 'Full-Stack Development');
  assert.equal(fsOnly.totalSessions, 3);
  assert.equal(fsOnly.points[0].sessionLabel, 'S1');
  assert.equal(fsOnly.points[2].sessionLabel, 'S3');

  // Verify empty session list handling
  const emptySummary = buildInterviewProgressSeries([], 'All');
  assert.equal(emptySummary.totalSessions, 0);
  assert.equal(emptySummary.points.length, 0);
  assert.equal(computeSessionConfidenceScore([], {}), 0);
});



