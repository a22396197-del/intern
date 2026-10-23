export type SkillCategory =
  | 'Programming Languages'
  | 'Frameworks and Libraries'
  | 'Databases'
  | 'Development Tools'
  | 'Cloud and Deployment'
  | 'Testing Tools'
  | 'Other Technical Technologies';

export type ProficiencyLevel = 'Beginner' | 'Intermediate' | 'Demonstrated' | 'Verified via Assessment';

export interface TechnicalCompetency {
  id: string;
  name: string;
  category: SkillCategory;
  selfReportedLevel: 'Beginner' | 'Intermediate' | 'Advanced (Self-Reported)';
  verificationType: 'Self-Reported Only' | 'Project Evidence' | 'Course / Certification' | 'Skill Assessment Verified';
  evidenceTitle: string;
  relatedProjectTitle?: string;
  lastUpdated: string;
}

export interface DomainCompetency {
  id: string;
  domain:
    | 'Artificial Intelligence and Machine Learning'
    | 'Web Development'
    | 'Full-Stack Development'
    | 'Data Analytics'
    | 'Cybersecurity'
    | 'Cloud Computing'
    | 'Software Engineering'
    | 'UI/UX and Product Design';
  learningLevel: 'Exploring' | 'Foundational' | 'Project-Tested' | 'Internship-Ready';
  relevantProjects: string[];
  interestNote: string;
  lastUpdated: string;
}

export interface StudentProject {
  id: string;
  title: string;
  description: string;
  problemSolved: string;
  technologies: string[];
  studentContribution: string;
  skillsDemonstrated: string[];
  status: 'In Progress' | 'Completed' | 'Maintained';
  repoUrl?: string;
  liveUrl?: string;
}

export interface CertificationAchievement {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  type: 'Certification' | 'Course Completion' | 'Competition / Hackathon' | 'Academic Achievement';
  credentialUrl?: string;
  skillsCovered: string[];
}

export interface StudentProfile {
  userId: string;
  fullName: string;
  email: string;
  role: 'student' | 'admin';
  avatarUrl?: string;
  college: string;
  degree: string;
  department: string;
  currentYear: number | null; // e.g., 1, 2, 3, 4
  currentSemester: number | null; // e.g., 1..8
  graduationYear: number | null; // e.g., 2026, 2027, 2028
  gpa?: string;
  relevantCoursework: string[];
  academicAchievements: string[];
  location: string;
  careerGoal: string;
  careerInterests: string[];
  targetRoles: string[];
  skillsLearningNow: string[];
  preferredWorkMode: 'Online' | 'Offline' | 'Hybrid' | 'Any';
  preferredLocations: string[];
  paidPreference: 'Paid Only' | 'Paid or Unpaid' | 'Unpaid Acceptable';
  preferredDuration: string;
  availability: string;
  technicalCompetencies: TechnicalCompetency[];
  domainCompetencies: DomainCompetency[];
  projects: StudentProject[];
  certifications: CertificationAchievement[];
  uploadedResumeName?: string;
  uploadedResumeText?: string;
  uploadedResumeUpdatedAt?: string;
  onboardingCompleted: boolean;
}

export type EligibilityOutcome =
  | 'Eligible'
  | 'Not Eligible Yet'
  | 'Potentially Eligible / More Information Needed'
  | 'Closed / Expired';

export interface InternshipListing {
  id: string;
  title: string;
  organization: string;
  organizationType: 'Private' | 'Central Government' | 'State Government' | 'Government Research Institution' | 'PM Internship Scheme';
  roleCategory:
    | 'Full-Stack Development'
    | 'Frontend Development'
    | 'Backend Development'
    | 'AI and Machine Learning'
    | 'Data Analytics'
    | 'Python Development'
    | 'Java Development'
    | 'Cloud and DevOps'
    | 'Cybersecurity';
  description: string;
  responsibilities: string[];
  workMode: 'Online' | 'Offline' | 'Hybrid';
  location: string;
  isPaid: boolean;
  stipend: string;
  stipendAmountMonthly: number;
  duration: string;
  openingDate: string;
  deadline: string; // YYYY-MM-DD
  mandatoryRequirements: {
    allowedDegrees: string[]; // e.g. ['B.E.', 'B.Tech', 'B.Sc', 'BCA', 'MCA', 'M.Tech']
    allowedDepartments: string[]; // e.g. ['Computer Science', 'Information Technology', 'AI & DS', 'Electronics', 'Any Engineering/Science']
    allowedYearsOfStudy: number[]; // e.g. [3, 4]
    allowedGraduationYears: number[]; // e.g. [2026, 2027]
    mandatorySkills: string[];
    requiredLocation?: string; // if Offline/Hybrid strict location
    ageCriteria?: string;
    requiredDocuments?: string[];
  };
  preferredSkills: string[];
  selectionProcess: string[];
  officialSourceName: string;
  officialSourceUrl: string;
  applicationUrl: string;
  supportsInternalApply: boolean;
  verificationStatus: 'Verified Official Source' | 'Partner Verified' | 'Pending Admin Review' | 'Closed / Expired';
  lastVerifiedDate: string;
}

