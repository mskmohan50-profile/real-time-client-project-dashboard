import {
  User,
  Project,
  Task,
  ActivityLog,
  NotificationItem,
  DashboardStats,
  Client,
  TaskStatus,
  TaskPriority,
} from '../types.ts';

let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (currentAccessToken) {
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', 
  };

  let response = await fetch(endpoint, config);
  if (response.status === 401 && !endpoint.includes('/api/auth/login') && !endpoint.includes('/api/auth/refresh')) {
    try {
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.success && refreshData.data?.accessToken) {
          setAccessToken(refreshData.data.accessToken);
          headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
          response = await fetch(endpoint, { ...config, headers });
        }
      }
    } catch (err) {
      console.error('Failed to auto-refresh session:', err);
    }
  }

  const json = await response.json();

  if (!response.ok || !json.success) {
    const errorMsg = json.error?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    (error as any).code = json.error?.code;
    (error as any).details = json.error?.details;
    (error as any).status = response.status;
    throw error;
  }

  return json.data !== undefined ? json.data : json;
}

export function normalizeUser(u: any): User {
  if (!u) return u;
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName || u.full_name || u.email?.split('@')[0] || 'User',
    role: u.role,
    avatarUrl: u.avatarUrl || u.avatar_url || undefined,
    unreadNotifications: u.unreadNotifications ?? u.unread_notifications ?? 0,
  };
}

export const api = {
  async login(email: string, password: string): Promise<{ user: User; accessToken: string }> {
    const res = await request<{ user: any; accessToken: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(res.accessToken);
    return { user: normalizeUser(res.user), accessToken: res.accessToken };
  },

  async quickLogin(userId: string): Promise<{ user: User; accessToken: string }> {
    const res = await request<{ user: any; accessToken: string }>('/api/auth/quick-login', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    setAccessToken(res.accessToken);
    return { user: normalizeUser(res.user), accessToken: res.accessToken };
  },

  async refresh(): Promise<{ user: User; accessToken: string }> {
    const res = await request<{ user: any; accessToken: string }>('/api/auth/refresh', {
      method: 'POST',
    });
    setAccessToken(res.accessToken);
    return { user: normalizeUser(res.user), accessToken: res.accessToken };
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setAccessToken(null);
    }
  },

  async getMe(): Promise<{ user: User }> {
    const res = await request<{ user: any }>('/api/auth/me');
    return { user: normalizeUser(res.user) };
  },

  async getPersonas(): Promise<User[]> {
    const res = await request<any[]>('/api/auth/personas');
    return (res || []).map(normalizeUser);
  },
  async getDashboardStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/api/dashboard/stats');
  },
  async getProjects(): Promise<Project[]> {
    return request<Project[]>('/api/projects');
  },

  async getProject(id: string): Promise<Project> {
    return request<Project>(`/api/projects/${id}`);
  },

  async createProject(data: {
    title: string;
    description?: string;
    client_id: string;
    status?: string;
  }): Promise<Project> {
    return request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProject(
    id: string,
    data: { title?: string; description?: string; status?: string }
  ): Promise<Project> {
    return request<Project>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProject(id: string): Promise<void> {
    return request<void>(`/api/projects/${id}`, { method: 'DELETE' });
  },

  async getClients(): Promise<Client[]> {
    return request<Client[]>('/api/projects/clients');
  },

  async getTasks(params?: {
    projectId?: string;
    status?: string;
    priority?: string;
    due?: string;
    assignedTo?: string;
    sort?: string;
  }): Promise<Task[]> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v && v !== 'ALL') searchParams.append(k, v);
      });
    }
    const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<Task[]>(`/api/tasks${queryStr}`);
  },

  async getTask(id: string): Promise<Task & { activity: ActivityLog[] }> {
    return request<Task & { activity: ActivityLog[] }>(`/api/tasks/${id}`);
  },

  async createTask(data: {
    project_id: string;
    title: string;
    description?: string;
    assigned_to?: string | null;
    priority: TaskPriority;
    due_date: string;
  }): Promise<Task> {
    return request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTask(
    id: string,
    data: {
      title?: string;
      description?: string;
      assigned_to?: string | null;
      priority?: TaskPriority;
      due_date?: string;
    }
  ): Promise<Task> {
    return request<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
    return request<Task>(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async deleteTask(id: string): Promise<void> {
    return request<void>(`/api/tasks/${id}`, { method: 'DELETE' });
  },

  async runOverdueScan(): Promise<{ flaggedCount: number; taskIds: string[] }> {
    const res = await request<{ flaggedCount: number; taskIds: string[] }>('/api/tasks/run-overdue-scan', {
      method: 'POST',
    });
    return res;
  },

  async getActivityFeed(params?: { limit?: number; since?: string; projectId?: string }): Promise<ActivityLog[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.since) searchParams.append('since', params.since);
    if (params?.projectId) searchParams.append('projectId', params.projectId);
    const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<ActivityLog[]>(`/api/activity/feed${queryStr}`);
  },
  async getNotifications(limit?: number): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
    const queryStr = limit ? `?limit=${limit}` : '';
    return request<{ notifications: NotificationItem[]; unreadCount: number }>(`/api/notifications${queryStr}`);
  },

  async markNotificationRead(id: string): Promise<void> {
    return request<void>(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  async markAllNotificationsRead(): Promise<void> {
    return request<void>('/api/notifications/read-all', { method: 'POST' });
  },
};
