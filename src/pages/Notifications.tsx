import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ArrowRight,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { filterNotificationsForUser } from '../services/rbacService';
import { NotificationItem } from '../types';

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead
  } = useApp();

  const [activeTab, setActiveTab] = useState<'All' | 'Unread' | 'High'>('All');

  const scopedNotifs = React.useMemo(() => {
    return filterNotificationsForUser(notifications, user);
  }, [notifications, user]);

  const filteredNotifs = scopedNotifs.filter((n: NotificationItem) => {
    if (activeTab === 'Unread') return !n.read;
    if (activeTab === 'High') return n.priority === 'high';
    return true;
  });

  const unreadCount = scopedNotifs.filter((n: NotificationItem) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Notifications & System Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time critical alerts, pending undertakings, and scheduled EVC updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllNotificationsAsRead}
            className="flex items-center space-x-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {(['All', 'Unread', 'High'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'All'
                ? `All Notifications (${scopedNotifs.length})`
                : tab === 'Unread'
                ? `Unread (${unreadCount})`
                : 'High Priority Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        {filteredNotifs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No notifications in this category.
          </div>
        ) : (
          filteredNotifs.map((notif: NotificationItem) => (
            <div
              key={notif.id}
              className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                !notif.read ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    notif.priority === 'high'
                      ? 'bg-rose-100 text-rose-600'
                      : notif.category === 'evc'
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900">{notif.title}</h3>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        notif.priority === 'high'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {notif.priority}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-normal max-w-2xl">
                    {notif.description}
                  </p>

                  <div className="text-[11px] text-slate-400 font-medium">
                    {notif.timestamp} • Category: {notif.category.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                {!notif.read && (
                  <button
                    onClick={() => markNotificationAsRead(notif.id)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 active:scale-95 transition-all duration-150 cursor-pointer"
                  >
                    Mark Read
                  </button>
                )}

                {notif.link && (
                  <button
                    onClick={() => {
                      markNotificationAsRead(notif.id);
                      navigate(notif.link!);
                    }}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all duration-150 cursor-pointer"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
