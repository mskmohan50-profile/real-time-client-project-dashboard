import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  AlertCircle,
  User,
  Clock,
  Activity,
  Layers,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Task, TaskStatus, UserRole, ActivityLog } from '../types.ts';
import { api } from '../services/api.ts';
import { formatDate, formatRelativeTime, getPriorityColor, getStatusBadge } from '../utils/formatters.ts';

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
  userRole: UserRole;
  currentUserId: string;
}

export function TaskDetailModal({
  task,
  onClose,
  onUpdateStatus,
  onDeleteTask,
  userRole,
  currentUserId,
}: TaskDetailModalProps) {
  const [taskDetails, setTaskDetails] = useState<(Task & { activity: ActivityLog[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!task) return;
    let isMounted = true;
    setLoading(true);

    api
      .getTask(task.id)
      .then((data) => {
        if (isMounted) setTaskDetails(data);
      })
      .catch((err) => {
        console.error('Failed to fetch full task details:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [task?.id]);

  if (!task) return null;

  const isAssignee = task.assigned_to === currentUserId;
  const canUpdateStatus = userRole === 'ADMIN' || (userRole === 'DEVELOPER' && isAssignee) || userRole === 'PROJECT_MANAGER';
  const canDelete = userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER';

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(task.id, newStatus);
      const refreshed = await api.getTask(task.id);
      setTaskDetails(refreshed);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    if (onDeleteTask) {
      await onDeleteTask(task.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              {task.project_title || 'Project Task'}
            </span>
            <h3 className="text-base font-bold text-slate-900 leading-snug">{task.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6">
          {task.is_overdue && task.status !== 'DONE' && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>This task has passed its due date and was flagged as Overdue by the background scheduler.</span>
            </div>
          )}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</h4>
            <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {task.description || 'No detailed description provided.'}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Priority</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityColor(task.priority).bg}`}>
                {task.priority}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Status</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(task.status).bg} ${getStatusBadge(task.status).text}`}>
                {getStatusBadge(task.status).label}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Due Date</span>
              <span className="font-semibold text-slate-800">{formatDate(task.due_date)}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Assigned Developer</span>
              <span className="font-semibold text-slate-800 line-clamp-1">{task.assignee_name || 'Unassigned'}</span>
            </div>
          </div>
          {canUpdateStatus && (
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Update Task Status</h4>
                <p className="text-[11px] text-slate-500">
                  Mutations record immutable audit logs and broadcast in real time.
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as TaskStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={isUpdating || task.status === st}
                    onClick={() => handleStatusChange(st)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                      task.status === st
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {getStatusBadge(st).label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Task Audit History (Stored in DB)</span>
            </h4>

            <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto pr-1">
              {taskDetails?.activity && taskDetails.activity.length > 0 ? (
                taskDetails.activity.map((act) => (
                  <div key={act.id} className="py-2.5 text-xs flex items-start justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 block">{act.message}</span>
                      <span className="text-[10px] text-slate-400">
                        By {act.user_name} ({act.user_role})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {formatRelativeTime(act.created_at)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">No activity logged for this task yet.</div>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          {canDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Task</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-semibold transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
