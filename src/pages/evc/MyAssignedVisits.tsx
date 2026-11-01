import React, { useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, ClipboardCheck, MapPin, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { filterEVCVisitsForUser } from '../../services/rbacService';
import { checklistProgress } from '../../workflow/evc';
import { formatDisplayDate } from '../../utils/dates';
import { EVCVisit } from '../../types';
import { statusTone } from '../../utils/statusTone';
import {
  Badge,
  Button,
  Card,
  Field,
  Modal,
  Notice,
  PageHeader,
  ProgressBar,
  Textarea
} from '../../components/ui';

export const MyAssignedVisits: React.FC = () => {
  const { user } = useAuth();
  const { evcVisits, completeEVC } = useApp();
  const navigate = useNavigate();

  const assignedVisits = filterEVCVisitsForUser(evcVisits, user);

  const [selectedVisit, setSelectedVisit] = useState<EVCVisit | null>(null);
  const [infraScore, setInfraScore] = useState(85);
  const [facultyScore, setFacultyScore] = useState(90);
  const [labScore, setLabScore] = useState(88);
  const [recommendation, setRecommendation] = useState<'Recommended' | 'Conditional' | 'Not Recommended'>('Recommended');
  const [remarks, setRemarks] = useState('');
  const [safetyCompliance, setSafetyCompliance] = useState(true);

  const selectedProgress = checklistProgress(selectedVisit);
  const reportRecorded = Boolean(selectedVisit?.reportSubmitted);

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisit) return;

    const saved = completeEVC(selectedVisit.id, {
      infrastructureScore: infraScore,
      facultyScore,
      labScore,
      safetyCompliance,
      recommendations: recommendation,
      remarks
    });

    if (saved) {
      setSelectedVisit(null);
      setRemarks('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assigned visits"
        description="Conduct on-site inspections for institutions under your committee and submit authoritative findings."
        meta={
          <>
            <Badge tone="info">EVC member</Badge>
            {user?.committeeName && <span className="text-xs text-ink-2">{user.committeeName}</span>}
          </>
        }
      />

      <div className="space-y-4">
        {assignedVisits.map((visit) => {
          const progress = checklistProgress(visit);
          return (
            <Card key={visit.id}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-ink">{visit.instituteName}</span>
                    <span className="rounded-control bg-surface-2 px-2 py-0.5 font-mono text-xs text-ink-2">
                      {visit.id}
                    </span>
                    <Badge tone={statusTone(visit.status)}>{visit.status}</Badge>
                    <Badge tone="info">{visit.mode} inspection</Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label text-ink-2">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
                      {visit.date ? formatDisplayDate(visit.date) : 'Date pending'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
                      {visit.stateRegion}, {visit.region} region
                    </span>
                    <span>Committee {visit.assignedCommittee}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label text-ink-2">
                    {visit.applicationId && <span>Case {visit.applicationId}</span>}
                    {visit.reportDueAt && !visit.reportSubmitted && (
                      <span>Report due {formatDisplayDate(visit.reportDueAt)}</span>
                    )}
                    {visit.reportSubmitted ? (
                      <span className="font-medium text-success">
                        Report {visit.report?.id ?? ''} submitted
                        {visit.report ? `, ${visit.report.recommendations}` : ''}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <ClipboardCheck
                          className="h-3.5 w-3.5 text-ink-3"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        Checklist {progress.assessed}/{progress.total} assessed
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {visit.reportSubmitted ? (
                    <Button variant="secondary" onClick={() => setSelectedVisit(visit)}>
                      View report
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setSelectedVisit(visit)}
                      icon={<UploadCloud className="h-4 w-4" />}
                    >
                      Submit report
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={Boolean(selectedVisit)}
        onClose={() => setSelectedVisit(null)}
        title={reportRecorded ? 'Inspection report' : 'Submit inspection report'}
        subtitle={
          selectedVisit
            ? `${selectedVisit.instituteName}, ${selectedVisit.id}`
            : undefined
        }
        size="md"
        footer={
          reportRecorded ? (
            <Button variant="secondary" onClick={() => setSelectedVisit(null)}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setSelectedVisit(null)}>
                Cancel
              </Button>
              <Button type="submit" form="evc-report-form" disabled={!selectedProgress.complete}>
                Sign and submit
              </Button>
            </>
          )
        }
      >
        {selectedVisit && (
          <div className="space-y-5">
            {selectedProgress.assessed < selectedProgress.total && !reportRecorded && (
              <Notice tone="warning" icon={AlertTriangle} title="Inspection checklist incomplete">
                {selectedProgress.assessed} of {selectedProgress.total} statutory items assessed. The
                report cannot be signed until the campus checklist is complete.{' '}
                <button
                  type="button"
                  onClick={() => navigate('/evc/checklist')}
                  className="font-semibold underline underline-offset-2"
                >
                  Open inspection checklist
                </button>
              </Notice>
            )}

            {reportRecorded ? (
              <div className="space-y-4">
                <Notice
                  tone="success"
                  icon={CheckCircle2}
                  title={`Report ${selectedVisit.report?.id} recorded`}
                >
                  Recommendation {selectedVisit.report?.recommendations}. Submitted{' '}
                  {selectedVisit.reportSubmittedAt
                    ? formatDisplayDate(selectedVisit.reportSubmittedAt)
                    : 'for record'}
                  {selectedVisit.report?.inspectorName
                    ? ` by ${selectedVisit.report.inspectorName}`
                    : ''}
                </Notice>

                {selectedVisit.report?.remarks && (
                  <p className="text-label leading-relaxed text-ink-2">
                    {selectedVisit.report.remarks}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Infrastructure', value: selectedVisit.report?.infrastructureScore },
                    { label: 'Faculty', value: selectedVisit.report?.facultyScore },
                    { label: 'Laboratories', value: selectedVisit.report?.labScore }
                  ].map((score) => (
                    <div key={score.label} className="rounded-control bg-surface-2 p-3 text-center">
                      <p className="text-xs text-ink-2">{score.label}</p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {score.value ?? 'None'}/100
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form id="evc-report-form" onSubmit={handleSubmitReport} className="space-y-5">
                <section className="space-y-4">
                  <h3 className="text-sm font-medium text-ink">Compliance scores</h3>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label htmlFor="evc-infra-score" className="text-label font-medium text-ink">
                        Infrastructure and land
                      </label>
                      <span className="text-label font-semibold text-ink">{infraScore}</span>
                    </div>
                    <input
                      id="evc-infra-score"
                      type="range"
                      min={0}
                      max={100}
                      value={infraScore}
                      onChange={(e) => setInfraScore(Number(e.target.value))}
                      className="w-full accent-accent"
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label htmlFor="evc-faculty-score" className="text-label font-medium text-ink">
                        Faculty cadre and qualifications
                      </label>
                      <span className="text-label font-semibold text-ink">{facultyScore}</span>
                    </div>
                    <input
                      id="evc-faculty-score"
                      type="range"
                      min={0}
                      max={100}
                      value={facultyScore}
                      onChange={(e) => setFacultyScore(Number(e.target.value))}
                      className="w-full accent-accent"
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label htmlFor="evc-lab-score" className="text-label font-medium text-ink">
                        Laboratories and computing
                      </label>
                      <span className="text-label font-semibold text-ink">{labScore}</span>
                    </div>
                    <input
                      id="evc-lab-score"
                      type="range"
                      min={0}
                      max={100}
                      value={labScore}
                      onChange={(e) => setLabScore(Number(e.target.value))}
                      className="w-full accent-accent"
                    />
                  </div>
                </section>

                <div role="group" aria-labelledby="evc-recommendation-label">
                  <span
                    id="evc-recommendation-label"
                    className="mb-1.5 block text-label font-medium text-ink"
                  >
                    Final recommendation
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Recommended', 'Conditional', 'Not Recommended'] as const).map((value) => {
                      const active = recommendation === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setRecommendation(value)}
                          className={
                            active
                              ? 'rounded-control border border-accent bg-accent-soft p-2.5 text-xs font-semibold text-accent'
                              : 'rounded-control border border-line bg-surface p-2.5 text-xs font-semibold text-ink-2 transition-colors duration-150 hover:bg-surface-2'
                          }
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={safetyCompliance}
                    onChange={(e) => setSafetyCompliance(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-accent"
                  />
                  <span className="text-label leading-relaxed text-ink-2">
                    Fire and safety NOC confirmed, and barrier-free ramps verified on campus.
                  </span>
                </label>

                <Field
                  label="Committee findings"
                  htmlFor="evc-remarks"
                  hint="Summarise faculty interviews, the student ratio audit and infrastructure condition."
                  required
                >
                  <Textarea
                    id="evc-remarks"
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Observations recorded during the campus inspection"
                    required
                  />
                </Field>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3 text-label">
                    <span className="text-ink-2">Checklist completion</span>
                    <span className="font-semibold text-ink">
                      {selectedProgress.assessed}/{selectedProgress.total}
                    </span>
                  </div>
                  <ProgressBar
                    value={selectedProgress.assessed}
                    max={selectedProgress.total}
                    tone={selectedProgress.complete ? 'success' : 'info'}
                    label="Checklist completion"
                  />
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
