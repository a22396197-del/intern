import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Lock,
  Mail,
  User,
  GraduationCap,
  X,
  Download,
} from 'lucide-react';
import type { StudentProfile } from '../types.ts';

export const FreeInternLogo: React.FC<{ size?: 'sm' | 'md' | 'hero' }> = ({ size = 'md' }) => {
  const dimensions =
    size === 'hero' ? 'w-24 h-24' : size === 'md' ? 'w-12 h-12' : 'w-9 h-9';
  const svgSize = size === 'hero' ? 'w-16 h-16' : size === 'md' ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <div
      className={`${dimensions} rounded-2xl bg-gradient-to-br from-[#292344] via-[#6554C0] to-[#2A9D8F] p-[2px] shadow-sm inline-flex items-center justify-center shrink-0`}
    >
      <div className="w-full h-full rounded-[14px] bg-[#292344] flex items-center justify-center relative overflow-hidden">
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={svgSize}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="fiShieldGrad" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6554C0" />
              <stop offset="55%" stopColor="#2A9D8F" />
              <stop offset="100%" stopColor="#F28B72" />
            </linearGradient>
          </defs>
          {/* Outer Career Shield */}
          <path
            d="M32 6L52 14V30C52 43.5 43.2 53.6 32 58C20.8 53.6 12 43.5 12 30V14L32 6Z"
            fill="#292344"
            stroke="url(#fiShieldGrad)"
            strokeWidth="3.5"
          />
          {/* Graduation Cap Mortarboard */}
          <path
            d="M32 15L47 22L32 29L17 22L32 15Z"
            fill="#EEE9FF"
          />
          <path
            d="M23 25.5V32.5C23 35.2 27 37.5 32 37.5C37 37.5 41 35.2 41 32.5V25.5"
            stroke="#2A9D8F"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Tassel */}
          <path
            d="M45 23V31"
            stroke="#F28B72"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="45" cy="32.5" r="2" fill="#F28B72" />
          {/* Rising Career Nodes */}
          <path
            d="M22 45L29 39L35 43L42 35"
            stroke="#DDF5EA"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="22" cy="45" r="2.3" fill="#2A9D8F" />
          <circle cx="29" cy="39" r="2.3" fill="#6554C0" />
          <circle cx="35" cy="43" r="2.3" fill="#2A9D8F" />
          <circle cx="42" cy="35" r="2.6" fill="#F28B72" />
        </svg>
      </div>
    </div>
  );
};

interface EntryAndAuthViewProps {
  onAuthenticated: (
    token: string,
    profile: StudentProfile,
    bootstrapPayload?: {
      profile?: StudentProfile;
      internships?: any[];
      savedInternshipIds?: string[];
      applications?: any[];
      resumeReports?: any[];
      interviewSessions?: any[];
      completedAssessments?: any[];
      learningProgress?: string[];
      notifications?: any[];
      aiRecommendations?: any[];
    }
  ) => void;
}

