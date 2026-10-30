import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DEMO_PASSWORD } from '../../services/authService';
import { UserRole } from '../../types';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Building2,
  Users,
  Compass,
  FileCheck2,
  HelpCircle,
  X
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

  const [email, setEmail] = useState('aicteadmin@apoorvasetu.demo');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // If already authenticated, redirect to home
  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const demoAccounts: DemoAccountInfo[] = [
    {
      role: 'SUPER_ADMIN',
      roleTitle: 'Super Admin',
      name: 'Dr. Ramesh Pokhriyal',
      email: 'superadmin@apoorvasetu.demo',
      description: 'System-wide governance, user management, audit logs, configuration',
      scope: 'National Authority',
      icon: Users,
      color: 'from-purple-500 to-indigo-600'
    },
    {
      role: 'AICTE_ADMIN',
      roleTitle: 'AICTE Central Admin',
      name: 'Amit Sharma',
      email: 'aicteadmin@apoorvasetu.demo',
      description: 'National approval operations, centralized workflow oversight, EVC management',
      scope: 'Central AICTE HQ',
      icon: ShieldCheck,
      color: 'from-blue-600 to-cyan-600'
    },
    {
      role: 'REGIONAL_OFFICER',
      roleTitle: 'Regional Officer',
      name: 'Dr. R. K. Sharma',
      email: 'regional@apoorvasetu.demo',
      description: 'Regional scrutiny, document verification, forwarding eligible applications',
      scope: 'Northern Region Jurisdiction',
      icon: Compass,
      color: 'from-teal-500 to-emerald-600'
    },
    {
      role: 'EVC_MEMBER',
      roleTitle: 'EVC Committee Member',
      name: 'Prof. S. Banerjee',
      email: 'evc@apoorvasetu.demo',
      description: 'Institutional physical inspection, checklist scoring, evidence upload',
      scope: 'Inspection Committee North-A',
      icon: FileCheck2,
      color: 'from-amber-500 to-orange-600'
    },
    {
      role: 'INSTITUTION_ADMIN',
      roleTitle: 'Institution Admin',
      name: 'Dr. K. S. Murthy',
      email: 'institute@apoorvasetu.demo',
      description: 'Submit EoA applications, monitor progress timeline, upload compliance',
      scope: 'ABC Institute of Tech (INST-101)',
      icon: Building2,
      color: 'from-rose-500 to-pink-600'
    }
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email or user ID.');
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
      setErrorMessage(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemoAccount = async (account: DemoAccountInfo) => {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setErrorMessage('');
    setIsLoading(true);
    try {
      await login(account.email, DEMO_PASSWORD, rememberMe);
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to login with demo account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#070e1b] flex flex-col justify-between text-slate-100 relative overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <img
              src="/apoorvasetu-icon.png"
              alt="ApprovaSetu Icon"
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
          <div>
            <div className="text-white font-bold text-lg tracking-wide leading-tight">
              ApprovaSetu
            </div>
            <div className="text-[11px] text-slate-400 font-normal leading-tight">
              AICTE Approvals, Simplified
            </div>
          </div>
        </div>

        {/* AICTE Emblem badge */}
        <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
          <img
            src="/aicte-logo.png"
            alt="AICTE Logo"
            className="w-5 h-5 object-contain"
          />
          <span className="font-semibold text-slate-200 hidden sm:inline">
            All India Council for Technical Education
          </span>
          <span className="font-semibold text-slate-200 sm:hidden">
            AICTE
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
          {/* Left Column: Form Card */}
          <div className="lg:col-span-5 max-w-md mx-auto w-full">
            <div className="bg-[#0b162c]/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-6">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-2">
                  Role-Based Secure Portal
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Sign In
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Access your dedicated AICTE approval & compliance workspace.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Email / User ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Official Email / User ID
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@aicte-india.org"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 text-white text-xs sm:text-sm rounded-xl border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setIsForgotModalOpen(true);
                      }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 text-white text-xs sm:text-sm rounded-xl border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition-all placeholder:text-slate-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-md border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/20"
                    />
                    <span>Remember this device (30 days)</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In to Dashboard</span>
                  )}
                </button>
              </form>

              {/* Development note */}
              <div className="mt-5 pt-4 border-t border-slate-800 text-center">
                <p className="text-[11px] text-slate-400">
                  Shared Demo Password:{' '}
                  <code className="text-amber-400 font-mono bg-amber-400/10 px-1.5 py-0.5 rounded">
                    {DEMO_PASSWORD}
                  </code>
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: 1-Click Demo Accounts Quick-Selector */}
          <div className="lg:col-span-7">
            <div className="bg-[#0b162c]/60 border border-slate-800/90 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center space-x-2">
                    <span>1-Click Evaluator Access</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      5 Pre-configured Roles
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Select any role below to test its dedicated dashboard, custom navigation, and data scoping.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {demoAccounts.map((account) => {
                  const Icon = account.icon;
                  const isSelected = email === account.email;

                  return (
                    <div
                      key={account.role}
                      onClick={() => handleSelectDemoAccount(account)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isSelected
                          ? 'bg-blue-900/20 border-blue-500/60 shadow-md shadow-blue-500/10'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                        }`}
                    >
                      <div className="flex items-start space-x-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${account.color} text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                              {account.roleTitle}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                              {account.scope}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-300 mt-0.5">
                            {account.name}{' '}
                            <span className="text-slate-500 font-normal">
                              ({account.email})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug mt-1">
                            {account.description}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 self-end sm:self-center">
                        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl text-xs font-semibold bg-blue-600/20 text-blue-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <span>Log In</span>
                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Operational notice */}
              <div className="mt-4 p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-[11px] flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
                <span>
                  Every role is securely enforced with server-side RBAC permissions, jurisdictional filtering, and complete audit logging.
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-900 bg-slate-950/60 text-center text-xs text-slate-500 relative z-10">
        ApprovaSetu — AICTE Approval Workflow Automation & Compliance System © 2026. Smart India Hackathon Edition.
      </footer>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#0b162c] border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => {
                setIsForgotModalOpen(false);
                setForgotSubmitted(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2">
              Password Recovery Workflow
            </h3>

            {forgotSubmitted ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-300">
                  Password reset link has been dispatched to{' '}
                  <strong className="text-white">{forgotEmail}</strong>.
                </p>
                <p className="text-[11px] text-slate-400">
                  For this local development sandbox, use the shared development credentials (<code>{DEMO_PASSWORD}</code>) or the 1-click account selector.
                </p>
                <button
                  onClick={() => {
                    setIsForgotModalOpen(false);
                    setForgotSubmitted(false);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer mt-2"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4 mt-3">
                <p className="text-xs text-slate-400">
                  Enter your registered institutional or AICTE officer email address to receive an authentication reset challenge.
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@domain.edu.in"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-900 text-white text-xs sm:text-sm rounded-xl border border-slate-700 focus:border-blue-500 focus:outline-hidden"
                />
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

