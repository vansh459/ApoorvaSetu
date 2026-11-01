import React, { useState } from 'react';
import { Check, Save } from 'lucide-react';
import { authService } from '../../services/authService';
import { ROLE_LABELS } from '../../services/rbacService';
import { SystemConfig as ConfigType } from '../../types';
import { OPERATIONAL_STAGES, getStageMeta } from '../../workflow/stages';
import { resolveWorkflowConfig } from '../../workflow/config';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Notice,
  PageHeader
} from '../../components/ui';

const parseWarningDays = (value: string, fallback: number[]): number[] => {
  const days = value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((day) => Number.isFinite(day) && day >= 0);
  return days.length ? days : fallback;
};

const stageFieldId = (stage: string) =>
  `config-stage-${stage.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

interface SettingToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const SettingToggle: React.FC<SettingToggleProps> = ({
  id,
  label,
  description,
  checked,
  onChange
}) => (
  <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-6 py-4">
    <span className="min-w-0">
      <span className="block text-sm font-medium text-ink">{label}</span>
      <span className="mt-0.5 block text-label text-ink-2">{description}</span>
    </span>
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-accent"
    />
  </label>
);

export const SystemConfigPage: React.FC = () => {
  const [config, setConfig] = useState<ConfigType>(() => authService.getSystemConfig());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workflow = resolveWorkflowConfig(config);
  const stageSlas = workflow.stageSlas;
  const matrix = workflow.escalationMatrix;

  const updateStageSla = (stage: (typeof OPERATIONAL_STAGES)[number], days: number) => {
    setConfig((prev) => ({
      ...prev,
      stageSlas: {
        ...prev.stageSlas,
        [stage]: {
          days: Math.max(1, days || 1),
          approachingPct: resolveWorkflowConfig(prev).stageSlas[stage]?.approachingPct ?? 80
        }
      }
    }));
  };

  const updateEscalationDays = (level: number, days: number) => {
    setConfig((prev) => ({
      ...prev,
      escalationMatrix: resolveWorkflowConfig(prev).escalationMatrix.map((rule) =>
        rule.level === level ? { ...rule, breachDays: Math.max(0, days) } : rule
      )
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await authService.updateSystemConfig(config);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the configuration.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System configuration"
        description="Approval cycle dates, inspection quorum thresholds and the governance parameters that drive every case."
        meta={
          <>
            <Badge tone="info">Super admin console</Badge>
            <span className="text-xs text-ink-2">Academic year {config.academicYear}</span>
          </>
        }
      />

      {savedSuccess && (
        <Notice tone="success" icon={Check} title="Settings saved">
          The new configuration is live across active sessions.
        </Notice>
      )}

      {error && (
        <Notice tone="danger" title="Could not save settings">
          {error}
        </Notice>
      )}

      <form id="system-config-form" onSubmit={handleSave} className="space-y-6">
        <Card padded="none">
          <CardHeader
            title="Academic year"
            description="The active national intake cycle and its statutory deadline."
          />
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <Field
              label="Active academic year"
              htmlFor="config-academic-year"
              hint="Shown on dashboards, reports and approval letters."
            >
              <Input
                id="config-academic-year"
                type="text"
                value={config.academicYear}
                onChange={(e) => setConfig({ ...config, academicYear: e.target.value })}
              />
            </Field>

            <Field
              label="Approval cycle cut-off date"
              htmlFor="config-cycle-end"
              hint="Applications filed after this date roll to the next cycle."
            >
              <Input
                id="config-cycle-end"
                type="date"
                value={config.approvalCycleEndDate}
                onChange={(e) => setConfig({ ...config, approvalCycleEndDate: e.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card padded="none">
          <CardHeader
            title="Inspection and governance"
            description="Committee thresholds set by the AICTE Approval Process Handbook."
          />
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <Field
              label="Minimum EVC inspectors"
              htmlFor="config-evc-members"
              hint="Default of 3: one chairperson, one subject expert and one industry representative."
            >
              <Input
                id="config-evc-members"
                type="number"
                min={2}
                max={5}
                value={config.evcMinMembers}
                onChange={(e) => setConfig({ ...config, evcMinMembers: Number(e.target.value) })}
              />
            </Field>

            <Field
              label="Auto-escalation threshold"
              htmlFor="config-auto-escalation"
              hint="Days pending before an application is flagged automatically."
            >
              <Input
                id="config-auto-escalation"
                type="number"
                min={3}
                max={30}
                value={config.autoEscalationDays}
                onChange={(e) =>
                  setConfig({ ...config, autoEscalationDays: Number(e.target.value) })
                }
              />
            </Field>
          </div>
        </Card>

        <Card padded="none">
          <CardHeader
            title="Statutory SLAs"
            description="Deadline tiers, reminder windows and automatic escalation for every case."
          />
          <div className="space-y-8 p-5 sm:p-6">
            <section>
              <h3 className="mb-4 text-sm font-medium text-ink">Stage turnaround in days</h3>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {OPERATIONAL_STAGES.map((stage) => (
                  <Field
                    key={stage}
                    label={getStageMeta(stage).label}
                    htmlFor={stageFieldId(stage)}
                  >
                    <Input
                      id={stageFieldId(stage)}
                      type="number"
                      min={1}
                      max={365}
                      value={stageSlas[stage]?.days ?? 30}
                      onChange={(e) => updateStageSla(stage, Number(e.target.value))}
                    />
                  </Field>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-sm font-medium text-ink">Reminder windows in days</h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Undertaking reminders"
                  htmlFor="config-undertaking-windows"
                  hint="Comma-separated offsets before the evidence deadline."
                >
                  <Input
                    id="config-undertaking-windows"
                    type="text"
                    value={workflow.undertakingWarningDays.join(', ')}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        undertakingWarningDays: parseWarningDays(
                          e.target.value,
                          workflow.undertakingWarningDays
                        )
                      })
                    }
                  />
                </Field>

                <Field
                  label="Document expiry warnings"
                  htmlFor="config-document-windows"
                  hint="The first value opens the early warning, the second marks the document critical."
                >
                  <Input
                    id="config-document-windows"
                    type="text"
                    value={workflow.documentWarningDays.join(', ')}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        documentWarningDays: parseWarningDays(
                          e.target.value,
                          workflow.documentWarningDays
                        )
                      })
                    }
                  />
                </Field>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-sm font-medium text-ink">
                Escalation matrix in days past the deadline
              </h3>
              <div className="grid gap-5 sm:grid-cols-3">
                {matrix.map((rule) => (
                  <Field
                    key={rule.level}
                    label={`Level ${rule.level}`}
                    htmlFor={`config-escalation-level-${rule.level}`}
                    hint={rule.targetRoles.map((role) => ROLE_LABELS[role]).join(', ')}
                  >
                    <Input
                      id={`config-escalation-level-${rule.level}`}
                      type="number"
                      min={0}
                      max={90}
                      value={rule.breachDays}
                      onChange={(e) => updateEscalationDays(rule.level, Number(e.target.value))}
                    />
                  </Field>
                ))}
              </div>
            </section>

            <div className="divide-y divide-line border-t border-line pt-2">
              <SettingToggle
                id="config-business-days"
                label="Business-day SLA clock"
                description="Count weekdays only when computing statutory deadlines."
                checked={Boolean(workflow.businessDaysOnly)}
                onChange={(checked) => setConfig({ ...config, businessDaysOnly: checked })}
              />
            </div>
          </div>
        </Card>

        <Card padded="none">
          <CardHeader
            title="Security and platform"
            description="Maintenance mode and outbound notification controls."
          />
          <div className="divide-y divide-line px-5 sm:px-6">
            <SettingToggle
              id="config-maintenance-mode"
              label="Portal maintenance mode"
              description="Suspend new applications while administrative review stays available."
              checked={config.maintenanceMode}
              onChange={(checked) => setConfig({ ...config, maintenanceMode: checked })}
            />
            <SettingToggle
              id="config-email-alerts"
              label="Automated notification alerts"
              description="Send email on status transitions and EVC scheduling."
              checked={config.notificationEmailAlerts}
              onChange={(checked) => setConfig({ ...config, notificationEmailAlerts: checked })}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" icon={<Save className="h-4 w-4" />}>
            Save configuration
          </Button>
        </div>
      </form>
    </div>
  );
};
