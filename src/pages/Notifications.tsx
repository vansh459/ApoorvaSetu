import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarCheck,
  Check,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { filterNotificationsForUser } from '../services/rbacService';
import { Badge, Button, Card, EmptyState, PageHeader, Tabs } from '../components/ui';
import type { NotificationItem } from '../types';
import type { Tone } from '../utils/statusTone';

type NotificationFilter = 'All' | 'Unread' | 'High';

const CATEGORY_ICON = {
  application: FileText,
  evc: CalendarCheck,
  compliance: ShieldCheck,
  system: Bell
} as const;

const PRIORITY_TONE: Record<NotificationItem['priority'], Tone> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral'
};

const CATEGORY_LABEL: Record<NotificationItem['category'], string> = {
  application: 'Application',
  evc: 'Expert visit',
  compliance: 'Compliance',
  system: 'System'
};

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
  } = useApp();

  const [activeTab, setActiveTab] = useState<NotificationFilter>('All');

  const scopedNotifs = useMemo(
    () => filterNotificationsForUser(notifications, user),
    [notifications, user]
  );

  const unreadCount = scopedNotifs.filter((notif) => !notif.read).length;
  const highCount = scopedNotifs.filter((notif) => notif.priority === 'high').length;

  const filteredNotifs = scopedNotifs.filter((notif: NotificationItem) => {
    if (activeTab === 'Unread') return !notif.read;
    if (activeTab === 'High') return notif.priority === 'high';
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Deadline alerts, pending undertakings and scheduled expert visit updates, scoped to your role."
        actions={
          unreadCount > 0 ? (
            <Button
              variant="secondary"
              icon={<Check className="h-4 w-4" />}
              onClick={markAllNotificationsAsRead}
            >
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      <Card padded="none">
        <div className="border-b border-line p-4">
          <Tabs
            ariaLabel="Filter notifications"
            items={[
              { id: 'All', label: 'All', count: scopedNotifs.length },
              { id: 'Unread', label: 'Unread', count: unreadCount },
              { id: 'High', label: 'High priority', count: highCount }
            ]}
            value={activeTab}
            onChange={(id) => setActiveTab(id as NotificationFilter)}
          />
        </div>

        {filteredNotifs.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={scopedNotifs.length === 0 ? 'No notifications yet' : 'Nothing in this filter'}
            description={
              scopedNotifs.length === 0
                ? 'Alerts appear here when a stage, report, undertaking or document approaches its due date.'
                : 'Choose another filter or mark the current items as read.'
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {filteredNotifs.map((notif: NotificationItem) => {
              const Icon = CATEGORY_ICON[notif.category];

              return (
                <li
                  key={notif.id}
                  className={`flex flex-col gap-3 p-4 transition-colors duration-150 sm:flex-row sm:items-start sm:justify-between ${
                    notif.read ? 'hover:bg-surface-2/60' : 'bg-accent-soft/30 hover:bg-accent-soft/50'
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-2 text-ink-2">
                      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </span>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3
                          className={`text-sm leading-snug ${
                            notif.read ? 'font-medium text-ink' : 'font-semibold text-ink'
                          }`}
                        >
                          {notif.title}
                        </h3>
                        {!notif.read && <Badge tone="info">Unread</Badge>}
                        <Badge tone={PRIORITY_TONE[notif.priority]}>
                          {notif.priority === 'high' ? 'High' : notif.priority === 'medium' ? 'Medium' : 'Low'} priority
                        </Badge>
                      </div>

                      <p className="max-w-[62ch] text-sm leading-relaxed text-ink-2 [text-wrap:pretty]">
                        {notif.description}
                      </p>

                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-2">
                        <span>{notif.timestamp}</span>
                        <span aria-hidden="true" className="text-line-strong">
                          /
                        </span>
                        <span>{CATEGORY_LABEL[notif.category]}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                    {!notif.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markNotificationAsRead(notif.id)}
                      >
                        Mark read
                      </Button>
                    )}

                    {notif.link && (
                      <Button
                        size="sm"
                        onClick={() => {
                          markNotificationAsRead(notif.id);
                          navigate(notif.link!);
                        }}
                      >
                        Inspect
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};
