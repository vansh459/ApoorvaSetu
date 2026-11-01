import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Menu,
  RotateCcw,
  Check,
  ExternalLink,
  LogOut,
  Compass,
  Sparkles,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { filterNotificationsForUser } from '../../services/rbacService';
import { getDataMode } from '../../services/repositories';
import { DEMO_CLOCK_PRESETS } from '../../data/seedScenarios';
import { Avatar, IconButton } from '../ui';
import { cn } from '../../utils/cn';

interface HeaderProps {
  onMenuToggle: () => void;
  assistantOpen: boolean;
  onToggleAssistant: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuToggle,
  assistantOpen,
  onToggleAssistant
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    searchQuery,
    setSearchQuery,
    applications,
    institutes,
    notifications,
    setSelectedApplication,
    setActiveModal,
    resetToInitialData,
    markAllNotificationsAsRead,
    demoClockOffsetDays,
    setDemoClockOffset
  } = useApp();

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'AICTE_ADMIN';
  const isDemo = getDataMode() === 'demo';

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Scoped notifications for this specific user role & jurisdiction
  const roleNotifications = filterNotificationsForUser(notifications, user);
  const unreadNotifications = roleNotifications.filter((n) => !n.read);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) {
        setIsMobileSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered results for global search dropdown
  const filteredApps = searchQuery.trim()
    ? applications.filter(
        (a) =>
          a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.instituteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.stage.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredInsts = searchQuery.trim()
    ? institutes.filter(
        (i) =>
          i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.state.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const searchResults = (
    <>
      {filteredApps.length === 0 && filteredInsts.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-ink-2">
          No applications or institutes match your search.
        </div>
      ) : (
        <div className="py-2">
          {filteredApps.length > 0 && (
            <div className="px-2 pb-1">
              <div className="px-2 pt-1 pb-1.5 text-xs font-semibold text-ink-2">Applications</div>
              {filteredApps.slice(0, 4).map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => {
                    setSelectedApplication(app);
                    setActiveModal('app-detail');
                    setIsSearchOpen(false);
                    setIsMobileSearchOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-control px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">
                      <span className="text-accent">{app.id}</span>{' '}
                      <span>{app.instituteName}</span>
                    </div>
                    <div className="truncate text-xs text-ink-2">
                      {app.stage}, {app.region} Region
                    </div>
                  </div>
                  <span className="shrink-0 rounded-pill bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-ink-2">
                    {app.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredInsts.length > 0 && (
            <div className="mt-1 border-t border-line px-2 pt-2">
              <div className="px-2 pb-1.5 text-xs font-semibold text-ink-2">Institutes</div>
              {filteredInsts.slice(0, 3).map((inst) => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => {
                    navigate('/institutes');
                    setIsSearchOpen(false);
                    setIsMobileSearchOpen(false);
                  }}
                  className="w-full rounded-control px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-2"
                >
                  <div className="truncate text-sm font-medium text-ink">{inst.name}</div>
                  <div className="truncate text-xs text-ink-2">
                    PID {inst.code}, {inst.city}, {inst.state}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <header className="glass-header sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line/70 px-4 sm:px-6 lg:px-8">
      {/* Left: mobile menu, search */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          onClick={onMenuToggle}
          className="lg:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink cursor-pointer"
          aria-label="Open navigation"
        >
          <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>

        {/* Desktop search */}
        <div ref={searchRef} className="relative hidden w-full max-w-md md:block">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ink-3" strokeWidth={1.75} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search applications, institutes, regions"
              aria-label="Search applications and institutes"
              className="h-9 w-full rounded-control border border-transparent bg-surface-2 pl-9 pr-16 text-sm text-ink placeholder:text-ink-3 transition-colors duration-150 hover:border-line focus:border-line-strong focus:bg-surface"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 rounded px-1.5 py-0.5 text-xs font-medium text-ink-2 transition-colors duration-150 hover:text-ink cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div className="pop-enter absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-card border border-line bg-surface shadow-overlay">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs text-ink-2">
                <span className="truncate">Results for “{searchQuery}”</span>
                <span className="shrink-0 pl-2">{filteredApps.length + filteredInsts.length} matches</span>
              </div>
              {searchResults}
            </div>
          )}
        </div>

        {/* Mobile search trigger */}
        <div ref={mobileSearchRef} className="relative md:hidden">
          <IconButton
            label="Search"
            variant="ghost"
            onClick={() => setIsMobileSearchOpen((v) => !v)}
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </IconButton>
          {isMobileSearchOpen && (
            <div className="pop-enter-left absolute left-0 top-full z-50 mt-2 w-[min(88vw,26rem)] rounded-card border border-line bg-surface shadow-overlay">
              <div className="relative flex items-center border-b border-line p-2">
                <Search className="pointer-events-none absolute left-5 h-4 w-4 text-ink-3" strokeWidth={1.75} />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search applications, institutes"
                  aria-label="Search applications and institutes"
                  className="h-9 w-full rounded-control bg-surface-2 pl-9 pr-9 text-sm text-ink placeholder:text-ink-3"
                />
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(false)}
                  aria-label="Close search"
                  className="absolute right-4 inline-flex h-7 w-7 items-center justify-center rounded-pill text-ink-2 hover:bg-surface-2 hover:text-ink cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {searchQuery.trim() ? (
                  searchResults
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-ink-2">
                    Search by application ID, institution or region.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <IconButton
          label="Ask the ApoorvaSetu assistant"
          variant="ghost"
          aria-pressed={assistantOpen}
          onClick={onToggleAssistant}
          className={cn(assistantOpen && 'bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent')}
        >
          <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </IconButton>

        <div ref={notifRef} className="relative">
          <IconButton
            label="Notifications"
            variant="ghost"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            aria-expanded={isNotifOpen}
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </IconButton>
          {unreadNotifications.length > 0 && (
            <span className="pointer-events-none absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-danger px-1 text-xs font-semibold leading-none text-white ring-2 ring-surface">
              {unreadNotifications.length}
            </span>
          )}

          {isNotifOpen && (
            <div className="pop-enter absolute right-0 top-full z-50 mt-2 w-[min(88vw,24rem)] overflow-hidden rounded-card border border-line bg-surface shadow-overlay">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Notifications</span>
                  {unreadNotifications.length > 0 && (
                    <span className="rounded-pill bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">
                      {unreadNotifications.length} new
                    </span>
                  )}
                </div>
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-80 divide-y divide-line overflow-y-auto">
                {roleNotifications.slice(0, 5).map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    className={cn(
                      'block w-full px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-2',
                      !notif.read && 'bg-accent-soft/50'
                    )}
                    onClick={() => {
                      if (notif.link) navigate(notif.link);
                      setIsNotifOpen(false);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-medium leading-snug text-ink">{notif.title}</h4>
                      <span className="shrink-0 text-xs text-ink-2">{notif.timestamp}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-2">
                      {notif.description}
                    </p>
                  </button>
                ))}
                {roleNotifications.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-ink-2">
                    You have no notifications.
                  </div>
                )}
              </div>

              <div className="border-t border-line px-4 py-2.5 text-center">
                <button
                  onClick={() => {
                    navigate('/notifications');
                    setIsNotifOpen(false);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
                >
                  View all notifications
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div ref={profileRef} className="relative">
          <button
            type="button"
            aria-expanded={isProfileOpen}
            aria-label="Account menu"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && isProfileOpen) {
                setIsProfileOpen(false);
              }
            }}
            className="flex items-center gap-2.5 rounded-control p-1 pr-1.5 transition-colors duration-150 hover:bg-surface-2 cursor-pointer"
          >
            <Avatar initials={user?.initials || 'AS'} size="md" />
            <div className="hidden text-left sm:block">
              <div className="text-xs font-semibold leading-tight text-ink">
                {user?.name || 'Amit Sharma'}
              </div>
              <div className="text-xs leading-tight text-ink-2">
                {user?.roleTitle || 'AICTE Official'}
              </div>
            </div>
          </button>

          {isProfileOpen && (
            <div className="pop-enter absolute right-0 top-full z-50 mt-2 w-[min(88vw,20rem)] overflow-hidden rounded-card border border-line bg-surface shadow-overlay">
              <div className="border-b border-line px-4 py-3">
                <p className="text-sm font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-xs text-ink-2">{user?.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                    {user?.roleTitle}
                  </span>
                  {user?.region && (
                    <span className="rounded-pill bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2">
                      {user.region}
                    </span>
                  )}
                </div>
              </div>

              {/* Active Role & Jurisdiction Metadata (Role switching strictly removed for security) */}
              <div className="space-y-1.5 border-b border-line px-4 py-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink-2">Designation</span>
                  <span className="truncate font-medium text-ink">{user?.designation || user?.roleTitle}</span>
                </div>
                {user?.instituteName && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink-2">Institution</span>
                    <span className="truncate font-medium text-ink">{user.instituteName}</span>
                  </div>
                )}
                {user?.instituteId && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink-2">AICTE PID</span>
                    <span className="rounded-control bg-surface-2 px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                      {user.instituteId}
                    </span>
                  </div>
                )}
                {user?.region && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-ink-2">Jurisdiction</span>
                    <span className="font-medium text-ink">{user.region} Region</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <span className="text-ink-2">Session</span>
                  <span className="inline-flex items-center gap-1 font-medium text-success">
                    <Check className="h-3 w-3" /> Authenticated
                  </span>
                </div>
              </div>

              <div className="py-1">
                {isAdmin && isDemo && (
                  <div className="border-b border-line px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-ink-2">Demo clock</span>
                      <span className="font-mono text-xs text-ink-2">
                        {demoClockOffsetDays === 0 ? 'today' : `+${demoClockOffsetDays}d`}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-4 gap-1 rounded-control bg-surface-2 p-1">
                      {DEMO_CLOCK_PRESETS.map((preset) => {
                        const active = preset.days === demoClockOffsetDays;
                        return (
                          <button
                            key={preset.days}
                            type="button"
                            aria-pressed={active}
                            title={preset.hint}
                            onClick={() => setDemoClockOffset(preset.days)}
                            className={cn(
                              'rounded-control px-1 py-1 text-xs font-medium transition-colors duration-150 cursor-pointer',
                              active
                                ? 'bg-surface text-ink shadow-raise'
                                : 'text-ink-2 hover:text-ink'
                            )}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/demo-scenarios');
                        setIsProfileOpen(false);
                      }}
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover cursor-pointer"
                    >
                      <Compass className="h-3.5 w-3.5" />
                      Scenario guide
                    </button>
                  </div>
                )}

                {isAdmin && isDemo && (
                  <button
                    type="button"
                    onClick={() => {
                      resetToInitialData();
                      setIsProfileOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Reset demo data</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 border-t border-line px-4 py-2 text-left text-sm text-danger transition-colors duration-150 hover:bg-danger-soft cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-ink-2">
                <span>ApoorvaSetu v4.2 RBAC</span>
                <span className="inline-flex items-center gap-1 font-medium text-success">
                  <Check className="h-3 w-3" /> Secure
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
