import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { regionalOffices } from '../data/initialData';
import { RegionalOffice } from '../types';
import { Avatar, Badge, PageHeader } from '../components/ui';

export const RegionsOfficials: React.FC = () => (
  <div className="space-y-6">
    <PageHeader
      title="Regional offices"
      description="Directory of AICTE regional offices, zonal jurisdictions and appointed regional officers."
    />

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {regionalOffices.map((office: RegionalOffice) => {
        const initials = office.officerName
          .split(' ')
          .map((name: string) => name[0])
          .join('')
          .substring(0, 2);

        return (
          <article
            key={office.id}
            className="flex flex-col justify-between rounded-card border border-line bg-surface p-5 shadow-raise"
          >
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <Badge tone="info">{office.region} Region</Badge>
                <span className="text-xs text-ink-2">{office.headquarters}</span>
              </div>

              <div className="mb-4 flex items-start gap-3">
                <Avatar initials={initials} size="lg" />
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-ink">{office.officerName}</h3>
                  <p className="text-xs text-ink-2">{office.designation}</p>
                </div>
              </div>

              <div className="space-y-2 rounded-control border border-line bg-surface-2 p-3.5 text-xs text-ink-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true" />
                  <span className="truncate font-medium text-accent">{office.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true" />
                  <span>{office.phone}</span>
                </div>
                <div className="flex items-start gap-2 border-t border-line pt-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden="true" />
                  <span className="leading-tight">Headquarters: {office.headquarters}</span>
                </div>
              </div>

              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-ink-2">States in jurisdiction</p>
                <div className="flex flex-wrap gap-1">
                  {office.jurisdiction.map((state: string) => (
                    <Badge key={state} tone="neutral">
                      {state}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 text-center">
              <div className="rounded-control bg-surface-2 p-2">
                <div className="text-sm font-semibold text-ink">{office.totalInstitutes}</div>
                <div className="text-xs text-ink-2">Institutes</div>
              </div>
              <div className="rounded-control bg-warning-soft p-2">
                <div className="text-sm font-semibold text-warning">
                  {office.pendingApplications}
                </div>
                <div className="text-xs text-warning">Active workflow</div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  </div>
);
