import { useState } from 'react';
import { Activity, Clock, Shield, RefreshCw, Radio, User, FolderKanban } from 'lucide-react';
import { ActivityLog, UserRole } from '../types.ts';
import { formatRelativeTime } from '../utils/formatters.ts';

interface ActivityFeedProps {
  activityLogs: ActivityLog[];
  userRole: UserRole;
  onRefreshFeed: () => Promise<void>;
  isLoading: boolean;
  wsStatus: 'connected' | 'connecting' | 'disconnected';
}

export function ActivityFeed({
  activityLogs,
  userRole,
  onRefreshFeed,
  isLoading,
  wsStatus,
}: ActivityFeedProps) {
  const [filterProject, setFilterProject] = useState<string>('ALL');

  const getScopeDescription = () => {
    switch (userRole) {
      case 'ADMIN':
        return {
          title: 'Global Agency Real-Time Stream',
          desc: 'Observing all task and project operations across every client and team member.',
          pill: 'Global Scope',
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        };
      case 'PROJECT_MANAGER':
        return {
          title: 'Project Manager Feed Stream',
          desc: 'Role-filtered: Exclusively streaming activity from projects you created.',
          pill: 'PM Project Scope',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'DEVELOPER':
        return {
          title: 'Developer Activity Stream',
          desc: 'Role-filtered: Exclusively streaming activity for tasks assigned to you.',
          pill: 'Assigned Tasks Scope',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
    }
  };

  const scopeInfo = getScopeDescription();

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${scopeInfo.badgeColor}`}>
                {scopeInfo.pill}
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
                <Radio className={`w-3 h-3 ${wsStatus === 'connected' ? 'animate-pulse text-emerald-600' : ''}`} />
                <span>Live WebSocket Feed</span>
              </div>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{scopeInfo.title}</h2>
            <p className="text-xs text-slate-500">{scopeInfo.desc}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefreshFeed}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-xs font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              title="Refetch last 20 events from PostgreSQL database (reconnect catchup)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span>Catchup Sync (DB)</span>
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Live Event Journal</span>
          </div>
          <span className="text-xs text-slate-400">
            {activityLogs.length} events logged
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {activityLogs.map((log) => {
            const isStatusChange = log.action_type === 'STATUS_CHANGE';
            const isOverdue = log.action_type === 'FLAGGED_OVERDUE';
            const isAssignment = log.action_type === 'TASK_ASSIGNED';

            return (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-4 text-xs"
              >
                <div className="flex items-start gap-3">
                  {log.user_avatar ? (
                    <img
                      src={log.user_avatar}
                      alt={log.user_name || 'User'}
                      className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-slate-200">
                      {(log.user_name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900 leading-snug">
                      {log.message}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <FolderKanban className="w-3 h-3 text-slate-400" />
                        {log.project_title || 'Project'}
                      </span>
                      {log.task_title && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600 font-medium">{log.task_title}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                        {log.user_role === 'ADMIN' ? 'Admin' : log.user_role === 'PROJECT_MANAGER' ? 'PM' : 'Dev'}
                      </span>
                    </div>

                    {isStatusChange && log.previous_status && log.new_status && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 text-[10px] font-mono border border-slate-200 mt-1">
                        <span className="text-slate-600">{log.previous_status}</span>
                        <span className="text-blue-600 font-bold">→</span>
                        <span className="text-slate-900 font-bold">{log.new_status}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 whitespace-nowrap flex items-center gap-1 shrink-0 pt-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(log.created_at)}</span>
                </div>
              </div>
            );
          })}

          {activityLogs.length === 0 && (
            <div className="p-12 text-center text-xs text-slate-400">
              <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No activity recorded for your role's visibility scope yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
