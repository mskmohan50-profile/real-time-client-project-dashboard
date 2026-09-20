export type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  unreadNotifications?: number;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  client_id: string;
  created_by: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  client_name?: string;
  client_company?: string;
  creator_name?: string;
  total_tasks?: number;
  completed_tasks?: number;
  overdue_tasks?: number;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  assigned_to?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
  assignee_name?: string | null;
  assignee_email?: string | null;
  assignee_avatar?: string | null;
  project_title?: string;
  project_creator_id?: string;
  creator_name?: string;
}

export interface ActivityLog {
  id: string;
  task_id?: string | null;
  project_id: string;
  user_id: string;
  action_type: string;
  previous_status?: string | null;
  new_status?: string | null;
  message: string;
  created_at: string;
  user_name?: string;
  user_role?: UserRole;
  user_avatar?: string | null;
  task_title?: string | null;
  project_title?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  task_id?: string | null;
  project_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DashboardStats {
  role: UserRole;
  totalProjects?: number;
  totalClients?: number;
  overdueTasksCount?: number;
  activeUsersOnline?: number;
  onlineUsersList?: Array<{ id: string; fullName: string; role: UserRole }>;
  tasksByStatus?: Record<string, number>;
  users?: User[];
  projects?: Project[];
  tasksByPriority?: Record<string, number>;
  upcomingDueThisWeek?: Task[];
  overdueCount?: number;
  assignedTasks?: Task[];
  totalTasks?: number;
  inProgressCount?: number;
  inReviewCount?: number;
  doneCount?: number;
}