export const EntryAndAuthView: React.FC<EntryAndAuthViewProps> = ({ onAuthenticated }) => {
  const [screen, setScreen] = useState<'entry' | 'login' | 'signup' | 'forgot'>('entry');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [college, setCollege] = useState('');
  const [degree, setDegree] = useState('B.Tech');
  const [department, setDepartment] = useState('Computer Science and Engineering');
  const [currentYear, setCurrentYear] = useState('3');
  const [graduationYear, setGraduationYear] = useState('2027');
  const [initialSkillsText, setInitialSkillsText] = useState(
    'JavaScript, Python, HTML, CSS, React, SQL, Git'
  );

  // Password Reset fields
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | 'google-oauth' | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please check your credentials.');
      } else {
        onAuthenticated(data.token, data.profile, data);
      }
    } catch (_err) {
      setError('Network error while connecting to the authentication server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setInfoMessage(null);
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: demoPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Demo login failed.');
      } else {
        onAuthenticated(data.token, data.profile, data);
      }
    } catch (_err) {
      setError('Network error while signing in.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Full name, email address, and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          college: college.trim(),
          degree,
          department: department.trim(),
          currentYear: Number(currentYear),
          graduationYear: Number(graduationYear),
          initialSkills: initialSkillsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create account.');
      } else {
        onAuthenticated(data.token, data.profile, data);
      }
    } catch (_err) {
      setError('Network error while creating your student account.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    if (!resetEmail.trim() || resetNewPassword.length < 6) {
      setError('Please enter your registered email and a new password (at least 6 characters).');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim(), newPassword: resetNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not reset password.');
      } else {
        setInfoMessage(data.message);
        setEmail(resetEmail.trim());
        setTimeout(() => setScreen('login'), 1200);
      }
    } catch (_err) {
      setError('Network error during password reset.');
    } finally {
      setLoading(false);
    }
  };

  if (screen === 'entry') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] text-[#292936] flex flex-col justify-between">
        {/* Top Bar following 3-zone contract */}
        <header className="h-16 flex items-center justify-between gap-8 px-6 md:px-12 border-b border-[#E8E5EF] bg-[#FFFFFF]">
          <button
            type="button"
            onClick={() => setScreen('login')}
            className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#292344] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FreeInternLogo size="sm" />
            <span>Free Intern</span>
          </button>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#747484]">
            <a
              href="#features"
              className="hover:text-[#292344] transition-colors whitespace-nowrap shrink-0"
            >
              Eligibility Verification
            </a>
            <a
              href="#features"
              className="hover:text-[#292344] transition-colors whitespace-nowrap shrink-0"
            >
              Government Programs
            </a>
            <a
              href="#features"
              className="hover:text-[#292344] transition-colors whitespace-nowrap shrink-0"
            >
              Resume Scanner
            </a>
            <a
              href="#features"
              className="hover:text-[#292344] transition-colors whitespace-nowrap shrink-0"
            >
              AI Mock Interview
            </a>
          </nav>
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="/api/download-project-zip"
              download="free-intern-complete-project.zip"
              className="h-9 px-3.5 inline-flex items-center gap-1.5 justify-center text-xs font-semibold text-[#292344] bg-[#DDF5EA] hover:bg-[#2A9D8F]/25 border border-[#2A9D8F]/40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#2A9D8F]" />
              <span>Download Project (.zip)</span>
            </a>
            <button
              type="button"
              onClick={() => setScreen('login')}
              className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] rounded-lg hover:bg-[#6554C0] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              Continue to Login
            </button>
          </div>
        </header>

        {/* Animated Entry Hero */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-[#FAF9F6] via-[#FFFFFF] to-[#EEE9FF]/35">
          <div className="max-w-4xl w-full text-center space-y-6">
            {/* Interactive Animated Free Intern Logo — Click Logo to Enter Login Page */}
            <div className="flex flex-col items-center justify-center space-y-3">
              <button
                type="button"
                onClick={() => setScreen('login')}
                aria-label="Click Free Intern logo to enter login page"
                className="animate-logo-reveal group relative mx-auto rounded-3xl px-8 py-6 bg-[#FFFFFF] border-2 border-[#E8E5EF] hover:border-[#6554C0] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.99] shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6554C0] focus:ring-offset-2 flex flex-col items-center gap-3"
              >
                <div
                  className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-[#6554C0]/20 via-[#2A9D8F]/20 to-[#F28B72]/20 blur-xl opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none"
                  aria-hidden="true"
                />
                <div className="relative">
                  <FreeInternLogo size="hero" />
                </div>
                <div className="relative space-y-0.5">
                  <p className="text-base font-bold text-[#292344]">Free Intern</p>
                  <p className="text-[11px] font-medium text-[#747484]">
                    Student Career &amp; Internship Readiness
                  </p>
                </div>
                <span className="relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#EEE9FF] group-hover:bg-[#292344] text-[#292344] group-hover:text-[#FFFFFF] text-xs font-semibold transition-colors">
                  <span>Click Logo to Enter Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>

            <div className="animate-fade-slide-up space-y-3">
              <p className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EEE9FF] border border-[#E8E5EF] text-xs font-semibold tracking-wide text-[#6554C0]">
                AI-Powered Student Internship & Career Platform
              </p>
              <h1
                className="text-4xl md:text-5xl font-bold tracking-tight text-[#292344]"
                style={{ textWrap: 'balance' }}
              >
                Free Intern
              </h1>
              <p className="text-lg md:text-xl font-semibold text-[#2A9D8F]">
                Discover Internships. Build Skills. Start Your Career.
              </p>
              <p className="text-sm md:text-base text-[#747484] max-w-2xl mx-auto leading-relaxed">
                Verify your exact eligibility against mandatory academic and skill requirements, explore official Central & State Government internships, scan your resume for truthful keywords, and practice 15-question role-specific interviews.
              </p>
            </div>

            <div className="animate-fade-slide-up pt-2 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setScreen('login')}
                className="h-11 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Get Started / Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setScreen('signup')}
                className="h-11 px-6 inline-flex items-center justify-center text-sm font-semibold text-[#292344] bg-[#FFFFFF] hover:bg-[#EEE9FF]/60 border border-[#E8E5EF] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Create Student Account
              </button>
            </div>

            {/* Feature Overview Grid */}
            <div
              id="features"
              className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-5 text-left items-stretch"
            >
              <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E5EF] flex flex-col justify-between h-full shadow-2xs">
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-[#DDF5EA] text-[#2A9D8F] flex items-center justify-center font-bold text-xs">
                    01
                  </div>
                  <h2 className="text-sm font-bold text-[#292344]">
                    Transparent Eligibility Checks
                  </h2>
                  <p className="text-xs text-[#747484] leading-relaxed">
                    See Internships You Are Eligible For alongside Not Eligible Yet opportunities, separating learnable skill gaps from fixed academic cohort criteria.
                  </p>
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E5EF] flex flex-col justify-between h-full shadow-2xs">
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EEE9FF] text-[#6554C0] flex items-center justify-center font-bold text-xs">
                    02
                  </div>
                  <h2 className="text-sm font-bold text-[#292344]">
                    Government & PM Internship Hub
                  </h2>
                  <p className="text-xs text-[#747484] leading-relaxed">
                    Dedicated access to verified Central, State, Research (MeitY, NITI Aayog, ISRO, TNeGA), and Prime Minister’s Internship Scheme opportunities.
                  </p>
                </div>
              </div>
              <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E5EF] flex flex-col justify-between h-full shadow-2xs">
                <div className="space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FFF0E8] text-[#F28B72] flex items-center justify-center font-bold text-xs">
                    03
                  </div>
                  <h2 className="text-sm font-bold text-[#292344]">
                    Truthful AI Resume & Interview Lab
                  </h2>
                  <p className="text-xs text-[#747484] leading-relaxed">
                    Extract real resume text to identify safe-to-add keywords, analyze application rejections honestly, and practice 15 role-specific interview questions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="px-6 md:px-12 py-4 border-t border-[#E8E5EF] bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-4 text-xs text-[#747484]">
          <span>Free Intern — Student Career & Internship Readiness Platform</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setLegalModal('terms')}
              className="hover:text-[#292344] underline cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => setLegalModal('privacy')}
              className="hover:text-[#292344] underline cursor-pointer"
            >
              Privacy Policy
            </button>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#292936] flex flex-col justify-between">
      {/* Header */}
      <header className="h-16 flex items-center justify-between gap-8 px-6 md:px-12 border-b border-[#E8E5EF] bg-[#FFFFFF]">
        <button
          type="button"
          onClick={() => setScreen('entry')}
          className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#292344] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FreeInternLogo size="sm" />
          <span>Free Intern</span>
        </button>
        <div className="text-xs font-medium text-[#747484] hidden sm:block">
          Discover Internships. Build Skills. Start Your Career.
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {screen !== 'login' ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setInfoMessage(null);
                setScreen('login');
              }}
              className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#FAF9F6] border border-[#E8E5EF] rounded-lg hover:bg-[#EEE9FF]/60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Back to Login
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setInfoMessage(null);
                setScreen('signup');
              }}
              className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] rounded-lg hover:bg-[#6554C0] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Create Account
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="animate-fade-slide-up max-w-md w-full bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] p-6 md:p-8 shadow-xs">
          {/* Logo Header */}
          <div className="flex items-center gap-3.5 mb-6">
            <FreeInternLogo size="md" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-[#292344] leading-snug">
                {screen === 'login'
                  ? 'Sign in to Free Intern'
                  : screen === 'signup'
                  ? 'Create Student Account'
                  : 'Reset Your Password'}
              </h1>
              <p className="text-xs text-[#747484] mt-0.5">
                {screen === 'login'
                  ? 'Access your personalized internship eligibility & career workspace'
                  : screen === 'signup'
                  ? 'Start your personalized student profile and skill roadmap'
                  : 'Enter your registered student email to update your password'}
              </p>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3.5 rounded-xl bg-[#FFF0E8] border border-[#F28B72]/50 text-[#292344] text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#F28B72]" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div
              role="status"
              className="mb-4 p-3.5 rounded-xl bg-[#DDF5EA] border border-[#2A9D8F]/40 text-[#292344] text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#2A9D8F]" />
              <span>{infoMessage}</span>
            </div>
          )}

          {screen === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-semibold text-[#292344] mb-1.5">
                  Student or Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#747484] absolute left-3 top-2.5" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@freeintern.edu"
                    required
                    className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] text-[#292936] focus:outline-none focus:border-[#6554C0]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-xs font-semibold text-[#292344]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setResetEmail(email);
                      setScreen('forgot');
                    }}
                    className="text-xs font-semibold text-[#6554C0] hover:text-[#292344] hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#747484] absolute left-3 top-2.5" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full h-9 pl-9 pr-10 text-sm rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] text-[#292936] focus:outline-none focus:border-[#6554C0]"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-2 text-[#747484] hover:text-[#292344] p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 px-4 inline-flex items-center justify-center text-sm font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Signing in...' : 'Login to Free Intern'}
              </button>

              {/* Quick Verified Demo Sessions for Evaluation & Testing */}
              <div className="pt-3.5 border-t border-[#E8E5EF] space-y-2">
                <p className="text-[11px] font-medium text-[#747484]">
                  Instant Verified Accounts (Pre-loaded with Profile & Internships):
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('student@freeintern.edu', 'Student@123')}
                    className="h-9 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#EEE9FF]/70 hover:bg-[#EEE9FF] border border-[#E8E5EF] rounded-lg transition-colors cursor-pointer"
                  >
                    Student Account
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin@freeintern.edu', 'Admin@123')}
                    className="h-9 px-3 inline-flex items-center justify-center text-xs font-semibold text-[#292344] bg-[#FAF9F6] hover:bg-[#EEE9FF]/50 border border-[#E8E5EF] rounded-lg transition-colors cursor-pointer"
                  >
                    Admin Account
                  </button>
                </div>
              </div>

              {/* Continue with Google */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setLegalModal('google-oauth')}
                  className="w-full h-9 px-4 inline-flex items-center justify-center gap-2 text-xs font-semibold text-[#292936] bg-[#FFFFFF] hover:bg-[#FAF9F6] border border-[#E8E5EF] rounded-lg transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-[#2A9D8F]" />
                  <span>Continue with Google (Configuration Info)</span>
                </button>
              </div>

              <p className="text-xs text-center text-[#747484] pt-2">
                New to Free Intern?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setScreen('signup');
                  }}
                  className="font-semibold text-[#6554C0] hover:text-[#292344] hover:underline cursor-pointer"
                >
                  Create Account / Sign Up
                </button>
              </p>
            </form>
          )}

          {screen === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="signup-name" className="block text-xs font-semibold text-[#292344] mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#747484] absolute left-3 top-2.5" />
                  <input
                    id="signup-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Priya Darshini S"
                    required
                    className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-semibold text-[#292344] mb-1">
                  College or Personal Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#747484] absolute left-3 top-2.5" />
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@college.edu"
                    required
                    className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-xs font-semibold text-[#292344] mb-1">
                  Password (min 6 characters) *
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="w-full h-9 px-3 text-sm rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
                />
              </div>

              <div>
                <label htmlFor="signup-college" className="block text-xs font-semibold text-[#292344] mb-1">
                  College / University (Optional now, editable later)
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-[#747484] absolute left-3 top-2.5" />
                  <input
                    id="signup-college"
                    type="text"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g., PSG College of Technology"
                    className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="signup-degree" className="block text-xs font-semibold text-[#292344] mb-1">
                    Degree
                  </label>
                  <select
                    id="signup-degree"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
                  >
                    <option value="B.Tech">B.Tech</option>
                    <option value="B.E.">B.E.</option>
                    <option value="B.Sc">B.Sc</option>
                    <option value="BCA">BCA</option>
                    <option value="MCA">MCA</option>
                    <option value="M.Tech">M.Tech</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="signup-gradyear" className="block text-xs font-semibold text-[#292344] mb-1">
                    Graduation Year
                  </label>
                  <select
                    id="signup-gradyear"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
                  >
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                    <option value="2029">2029</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="signup-dept" className="block text-xs font-semibold text-[#292344] mb-1">
                    Department
                  </label>
                  <input
                    id="signup-dept"
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
                  />
                </div>
                <div>
                  <label htmlFor="signup-year" className="block text-xs font-semibold text-[#292344] mb-1">
                    Current Year
                  </label>
                  <select
                    id="signup-year"
                    value={currentYear}
                    onChange={(e) => setCurrentYear(e.target.value)}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="signup-skills" className="block text-xs font-semibold text-[#292344] mb-1">
                  Your Technical Skills (Comma-separated, editable in My Profile)
                </label>
                <input
                  id="signup-skills"
                  type="text"
                  value={initialSkillsText}
                  onChange={(e) => setInitialSkillsText(e.target.value)}
                  placeholder="e.g., JavaScript, Python, HTML, CSS, React, SQL, Git"
                  className="w-full h-9 px-3 text-sm rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 px-4 inline-flex items-center justify-center text-sm font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Creating Account...' : 'Create Student Account & Continue'}
              </button>
            </form>
          )}

          {screen === 'forgot' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-xs font-semibold text-[#292344] mb-1">
                  Registered Student Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="student@freeintern.edu"
                  required
                  className="w-full h-9 px-3 text-sm rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
                />
              </div>
              <div>
                <label htmlFor="reset-pass" className="block text-xs font-semibold text-[#292344] mb-1">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#747484] absolute left-3 top-2.5" />
                  <input
                    id="reset-pass"
                    type="password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-[#E8E5EF] bg-[#FFFFFF] focus:outline-none focus:border-[#6554C0]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 px-4 inline-flex items-center justify-center text-sm font-semibold text-[#FFFFFF] bg-[#292344] hover:bg-[#6554C0] rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          )}

          {/* Legal Links */}
          <div className="mt-6 pt-4 border-t border-[#E8E5EF] flex items-center justify-center gap-4 text-[11px] text-[#747484]">
            <button
              type="button"
              onClick={() => setLegalModal('terms')}
              className="hover:text-[#292344] underline cursor-pointer"
            >
              Terms of Service
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setLegalModal('privacy')}
              className="hover:text-[#292344] underline cursor-pointer"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </main>

      {/* Modals for Terms, Privacy, or Google OAuth Setup Info */}
      {legalModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#292344]/40 flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFFFF] rounded-2xl border border-[#E8E5EF] max-w-lg w-full p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#E8E5EF] pb-3">
              <h2 className="text-base font-bold text-[#292344]">
                {legalModal === 'terms'
                  ? 'Free Intern — Terms of Service'
                  : legalModal === 'privacy'
                  ? 'Free Intern — Student Privacy Policy'
                  : 'Google OAuth Configuration Guide'}
              </h2>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setLegalModal(null)}
                className="p-1 text-[#747484] hover:text-[#292344] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-[#292936] space-y-2.5 leading-relaxed">
              {legalModal === 'terms' && (
                <>
                  <p>
                    1. <strong>Honest Representation:</strong> Free Intern helps students verify eligibility and improve resumes using actual profile and project evidence. Students should never claim fabricated skills or credentials.
                  </p>
                  <p>
                    2. <strong>Official Application Portals:</strong> External internships and Government schemes redirect to their official portals. Free Intern never claims an external application was auto-submitted without your action.
                  </p>
                  <p>
                    3. <strong>Advisory AI Scores:</strong> Eligibility relevance scores, resume scores, and mock interview evaluations are advisory educational tools, not guarantees of recruitment selection.
                  </p>
                </>
              )}
              {legalModal === 'privacy' && (
                <>
                  <p>
                    1. <strong>Strict Account Isolation:</strong> Your student profile, uploaded resume text, application tracker records, and mock interview sessions are scoped strictly to your authenticated user ID.
                  </p>
                  <p>
                    2. <strong>No Public Sharing:</strong> Other students cannot view your private profile, resume reports, or application status history.
                  </p>
                  <p>
                    3. <strong>Server-Side AI Security:</strong> All AI calls run through server-side endpoints so API credentials are never exposed in client code.
                  </p>
                </>
              )}
              {legalModal === 'google-oauth' && (
                <>
                  <p>
                    To enable <strong>Continue with Google</strong> in your deployment environment, configure a Google Cloud OAuth 2.0 Client ID:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Open Google Cloud Console → <strong>APIs & Services → Credentials</strong>.</li>
                    <li>Create an <strong>OAuth 2.0 Client ID</strong> (Web Application).</li>
                    <li>Add your Authorized JavaScript Origin and Redirect URI (<code>/api/auth/google/callback</code>).</li>
                    <li>Set <code>GOOGLE_CLIENT_ID</code> in your environment configuration.</li>
                  </ul>
                  <p className="pt-1 text-[#6554C0] font-medium">
                    In this environment, you can sign in immediately using Email & Password or the pre-verified Student / Admin accounts on the login form.
                  </p>
                </>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="h-9 px-4 inline-flex items-center justify-center text-xs font-semibold text-[#FFFFFF] bg-[#292344] rounded-lg hover:bg-[#6554C0] cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
