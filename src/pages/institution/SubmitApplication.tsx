import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { APPLICATION_TYPE_OPTIONS, resolveRoute } from '../../workflow/routes';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageHeader,
  Textarea
} from '../../components/ui';

const STEPS = [
  { num: 1, label: 'Approval type' },
  { num: 2, label: 'Intake and programs' },
  { num: 3, label: 'Review and submit' }
];

export const SubmitApplication: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNewApplication, showToast } = useApp();

  const [step, setStep] = useState(1);
  const [appType, setAppType] = useState('Extension of Approval (EoA)');
  const [academicYear] = useState('2026-2027');
  const [proposedIntake, setProposedIntake] = useState('540');
  const [programList, setProgramList] = useState('Computer Science & Engg, AI & Machine Learning, Data Science');
  const [undertakingAgreed, setUndertakingAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!undertakingAgreed) {
      setSubmitError('Agree to the statutory undertaking before submitting.');
      return;
    }
    setSubmitError('');

    setIsSubmitting(true);
    setTimeout(() => {
      const newAppId = `APP2026-${Math.floor(1000 + Math.random() * 9000)}`;

      addNewApplication({
        id: newAppId,
        instituteId: user?.instituteId || 'INST-101',
        instituteName: user?.instituteName || 'ABC Institute of Tech',
        type: appType,
        region: user?.region || 'Northern',
        state: 'Uttar Pradesh',
        stage: 'Submitted',
        status: 'In Progress',
        appliedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        category: 'Engineering & Technology',
        intakeProposed: Number(proposedIntake) || 540,
        programs: programList.split(',').map((p) => p.trim()),
        contactEmail: user?.email || 'principal@abctech.edu.in',
        contactPhone: user?.phone || '+91 98765 43210',
        remarks: 'New Extension of Approval application submitted with complete fees and affidavits.'
      });

      setIsSubmitting(false);
      showToast(`Application ${newAppId} successfully submitted to AICTE National Portal`, 'success');
      navigate('/institution/tracking');
    }, 800);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submit an application"
        description="File an extension of approval, program expansion or intake variation request for the national approval cycle."
        meta={
          <>
            <Badge tone="info">Application wizard</Badge>
            <span className="text-xs text-ink-2">Academic year {academicYear}</span>
          </>
        }
      />

      <Card padded="sm">
        <ol className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {STEPS.map((s) => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <li
                key={s.num}
                aria-current={isActive ? 'step' : undefined}
                className="flex items-center gap-2"
              >
                <span
                  className={
                    isActive
                      ? 'flex h-6 w-6 items-center justify-center rounded-full bg-action text-xs font-semibold text-white'
                      : isDone
                        ? 'flex h-6 w-6 items-center justify-center rounded-full bg-success text-white'
                        : 'flex h-6 w-6 items-center justify-center rounded-full border border-line-strong bg-surface text-xs font-medium text-ink-2'
                  }
                >
                  {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" /> : s.num}
                </span>
                <span
                  className={
                    isActive ? 'text-label font-semibold text-ink' : 'text-label text-ink-2'
                  }
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card>
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-ink">Select the approval category</h2>

            <div className="space-y-2.5">
              {APPLICATION_TYPE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={
                    appType === option.value
                      ? 'flex cursor-pointer items-start gap-3 rounded-control border border-accent bg-accent-soft/60 p-4'
                      : 'flex cursor-pointer items-start gap-3 rounded-control border border-line p-4 transition-colors duration-150 hover:bg-surface-2'
                  }
                >
                  <input
                    type="radio"
                    name="appType"
                    checked={appType === option.value}
                    onChange={() => setAppType(option.value)}
                    className="mt-0.5 h-4 w-4 accent-accent"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{option.value}</span>
                    <span className="mt-0.5 block text-label text-ink-2">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <Notice tone="info" title="Automated routing">
              The case routes through {resolveRoute(appType).stages.join(', ')} after submission.
            </Notice>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>
                Continue to programs
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-ink">Intake capacity and disciplines</h2>

            <div className="space-y-5">
              <Field
                label="Proposed total intake"
                htmlFor="application-intake"
                hint="Total seats requested across all programs."
              >
                <Input
                  id="application-intake"
                  type="number"
                  value={proposedIntake}
                  onChange={(e) => setProposedIntake(e.target.value)}
                />
              </Field>

              <Field
                label="Offered programs"
                htmlFor="application-programs"
                hint="Separate each undergraduate or postgraduate program with a comma."
              >
                <Textarea
                  id="application-programs"
                  rows={3}
                  value={programList}
                  onChange={(e) => setProgramList(e.target.value)}
                />
              </Field>

              <Notice tone="info">
                The Scrutiny Committee audits the 1:2:6 cadre ratio against this intake number.
              </Notice>
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                onClick={() => setStep(1)}
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Review declaration
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-sm font-semibold text-ink">Statutory declaration</h2>

            <dl className="grid gap-3 rounded-control bg-surface-2 p-4 sm:grid-cols-2">
              <div className="flex justify-between gap-4">
                <dt className="text-label text-ink-2">Institution</dt>
                <dd className="text-right text-label font-medium text-ink">
                  {user?.instituteName || 'ABC Institute of Tech'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-label text-ink-2">Application category</dt>
                <dd className="text-right text-label font-medium text-ink">{appType}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-label text-ink-2">Proposed seats</dt>
                <dd className="text-right text-label font-medium text-ink">{proposedIntake}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-label text-ink-2">Academic year</dt>
                <dd className="text-right text-label font-medium text-ink">{academicYear}</dd>
              </div>
            </dl>

            <div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={undertakingAgreed}
                  onChange={(e) => {
                    setUndertakingAgreed(e.target.checked);
                    if (e.target.checked) setSubmitError('');
                  }}
                  className="mt-0.5 h-4 w-4 accent-accent"
                />
                <span className="text-label leading-relaxed text-ink-2">
                  I declare that all submitted land titles, fire safety NOCs, building approval plans
                  and faculty cadre registers comply with the AICTE Approval Process Handbook norms.
                </span>
              </label>
              {submitError && (
                <p role="alert" className="mt-2 text-xs text-danger">
                  {submitError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                onClick={() => setStep(2)}
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? 'Submitting' : 'Submit application'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};
