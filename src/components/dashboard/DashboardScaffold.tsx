import React from 'react';
import { StatTile, type StatTileProps } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { getNow } from '../../utils/dates';

interface DashboardScaffoldProps {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  stats: StatTileProps[];
  children: React.ReactNode;
}

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const DashboardScaffold: React.FC<DashboardScaffoldProps> = ({
  title,
  description,
  meta,
  actions,
  stats,
  children
}) => {
  const { user } = useAuth();
  const now = getNow();
  const nameParts = (user?.name || '')
    .split(/\s+/)
    .filter((part) => part && !/^(dr|prof|mr|mrs|ms)\.?$/i.test(part));
  const firstName =
    nameParts.length === 0
      ? 'there'
      : nameParts[0].replace(/\./g, '').length > 1
        ? nameParts[0]
        : nameParts.join(' ');
  const dateLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-label text-ink-2">{dateLabel}</p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">
            {greetingFor(now)}, {firstName}
          </h1>
          <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-ink-2 [text-wrap:pretty]">
            {description || title}
          </p>
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-2">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </section>

      {stats.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
          {stats.map((stat) => (
            <StatTile key={stat.label} {...stat} />
          ))}
        </div>
      )}

      {children}
    </div>
  );
};
