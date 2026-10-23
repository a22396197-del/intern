import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import http from 'http';
import net from 'net';
import { GoogleGenAI, Type } from '@google/genai';

// Load environment variables from both root .env and .aistudio/.env
const rootEnvPath = path.resolve(process.cwd(), '.env');
const aiStudioEnvPath = path.resolve(process.cwd(), '.aistudio', '.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}
if (fs.existsSync(aiStudioEnvPath)) {
  dotenv.config({ path: aiStudioEnvPath, override: true });
}
import {
  INITIAL_STUDENT_PROFILE,
  ADMIN_USER_PROFILE,
  INITIAL_INTERNSHIPS,
  INITIAL_APPLICATIONS,
  INITIAL_NOTIFICATIONS,
} from './src/data/seedData.ts';
import {
  analyzeResumeContent,
  buildRejectionAnalysis,
  generateRoleSpecific15Questions,
  evaluateInternshipEligibility,
  generatePersonalizedAiRecommendations,
  createDefaultInterviewSessions,
} from './src/utils/logic.ts';
import type {
  StudentProfile,
  InternshipListing,
  ApplicationRecord,
  ResumeAnalysisReport,
  MockInterviewSession,
  CompletedAssessmentRecord,
  AppNotification,
  AiInternshipRecommendation,
} from './src/types.ts';

const isVercel = Boolean(process.env.VERCEL);
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = isVercel
  ? path.join('/tmp', '.data')
  : path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'freeintern-db.json');

interface UserCredential {
  userId: string;
  email: string;
  passwordHash: string;
  role: 'student' | 'admin';
}

interface DatabaseSchema {
  credentials: UserCredential[];
  sessions: Record<string, string>; // token -> userId
  profiles: Record<string, StudentProfile>;
  internships: InternshipListing[];
  savedInternships: Record<string, string[]>; // userId -> internshipIds
  applications: Record<string, ApplicationRecord[]>; // userId -> applications
  resumeReports: Record<string, ResumeAnalysisReport[]>; // userId -> reports
  interviewSessions: Record<string, MockInterviewSession[]>; // userId -> sessions
  completedAssessments: Record<string, CompletedAssessmentRecord[]>; // userId -> assessments
  learningProgress: Record<string, string[]>; // userId -> completed topic/task IDs
  notifications: Record<string, AppNotification[]>; // userId -> notifications
  aiRecommendations?: Record<string, AiInternshipRecommendation[]>; // userId -> personalized AI recommendations
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`freeintern_salt_${password}`).digest('hex');
}

function createInitialDb(): DatabaseSchema {
  const defaultStudentId = INITIAL_STUDENT_PROFILE.userId;
  const adminId = ADMIN_USER_PROFILE.userId;

  const initialAppsWithRejection = INITIAL_APPLICATIONS.map((app) => {
    if (app.status === 'Rejected') {
      const targetInt = INITIAL_INTERNSHIPS.find((i) => i.id === app.internshipId);
      return {
        ...app,
        rejectionAnalysis: buildRejectionAnalysis(
          app,
          targetInt,
          INITIAL_STUDENT_PROFILE,
          INITIAL_INTERNSHIPS
        ),
      };
    }
    return app;
  });

  const initialResumeReport = analyzeResumeContent(
    INITIAL_STUDENT_PROFILE.uploadedResumeText || '',
    INITIAL_STUDENT_PROFILE.uploadedResumeName || 'Aaravishnan_K_Resume_Oct2026.pdf',
    'Full-Stack Development Intern',
    INITIAL_INTERNSHIPS[0],
    INITIAL_STUDENT_PROFILE,
    INITIAL_INTERNSHIPS
  );

  return {
    credentials: [
      {
        userId: defaultStudentId,
        email: INITIAL_STUDENT_PROFILE.email.toLowerCase(),
        passwordHash: hashPassword('Student@123'),
        role: 'student',
      },
      {
        userId: adminId,
        email: ADMIN_USER_PROFILE.email.toLowerCase(),
        passwordHash: hashPassword('Admin@123'),
        role: 'admin',
      },
    ],
    sessions: {
      'demo-student-session-token': defaultStudentId,
      'demo-admin-session-token': adminId,
    },
    profiles: {
      [defaultStudentId]: INITIAL_STUDENT_PROFILE,
      [adminId]: ADMIN_USER_PROFILE,
    },
    internships: INITIAL_INTERNSHIPS,
    savedInternships: {
      [defaultStudentId]: ['int-fe-freshworks', 'gov-meity-digital-india'],
      [adminId]: [],
    },
    applications: {
      [defaultStudentId]: initialAppsWithRejection,
      [adminId]: [],
    },
    resumeReports: {
      [defaultStudentId]: [initialResumeReport],
      [adminId]: [],
    },
    interviewSessions: {
      [defaultStudentId]: createDefaultInterviewSessions(
        INITIAL_STUDENT_PROFILE,
        INITIAL_INTERNSHIPS
      ),
      [adminId]: [],
    },
    completedAssessments: {
      [defaultStudentId]: [],
      [adminId]: [],
    },
    learningProgress: {
      [defaultStudentId]: ['fs-top-1', 'fs-prac-1'],
      [adminId]: [],
    },
    notifications: {
      [defaultStudentId]: INITIAL_NOTIFICATIONS,
      [adminId]: [],
    },
  };
}

function loadDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // In Vercel serverless environment, copy seed database to /tmp if not already present
    if (isVercel && !fs.existsSync(DB_FILE)) {
      const rootDbFile = path.resolve(process.cwd(), '.data', 'freeintern-db.json');
      if (fs.existsSync(rootDbFile)) {
        try {
          fs.copyFileSync(rootDbFile, DB_FILE);
        } catch (copyErr) {
          console.warn('[Vercel] Could not copy seed DB to /tmp, will initialize fresh DB:', copyErr);
        }
      }
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      // Ensure seed internships stay up to date while preserving custom admin listings
      const seedIds = new Set(INITIAL_INTERNSHIPS.map((i) => i.id));
      const customInternships = (parsed.internships || []).filter((i) => !seedIds.has(i.id));
      parsed.internships = [...customInternships, ...INITIAL_INTERNSHIPS];
      const defaultStudentId = INITIAL_STUDENT_PROFILE.userId;
      if (
        !parsed.interviewSessions ||
        !parsed.interviewSessions[defaultStudentId] ||
        parsed.interviewSessions[defaultStudentId].length === 0
      ) {
        parsed.interviewSessions = parsed.interviewSessions || {};
        parsed.interviewSessions[defaultStudentId] = createDefaultInterviewSessions(
          parsed.profiles?.[defaultStudentId] || INITIAL_STUDENT_PROFILE,
          parsed.internships
        );
      }
      saveDb(parsed);
      return parsed;
    }
  } catch (err) {
    console.error('Error loading DB, initializing fresh DB:', err);
  }
  const initial = createInitialDb();
  saveDb(initial);
  return initial;
}

