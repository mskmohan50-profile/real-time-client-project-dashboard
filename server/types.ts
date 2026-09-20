import { Request } from 'express';

export type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'DEVELOPER';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface ClientRow {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
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

export interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
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
}

export interface ActivityLogRow {
  id: string;
  task_id: string | null;
  project_id: string;
  user_id: string;
  action_type: string;
  previous_status: string | null;
  new_status: string | null;
  message: string;
  created_at: string;
  user_name?: string;
  user_role?: UserRole;
  user_avatar?: string | null;
  task_title?: string | null;
  project_title?: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  task_id: string | null;
  project_id: string | null;
  is_read: boolean;
  created_at: string;
}
