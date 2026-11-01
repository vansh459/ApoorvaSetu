import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Plus, Send, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { EscalationItem } from '../../types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Tabs,
  Textarea
} from '../../components/ui';
import { severityTone, statusTone } from '../../utils/statusTone';

type StatusFilter = 'Open' | 'Under Review' | 'Resolved' | 'All';

export const RegionalEscalations: React.FC = () => {
  const { user } = useAuth();
  const {
    applications,
    escalations,
    acknowledgeEscalation,
    resolveEscalation,
    createEscalation
  } = useApp();
  const region = user?.region || 'Northern';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Open');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAppId, setNewAppId] = useState('');
  const [newInstName, setNewInstName] = useState('');
  const [newUrgency, setNewUrgency] = useState<'Medium' | 'High' | 'Critical'>('High');
  const [newReason, setNewReason] = useState('');

  const scoped = useMemo(() => {
    if (user?.role === 'REGIONAL_OFFICER' && user.region) {
      return escalations.filter((item) => item.region === user.region);
    }
    return escalations;
  }, [escalations, user]);

  const filtered = statusFilter === 'All' ? scoped : scoped.filter((item) => item.status === statusFilter);

  const counts = {
    open: scoped.filter((item) => item.status === 'Open').length,
    review: scoped.filter((item) => item.status === 'Under Review').length,
    resolved: scoped.filter((item) => item.status === 'Resolved').length
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppId || !newReason.trim()) return;

    const linked = applications.find((app) => app.id === newAppId);
    createEscalation({
      applicationId: newAppId,
      instituteName: newInstName || linked?.instituteName || 'Technical Institution',
      region: (linked?.region ?? region) as EscalationItem['region'],
      urgency: newUrgency,
      reason: newReason.trim()
    });
    setIsModalOpen(false);
    setNewAppId('');
    setNewInstName('');
    setNewReason('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escalation queue"
        description="Flag critical institutional deficiencies or special inspection requests to central AICTE."
        meta={<Badge tone="neutral">{region} Regional Office</Badge>}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setIsModalOpen(true)}>
            Raise escalation
          </Button>
        }
      />

      <Card>
        <Tabs
          ariaLabel="Filter escalations by status"
          items={[
            { id: 'Open', label: 'Open', count: counts.open },
            { id: 'Under Review', label: 'Under review', count: counts.review },
            { id: 'Resolved', label: 'Resolved', count: counts.resolved },
            { id: 'All', label: 'All', count: scoped.length }
          ]}
          value={statusFilter}
          onChange={(id) => setStatusFilter(id as StatusFilter)}
        />
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title="No escalations in this view"
            description="Overdue statutory deadlines are escalated automatically by the SLA monitor."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="flex flex-col justify-between gap-4 rounded-card border border-line bg-surface p-4 shadow-raise md:flex-row md:items-center sm:p-5"
            >
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="info">{item.applicationId}</Badge>
                  <span className="text-sm font-semibold text-ink">{item.instituteName}</span>
                  {item.level && <Badge tone="neutral">Level {item.level}</Badge>}
                  <Badge tone={severityTone(item.urgency)}>{item.urgency} urgency</Badge>
                  <Badge tone={statusTone(item.status, 'info')}>{item.status}</Badge>
                  {typeof item.slaBreachDays === 'number' && item.slaBreachDays > 0 && (
                    <Badge tone="danger">
                      <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                      {item.slaBreachDays} day(s) overdue
                    </Badge>
                  )}
                </div>

                <p className="text-sm leading-relaxed text-ink-2">{item.reason}</p>

                <p className="text-xs text-ink-2">
                  Raised by {item.raisedBy} on {item.raisedDate}
                  {item.acknowledgedBy ? `. Acknowledged by ${item.acknowledgedBy}.` : '.'}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Badge tone="neutral" className="font-mono">
                  {item.id}
                </Badge>
                {item.status === 'Open' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => acknowledgeEscalation(item.id)}
                  >
                    Acknowledge
                  </Button>
                )}
                {item.status !== 'Resolved' && (
                  <Button
                    size="sm"
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    onClick={() => resolveEscalation(item.id)}
                  >
                    Resolve
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Raise a central escalation"
        subtitle="Escalate complex scrutiny issues, land title disputes or emergency scheduling to AICTE headquarters."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="raise-escalation-form"
              icon={<Send className="h-4 w-4" />}
            >
              Dispatch escalation
            </Button>
          </>
        }
      >
        <form id="raise-escalation-form" onSubmit={handleCreate} className="space-y-4">
          <Field label="Application ID" htmlFor="escalation-application" required>
            <Input
              id="escalation-application"
              type="text"
              value={newAppId}
              onChange={(e) => setNewAppId(e.target.value)}
              placeholder="APP2026-0012"
              required
            />
          </Field>

          <Field
            label="Institution name"
            htmlFor="escalation-institute"
            hint="Defaults to the linked application when left blank."
          >
            <Input
              id="escalation-institute"
              type="text"
              value={newInstName}
              onChange={(e) => setNewInstName(e.target.value)}
              placeholder="ABC Institute of Technology"
            />
          </Field>

          <Field label="Urgency level" htmlFor="escalation-urgency">
            <Select
              id="escalation-urgency"
              value={newUrgency}
              onChange={(e) => setNewUrgency(e.target.value as 'Medium' | 'High' | 'Critical')}
            >
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </Select>
          </Field>

          <Field label="Reason and recommendation" htmlFor="escalation-reason" required>
            <Textarea
              id="escalation-reason"
              rows={3}
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Detail the regulatory dilemma, deficiency or special exemption required."
              required
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
};
