import { Response } from 'express';
import { AuthenticatedRequest } from '../types.ts';
import { query, queryOne } from '../db/index.ts';
import { wsManager } from '../services/websocketService.ts';

export async function getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;

  if (user.role === 'ADMIN') {
    // 1. Total projects
    const projCount = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM projects');

    // 2. Total tasks by status
    const { rows: tasksByStatus } = await query<{ status: string; count: string }>(
      'SELECT status, COUNT(*) as count FROM tasks GROUP BY status'
    );

    // 3. Overdue task count
    const overdueCount = await queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM tasks WHERE is_overdue = TRUE AND status != 'DONE'"
    );

    // 4. Total clients
    const clientCount = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM clients');

    // 5. Active users online right now from WebSocket presence
    const activeOnlineCount = wsManager.getUniqueOnlineUsersCount();
    const onlineUsersList = wsManager.getOnlineUsers();

    // 6. Users by role
    const { rows: rawUsers } = await query<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      avatar_url: string | null;
    }>('SELECT id, email, full_name, role, avatar_url FROM users ORDER BY role ASC, full_name ASC');

    const usersList = rawUsers.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.full_name,
      full_name: u.full_name,
      role: u.role,
      avatarUrl: u.avatar_url || undefined,
      avatar_url: u.avatar_url || undefined,
    }));

    res.json({
      success: true,
      data: {
        role: 'ADMIN',
        totalProjects: parseInt(projCount?.count || '0', 10),
        totalClients: parseInt(clientCount?.count || '0', 10),
        overdueTasksCount: parseInt(overdueCount?.count || '0', 10),
        activeUsersOnline: Math.max(activeOnlineCount, 1), // At least current user
        onlineUsersList,
        tasksByStatus: tasksByStatus.reduce((acc, curr) => {
          acc[curr.status] = parseInt(curr.count, 10);
          return acc;
        }, {} as Record<string, number>),
        users: usersList,
      },
    });
    return;
  }

  if (user.role === 'PROJECT_MANAGER') {
    // PM: their projects summary, tasks by priority, upcoming due dates this week
    const { rows: pmProjects } = await query(
      `SELECT p.*, c.name as client_name, c.company as client_company,
              COUNT(t.id)::int as total_tasks,
              COUNT(CASE WHEN t.status = 'DONE' THEN 1 END)::int as completed_tasks,
              COUNT(CASE WHEN t.is_overdue = TRUE AND t.status != 'DONE' THEN 1 END)::int as overdue_tasks
       FROM projects p
       JOIN clients c ON p.client_id = c.id
       LEFT JOIN tasks t ON p.id = t.project_id
       WHERE p.created_by = $1
       GROUP BY p.id, c.name, c.company
       ORDER BY p.created_at DESC`,
      [user.id]
    );

    const { rows: tasksByPriority } = await query<{ priority: string; count: string }>(
      `SELECT t.priority, COUNT(*) as count
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE p.created_by = $1
       GROUP BY t.priority`,
      [user.id]
    );

    const { rows: upcomingThisWeek } = await query(
      `SELECT t.*, p.title as project_title, u.full_name as assignee_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE p.created_by = $1
         AND t.status != 'DONE'
         AND t.due_date >= CURRENT_DATE
         AND t.due_date <= (CURRENT_DATE + INTERVAL '7 days')
       ORDER BY t.due_date ASC`,
      [user.id]
    );

    const overdueCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       WHERE p.created_by = $1 AND t.is_overdue = TRUE AND t.status != 'DONE'`,
      [user.id]
    );

    res.json({
      success: true,
      data: {
        role: 'PROJECT_MANAGER',
        projects: pmProjects,
        totalProjects: pmProjects.length,
        tasksByPriority: tasksByPriority.reduce((acc, curr) => {
          acc[curr.priority] = parseInt(curr.count, 10);
          return acc;
        }, {} as Record<string, number>),
        upcomingDueThisWeek: upcomingThisWeek,
        overdueCount: parseInt(overdueCount?.count || '0', 10),
      },
    });
    return;
  }

  if (user.role === 'DEVELOPER') {
    // Developer: their assigned tasks, sorted by priority then due date
    const { rows: myTasks } = await query(
      `SELECT t.*, p.title as project_title, u.full_name as creator_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       JOIN users u ON p.created_by = u.id
       WHERE t.assigned_to = $1
       ORDER BY 
        CASE t.priority 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MEDIUM' THEN 3 
          WHEN 'LOW' THEN 4 
          ELSE 5 
        END ASC, 
        t.due_date ASC`,
      [user.id]
    );

    const overdueCount = myTasks.filter((t) => t.is_overdue && t.status !== 'DONE').length;
    const inProgressCount = myTasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const inReviewCount = myTasks.filter((t) => t.status === 'IN_REVIEW').length;
    const doneCount = myTasks.filter((t) => t.status === 'DONE').length;

    res.json({
      success: true,
      data: {
        role: 'DEVELOPER',
        assignedTasks: myTasks,
        totalTasks: myTasks.length,
        overdueCount,
        inProgressCount,
        inReviewCount,
        doneCount,
      },
    });
    return;
  }
}
