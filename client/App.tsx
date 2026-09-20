import { useState, useEffect, useCallback } from 'react';
import { api } from './services/api.ts';
import { wsClient } from './services/websocket.ts';
import {
  User,
  Project,
  Task,
  ActivityLog,
  NotificationItem,
  DashboardStats,
  TaskStatus,
  TaskPriority,
  Client,
  ProjectStatus,
  UserRole,
} from './types.ts';

import { Header } from './components/Header.tsx';
import { Navigation } from './components/Navigation.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ProjectsView } from './components/ProjectsView.tsx';
import { TaskBoard } from './components/TaskBoard.tsx';
import { ActivityFeed } from './components/ActivityFeed.tsx';
import { TaskDetailModal } from './components/TaskDetailModal.tsx';
import { CreateTaskModal } from './components/CreateTaskModal.tsx';
import { CreateProjectModal } from './components/CreateProjectModal.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [personas, setPersonas] = useState<User[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'tasks' | 'feed'>('dashboard');

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [onlineCount, setOnlineCount] = useState(1);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ id: string; fullName: string; role: UserRole }>>([]);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [dueFilter, setDueFilter] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isScanningOverdue, setIsScanningOverdue] = useState(false);
  const [isFeedLoading, setIsFeedLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status')) setStatusFilter(params.get('status')!);
    if (params.get('priority')) setPriorityFilter(params.get('priority')!);
    if (params.get('due')) setDueFilter(params.get('due')!);
    if (params.get('projectId')) setSelectedProjectId(params.get('projectId')!);
    if (params.get('tab') && ['dashboard', 'projects', 'tasks', 'feed'].includes(params.get('tab')!)) {
     setActiveTab(params.get('tab') as 'dashboard' | 'projects' | 'tasks' | 'feed');
    }
  }, []);

  const updateUrlFilters = useCallback(
    (newFilters: { status?: string; priority?: string; due?: string; projectId?: string; tab?: string }) => {
      const params = new URLSearchParams(window.location.search);

      if (newFilters.status !== undefined) {
        if (newFilters.status === 'ALL') params.delete('status');
        else params.set('status', newFilters.status);
      }
      if (newFilters.priority !== undefined) {
        if (newFilters.priority === 'ALL') params.delete('priority');
        else params.set('priority', newFilters.priority);
      }
      if (newFilters.due !== undefined) {
        if (newFilters.due === 'all') params.delete('due');
        else params.set('due', newFilters.due);
      }
      if (newFilters.projectId !== undefined) {
        if (!newFilters.projectId || newFilters.projectId === 'ALL') params.delete('projectId');
        else params.set('projectId', newFilters.projectId);
      }
      if (newFilters.tab !== undefined) {
        params.set('tab', newFilters.tab);
      }

      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.pushState(null, '', newUrl);
    },
    []
  );

  const loadData = useCallback(async () => {
    try {
      const [statsRes, projectsRes, clientsRes, tasksRes, feedRes, notifsRes] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getProjects().catch(() => []),
        api.getClients().catch(() => []),
        api.getTasks({
          status: statusFilter,
          priority: priorityFilter,
          due: dueFilter,
          projectId: selectedProjectId,
        }).catch(() => []),
        api.getActivityFeed({ limit: 30 }).catch(() => []),
        api.getNotifications().catch(() => ({ notifications: [], unreadCount: 0 })),
      ]);

      if (statsRes) setDashboardStats(statsRes);
      setProjects(projectsRes || []);
      setClients(clientsRes || []);
      setTasks(tasksRes || []);
      setActivityLogs(feedRes || []);
      if (notifsRes) {
        setNotifications(notifsRes.notifications || []);
        setUnreadNotificationCount(notifsRes.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  }, [statusFilter, priorityFilter, dueFilter, selectedProjectId]);

  useEffect(() => {
    async function initAuth() {
      setIsAuthLoading(true);
      try {
        try {
          const personasList = await api.getPersonas();
          setPersonas(personasList);
        } catch {
          setPersonas([]);
        }

        try {
          const refreshRes = await api.refresh();
          setCurrentUser(refreshRes.user);
        } catch {
          setCurrentUser(null);
        }
      } finally {
        setIsAuthLoading(false);
      }
    }

    initAuth();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setCurrentUser(res.user);
    wsClient.authenticate(res.accessToken);
  };

  useEffect(() => {
    if (!currentUser) return;

    loadData();
    wsClient.connect();

    const unsubs = [
      wsClient.on('connection_status', (data) => {
        setWsStatus(data.status);
      }),

      wsClient.on('presence_update', (data) => {
        if (data.onlineCount !== undefined) setOnlineCount(data.onlineCount);
        if (data.users) setOnlineUsers(data.users);
      }),

      wsClient.on('task:updated', (data) => {
        const updatedTask = data.task as Task;
        setTasks((prev) => {
          const index = prev.findIndex((t) => t.id === updatedTask.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = updatedTask;
            return next;
          }
          return [updatedTask, ...prev];
        });

        api.getDashboardStats().then((s) => s && setDashboardStats(s)).catch(() => {});
      }),

      wsClient.on('activity:new', (data) => {
        const newLog = data.activityLog as ActivityLog;
        setActivityLogs((prev) => [newLog, ...prev.slice(0, 49)]);
      }),

      wsClient.on('notification:new', (data) => {
        const newNotif = data.notification as NotificationItem;
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadNotificationCount((prev) => prev + 1);
      }),

      wsClient.on('notification:count_update', (data) => {
        if (data.unreadCount !== undefined) {
          setUnreadNotificationCount(data.unreadCount);
        }
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [currentUser, loadData]);

  const handleSwitchPersona = async (userId: string) => {
    try {
      const res = await api.quickLogin(userId);
      setCurrentUser(res.user);
      wsClient.authenticate(res.accessToken);
    } catch (err) {
      console.error('Failed to switch persona:', err);
    }
  };

  const handleFilterChange = (filters: {
    status?: string;
    priority?: string;
    due?: string;
    projectId?: string;
  }) => {
    if (filters.status !== undefined) setStatusFilter(filters.status);
    if (filters.priority !== undefined) setPriorityFilter(filters.priority);
    if (filters.due !== undefined) setDueFilter(filters.due);
    if (filters.projectId !== undefined) setSelectedProjectId(filters.projectId);

    updateUrlFilters(filters);
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    const updated = await api.updateTaskStatus(taskId, newStatus);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    api.getDashboardStats().then((s) => s && setDashboardStats(s)).catch(() => {});
  };

  const handleDeleteTask = async (taskId: string) => {
    await api.deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    api.getDashboardStats().then((s) => s && setDashboardStats(s)).catch(() => {});
  };

  const handleCreateTask = async (data: {
    project_id: string;
    title: string;
    description: string;
    assigned_to: string | null;
    priority: TaskPriority;
    due_date: string;
  }) => {
    const created = await api.createTask(data);
    setTasks((prev) => [created, ...prev]);
    api.getDashboardStats().then((s) => s && setDashboardStats(s)).catch(() => {});
  };

  const handleCreateProject = async (data: {
    title: string;
    description: string;
    client_id: string;
    status: ProjectStatus;
  }) => {
    const created = await api.createProject(data);
    setProjects((prev) => [created, ...prev]);
    api.getDashboardStats().then((s) => s && setDashboardStats(s)).catch(() => {});
  };

  const handleRunOverdueScan = async () => {
    setIsScanningOverdue(true);
    try {
      const result = await api.runOverdueScan();
      await loadData();
      alert(`Overdue background scanner completed successfully! Flagged ${result.flaggedCount} task(s).`);
    } catch (err: any) {
      alert(`Scan failed: ${err.message}`);
    } finally {
      setIsScanningOverdue(false);
    }
  };

  const handleRefreshFeed = async () => {
    setIsFeedLoading(true);
    try {
      const feed = await api.getActivityFeed({ limit: 30 });
      setActivityLogs(feed);
    } finally {
      setIsFeedLoading(false);
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllNotificationsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadNotificationCount(0);
  };

  const handleLogout = async () => {
    await api.logout();
    wsClient.disconnect();
    setCurrentUser(null);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto" />
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">Initializing AgencyFlow</h2>
          <p className="text-xs text-slate-500">Connecting PostgreSQL relational engine & WebSocket services...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans antialiased selection:bg-amber-100 selection:text-amber-900">
      <Header
        currentUser={currentUser}
        personas={personas}
        onSwitchPersona={handleSwitchPersona}
        notifications={notifications}
        unreadNotificationCount={unreadNotificationCount}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onlineCount={onlineCount}
        onlineUsers={onlineUsers}
        wsStatus={wsStatus}
        onRunOverdueScan={handleRunOverdueScan}
        onOpenArchitectureDoc={() =>(false)}
        onLogout={handleLogout}
        isScanningOverdue={isScanningOverdue}
      />

      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          updateUrlFilters({ tab });
        }}
        userRole={currentUser?.role}
        activityCount={activityLogs.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={dashboardStats}
            userRole={currentUser?.role || 'ADMIN'}
            onSelectProject={(projectId) => {
              setSelectedProjectId(projectId);
              setActiveTab('tasks');
              updateUrlFilters({ projectId, tab: 'tasks' });
            }}
            onOpenTask={(task) => setSelectedTask(task)}
            onNavigateToTasks={() => {
              setActiveTab('tasks');
              updateUrlFilters({ tab: 'tasks' });
            }}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsView
            projects={projects}
            userRole={currentUser?.role || 'ADMIN'}
            onSelectProject={(projectId) => {
              setSelectedProjectId(projectId);
              setActiveTab('tasks');
              updateUrlFilters({ projectId, tab: 'tasks' });
            }}
            onOpenCreateModal={() => setIsCreateProjectOpen(true)}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskBoard
            tasks={tasks}
            projects={projects}
            selectedProjectId={selectedProjectId}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            dueFilter={dueFilter}
            onFilterChange={handleFilterChange}
            onUpdateStatus={handleUpdateStatus}
            onOpenTask={(task) => setSelectedTask(task)}
            onOpenCreateTaskModal={() => setIsCreateTaskOpen(true)}
            userRole={currentUser?.role || 'ADMIN'}
            currentUserId={currentUser?.id || ''}
          />
        )}

        {activeTab === 'feed' && (
          <ActivityFeed
            activityLogs={activityLogs}
            userRole={currentUser?.role || 'ADMIN'}
            onRefreshFeed={handleRefreshFeed}
            isLoading={isFeedLoading}
            wsStatus={wsStatus}
          />
        )}

      </main>

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdateStatus={handleUpdateStatus}
        onDeleteTask={handleDeleteTask}
        userRole={currentUser?.role || 'ADMIN'}
        currentUserId={currentUser?.id || ''}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSubmit={handleCreateTask}
        projects={projects}
        users={personas}
        defaultProjectId={selectedProjectId}
      />

      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onSubmit={handleCreateProject}
        clients={clients}
      />
    </div>
  );
}

export default App;
