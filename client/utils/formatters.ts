export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 5) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getPriorityColor(priority: string): { bg: string; text: string; border: string } {
  switch (priority) {
    case 'CRITICAL':
      return { bg: 'bg-rose-50 text-rose-700', text: 'text-rose-700', border: 'border-rose-300' };
    case 'HIGH':
      return { bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700', border: 'border-amber-300' };
    case 'MEDIUM':
      return { bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700', border: 'border-blue-300' };
    case 'LOW':
    default:
      return { bg: 'bg-slate-50 text-slate-700', text: 'text-slate-700', border: 'border-slate-300' };
  }
}

export function getStatusBadge(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'TODO':
      return { label: 'To Do', bg: 'bg-slate-100', text: 'text-slate-700' };
    case 'IN_PROGRESS':
      return { label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'IN_REVIEW':
      return { label: 'In Review', bg: 'bg-purple-100', text: 'text-purple-800' };
    case 'DONE':
      return { label: 'Done', bg: 'bg-emerald-100', text: 'text-emerald-800' };
    default:
      return { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };
  }
}
