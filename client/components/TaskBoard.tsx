import { useState } from 'react';
import {
  Plus,
  Filter,
  Share2,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  ArrowRight,
  Flame,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority, UserRole, Project } from '../types.ts';
import { formatDate, getPriorityColor, getStatusBadge } from '../utils/formatters.ts';

interface TaskBoardProps {
  tasks: Task[];
  projects: Project[];
  selectedProjectId?: string;
  statusFilter: string;
  priorityFilter: string;
  dueFilter: string;
  onFilterChange: (filters: { status?: string; priority?: string; due?: string; projectId?: string }) => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onOpenTask: (task: Task) => void;
  onOpenCreateTaskModal: () => void;
  userRole: UserRole;
  currentUserId: string;
}

export function TaskBoard({
  tasks,
  projects,
  selectedProjectId,
  statusFilter,
  priorityFilter,
  dueFilter,
  onFilterChange,
  onUpdateStatus,
  onOpenTask,
  onOpenCreateTaskModal,
  userRole,
  currentUserId,
}: TaskBoardProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const canCreateTask = userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER';

  const handleShareFilters = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleQuickStatusChange = async (e: React.MouseEvent, taskId: string, newStatus: TaskStatus) => {
    e.stopPropagation();
    setUpdatingTaskId(taskId);
    try {
      await onUpdateStatus(taskId, newStatus);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const columns: { id: TaskStatus; label: string; bg: string; border: string }[] = [
    { id: 'TODO', label: 'To Do', bg: 'bg-slate-50', border: 'border-slate-200' },
    { id: 'IN_PROGRESS', label: 'In Progress', bg: 'bg-blue-50/50', border: 'border-blue-200' },
    { id: 'IN_REVIEW', label: 'In Review', bg: 'bg-purple-50/50', border: 'border-purple-200' },
    { id: 'DONE', label: 'Done', bg: 'bg-emerald-50/50', border: 'border-emerald-200' },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filters:</span>
            </div>

            {userRole !== 'DEVELOPER' && (
              <select
                value={selectedProjectId || 'ALL'}
                onChange={(e) => onFilterChange({ projectId: e.target.value === 'ALL' ? undefined : e.target.value })}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-slate-900"
              >
                <option value="ALL">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
            <select
              value={statusFilter}
              onChange={(e) => onFilterChange({ status: e.target.value })}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="DONE">Done</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => onFilterChange({ priority: e.target.value })}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select
              value={dueFilter}
              onChange={(e) => onFilterChange({ due: e.target.value })}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Dates</option>
              <option value="overdue">🚨 Overdue Only</option>
              <option value="today">Due Today</option>
              <option value="this_week">Due This Week</option>
            </select>

            {(statusFilter !== 'ALL' || priorityFilter !== 'ALL' || dueFilter !== 'all' || selectedProjectId) && (
              <button
                type="button"
                onClick={() => onFilterChange({ status: 'ALL', priority: 'ALL', due: 'all', projectId: undefined })}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'kanban' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500'
                }`}
                title="Kanban Board View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleShareFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Copy shareable URL containing active query parameters"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{copiedUrl ? 'Copied URL!' : 'Share URL'}</span>
            </button>

            {canCreateTask && (
              <button
                type="button"
                onClick={onOpenCreateTaskModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className={`rounded-xl border ${col.border} ${col.bg} p-3 flex flex-col min-h-[500px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-800">{col.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                      {colTasks.length}
                    </span>
                  </div>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map((task) => {
                    const isAssignee = task.assigned_to === currentUserId;
                    const canMoveStatus = userRole === 'ADMIN' || (userRole === 'DEVELOPER' && isAssignee) || userRole === 'PROJECT_MANAGER';

                    return (
                      <div
                        key={task.id}
                        onClick={() => onOpenTask(task)}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer space-y-2.5 relative group"
                      >
                        {task.is_overdue && task.status !== 'DONE' && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 w-fit">
                            <AlertCircle className="w-3 h-3" />
                            <span>OVERDUE</span>
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block line-clamp-1">
                            {task.project_title}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">{task.title}</h4>
                        </div>

                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>
                        )}

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(task.priority).bg}`}>
                            {task.priority}
                          </span>

                          <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.due_date)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            {task.assignee_avatar ? (
                              <img
                                src={task.assignee_avatar}
                                alt={task.assignee_name || 'Assignee'}
                                className="w-5 h-5 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                                {(task.assignee_name || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-[11px] font-medium text-slate-700 line-clamp-1 max-w-[100px]">
                              {task.assignee_name || 'Unassigned'}
                            </span>
                          </div>
                          {canMoveStatus && (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={task.status}
                                disabled={updatingTaskId === task.id}
                                onChange={(e) => handleQuickStatusChange(e as any, task.id, e.target.value as TaskStatus)}
                                className="text-[10px] font-semibold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 hover:bg-slate-100 focus:outline-hidden"
                              >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="IN_REVIEW">In Review</option>
                                <option value="DONE">Done</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No tasks in this column
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const isAssignee = task.assigned_to === currentUserId;
              const canMoveStatus = userRole === 'ADMIN' || (userRole === 'DEVELOPER' && isAssignee) || userRole === 'PROJECT_MANAGER';

              return (
                <div
                  key={task.id}
                  onClick={() => onOpenTask(task)}
                  className="p-4 hover:bg-slate-50/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{task.title}</span>
                      {task.is_overdue && task.status !== 'DONE' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded border border-rose-200">
                          OVERDUE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                    <span className="text-[11px] text-slate-400">{task.project_title}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(task.priority).bg}`}>
                      {task.priority}
                    </span>

                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(task.due_date)}
                    </span>

                    {canMoveStatus ? (
                      <select
                        value={task.status}
                        onChange={(e) => handleQuickStatusChange(e as any, task.id, e.target.value as TaskStatus)}
                        className={`text-xs font-bold rounded px-2 py-1 border border-slate-200 ${getStatusBadge(task.status).bg} ${getStatusBadge(task.status).text}`}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="DONE">Done</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getStatusBadge(task.status).bg} ${getStatusBadge(task.status).text}`}>
                        {getStatusBadge(task.status).label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {tasks.length === 0 && (
              <div className="p-12 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No tasks match current filter parameters.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