function saveDb(db: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

const db = loadDb();

function getGeminiApiKey(): string | null {
  const candidateKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_GENAI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.API_KEY,
  ];

  for (const raw of candidateKeys) {
    if (raw && typeof raw === 'string') {
      const clean = raw.trim().replace(/^["']|["']$/g, '');
      if (clean && clean !== 'MY_GEMINI_API_KEY' && clean.length > 5) {
        return clean;
      }
    }
  }

  // Also check dynamically if .aistudio/.env or .env file has an updated key
  const envFiles = [
    path.resolve(process.cwd(), '.aistudio', '.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      try {
        const content = fs.readFileSync(envFile, 'utf-8');
        const match = content.match(
          /(?:GEMINI_API_KEY|GOOGLE_API_KEY|GOOGLE_GENAI_API_KEY|API_KEY)\s*=\s*["']?([^"'\r\n]+)["']?/i
        );
        if (match && match[1]) {
          const val = match[1].trim();
          if (val && val !== 'MY_GEMINI_API_KEY' && val.length > 5) {
            return val;
          }
        }
      } catch (_e) {
        // Ignore read errors
      }
    }
  }

  return null;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Resilient multi-model generation with automatic fallback
async function generateWithGemini(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    model?: string;
  }
) {
  const modelsToTry = [
    params.model || 'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];
  let lastErr: any = null;
  for (const m of modelsToTry) {
    try {
      const res = await ai.models.generateContent({
        ...params,
        model: m,
      });
      return res;
    } catch (err: any) {
      lastErr = err;
      console.warn(`[Gemini AI] Model ${m} attempt failed, trying fallback: ${err?.message || err}`);
    }
  }
  throw lastErr;
}

// Initialize Express Application
export const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS configuration for local development and Vercel deployments
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Serverless / Container Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    environment: isVercel ? 'vercel' : 'local',
    timestamp: new Date().toISOString(),
    database: fs.existsSync(DB_FILE) ? 'connected' : 'initializing',
  });
});

  // Serve extensionless uploaded media assets from public/assets with image/png Content-Type before Vite SPA fallback
  app.use(['/assets', '/public/assets'], (req, res, next) => {
    const cleanRel = req.path.replace(/^\/+/, '');
    const filePath = path.resolve(process.cwd(), 'public', 'assets', cleanRel);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      if (!path.extname(filePath)) {
        res.setHeader('Content-Type', 'image/png');
      }
      res.sendFile(filePath);
      return;
    }
    next();
  });

  // Serve the complete project ZIP archive for one-click download
  app.get(['/api/download-project-zip', '/free-intern-complete-project.zip'], (_req, res) => {
    const zipPath = path.resolve(process.cwd(), 'public', 'free-intern-complete-project.zip');
    if (!fs.existsSync(zipPath)) {
      res.status(404).json({ error: 'Project ZIP archive not found.' });
      return;
    }
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="free-intern-complete-project.zip"');
    res.sendFile(zipPath);
  });

  // Auth Helper
  function getAuthenticatedUser(req: express.Request): StudentProfile | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.replace('Bearer ', '').trim();
    const userId = db.sessions[token];
    if (!userId) return null;
    return db.profiles[userId] || null;
  }

  function getBootstrapPayload(userId: string) {
    if (!db.aiRecommendations) {
      db.aiRecommendations = {};
    }
    const profile = db.profiles[userId] || INITIAL_STUDENT_PROFILE;
    const existingRecs = db.aiRecommendations[userId] || [];
    const hasGeminiGenerated = existingRecs.some((r) => r.generatedBy === 'gemini-ai');
    if (existingRecs.length === 0 || !hasGeminiGenerated) {
      db.aiRecommendations[userId] = generatePersonalizedAiRecommendations(
        db.internships,
        profile
      );
      saveDb(db);
    }
    return {
      profile: db.profiles[userId],
      internships: db.internships,
      savedInternshipIds: db.savedInternships[userId] || [],
      applications: db.applications[userId] || [],
      resumeReports: db.resumeReports[userId] || [],
      interviewSessions: db.interviewSessions[userId] || [],
      completedAssessments: db.completedAssessments[userId] || [],
      learningProgress: db.learningProgress[userId] || [],
      notifications: db.notifications[userId] || [],
      aiRecommendations: db.aiRecommendations[userId] || [],
    };
  }

  // 1. AUTHENTICATION ROUTES
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const cred = db.credentials.find((c) => c.email === cleanEmail);
    if (!cred || cred.passwordHash !== hashPassword(String(password))) {
      res.status(401).json({
        error:
          'Invalid email or password. For demo student access, use student@freeintern.edu / Student@123.',
      });
      return;
    }
    const token = `sess_${crypto.randomBytes(16).toString('hex')}`;
    db.sessions[token] = cred.userId;
    saveDb(db);
    const bootstrapPayload = getBootstrapPayload(cred.userId);
    res.json({
      token,
      ...bootstrapPayload,
    });
  });

  app.post('/api/auth/signup', (req, res) => {
    const {
      fullName,
      email,
      password,
      college,
      degree,
      department,
      currentYear,
      graduationYear,
      initialSkills,
    } = req.body || {};
    if (!fullName || !email || !password) {
      res.status(400).json({ error: 'Full name, email, and password are required to create an account.' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();
    if (db.credentials.some((c) => c.email === cleanEmail)) {
      res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
      return;
    }

    const parsedSkills: string[] = Array.isArray(initialSkills)
      ? initialSkills.map((s) => String(s).trim()).filter(Boolean)
      : typeof initialSkills === 'string'
      ? initialSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const userId = `stu-${Date.now()}`;
    const todayStr = new Date().toISOString().slice(0, 10);
    const newProfile: StudentProfile = {
      userId,
      fullName: String(fullName).trim(),
      email: cleanEmail,
      role: 'student',
      college: college ? String(college).trim() : '',
      degree: degree ? String(degree).trim() : '',
      department: department ? String(department).trim() : '',
      currentYear: currentYear ? Number(currentYear) : null,
      currentSemester: currentYear ? Number(currentYear) * 2 - 1 : null,
      graduationYear: graduationYear ? Number(graduationYear) : null,
      relevantCoursework: [],
      academicAchievements: [],
      location: '',
      careerGoal: '',
      careerInterests: ['Full-Stack Development'],
      targetRoles: ['Full-Stack Development Intern'],
      skillsLearningNow: [],
      preferredWorkMode: 'Any',
      preferredLocations: [],
      paidPreference: 'Paid or Unpaid',
      preferredDuration: '2 to 3 Months',
      availability: 'Immediate',
      technicalCompetencies: parsedSkills.map((sk, idx) => ({
        id: `tc-init-${Date.now()}-${idx}`,
        name: sk,
        category: 'Programming Languages',
        selfReportedLevel: 'Intermediate',
        verificationType: 'Course / Certification',
        evidenceTitle: 'Academic Coursework & Lab Practice',
        lastUpdated: todayStr,
      })),
      domainCompetencies: [],
      projects: [],
      certifications: [],
      onboardingCompleted: false,
    };

    db.credentials.push({
      userId,
      email: cleanEmail,
      passwordHash: hashPassword(String(password)),
      role: 'student',
    });
    db.profiles[userId] = newProfile;
    db.savedInternships[userId] = [];
    db.applications[userId] = [];
    db.resumeReports[userId] = [];
    db.interviewSessions[userId] = [];
    db.completedAssessments[userId] = [];
    db.learningProgress[userId] = [];
    db.notifications[userId] = [
      {
        id: `notif-welcome-${Date.now()}`,
        userId,
        title: 'Welcome to Free Intern',
        message: 'Complete your student onboarding and Technical Competencies to unlock accurate internship eligibility checks.',
        category: 'System',
        createdAt: new Date().toISOString(),
        read: false,
        linkPage: 'profile',
      },
    ];

    const token = `sess_${crypto.randomBytes(16).toString('hex')}`;
    db.sessions[token] = userId;
    saveDb(db);

    const bootstrapPayload = getBootstrapPayload(userId);
    res.status(201).json({
      token,
      ...bootstrapPayload,
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { email, newPassword } = req.body || {};
    if (!email || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'Provide a valid registered email and a new password (min 6 characters).' });
      return;
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const cred = db.credentials.find((c) => c.email === cleanEmail);
    if (!cred) {
      res.status(404).json({ error: 'No student account found with that email address.' });
      return;
    }
    cred.passwordHash = hashPassword(String(newPassword));
    saveDb(db);
    res.json({ message: 'Password updated successfully. You may now log in with your new password.' });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      if (token !== 'demo-student-session-token' && token !== 'demo-admin-session-token') {
        delete db.sessions[token];
        saveDb(db);
      }
    }
    res.json({ ok: true });
  });

  // 2. BOOTSTRAP / SYNC STATE FOR AUTHENTICATED STUDENT
  app.get('/api/bootstrap', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthenticated session. Please log in.' });
      return;
    }
    res.json(getBootstrapPayload(user.userId));
  });

  // 3. PROFILE PERSISTENCE (WITH OWNERSHIP CHECK)
  app.put('/api/profile', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const updated: StudentProfile = {
      ...db.profiles[user.userId],
      ...req.body,
      userId: user.userId, // Enforce ownership: never allow changing userId
      role: user.role, // Prevent privilege escalation
    };
    db.profiles[user.userId] = updated;
    if (!db.aiRecommendations) {
      db.aiRecommendations = {};
    }
    db.aiRecommendations[user.userId] = generatePersonalizedAiRecommendations(
      db.internships,
      updated
    );
    saveDb(db);
    res.json({
      profile: updated,
      aiRecommendations: db.aiRecommendations[user.userId],
    });
  });

  // 3B. PERSONALIZED AI INTERNSHIP RECOMMENDATIONS ENDPOINT
  app.post('/api/ai/recommendations', async (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const baseRecommendations = generatePersonalizedAiRecommendations(db.internships, user);
    const ai = getGeminiClient();

    if (ai && baseRecommendations.length > 0) {
      try {
        const candidateDetails = baseRecommendations.map((rec) => {
          const listing = db.internships.find((i) => i.id === rec.internshipId);
          return {
            internshipId: rec.internshipId,
            title: listing?.title,
            organization: listing?.organization,
            roleCategory: listing?.roleCategory,
            workMode: listing?.workMode,
            location: listing?.location,
            stipend: listing?.stipend,
            deadline: listing?.deadline,
            mandatorySkills: listing?.mandatoryRequirements.mandatorySkills,
            preferredSkills: listing?.preferredSkills,
            eligibilityStatus: rec.eligibilityStatus,
            recommendationCategory: rec.recommendationCategory,
          };
        });

        const prompt = `Generate personalized AI internship recommendation explanations for this student based strictly on their actual profile, resume, competencies, projects, certifications, career goals, and preferences.

Student Profile:
- Name: ${user.fullName}
- Education: ${user.degree || 'Unspecified'} in ${user.department || 'Unspecified'} at ${user.college || 'Unspecified'} (Year ${user.currentYear ?? 'N/A'}, Graduation ${user.graduationYear ?? 'TBD'})
- Uploaded Resume (${user.uploadedResumeName || 'None'}): ${(user.uploadedResumeText || '').slice(0, 1200)}
- Technical Competencies: ${(user.technicalCompetencies || []).map((t) => `${t.name} (${t.selfReportedLevel}, ${t.verificationType})`).join(', ')}
- Domain Competencies: ${(user.domainCompetencies || []).map((d) => `${d.domain} (${d.learningLevel})`).join(', ')}
- Projects: ${(user.projects || []).map((p) => `${p.title} [${p.technologies.join(', ')}]`).join('; ')}
- Certifications: ${(user.certifications || []).map((c) => `${c.title} (${c.issuer})`).join('; ')}
- Career Goal & Target Roles: ${user.careerGoal} | Target Roles: ${(user.targetRoles || []).join(', ')} | Interests: ${(user.careerInterests || []).join(', ')}
- Work Mode & Stipend Preferences: Mode=${user.preferredWorkMode}, Locations=${(user.preferredLocations || []).join(', ')}, Paid=${user.paidPreference}

Candidate Internships:
${JSON.stringify(candidateDetails, null, 2)}

Return a JSON array with personalizedReason, careerAndPreferenceFit, and skillGapOrNextAction for each internshipId.`;

        const response = await generateWithGemini(ai, {
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  internshipId: { type: Type.STRING },
                  personalizedReason: { type: Type.STRING },
                  careerAndPreferenceFit: { type: Type.STRING },
                  skillGapOrNextAction: { type: Type.STRING },
                },
                required: [
                  'internshipId',
                  'personalizedReason',
                  'careerAndPreferenceFit',
                  'skillGapOrNextAction',
                ],
              },
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (Array.isArray(parsed)) {
            const byId = new Map(parsed.map((item: Record<string, string>) => [item.internshipId, item]));
            for (const rec of baseRecommendations) {
              const aiItem = byId.get(rec.internshipId);
              if (aiItem) {
                if (aiItem.personalizedReason) rec.personalizedReason = String(aiItem.personalizedReason);
                if (aiItem.careerAndPreferenceFit) {
                  rec.careerAndPreferenceFit = String(aiItem.careerAndPreferenceFit);
                }
                if (aiItem.skillGapOrNextAction) {
                  rec.skillGapOrNextAction = String(aiItem.skillGapOrNextAction);
                }
                rec.generatedBy = 'gemini-ai';
              }
            }
          }
        }
      } catch (_err) {
        // Keep profile-grounded AI recommendations if network/API call fails
      }
    }

    if (!db.aiRecommendations) {
      db.aiRecommendations = {};
    }
    db.aiRecommendations[user.userId] = baseRecommendations;
    saveDb(db);

    res.json({ recommendations: baseRecommendations });
  });

  // AI Connection Status Endpoint
  app.get('/api/ai/status', (_req, res) => {
    const key = getGeminiApiKey();
    const hasKey = Boolean(key);
    res.json({
      configured: hasKey,
      keyPreview: hasKey ? `${key!.slice(0, 4)}...${key!.slice(-4)}` : null,
      modelFallbackOrder: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
      envSourcesChecked: ['.aistudio/.env', '.env', 'process.env'],
    });
  });

  // 4. SAVED INTERNSHIPS PERSISTENCE
  app.post('/api/saved-internships/toggle', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { internshipId } = req.body || {};
    if (!internshipId) {
      res.status(400).json({ error: 'internshipId is required' });
      return;
    }
    const list = db.savedInternships[user.userId] || [];
    const exists = list.includes(internshipId);
    const next = exists ? list.filter((id) => id !== internshipId) : [...list, internshipId];
    db.savedInternships[user.userId] = next;
    saveDb(db);
    res.json({ savedInternshipIds: next });
  });

  // 5. APPLICATIONS & REJECTION ANALYSIS PERSISTENCE
  app.post('/api/applications', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { internshipId, applicationMode, status, notes, coverNote, resumeAttachedName } = req.body || {};
    const internship = db.internships.find((i) => i.id === internshipId);
    if (!internship) {
      res.status(404).json({ error: 'Internship listing not found.' });
      return;
    }
    const userApps = db.applications[user.userId] || [];
    if (userApps.some((a) => a.internshipId === internshipId)) {
      res.status(409).json({ error: 'You have already recorded an application for this internship in your tracker.' });
      return;
    }

    const initialStatus = status || 'Applied';
    const newApp: ApplicationRecord = {
      id: `app-${Date.now()}`,
      userId: user.userId,
      internshipId: internship.id,
      internshipTitle: internship.title,
      organization: internship.organization,
      appliedDate: new Date().toISOString().slice(0, 10),
      status: initialStatus,
      applicationMode: applicationMode || (internship.supportsInternalApply ? 'Internal Form' : 'External Official Portal'),
      applicationLink: internship.applicationUrl,
      deadline: internship.deadline,
      resumeAttachedName: resumeAttachedName || user.uploadedResumeName || 'Student_Resume.pdf',
      coverNote: coverNote || '',
      notes: notes || '',
      statusHistory: [
        {
          status: initialStatus,
          timestamp: new Date().toISOString(),
          note:
            applicationMode === 'External Official Portal'
              ? 'Opened external official portal and logged application status.'
              : 'Submitted internal application form.',
        },
      ],
    };

    if (newApp.status === 'Rejected') {
      newApp.rejectionAnalysis = buildRejectionAnalysis(newApp, internship, user, db.internships);
    }

    db.applications[user.userId] = [newApp, ...userApps];
    saveDb(db);
    res.status(201).json({ applications: db.applications[user.userId] });
  });

  app.patch('/api/applications/:id', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const appId = req.params.id;
    const userApps = db.applications[user.userId] || [];
    const idx = userApps.findIndex((a) => a.id === appId);
    if (idx === -1) {
      res.status(404).json({ error: 'Application record not found for your account.' });
      return;
    }

    const current = userApps[idx];
    const { status, notes, officialRejectionFeedback, toggleChecklistTaskId } = req.body || {};

    const updated: ApplicationRecord = {
      ...current,
      status: status || current.status,
      notes: notes !== undefined ? notes : current.notes,
      officialRejectionFeedback:
        officialRejectionFeedback !== undefined ? officialRejectionFeedback : current.officialRejectionFeedback,
    };

    if (status && status !== current.status) {
      updated.statusHistory = [
        ...current.statusHistory,
        {
          status,
          timestamp: new Date().toISOString(),
          note: `Status updated from ${current.status} to ${status}.`,
        },
      ];
    }

    const internship = db.internships.find((i) => i.id === updated.internshipId);
    if (updated.status === 'Rejected') {
      if (!updated.rejectionAnalysis || officialRejectionFeedback !== undefined || status !== current.status) {
        updated.rejectionAnalysis = buildRejectionAnalysis(updated, internship, user, db.internships);
      }
      if (toggleChecklistTaskId && updated.rejectionAnalysis) {
        updated.rejectionAnalysis = {
          ...updated.rejectionAnalysis,
          actionChecklist: updated.rejectionAnalysis.actionChecklist.map((t) =>
            t.id === toggleChecklistTaskId ? { ...t, completed: !t.completed } : t
          ),
        };
      }
    }

    userApps[idx] = updated;
    db.applications[user.userId] = userApps;
    saveDb(db);
    res.json({ applications: userApps });
  });

  app.delete('/api/applications/:id', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const appId = req.params.id;
    db.applications[user.userId] = (db.applications[user.userId] || []).filter((a) => a.id !== appId);
    saveDb(db);
    res.json({ applications: db.applications[user.userId] });
  });

  // 6. AI RESUME SCANNER ENDPOINT
  app.post('/api/ai/resume-scan', async (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { resumeText, fileName, targetRole, targetInternshipId } = req.body || {};
    if (!resumeText || String(resumeText).trim().length < 25) {
      res.status(400).json({
        error:
          'Unable to extract readable text from the document (fewer than 25 characters detected). Please upload a text-based PDF, DOCX, or TXT file, or paste your actual resume text.',
      });
      return;
    }

    const targetInternship = db.internships.find((i) => i.id === targetInternshipId);
    const baseReport = analyzeResumeContent(
      String(resumeText),
      fileName || 'Uploaded_Resume.pdf',
      targetRole || 'Full-Stack Development Intern',
      targetInternship,
      user,
      db.internships
    );

    // Optional server-side Gemini enhancement for strengths & role-specific feedback
    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await generateWithGemini(ai, {
          model: 'gemini-2.5-flash',
          contents: `Analyze this student resume truthfully against the role "${targetRole}"${
            targetInternship ? ` (${targetInternship.title} at ${targetInternship.organization})` : ''
          }. Never invent achievements or encourage claiming unlearned skills.\n\nResume Text:\n${String(
            resumeText
          ).slice(0, 3500)}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                roleAlignmentSummary: { type: Type.STRING },
                projectDescriptionTip: { type: Type.STRING },
              },
              required: ['roleAlignmentSummary', 'projectDescriptionTip'],
            },
          },
        });
        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (parsed.roleAlignmentSummary) {
            baseReport.sectionFeedback.roleAlignment = parsed.roleAlignmentSummary;
          }
          if (parsed.projectDescriptionTip) {
            baseReport.sectionFeedback.projectDescriptions = parsed.projectDescriptionTip;
          }
        }
      } catch (err) {
        // Keep validated rubric report if Gemini call fails
      }
    }

    // Update student profile resume text & store report
    db.profiles[user.userId] = {
      ...user,
      uploadedResumeName: fileName || 'Uploaded_Resume.pdf',
      uploadedResumeText: String(resumeText),
      uploadedResumeUpdatedAt: new Date().toISOString(),
    };
    db.resumeReports[user.userId] = [baseReport, ...(db.resumeReports[user.userId] || [])];
    saveDb(db);

    res.json({
      report: baseReport,
      reports: db.resumeReports[user.userId],
      profile: db.profiles[user.userId],
    });
  });

  // 7. AI MOCK INTERVIEW — GENERATE STRICTLY 15 ROLE-SPECIFIC QUESTIONS
  app.post('/api/ai/mock-interview/start', async (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { category, targetRole, targetInternshipId, experienceLevel, mode } = req.body || {};
    if (!category || !targetRole) {
      res.status(400).json({
        error: 'Please select both an interview category and a target role before generating questions.',
      });
      return;
    }

    const targetInternship = db.internships.find((i) => i.id === targetInternshipId);
    let questions = generateRoleSpecific15Questions(
      String(category),
      String(targetRole),
      targetInternship,
      user,
      String(experienceLevel || 'Intermediate (3rd/4th Year)')
    );

    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `Generate strictly 15 distinct, non-duplicate technical & project-based interview questions for a college student interviewing for:
Category: ${category}
Target Role: ${targetRole}
${
  targetInternship
    ? `Target Internship: ${targetInternship.title} at ${targetInternship.organization}\nRequired Skills: ${targetInternship.mandatoryRequirements.mandatorySkills.join(', ')}\nResponsibilities: ${targetInternship.responsibilities.join('; ')}`
    : ''
}
Experience Level: ${experienceLevel}
Student Projects: ${(user.projects || []).map((p) => `${p.title} (${p.technologies.join(', ')})`).join('; ') || 'General academic projects'}

Return a JSON array of exactly 15 question objects.`;

        const response = await generateWithGemini(ai, {
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  question: { type: Type.STRING },
                  whyAsked: { type: Type.STRING },
                  hint: { type: Type.STRING },
                  expectedKeyPoints: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ['topic', 'difficulty', 'question', 'whyAsked', 'hint', 'expectedKeyPoints'],
              },
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (Array.isArray(parsed) && parsed.length === 15) {
            questions = parsed.map((q, idx) => ({
              id: `q-ai-${Date.now()}-${idx + 1}`,
              index: idx + 1,
              topic: String(q.topic || category),
              difficulty:
                q.difficulty === 'Beginner' || q.difficulty === 'Intermediate' || q.difficulty === 'Practical Scenario'
                  ? q.difficulty
                  : 'Intermediate',
              question: String(q.question),
              whyAsked: String(q.whyAsked || 'Evaluates role-specific technical understanding.'),
              hint: String(q.hint || 'Explain the core concept and give a concrete example.'),
              expectedKeyPoints:
                Array.isArray(q.expectedKeyPoints) && q.expectedKeyPoints.length > 0
                  ? q.expectedKeyPoints.map(String)
                  : ['Core concept definition', 'Practical implementation example'],
              sampleStrongStructure:
                '1. Core concept definition -> 2. Technical mechanism -> 3. Practical example from your projects.',
            }));
          }
        }
      } catch (err) {
        // Validated 15 role-specific questions already prepared in `questions`
      }
    }

    if (questions.length !== 15) {
      res.status(500).json({ error: 'Failed to generate all 15 questions. Please retry.' });
      return;
    }

    const session: MockInterviewSession = {
      id: `iv-${Date.now()}`,
      userId: user.userId,
      category: String(category),
      targetRole: String(targetRole),
      targetInternshipId: targetInternship?.id,
      targetInternshipTitle: targetInternship ? `${targetInternship.title} (${targetInternship.organization})` : undefined,
      experienceLevel: experienceLevel || 'Intermediate (3rd/4th Year)',
      mode: mode || 'Practice Mode',
      createdAt: new Date().toISOString(),
      questions,
      answers: {},
    };

    db.interviewSessions[user.userId] = [session, ...(db.interviewSessions[user.userId] || [])];
    saveDb(db);
    res.status(201).json({
      session,
      sessions: db.interviewSessions[user.userId],
    });
  });

  app.put('/api/ai/mock-interview/:id', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const sessionId = req.params.id;
    const list = db.interviewSessions[user.userId] || [];
    const idx = list.findIndex((s) => s.id === sessionId);
    if (idx === -1) {
      res.status(404).json({ error: 'Interview session not found.' });
      return;
    }
    const updated: MockInterviewSession = {
      ...list[idx],
      ...req.body,
      id: list[idx].id,
      userId: user.userId,
    };
    list[idx] = updated;
    db.interviewSessions[user.userId] = list;
    saveDb(db);
    res.json({ session: updated, sessions: list });
  });

  // 8. AI INTERN & CAREER ASSISTANT (ENGLISH + TAMIL/THANGLISH SUPPORT)
  app.post('/api/ai/assistant', async (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { message, mode, language } = req.body || {};
    if (!message || !String(message).trim()) {
      res.status(400).json({ error: 'Please enter a question for the AI Assistant.' });
      return;
    }

    const eligibilitySummaries = db.internships.map((int) => {
      const rep = evaluateInternshipEligibility(int, user, db.internships);
      return `- ${int.title} at ${int.organization} (${int.workMode}, ${int.stipend}, Deadline: ${int.deadline}): Status = ${rep.status} (${rep.summaryReason})`;
    });

    const userSkills = (user.technicalCompetencies || []).map((t) => `${t.name} (${t.verificationType})`).join(', ');
    const latestResume = (db.resumeReports[user.userId] || [])[0];

    const ai = getGeminiClient();
    if (ai) {
      try {
        const sysInstruction = `You are the Free Intern AI ${
          mode === 'career' ? 'Career Planning' : 'Internship & Eligibility'
        } Assistant.
Student Name: ${user.fullName}
Degree & Dept: ${user.degree || 'Not specified'} in ${user.department || 'Not specified'} (Year: ${user.currentYear ?? 'Unspecified'}, Graduation: ${user.graduationYear ?? 'Unspecified'})
Verified Profile Skills: ${userSkills || 'None recorded yet'}
Target Roles: ${(user.targetRoles || []).join(', ')}
Latest Resume Score: ${latestResume ? `${latestResume.overallScore}/100` : 'No resume scanned yet'}
Language Preference: ${language === 'thanglish' ? 'Friendly Tamil / Thanglish mixed with clear English technical terms' : 'Simple, clear English suitable for college students'}

Active Verified Internships & Student Eligibility:
${eligibilitySummaries.join('\n')}

Strict Rules:
1. Never invent internship openings, deadlines, or rejection reasons.
2. Base all eligibility advice strictly on the student's actual profile and the verified listings above.
3. Provide actionable, encouraging, step-by-step advice.`;

        const response = await generateWithGemini(ai, {
          model: 'gemini-2.5-flash',
          contents: String(message),
          config: {
            systemInstruction: sysInstruction,
          },
        });

        if (response.text) {
          res.json({ reply: response.text });
          return;
        }
      } catch (err) {
        // Fallback to deterministic profile-grounded response below
      }
    }

    // Profile-grounded response using real student & internship records
    const eligibleList = db.internships.filter(
      (i) => evaluateInternshipEligibility(i, user, db.internships).status === 'Eligible'
    );
    const notEligibleList = db.internships.filter(
      (i) => evaluateInternshipEligibility(i, user, db.internships).status === 'Not Eligible Yet'
    );

    const isThanglish = language === 'thanglish' || /vanakkam|eppadi|tamil|thanglish/i.test(String(message));
    const reply = isThanglish
      ? `Vanakkam ${user.fullName}! Ungaloda Free Intern profile (${user.degree} ${user.department}, Graduation ${user.graduationYear}) base panni ippo **${eligibleList.length} verified internships**-ku neenga directly Eligible-aa irukkeenga:\n\n` +
        eligibleList
          .slice(0, 4)
          .map((i) => `• **${i.title}** — ${i.organization} (${i.workMode}, ${i.stipend}, Closes: ${i.deadline})`)
          .join('\n') +
        `\n\n**Skill Gap Analysis:** Innum ${notEligibleList.length} internships-ku apply panna **${(user.skillsLearningNow || ['TypeScript', 'Docker', 'PostgreSQL']).join(', ')}** skills-a Skill Development page-la padichu oru mini-project GitHub-la upload pannunga. Resume Scanner-la unga current score **${latestResume ? `${latestResume.overallScore}/100` : 'pending'}**.`
      : `Hello ${user.fullName}! Based on your verified profile (${user.degree || 'Degree pending'} in ${user.department || 'Department pending'}, Class of ${user.graduationYear || 'TBD'}) and your recorded skills (${userSkills || 'no skills added yet'}):\n\n` +
        `1. **Internships You Are Eligible For Right Now (${eligibleList.length}):**\n` +
        (eligibleList.length > 0
          ? eligibleList
              .slice(0, 4)
              .map((i) => `   • **${i.title}** at ${i.organization} (${i.workMode} · ${i.stipend} · Deadline: ${i.deadline})`)
              .join('\n')
          : '   • Complete your education and technical skills in My Profile to unlock eligible matches.') +
        `\n\n2. **High-Impact Skills to Learn Next:**\n` +
        `   • Developing **TypeScript, Docker, and PostgreSQL** with a documented GitHub project will unlock ${notEligibleList.length} additional internships (including Razorpay Full-Stack & Cloud Microservices).\n\n` +
        `3. **Recommended Next Step:**\n` +
        `   • Review your "Fix First" items in **AI Resume Scanner** (current advisory score: ${latestResume ? `${latestResume.overallScore}/100` : 'not scanned yet'}) and complete a 15-question session in **AI Mock Interview**.`;

    res.json({ reply });
  });

  // 9. SKILL DEVELOPMENT PROGRESS & ASSESSMENTS
  app.post('/api/skills/progress/toggle', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { itemId } = req.body || {};
    if (!itemId) {
      res.status(400).json({ error: 'itemId is required' });
      return;
    }
    const cur = db.learningProgress[user.userId] || [];
    const next = cur.includes(itemId) ? cur.filter((x) => x !== itemId) : [...cur, itemId];
    db.learningProgress[user.userId] = next;
    saveDb(db);
    res.json({ learningProgress: next });
  });

  app.post('/api/assessments/submit', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { assessmentId, skillName, category, badgeTitle, scorePercent, passed, areasToImprove } = req.body || {};
    const record: CompletedAssessmentRecord = {
      id: `ca-${Date.now()}`,
      userId: user.userId,
      assessmentId,
      skillName,
      badgeTitle,
      scorePercent: Number(scorePercent),
      passed: Boolean(passed),
      completedAt: new Date().toISOString().slice(0, 10),
      areasToImprove: areasToImprove || [],
    };

    const existingList = db.completedAssessments[user.userId] || [];
    db.completedAssessments[user.userId] = [record, ...existingList];

    // If passed, automatically upgrade or add all skills in skillName in Technical Competencies as 'Skill Assessment Verified'
    if (passed) {
      const profile = db.profiles[user.userId];
      const rawParts = String(skillName)
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
      const skillsToVerify = rawParts.length > 0 ? rawParts : [String(skillName).split('&')[0].trim()];

      for (const baseSkill of skillsToVerify) {
        const idx = profile.technicalCompetencies.findIndex(
          (t) => t.name.toLowerCase() === baseSkill.toLowerCase()
        );
        if (idx >= 0) {
          profile.technicalCompetencies[idx] = {
            ...profile.technicalCompetencies[idx],
            verificationType: 'Skill Assessment Verified',
            evidenceTitle: `${badgeTitle} (${scorePercent}%)`,
            lastUpdated: new Date().toISOString().slice(0, 10),
          };
        } else {
          profile.technicalCompetencies.push({
            id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: baseSkill,
            category: category || 'Frameworks and Libraries',
            selfReportedLevel: 'Intermediate',
            verificationType: 'Skill Assessment Verified',
            evidenceTitle: `${badgeTitle} (${scorePercent}%)`,
            lastUpdated: new Date().toISOString().slice(0, 10),
          });
        }
      }
      db.profiles[user.userId] = profile;
      if (!db.aiRecommendations) {
        db.aiRecommendations = {};
      }
      db.aiRecommendations[user.userId] = generatePersonalizedAiRecommendations(
        db.internships,
        profile
      );
    }

    saveDb(db);
    res.json({
      completedAssessments: db.completedAssessments[user.userId],
      profile: db.profiles[user.userId],
      aiRecommendations: db.aiRecommendations?.[user.userId] || [],
    });
  });

  // 10. NOTIFICATIONS
  app.post('/api/notifications/mark-read', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { notificationId } = req.body || {};
    db.notifications[user.userId] = (db.notifications[user.userId] || []).map((n) =>
      !notificationId || n.id === notificationId ? { ...n, read: true } : n
    );
    saveDb(db);
    res.json({ notifications: db.notifications[user.userId] });
  });

  // 11. ADMIN & POST INTERNSHIP ENDPOINTS (RBAC ENFORCED ON BACKEND)
  app.post('/api/admin/internships', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (user.role !== 'admin') {
      res.status(403).json({
        error: 'Forbidden: Only authorized administrators can publish verified internship listings.',
      });
      return;
    }
    const body = req.body || {};
    if (!body.title || !body.organization || !body.applicationUrl || !body.officialSourceUrl) {
      res.status(400).json({
        error: 'Title, organization, official source URL, and application URL are required.',
      });
      return;
    }
    const newListing: InternshipListing = {
      id: `int-custom-${Date.now()}`,
      title: String(body.title).trim(),
      organization: String(body.organization).trim(),
      organizationType: body.organizationType || 'Private',
      roleCategory: body.roleCategory || 'Full-Stack Development',
      description: String(body.description || '').trim(),
      responsibilities: Array.isArray(body.responsibilities) ? body.responsibilities : ['Contribute to engineering tasks'],
      workMode: body.workMode || 'Online',
      location: String(body.location || 'Remote').trim(),
      isPaid: Boolean(body.isPaid),
      stipend: String(body.stipend || (body.isPaid ? '₹15,000 / month' : 'Unpaid')).trim(),
      stipendAmountMonthly: Number(body.stipendAmountMonthly || 0),
      duration: String(body.duration || '3 Months').trim(),
      openingDate: new Date().toISOString().slice(0, 10),
      deadline: String(body.deadline || '2026-12-15'),
      mandatoryRequirements: {
        allowedDegrees: body.allowedDegrees || ['B.E.', 'B.Tech', 'B.Sc', 'BCA', 'MCA'],
        allowedDepartments: body.allowedDepartments || ['Computer Science', 'Information Technology'],
        allowedYearsOfStudy: body.allowedYearsOfStudy || [3, 4],
        allowedGraduationYears: body.allowedGraduationYears || [2026, 2027],
        mandatorySkills: body.mandatorySkills || ['JavaScript', 'Git'],
      },
      preferredSkills: body.preferredSkills || [],
      selectionProcess: body.selectionProcess || ['Resume Screening', 'Technical Interview'],
      officialSourceName: String(body.officialSourceName || body.organization).trim(),
      officialSourceUrl: String(body.officialSourceUrl).trim(),
      applicationUrl: String(body.applicationUrl).trim(),
      supportsInternalApply: Boolean(body.supportsInternalApply),
      verificationStatus: body.verificationStatus || 'Verified Official Source',
      lastVerifiedDate: new Date().toISOString().slice(0, 10),
    };

    db.internships = [newListing, ...db.internships];
    saveDb(db);
    res.status(201).json({ internships: db.internships });
  });

  app.patch('/api/admin/internships/:id', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Administrator role required.' });
      return;
    }
    const id = req.params.id;
    db.internships = db.internships.map((item) =>
      item.id === id
        ? {
            ...item,
            ...req.body,
            lastVerifiedDate: new Date().toISOString().slice(0, 10),
          }
        : item
    );
    saveDb(db);
    res.json({ internships: db.internships });
  });

function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port, '0.0.0.0');
  });
}

async function findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
  for (let p = startPort; p < startPort + maxAttempts; p++) {
    const available = await checkPortAvailable(p);
    if (available) {
      return p;
    }
    console.warn(`[Port Conflict] Port ${p} is in use by another process. Automatically checking port ${p + 1}...`);
  }
  return startPort;
}

export async function startServer() {
  const initialPort = PORT;
  const availablePort = await findAvailablePort(initialPort);

  const server = http.createServer(app);

  // Vite development middleware (local development only)
  if (process.env.NODE_ENV !== 'production' && !isVercel) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Bind Vite HMR to HTTP server so it never conflicts on port 24678
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!isVercel) {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  server.once('error', (err: any) => {
    console.error('[Server Error]', err);
  });

  server.listen(availablePort, '0.0.0.0', () => {
    console.log(`\n===============================================================`);
    console.log(`  FREE INTERN FULL-STACK PLATFORM`);
    console.log(`  Status: Running successfully`);
    console.log(`  Local URL:   http://localhost:${availablePort}`);
    console.log(`  Network URL: http://0.0.0.0:${availablePort}`);
    console.log(`===============================================================\n`);
  });
}

if (!isVercel && process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