export interface EligibilityReport {
  internshipId: string;
  status: EligibilityOutcome;
  relevanceScore: number; // 0-100 documented rubric
  scoreBreakdown: {
    mandatoryCriteriaScore: number; // out of 40
    technicalSkillsScore: number; // out of 35
    domainAndProjectScore: number; // out of 15
    preferenceAlignmentScore: number; // out of 10
  };
  summaryReason: string;
  mandatoryMet: string[];
  mandatoryNotMet: string[];
  unchangeableRequirementsNotMet: string[];
  changeableSkillGaps: string[];
  missingProfileInfo: string[];
  preferredMatching: string[];
  preferredMissing: string[];
  nextSteps: string[];
  similarEligibleInternshipIds: string[];
}

export interface AiInternshipRecommendation {
  internshipId: string;
  aiMatchScore: number; // 0-100 holistic AI career, project, resume & preference fit
  recommendationCategory:
    | 'Best Immediate Fit (Eligible Now)'
    | 'Career Goal & Project Match (Skill-Bridge Opportunity)';
  eligibilityStatus: EligibilityOutcome;
  personalizedReason: string;
  resumeAndSkillSignals: string[];
  projectAndCertConnections: string[];
  careerAndPreferenceFit: string;
  skillGapOrNextAction: string;
  crossSectionExplanation: string;
  generatedBy: 'gemini-ai' | 'profile-ai-engine';
  generatedAt: string;
}

export type ApplicationStatus =
  | 'Saved'
  | 'Planning to Apply'
  | 'Applied'
  | 'Assessment'
  | 'Interview'
  | 'Offer Received'
  | 'Rejected'
  | 'Withdrawn';

export interface RejectionImprovementTask {
  id: string;
  skillOrRequirement: string;
  category: 'Skill Gap' | 'Academic Eligibility' | 'Resume Quality' | 'Interview Preparation' | 'Project Evidence';
  whyItMatters: string;
  existingEvidence: string;
  learningRoadmap: string;
  practiceTask: string;
  suggestedProject: string;
  nextAction: string;
  completed: boolean;
}

export interface RejectionAnalysis {
  applicationId: string;
  internshipId: string;
  rejectionDate: string;
  officialFeedbackProvided: boolean;
  officialFeedbackText?: string;
  disclaimerText: string;
  skillsToImprove: string[];
  resumeImprovements: string[];
  projectSuggestions: string[];
  interviewPrepRecommendations: string[];
  alternativeInternshipIds: string[];
  actionChecklist: RejectionImprovementTask[];
  updatedAt: string;
}

export interface ApplicationRecord {
  id: string;
  userId: string;
  internshipId: string;
  internshipTitle: string;
  organization: string;
  appliedDate: string;
  status: ApplicationStatus;
  applicationMode: 'Internal Form' | 'External Official Portal';
  applicationLink: string;
  deadline: string;
  resumeAttachedName?: string;
  coverNote?: string;
  notes: string;
  officialRejectionFeedback?: string;
  statusHistory: {
    status: ApplicationStatus;
    timestamp: string;
    note: string;
  }[];
  rejectionAnalysis?: RejectionAnalysis;
}

export interface KeywordRecommendation {
  keyword: string;
  category:
    | 'Already Present'
    | 'Safe to Include (Evidence Exists)'
    | 'Relevant (Not Yet Demonstrated)'
    | 'Learn Before Claiming';
  whyItMatters: string;
  relatedRequirement: string;
  whereItFits: string;
  truthfulExample: string;
}

export interface ResumeSkillToDevelop {
  skillName: string;
  whyItMatters: string;
  currentEvidenceInResume: string;
  requiredLevel: string;
  priority: 'High' | 'Medium' | 'Foundational';
  learningOrder: number;
  practiceExercise: string;
  projectIdea: string;
  skillDevelopmentTrackId: string;
  relatedInternshipIds: string[];
}

export interface ResumeImprovementAction {
  id: string;
  tier: 'Fix First' | 'Improve Next' | 'Learn Before Adding' | 'Optional Improvements';
  section: string;
  issue: string;
  recommendation: string;
  nextAction: string;
  completed: boolean;
}

