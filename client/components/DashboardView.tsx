import { useState, useEffect } from 'react';
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Flame,
  Calendar,
  Layers,
  Radio,
} from 'lucide-react';
import { DashboardStats, UserRole, Task, Project } from '../types.ts';
import { formatDate, getPriorityColor, getStatusBadge } from '../utils/formatters.ts';

interface DashboardViewProps {
  stats: DashboardStats | null;
  userRole: UserRole;
  onSelectProject: (projectId: string) => void;
  onOpenTask: (task: Task) => void;
  onNavigateToTasks: () => void;
}
function LiveIndicator({ pulseColor = 'bg-emerald-400' }: { pulseColor?: string }) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    setSecondsAgo(0);
    const interval = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const label = secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.floor(secondsAgo / 60)}m ago`;

  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-white/70">
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pulseColor} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${pulseColor}`} />
      </span>
      <span>Live · updated {label}</span>
    </div>
  );
}

function LiveValue({ value, className = '' }: { value: number | string; className?: string }) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 600);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <span
      className={`inline-block transition-all duration-500 ${
        flash ? 'scale-110 text-blue-600' : 'scale-100'
      } ${className}`}
    >
      {value}
    </span>
  );
}

export function DashboardView({
  stats,
  userRole,
  onSelectProject,
  onOpenTask,
  onNavigateToTasks,
}: DashboardViewProps) {
  if (!stats) {
    return (
      <div className="py-12 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-2" />
        Loading role-tailored dashboard metrics...
      </div>
    );
  }
  if (userRole === 'ADMIN') {
    const tasksByStatus = stats.tasksByStatus || {};
    const todo = tasksByStatus['TODO'] || 0;
    const inProgress = tasksByStatus['IN_PROGRESS'] || 0;
    const inReview = tasksByStatus['IN_REVIEW'] || 0;
    const done = tasksByStatus['DONE'] || 0;
    const totalTasks = todo + inProgress + inReview + done;

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                  <span>Admin Global Visibility</span>
                </div>
                <LiveIndicator />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Organization Overview & Live Operations</h2>
              <p className="text-sm text-purple-200/80 mt-0.5">
                Full authority across all client projects, team members, and real-time WebSocket feeds.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateToTasks}
                className="px-3 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>Browse All Tasks</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Projects</span>
              <FolderKanban className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              <LiveValue value={stats.totalProjects || 0} />
            </div>
            <p className="text-xs text-slate-500 mt-1">{stats.totalClients || 0} corporate clients</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Tasks</span>
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              <LiveValue value={totalTasks} />
            </div>
            <p className="text-xs text-slate-500 mt-1">{done} completed ({totalTasks > 0 ? Math.round((done / totalTasks) * 100) : 0}%)</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Overdue Tasks</span>
              <AlertTriangle className={`w-4 h-4 text-rose-600 ${(stats.overdueTasksCount || 0) > 0 ? 'animate-pulse' : ''}`} />
            </div>
            <div className="text-2xl font-bold text-rose-600">
              <LiveValue value={stats.overdueTasksCount || 0} />
            </div>
            <p className="text-xs text-slate-500 mt-1">Flagged by background scheduler</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Active Online Now</span>
              <Radio className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
              <LiveValue value={stats.activeUsersOnline || 1} />
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Live WebSocket presence</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center justify-between">
              <span>Tasks by Status Distribution</span>
              <span className="text-xs text-slate-500 font-normal flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                </span>
                Real-time aggregate
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 transition-all duration-300">
                <span className="text-xs text-slate-500 block">To Do</span>
                <span className="text-xl font-bold text-slate-800"><LiveValue value={todo} /></span>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 transition-all duration-300">
                <span className="text-xs text-blue-700 block">In Progress</span>
                <span className="text-xl font-bold text-blue-900"><LiveValue value={inProgress} /></span>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 transition-all duration-300">
                <span className="text-xs text-purple-700 block">In Review</span>
                <span className="text-xl font-bold text-purple-900"><LiveValue value={inReview} /></span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 transition-all duration-300">
                <span className="text-xs text-emerald-700 block">Done</span>
                <span className="text-xl font-bold text-emerald-900"><LiveValue value={done} /></span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100">
                {todo > 0 && (
                  <div
                    style={{ width: `${(todo / totalTasks) * 100}%` }}
                    className="bg-slate-400 transition-all duration-700 ease-out"
                    title={`To Do: ${todo}`}
                  />
                )}
                {inProgress > 0 && (
                  <div
                    style={{ width: `${(inProgress / totalTasks) * 100}%` }}
                    className="bg-blue-500 transition-all duration-700 ease-out"
                    title={`In Progress: ${inProgress}`}
                  />
                )}
                {inReview > 0 && (
                  <div
                    style={{ width: `${(inReview / totalTasks) * 100}%` }}
                    className="bg-purple-500 transition-all duration-700 ease-out"
                    title={`In Review: ${inReview}`}
                  />
                )}
                {done > 0 && (
                  <div
                    style={{ width: `${(done / totalTasks) * 100}%` }}
                    className="bg-emerald-500 transition-all duration-700 ease-out"
                    title={`Done: ${done}`}
                  />
                )}
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                <span>{Math.round(((todo + inProgress + inReview) / (totalTasks || 1)) * 100)}% In Flight</span>
                <span>{Math.round((done / (totalTasks || 1)) * 100)}% Velocity Parity</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
              <span>Agency Personnel</span>
              <span className="text-xs text-slate-500">{stats.users?.length || 7} Members</span>
            </h3>
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
              {stats.users?.map((u: any) => {
                const displayName = u.fullName || u.full_name || u.email || 'User';
                const avatar = u.avatarUrl || u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
                return (
                  <div key={u.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <img
                          src={avatar}
                          alt={displayName}
                          className="w-6 h-6 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                      </div>
                      <div>
                        <span className="font-medium text-slate-900 block leading-tight">{displayName}</span>
                        <span className="text-[10px] text-slate-400 block">{u.email}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {u.role === 'ADMIN' ? 'Admin' : u.role === 'PROJECT_MANAGER' ? 'PM' : 'Dev'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (userRole === 'PROJECT_MANAGER') {
    const projects = stats.projects || [];
    const tasksByPriority = stats.tasksByPriority || {};
    const upcomingTasks = stats.upcomingDueThisWeek || [];

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  <span>Project Manager Scope</span>
                </div>
                <LiveIndicator />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Your Projects & Team Deliverables</h2>
              <p className="text-sm text-blue-200/80 mt-0.5">
                Managing your {projects.length} assigned projects. You only view and edit projects you created.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToTasks}
              className="px-3 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>View Tasks Board</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow duration-300">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
              Active Projects
            </span>
            <div className="text-2xl font-bold text-slate-900"><LiveValue value={stats.totalProjects || 0} /></div>
            <p className="text-xs text-slate-500 mt-1">Strictly your created projects</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow duration-300">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
              Due This Week
            </span>
            <div className="text-2xl font-bold text-blue-600"><LiveValue value={upcomingTasks.length} /></div>
            <p className="text-xs text-slate-500 mt-1">Upcoming milestones in 7 days</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow duration-300">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
              Overdue Tasks
            </span>
            <div className="text-2xl font-bold text-rose-600"><LiveValue value={stats.overdueCount || 0} /></div>
            <p className="text-xs text-slate-500 mt-1">Require immediate PM attention</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center justify-between">
              <span>Tasks by Priority</span>
              <Flame className="w-4 h-4 text-amber-500" />
            </h3>

            <div className="space-y-3">
              {[
                { label: 'Critical', key: 'CRITICAL', color: 'bg-rose-500', text: 'text-rose-700' },
                { label: 'High', key: 'HIGH', color: 'bg-amber-500', text: 'text-amber-700' },
                { label: 'Medium', key: 'MEDIUM', color: 'bg-blue-500', text: 'text-blue-700' },
                { label: 'Low', key: 'LOW', color: 'bg-slate-400', text: 'text-slate-700' },
              ].map((p) => {
                const count = tasksByPriority[p.key] || 0;
                return (
                  <div key={p.key} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${p.color} ${p.key === 'CRITICAL' && count > 0 ? 'animate-pulse' : ''}`} />
                      <span className="text-slate-700 font-medium">{p.label}</span>
                    </div>
                    <span className="font-bold text-slate-900"><LiveValue value={count} /></span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Overdue tasks trigger real-time alerts to the PM via WebSockets.
              </span>
            </div>
          </div>
          <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center justify-between">
              <span>Upcoming Due Dates This Week</span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </h3>

            {upcomingTasks.length > 0 ? (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onOpenTask(task)}
                    className="py-3 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors duration-200"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 block">{task.title}</span>
                      <span className="text-[11px] text-slate-500">
                        {task.project_title} · Assigned to {task.assignee_name || 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-600">
                        Due {formatDate(task.due_date)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(task.priority).bg}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                No tasks due this week across your projects
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Your Managed Projects</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => {
              const total = proj.total_tasks || 0;
              const completed = proj.completed_tasks || 0;
              const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj.id)}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all duration-300 cursor-pointer bg-slate-50/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-bold text-slate-900 text-sm">{proj.title}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                      {proj.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{proj.client_name}</p>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>Progress</span>
                      <span className="font-bold">{percent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div style={{ width: `${percent}%` }} className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out" />
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                    <span>{total} tasks</span>
                    {(proj.overdue_tasks || 0) > 0 && (
                      <span className="text-rose-600 font-bold animate-pulse">{proj.overdue_tasks} overdue</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  if (userRole === 'DEVELOPER') {
    const tasks = stats.assignedTasks || [];
    const overdueCount = stats.overdueCount || 0;
    const inProgressCount = stats.inProgressCount || 0;
    const inReviewCount = stats.inReviewCount || 0;
    const doneCount = stats.doneCount || 0;

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  <span>Developer View</span>
                </div>
                <LiveIndicator />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Your Assigned Task Queue</h2>
              <p className="text-sm text-emerald-200/80 mt-0.5">
                Automatically sorted by Priority then Due Date. You only see tasks assigned to you.
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToTasks}
              className="px-3 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>Kanban Board</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow duration-300">
            <span className="text-xs font-medium text-slate-500 uppercase block mb-1">Assigned Tasks</span>
            <div className="text-2xl font-bold text-slate-900"><LiveValue value={tasks.length} /></div>
            <p className="text-xs text-slate-500 mt-1">Total in your queue</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow duration-300">
            <span className="text-xs font-medium text-blue-600 uppercase block mb-1">In Progress</span>
            <div className="text-2xl font-bold text-blue-600"><LiveValue value={inProgressCount} /></div>
            <p className="text-xs text-slate-500 mt-1">Active sprint work</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow duration-300">
            <span className="text-xs font-medium text-purple-600 uppercase block mb-1">In Review</span>
            <div className="text-2xl font-bold text-purple-600"><LiveValue value={inReviewCount} /></div>
            <p className="text-xs text-slate-500 mt-1">Awaiting PM signoff</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow duration-300">
            <span className="text-xs font-medium text-rose-600 uppercase block mb-1">Overdue</span>
            <div className="text-2xl font-bold text-rose-600"><LiveValue value={overdueCount} /></div>
            <p className="text-xs text-slate-500 mt-1">Past due deadline</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Priority Task Queue</h3>
              <p className="text-xs text-slate-500">Sorted: Critical → High → Medium → Low, then by Due Date</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
              {tasks.length} Tasks
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onOpenTask(task)}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors duration-200"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-xs sm:text-sm">{task.title}</span>
                    {task.is_overdue && task.status !== 'DONE' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded border border-rose-200 animate-pulse">
                        OVERDUE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                  <span className="text-[11px] text-slate-400 block">{task.project_title}</span>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getPriorityColor(task.priority).bg}`}>
                    {task.priority}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${getStatusBadge(task.status).bg} ${getStatusBadge(task.status).text}`}>
                    {getStatusBadge(task.status).label}
                  </span>
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">
                    Due {formatDate(task.due_date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
