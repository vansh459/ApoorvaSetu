import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DEMO_PASSWORD } from '../../services/authService';
import { getDataMode } from '../../services/repositories';
import { UserRole } from '../../types';
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Zap,
  Eye as EyeIcon,
  Shield,
  BarChart2,
  AlertCircle,
  CheckCircle2,
  X,
  KeyRound,
  Building2,
  Users,
  Compass,
  FileCheck2,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface DemoAccountInfo {
  role: UserRole;
  roleTitle: string;
  name: string;
  email: string;
  description: string;
  scope: string;
  icon: any;
  color: string;
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const remoteAuthEnabled = getDataMode() === 'supabase';

  const [email, setEmail] = useState(remoteAuthEnabled ? '' : 'aicteadmin@apoorvasetu.demo');
  const [password, setPassword] = useState(remoteAuthEnabled ? '' : 'Apoorva@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isDemoHelperOpen, setIsDemoHelperOpen] = useState(false);

  const demoAccounts: DemoAccountInfo[] = [
    {
      role: 'SUPER_ADMIN',
      roleTitle: 'Super Admin',
      name: 'Dr. Ramesh Pokhriyal',
      email: 'superadmin@apoorvasetu.demo',
      description: 'System-wide governance, user management, audit logs, configuration',
      scope: 'National Authority',
      icon: Users,
      color: 'bg-purple-600'
    },
    {
      role: 'AICTE_ADMIN',
      roleTitle: 'AICTE Central Admin',
      name: 'Amit Sharma',
      email: 'aicteadmin@apoorvasetu.demo',
      description: 'National approval operations, centralized workflow oversight, EVC management',
      scope: 'Central AICTE HQ',
      icon: Shield,
      color: 'bg-blue-600'
    },
    {
      role: 'REGIONAL_OFFICER',
      roleTitle: 'Regional Officer',
      name: 'Dr. R. K. Sharma',
      email: 'regional@apoorvasetu.demo',
      description: 'Regional scrutiny, document verification, forwarding eligible applications',
      scope: 'Northern Region Jurisdiction',
      icon: Compass,
      color: 'bg-teal-600'
    },
    {
      role: 'EVC_MEMBER',
      roleTitle: 'EVC Committee Member',
      name: 'Prof. S. Banerjee',
      email: 'evc@apoorvasetu.demo',
      description: 'Institutional physical inspection, checklist scoring, evidence upload',
      scope: 'Inspection Committee North-A',
      icon: FileCheck2,
      color: 'bg-amber-600'
    },
    {
      role: 'INSTITUTION_ADMIN',
      roleTitle: 'Institution Admin',
      name: 'Dr. K. S. Murthy',
      email: 'institute@apoorvasetu.demo',
      description: 'Submit EoA applications, monitor progress timeline, upload compliance',
      scope: 'ABC Institute of Tech (INST-101)',
      icon: Building2,
      color: 'bg-rose-600'
    }
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your username or email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password, rememberMe);
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyDemoAccount = (acc: DemoAccountInfo) => {
    setEmail(acc.email);
    setPassword(DEMO_PASSWORD);
    setErrorMessage('');
    setIsDemoHelperOpen(false);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white text-slate-800 relative selection:bg-blue-100 selection:text-blue-900">
      {/* Demo helper only exists in offline demo mode; production uses Supabase Auth. */}
      <div className="absolute top-4 right-4 z-20">
        {remoteAuthEnabled ? (
          <span className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Official AICTE sign-in</span>
          </span>
        ) : (
          <button
            onClick={() => setIsDemoHelperOpen(true)}
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-blue-700 border border-blue-200/80 shadow-xs hover:shadow-md text-xs font-semibold backdrop-blur-xs transition-all cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
            <span>Demo Credentials</span>
          </button>
        )}
      </div>

      {/* Main Container: Split 2-Column Layout matching Reference Exactly */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Column: Brand & 4 Feature Value Props */}
        <div className="w-full lg:w-[42%] xl:w-[38%] bg-white p-8 sm:p-12 lg:p-16 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-100">
          <div className="max-w-md mx-auto w-full space-y-10 sm:space-y-12">
            {/* Header Brand */}
            <div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-start mb-3">
                <img
                  src="/apoorvasetu-icon.png"
                  alt="ApoorvaSetu Icon"
                  className="w-full h-full object-contain drop-shadow-xs"
                />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0e2a5c] tracking-tight">
                ApoorvaSetu
              </h1>
              <p className="text-sm sm:text-base font-medium text-slate-500 mt-1">
                AICTE Approvals, Simplified
              </p>
            </div>

            {/* 4 Feature Items */}
            <div className="space-y-6 sm:space-y-7">
              {/* Item 1: Streamlined Approvals */}
              <div className="flex items-start space-x-4">
                <div className="w-11 h-11 rounded-full bg-[#e8f1fc] text-[#1976d2] flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    Streamlined Approvals
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
                    Digitize and automate AICTE workflows
                  </p>
                </div>
              </div>

              {/* Item 2: Greater Transparency */}
              <div className="flex items-start space-x-4">
                <div className="w-11 h-11 rounded-full bg-[#eef2f9] text-[#2563eb] flex items-center justify-center shrink-0 mt-0.5">
                  <EyeIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    Greater Transparency
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
                    Track progress in real-time
                  </p>
                </div>
              </div>

              {/* Item 3: Regulatory Compliance */}
              <div className="flex items-start space-x-4">
                <div className="w-11 h-11 rounded-full bg-[#eaf8f0] text-[#16a34a] flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    Regulatory Compliance
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
                    Manage documents and undertakings
                  </p>
                </div>
              </div>

              {/* Item 4: Data-Driven Governance */}
              <div className="flex items-start space-x-4">
                <div className="w-11 h-11 rounded-full bg-[#e6f7f6] text-[#0d9488] flex items-center justify-center shrink-0 mt-0.5">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    Data-Driven Governance
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
                    Insights for better decision making
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pale Blue-Grey Background with Centered Login Card */}
        <div className="flex-1 bg-[#f4f7fb] flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12">
          {/* Centered Login Card */}
          <div className="w-full max-w-[430px] bg-white rounded-3xl p-7 sm:p-9 shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-slate-200/70">
            {/* Card Brand Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <img
                  src="/apoorvasetu-icon.png"
                  alt="ApoorvaSetu Icon"
                  className="w-full h-full object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-[#0e2a5c] tracking-tight">
                ApoorvaSetu
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Sign in to your AICTE Portal
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Username / Email ID field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username / Email ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your AICTE user ID or official email"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Sign In Primary Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white bg-[#1976d2] hover:bg-[#1565c0] active:scale-[0.98] focus:outline-hidden focus:ring-2 focus:ring-blue-500/40 shadow-xs hover:shadow-md transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-1"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* Bottom Contact Help inside Card */}
            <p className="text-[11px] text-center text-slate-600 mt-6 leading-relaxed">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setIsContactModalOpen(true)}
                className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline-offset-2 hover:underline"
              >
                Contact AICTE for portal access
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Full Page Bottom Footer */}
      <footer className="py-3 px-4 border-t border-slate-200/80 bg-white text-center text-[11px] sm:text-xs text-slate-500">
        © 2026 AICTE - Technical Approvals and Quality Assurance Division. Powered by ApoorvaSetu
      </footer>

      {/* Demo Credentials Drawer / Popover for Evaluators */}
      {!remoteAuthEnabled && isDemoHelperOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-modal-backdrop">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-modal-content">
            <button
              onClick={() => setIsDemoHelperOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer active:scale-90 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 mb-1">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900">
                Authorized Evaluator Credentials
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Select any role below to automatically fill the login form. Standard password: <code className="bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">{DEMO_PASSWORD}</code>
            </p>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {demoAccounts.map((account) => {
                const Icon = account.icon;
                return (
                  <div
                    key={account.role}
                    onClick={() => handleApplyDemoAccount(account)}
                    className="p-3 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${account.color} text-white flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 truncate">
                            {account.roleTitle}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                            {account.scope}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {account.email}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors ml-2"
                    >
                      Fill Form
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Smart India Hackathon 2026 Edition</span>
              <button
                onClick={() => setIsDemoHelperOpen(false)}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-modal-backdrop">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-modal-content">
            <button
              onClick={() => {
                setIsForgotModalOpen(false);
                setForgotSubmitted(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer active:scale-90 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Password Recovery Workflow
            </h3>

            {forgotSubmitted ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-700">
                  Password reset challenge dispatched to{' '}
                  <strong className="text-slate-900">{forgotEmail}</strong>.
                </p>
                <p className="text-[11px] text-slate-500">
                  For this local development sandbox, use the shared password: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-bold">{DEMO_PASSWORD}</code>.
                </p>
                <button
                  onClick={() => {
                    setIsForgotModalOpen(false);
                    setForgotSubmitted(false);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white cursor-pointer mt-2"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4 mt-3">
                <p className="text-xs text-slate-500">
                  Enter your registered institutional or AICTE officer email address to receive an authentication challenge link.
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@aicte-india.org or principal@college.edu"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 text-slate-900 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-hidden"
                />
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-[#1976d2] hover:bg-[#1565c0] text-xs font-semibold text-white cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Contact AICTE Modal */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsContactModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              AICTE Portal Access Helpdesk
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              For new institutional registration or official login credentials assistance:
            </p>

            <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <div>
                <span className="font-semibold text-slate-900 block">AICTE Headquarters:</span>
                <span>Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070</span>
              </div>
              <div>
                <span className="font-semibold text-slate-900 block">Approval Bureau Helpdesk:</span>
                <span className="font-mono text-blue-700 font-semibold">+91 11 29581000 / 29581050</span>
              </div>
              <div>
                <span className="font-semibold text-slate-900 block">Official Support Email:</span>
                <span className="font-mono text-blue-700 font-semibold">helpdesk@aicte-india.org</span>
              </div>
              <div>
                <span className="font-semibold text-slate-900 block">Operating Hours:</span>
                <span>Monday to Friday, 9:30 AM to 5:30 PM IST</span>
              </div>
            </div>

            <button
              onClick={() => setIsContactModalOpen(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