export interface ResumeAnalysisReport {
  id: string;
  userId: string;
  fileName: string;
  extractedCharCount: number;
  targetRole: string;
  targetInternshipId?: string;
  targetInternshipTitle?: string;
  createdAt: string;
  overallScore: number; // out of 100
  scoringRubricNote: string;
  sectionScores: {
    educationAndClarity: number; // out of 20
    technicalSkillsEvidence: number; // out of 30
    projectsAndImpact: number; // out of 30
    roleAlignmentAndKeywords: number; // out of 20
  };
  detectedSkills: string[];
  detectedEducation: string[];
  detectedProjects: string[];
  strengths: string[];
  weaknesses: string[];
  missingOrWeakSkills: string[];
  recommendedKeywords: KeywordRecommendation[];
  skillsToDevelop: ResumeSkillToDevelop[];
  sectionFeedback: {
    projectDescriptions: string;
    technicalContributions: string;
    skillPresentation: string;
    educationAndCoursework: string;
    readabilityAndClarity: string;
    roleAlignment: string;
  };
  improvementPlan: ResumeImprovementAction[];
}

export interface InterviewQuestion {
  id: string;
  index: number; // 1..15
  question: string;
  topic: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Practical Scenario';
  whyAsked: string;
  hint: string;
  expectedKeyPoints: string[];
  sampleStrongStructure: string;
}

export interface InterviewAnswer {
  questionId: string;
  answerText: string;
  submittedAt: string;
  score: number; // 0..10
  feedback: string;
  matchedPoints: string[];
  missedPoints: string[];
}

export interface MockInterviewSession {
  id: string;
  userId: string;
  category: string;
  targetRole: string;
  targetInternshipId?: string;
  targetInternshipTitle?: string;
  experienceLevel: 'Beginner (1st/2nd Year)' | 'Intermediate (3rd/4th Year)' | 'Project-Focused Intern';
  mode: 'Practice Mode' | 'Mock Interview Mode';
  createdAt: string;
  completedAt?: string;
  questions: InterviewQuestion[]; // Strictly 15 questions
  answers: Record<string, InterviewAnswer>;
  finalReport?: {
    questionsAnswered: number;
    totalQuestions: number; // 15
    overallScore: number; // 0..100
    confidenceScore?: number; // 0..100
    rubricExplanation: string;
    strengths: string[];
    areasToImprove: string[];
    technicalKnowledgeGaps: string[];
    communicationFeedback: string;
    topicsToRevise: string[];
    recommendedExercises: string[];
    nextSessionSuggestion: string;
  };
}

export interface InterviewProgressPoint {
  sessionId: string;
  sessionIndex: number; // 1..N consecutive order
  sessionLabel: string; // e.g. "S1", "S2"
  createdAt: string;
  dateLabel: string; // e.g. "Oct 05"
  category: string;
  targetRole: string;
  targetInternshipTitle?: string;
  mode: 'Practice Mode' | 'Mock Interview Mode';
  questionsAnswered: number;
  totalQuestions: number;
  progressScore: number; // 0..100
  confidenceScore: number; // 0..100
  progressDelta: number; // delta from previous session
  confidenceDelta: number; // delta from previous session
  isCompleted: boolean;
  topStrength: string;
  keyFocusArea: string;
}

export interface InterviewProgressSummary {
  points: InterviewProgressPoint[];
  totalSessions: number;
  latestProgressScore: number;
  latestConfidenceScore: number;
  progressImprovement: number;
  confidenceImprovement: number;
  averageProgressScore: number;
  averageConfidenceScore: number;
  peakConfidenceScore: number;
  consecutiveImprovementStreak: number;
}

export interface SkillDevelopmentTrack {
  id: string;
  title: string;
  category: string;
  summary: string;
  targetRoles: string[];
  relatedSkills: string[];
  stage1Learn: {
    prerequisites: string[];
    explanation: string;
    topics: { id: string; title: string; summary: string; exampleCodeOrConcept: string; resourceTitle: string; resourceUrl: string }[];
  };
  stage2Practice: {
    tasks: { id: string; title: string; prompt: string; hint: string; solutionExplanation: string }[];
  };
  stage3Build: {
    projects: {
      level: 'Beginner' | 'Intermediate' | 'Advanced';
      title: string;
      objective: string;
      technologies: string[];
      milestones: string[];
      expectedOutcome: string;
    }[];
  };
  stage4Prepare: {
    internshipRequirements: string[];
    resumeTips: string[];
    interviewFocus: string[];
  };
}

export interface SkillAssessment {
  id: string;
  skillName: string;
  category: SkillCategory;
  badgeTitle: string;
  passingScorePercent: number;
  description: string;
  questions: {
    id: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
  }[];
}

export interface CompletedAssessmentRecord {
  id: string;
  userId: string;
  assessmentId: string;
  skillName: string;
  badgeTitle: string;
  scorePercent: number;
  passed: boolean;
  completedAt: string;
  areasToImprove: string[];
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: 'Deadline' | 'Application' | 'Skill Milestone' | 'System';
  createdAt: string;
  read: boolean;
  linkPage?: string;
}
