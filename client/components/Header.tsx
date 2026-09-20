import { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Users,
  ShieldCheck,
  CheckCheck,
  Clock,
  Sparkles,
  Info,
  LogOut,
  ChevronDown,
  RotateCw,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react';
import { User, NotificationItem, UserRole } from '../types.ts';
import { formatRelativeTime } from '../utils/formatters.ts';

interface HeaderProps {
  currentUser: User | null;
  personas: User[];
  onSwitchPersona: (userId: string) => Promise<void>;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  onMarkNotificationRead: (id: string) => Promise<void>;
  onMarkAllNotificationsRead: () => Promise<void>;
  onlineCount: number;
  onlineUsers: Array<{ id: string; fullName: string; role: UserRole }>;
  wsStatus: 'connected' | 'connecting' | 'disconnected';
  onRunOverdueScan: () => Promise<void>;
  onOpenArchitectureDoc: () => void;
  onLogout: () => void;
  isScanningOverdue: boolean;
}

export function Header({
  currentUser,
  personas,
  onSwitchPersona,
  notifications,
  unreadNotificationCount,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onlineCount,
  onlineUsers,
  wsStatus,
  onRunOverdueScan,
  onOpenArchitectureDoc,
  onLogout,
  isScanningOverdue,
}: HeaderProps) {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showOnlineMenu, setShowOnlineMenu] = useState(false);

  const personaRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const onlineRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) {
        setShowPersonaMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (onlineRef.current && !onlineRef.current.contains(e.target as Node)) {
        setShowOnlineMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-800 rounded-md border border-purple-200">Admin</span>;
      case 'PROJECT_MANAGER':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-md border border-blue-200">PM</span>;
      case 'DEVELOPER':
        return <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">Dev</span>;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <FolderKanban className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 tracking-tight text-base">AgencyFlow</span>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-medium border border-slate-200">
                  Real-Time Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Client Projects & Live Activity Pulse</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-slate-600">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsStatus === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : wsStatus === 'connecting'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
              <span className="capitalize">{wsStatus}</span>
            </div>
            <div className="relative" ref={onlineRef}>
              <button
                type="button"
                onClick={() => setShowOnlineMenu(!showOnlineMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200"
                title="Active team members online"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold text-slate-900">{onlineCount}</span>
                <span className="hidden sm:inline">Online</span>
              </button>

              {showOnlineMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">Active WebSocket Presence</p>
                    <p className="text-xs text-slate-500">{onlineCount} client connection(s) right now</p>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                    {onlineUsers.length > 0 ? (
                      onlineUsers.map((u, i) => (
                        <div key={i} className="px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="font-medium text-slate-800">{u.fullName || (u as any).full_name || 'User'}</span>
                          </div>
                          {getRoleBadge(u.role)}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-xs text-slate-400 text-center">No other users online</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onRunOverdueScan}
              disabled={isScanningOverdue}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50"
              title="Runs the node-cron overdue task scanner job on demand"
            >
              <RotateCw className={`w-3.5 h-3.5 text-amber-600 ${isScanningOverdue ? 'animate-spin' : ''}`} />
              <span>{isScanningOverdue ? 'Scanning...' : 'Run Overdue Job'}</span>
            </button>
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900">Notifications</h4>
                      <p className="text-[11px] text-slate-500">Real-time WebSocket alerts</p>
                    </div>
                    {unreadNotificationCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllNotificationsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => !n.is_read && onMarkNotificationRead(n.id)}
                          className={`p-3 text-xs transition-colors cursor-pointer ${
                            n.is_read ? 'bg-white opacity-70' : 'bg-blue-50/50 hover:bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-slate-900">{n.title}</span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {formatRelativeTime(n.created_at)}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        No notifications yet
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={personaRef}>
              <button
                type="button"
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-left"
              >
                {currentUser?.avatarUrl || (currentUser as any)?.avatar_url ? (
                  <img
                    src={currentUser?.avatarUrl || (currentUser as any)?.avatar_url}
                    alt={currentUser?.fullName || (currentUser as any)?.full_name || 'User'}
                    className="w-7 h-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs">
                    {(currentUser?.fullName || (currentUser as any)?.full_name || currentUser?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 leading-tight flex items-center gap-1.5">
                    <span>{currentUser?.fullName || (currentUser as any)?.full_name || currentUser?.email || 'User'}</span>
                    {currentUser && getRoleBadge(currentUser.role)}
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-tight">{currentUser?.email}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {showPersonaMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">Switch Persona (Reviewer Fast-Toggle)</p>
                    <p className="text-[11px] text-slate-500">Instantly test RBAC & real-time role filtering</p>
                  </div>

                  <div className="max-h-72 overflow-y-auto py-1">
                    {personas.map((persona) => {
                      const isSelected = persona.id === currentUser?.id;
                      const displayName = persona.fullName || (persona as any).full_name || persona.email || 'User';
                      const avatar = persona.avatarUrl || (persona as any).avatar_url;
                      return (
                        <button
                          key={persona.id}
                          type="button"
                          onClick={async () => {
                            setShowPersonaMenu(false);
                            await onSwitchPersona(persona.id);
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-blue-50/70 font-semibold text-blue-900' : 'text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={displayName}
                                className="w-6 h-6 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="text-xs">{displayName}</div>
                              <div className="text-[10px] text-slate-400">{persona.email}</div>
                            </div>
                          </div>
                          {getRoleBadge(persona.role)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 pt-1 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPersonaMenu(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}