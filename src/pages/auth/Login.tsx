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
  Shield,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Building2,
  Users,
  Compass,
  FileCheck2,
  Check
} from 'lucide-react';
import { Button, Field, Input, Modal } from '../../components/ui';

interface DemoAccountInfo {
  role: UserRole;
  roleTitle: string;
  name: string;
  email: string;
  description: string;
  scope: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const remoteAuthEnabled = getDataMode() === 'supabase';

  const [email, setEmail] = useState(remoteAuthEnabled ? '' : 'aicteadmin@apoorvasetu.demo');
  const [password, setPassword] = useState(remoteAuthEnabled ? '' : 'Apoorva@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const demoAccounts: DemoAccountInfo[] = [
    {
      role: 'SUPER_ADMIN',
      roleTitle: 'Super admin',
      name: 'Dr. Ramesh Pokhriyal',
      email: 'superadmin@apoorvasetu.demo',
      description: 'System governance, user management, audit logs, configuration',
      scope: 'National authority',
      icon: Users
    },
    {
      role: 'AICTE_ADMIN',
      roleTitle: 'AICTE central admin',
      name: 'Amit Sharma',
      email: 'aicteadmin@apoorvasetu.demo',
      description: 'National approval operations, workflow oversight, EVC management',
      scope: 'Central AICTE HQ',
      icon: Shield
    },
    {
      role: 'REGIONAL_OFFICER',
      roleTitle: 'Regional officer',
      name: 'Dr. R. K. Sharma',
      email: 'regional@apoorvasetu.demo',
      description: 'Regional scrutiny, document verification, forwarding eligible cases',
      scope: 'Northern region',
      icon: Compass
    },
    {
      role: 'EVC_MEMBER',
      roleTitle: 'EVC committee member',
      name: 'Prof. S. Banerjee',
      email: 'evc@apoorvasetu.demo',
      description: 'Institutional inspection, checklist scoring, evidence upload',
      scope: 'Committee North-A',
      icon: FileCheck2
    },
    {
      role: 'INSTITUTION_ADMIN',
      roleTitle: 'Institution admin',
      name: 'Dr. K. S. Murthy',
      email: 'institute@apoorvasetu.demo',
      description: 'Submit applications, monitor progress, upload compliance',
      scope: 'ABC Institute of Tech',
      icon: Building2
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
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSubmitted(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="mx-auto flex h-16 w-full max-w-app items-center justify-between px-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-2.5">
          <img src="/apoorvasetu-icon.png" alt="" className="h-8 w-8 object-contain" />
          <div>
            <div className="text-sm font-semibold leading-tight">ApoorvaSetu</div>
            <div className="text-xs leading-tight text-ink-2">AICTE approvals</div>
          </div>
        </div>

        {remoteAuthEnabled ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-2">
            <Shield className="h-3.5 w-3.5" strokeWidth={1.75} />
            Official AICTE sign-in
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-2">
            <KeyRound className="h-3.5 w-3.5" strokeWidth={1.75} />
            Demo environment
          </span>
        )}
      </header>

      <main className="mx-auto grid w-full max-w-app flex-1 grid-cols-[minmax(0,1fr)] items-center gap-10 px-5 pb-14 pt-2 sm:px-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-16 lg:px-12">
        <section className="wash-accent order-2 rounded-modal px-5 py-6 sm:px-6 lg:order-1 lg:px-8 lg:py-10">
          <h1 className="max-w-xl text-display font-semibold tracking-tight text-ink">
            The approval desk for technical education.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-2">
            Apply, inspect and monitor affiliation in one place, with every decision recorded.
          </p>

          <ul className="mt-6 space-y-2 text-sm text-ink-2">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" strokeWidth={2} />
              Five role-based workspaces, scoped by jurisdiction
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" strokeWidth={2} />
              Every action written to the audit trail
            </li>
          </ul>

          <div className="mt-8 hidden max-w-2xl rounded-card border border-line bg-surface p-2 shadow-lift lg:block">
            <img
              src="/screenshots/dashboard.png"
              alt="ApoorvaSetu dashboard with application metrics, stage pendency and regional distribution"
              className="w-full rounded-[10px]"
              loading="lazy"
            />
          </div>
        </section>

        <section className="order-1 mx-auto w-full max-w-[420px] lg:order-2">
          <div className="rounded-modal border border-line bg-surface p-6 shadow-lift sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Sign in</h2>
            <p className="mt-1 text-sm text-ink-2">Use your AICTE credentials to continue.</p>

            {errorMessage && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2 rounded-control border border-line bg-danger-soft px-3 py-2.5 text-sm text-danger"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
              <Field label="Username or email" htmlFor="login-email">
                <div className="relative">
                  <UserIcon
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
                    strokeWidth={1.75}
                  />
                  <Input
                    id="login-email"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your AICTE user ID or email"
                    className="pl-9"
                    autoComplete="username"
                  />
                </div>
              </Field>

              <Field label="Password" htmlFor="login-password">
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
                    strokeWidth={1.75}
                  />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-9 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </Field>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-ink-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-line-strong accent-accent"
                  />
                  Remember me
                </label>

                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-sm font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" fullWidth loading={isLoading} className="mt-1 h-10">
                {isLoading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs leading-relaxed text-ink-2">
              Don’t have an account?{' '}
              <button
                type="button"
                onClick={() => setIsContactModalOpen(true)}
                className="font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
              >
                Contact AICTE
              </button>
            </p>
          </div>

          {!remoteAuthEnabled && (
            <div className="mt-4 rounded-card border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <span className="text-xs font-semibold text-ink">Demo accounts</span>
                <span className="font-mono text-xs text-ink-2">{DEMO_PASSWORD}</span>
              </div>
              <div className="divide-y divide-line/70">
                {demoAccounts.map((account) => {
                  const Icon = account.icon;
                  return (
                    <button
                      key={account.role}
                      type="button"
                      onClick={() => handleApplyDemoAccount(account)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-surface-2 cursor-pointer"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0 text-ink-2" strokeWidth={1.75} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">
                            {account.roleTitle}
                          </span>
                          <span className="block truncate text-xs text-ink-2">
                            {account.scope}, {account.email}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-accent">Use</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-line px-5 py-4 text-center text-xs text-ink-2 sm:px-8">
        © 2026 AICTE, Technical Approvals and Quality Assurance Division. Powered by ApoorvaSetu
      </footer>

      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => {
          setIsForgotModalOpen(false);
          setForgotSubmitted(false);
        }}
        title="Reset your password"
        subtitle="Enter the email registered with AICTE to receive a reset link."
        size="sm"
      >
        {forgotSubmitted ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-card bg-success-soft text-success">
              <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <p className="text-sm text-ink">
              A reset challenge was dispatched to{' '}
              <strong className="font-semibold">{forgotEmail}</strong>.
            </p>
            <p className="text-xs leading-relaxed text-ink-2">
              In this local sandbox, use the shared password{' '}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-ink">{DEMO_PASSWORD}</code>.
            </p>
            <Button
              fullWidth
              onClick={() => {
                setIsForgotModalOpen(false);
                setForgotSubmitted(false);
              }}
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <Field label="Email address" htmlFor="forgot-email">
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@aicte-india.org"
                required
              />
            </Field>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setIsForgotModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Send reset link</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        title="AICTE portal access helpdesk"
        subtitle="For new institutional registration or login assistance."
        size="sm"
        footer={<Button onClick={() => setIsContactModalOpen(false)}>Understood</Button>}
      >
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-ink">AICTE headquarters</dt>
            <dd className="text-ink-2">Nelson Mandela Marg, Vasant Kunj, New Delhi 110070</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Approval bureau helpdesk</dt>
            <dd className="font-mono text-ink-2">+91 11 29581000 / 29581050</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Official support email</dt>
            <dd className="font-mono text-ink-2">helpdesk@aicte-india.org</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Operating hours</dt>
            <dd className="text-ink-2">Monday to Friday, 9:30 AM to 5:30 PM IST</dd>
          </div>
        </dl>
      </Modal>
    </div>
  );
};
