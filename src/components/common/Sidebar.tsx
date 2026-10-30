import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock3,
  Building2,
  Workflow,
  CalendarDays,
  ShieldCheck,
  FolderArchive,
  Users2,
  FileBarChart,
  Bell,
  Landmark,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { notifications } = useApp();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Applications', path: '/applications', icon: Clock3 },
    { name: 'Institutes', path: '/institutes', icon: Building2 },
    { name: 'Stages & Workflow', path: '/workflow', icon: Workflow },
    { name: 'EVC Scheduling', path: '/evc-scheduling', icon: CalendarDays },
    { name: 'Undertakings & Compliance', path: '/compliance', icon: ShieldCheck },
    { name: 'Documents', path: '/documents', icon: FolderArchive },
    { name: 'Regions & Officials', path: '/regions-officials', icon: Users2 },
    { name: 'Reports', path: '/reports', icon: FileBarChart },
    { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0a1222] text-slate-200 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800/80 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
          <div className="flex items-center space-x-3">
            {/* AICTE Logo Emblem matching reference screenshot */}
            <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 flex items-center justify-center shadow-md shadow-amber-500/20">
              <div className="w-full h-full rounded-full bg-[#0d182b] flex items-center justify-center p-1">
                {/* Sunburst seal */}
                <div className="w-full h-full rounded-full border border-amber-400/80 flex items-center justify-center bg-radial from-amber-400/20 to-transparent">
                  <span className="text-[8px] font-black tracking-tighter text-amber-300">AICTE</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-white font-bold text-base leading-tight tracking-wide">
                AICTE
              </div>
              <div className="text-[11px] text-slate-300 font-normal leading-tight">
                Approval Management System
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-[#2563eb] text-white shadow-sm shadow-blue-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white text-blue-700'
                            : 'bg-rose-500 text-white shadow-xs'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom AICTE Motto Card matching screenshot */}
        <div className="p-4 border-t border-slate-800/60">
          <div className="bg-[#0f1b30] border border-slate-800/80 rounded-xl p-3.5 text-center shadow-inner">
            <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-blue-900/40 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Landmark className="w-4 h-4" />
            </div>
            <div className="text-white font-bold text-xs tracking-wider">
              AICTE
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-tight font-normal">
              Facilitating Quality Technical Education for a Better Tomorrow
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
