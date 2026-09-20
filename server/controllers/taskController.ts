import { Response } from 'express';
import { AuthenticatedRequest, TaskRow, TaskStatus, TaskPriority } from '../types.ts';
import { query, queryOne } from '../db/index.ts';
import { logActivity } from '../services/activityService.ts';
import { createNotification } from '../services/notificationService.ts';
import { wsManager } from '../services/websocketService.ts';

export async function getTasks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { projectId, status, priority, due, assignedTo, sort } = req.query;

  let sql = `
    SELECT t.*,
           p.title as project_title, p.created_by as project_creator_id,
           u.full_name as assignee_name, u.email as assignee_email, u.avatar_url as assignee_avatar,
           c.full_name as creator_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN users c ON p.created_by = c.id
    LEFT JOIN users u ON t.assigned_to = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // 1. Role Scoping Enforcement (Strict backend barrier)
  if (user.role === 'DEVELOPER') {
    // Developers can ONLY see tasks assigned to them
    params.push(user.id);
    sql += ` AND t.assigned_to = $${params.length}`;
  } else if (user.role === 'PROJECT_MANAGER') {
    // PMs can ONLY see tasks within projects they created
    params.push(user.id);
    sql += ` AND p.created_by = $${params.length}`;
  }

  // 2. Query Filters (Shareable URL query params)
  if (projectId) {
    params.push(projectId);
    sql += ` AND t.project_id = $${params.length}`;
  }

  if (status && status !== 'ALL') {
    params.push(status);
    sql += ` AND t.status = $${params.length}`;
  }

  if (priority && priority !== 'ALL') {
    params.push(priority);
    sql += ` AND t.priority = $${params.length}`;
  }

  if (assignedTo && user.role !== 'DEVELOPER') {
    params.push(assignedTo);
    sql += ` AND t.assigned_to = $${params.length}`;
  }

  // Due Date filtering
  if (due === 'overdue') {
    sql += ` AND (t.is_overdue = TRUE OR (t.due_date < CURRENT_TIMESTAMP AND t.status != 'DONE'))`;
  } else if (due === 'today') {
    sql += ` AND t.due_date::date = CURRENT_DATE`;
  } else if (due === 'this_week') {
    sql += ` AND t.due_date >= CURRENT_DATE AND t.due_date <= (CURRENT_DATE + INTERVAL '7 days')`;
  }

  // Sorting
  if (user.role === 'DEVELOPER' || sort === 'priority_due') {
    // Developer dashboard: sorted by priority then due date
    sql += ` ORDER BY 
      CASE t.priority 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        WHEN 'LOW' THEN 4 
        ELSE 5 
      END ASC, 
      t.due_date ASC`;
  } else {
    sql += ` ORDER BY t.created_at DESC`;
  }

  const { rows } = await query<TaskRow>(sql, params);

  res.json({
    success: true,
    data: rows,
  });
}

export async function getTaskById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;

  const task = await queryOne<TaskRow>(
    `SELECT t.*, p.title as project_title, p.created_by as project_creator_id,
            u.full_name as assignee_name, u.email as assignee_email, u.avatar_url as assignee_avatar
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.id = $1`,
    [id]
  );

  if (!task) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found.' } });
    return;
  }

  // Strict RBAC Access Check
  if (user.role === 'DEVELOPER' && task.assigned_to !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied: Developers can only view their assigned tasks.' },
    });
    return;
  }

  if (user.role === 'PROJECT_MANAGER' && task.project_creator_id !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied: You cannot view tasks from other Project Managers.' },
    });
    return;
  }

  // Fetch activity logs for this task
  const { rows: activity } = await query(
    `SELECT a.*, u.full_name as user_name, u.role as user_role, u.avatar_url as user_avatar
     FROM activity_logs a
     JOIN users u ON a.user_id = u.id
     WHERE a.task_id = $1
     ORDER BY a.created_at DESC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...task,
      activity,
    },
  });
}

export async function createTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { project_id, title, description, assigned_to, priority, due_date } = req.body;

  // Verify Project & Ownership
  const project = await queryOne<{ id: string; created_by: string; title: string }>(
    'SELECT id, created_by, title FROM projects WHERE id = $1',
    [project_id]
  );

  if (!project) {
    res.status(400).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } });
    return;
  }

  if (user.role === 'PROJECT_MANAGER' && project.created_by !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied: You can only create tasks in projects you created.' },
    });
    return;
  }

  const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const isOverdue = new Date(due_date) < new Date();

  await query(
    `INSERT INTO tasks (id, project_id, title, description, assigned_to, status, priority, due_date, is_overdue, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'TODO', $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [id, project_id, title, description || null, assigned_to || null, priority, due_date, isOverdue]
  );

  const newTask = await queryOne<TaskRow>(
    `SELECT t.*, p.title as project_title, p.created_by as project_creator_id,
            u.full_name as assignee_name, u.email as assignee_email
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.id = $1`,
    [id]
  );

  // Activity log: Task created
  const activity = await logActivity({
    taskId: id,
    projectId: project_id,
    userId: user.id,
    actionType: 'TASK_CREATED',
    message: `${user.fullName} created task "${title}"`,
  });

  // If assigned, send notification to developer
  if (assigned_to) {
    await createNotification({
      userId: assigned_to,
      title: 'New Task Assigned',
      message: `${user.fullName} assigned you to "${title}" in ${project.title}.`,
      taskId: id,
      projectId: project_id,
    });
  }

  // WebSocket broadcast
  await wsManager.broadcastActivityAndTaskUpdate({
    activity,
    task: newTask,
    projectCreatorId: project.created_by,
    taskAssigneeId: assigned_to || null,
  });

  res.status(201).json({
    success: true,
    data: newTask,
  });
}

export async function updateTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;
  const { title, description, assigned_to, priority, due_date } = req.body;

  const task = await queryOne<TaskRow>(
    `SELECT t.*, p.created_by as project_creator_id, p.title as project_title
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     WHERE t.id = $1`,
    [id]
  );

  if (!task) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found.' } });
    return;
  }

  // Developers CANNOT edit general task attributes (title, assignment, priority)
  if (user.role === 'DEVELOPER') {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Developers can only update task status.' },
    });
    return;
  }

  if (user.role === 'PROJECT_MANAGER' && task.project_creator_id !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied: You can only edit tasks in your projects.' },
    });
    return;
  }

  const prevAssignee = task.assigned_to;
  const isOverdue = due_date ? new Date(due_date) < new Date() && task.status !== 'DONE' : task.is_overdue;

  await query(
    `UPDATE tasks
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         assigned_to = $3,
         priority = COALESCE($4, priority),
         due_date = COALESCE($5, due_date),
         is_overdue = $6,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $7`,
    [title, description, assigned_to, priority, due_date, isOverdue, id]
  );

  const updatedTask = await queryOne<TaskRow>(
    `SELECT t.*, p.title as project_title, p.created_by as project_creator_id,
            u.full_name as assignee_name, u.email as assignee_email
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.id = $1`,
    [id]
  );

  let message = `${user.fullName} updated task "${updatedTask!.title}"`;

  // Check if assigned to a new developer
  if (assigned_to && assigned_to !== prevAssignee) {
    message = `${user.fullName} assigned "${updatedTask!.title}" to ${updatedTask!.assignee_name || 'developer'}`;
    await createNotification({
      userId: assigned_to,
      title: 'Task Assigned',
      message: `${user.fullName} assigned you to "${updatedTask!.title}".`,
      taskId: id,
      projectId: task.project_id,
    });
  }

  const activity = await logActivity({
    taskId: id,
    projectId: task.project_id,
    userId: user.id,
    actionType: assigned_to !== prevAssignee ? 'TASK_ASSIGNED' : 'TASK_UPDATED',
    message,
  });

  await wsManager.broadcastActivityAndTaskUpdate({
    activity,
    task: updatedTask,
    projectCreatorId: task.project_creator_id!,
    taskAssigneeId: updatedTask!.assigned_to,
  });

  res.json({
    success: true,
    data: updatedTask,
  });
}

export async function updateTaskStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;
  const { status } = req.body as { status: TaskStatus };

  const task = await queryOne<TaskRow>(
    `SELECT t.*, p.created_by as project_creator_id, p.title as project_title
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     WHERE t.id = $1`,
    [id]
  );

  if (!task) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found.' } });
    return;
  }

  // Developer restriction: can ONLY update status of tasks assigned to them!
  if (user.role === 'DEVELOPER') {
    if (task.assigned_to !== user.id) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: You can only update the status of tasks assigned to you.',
        },
      });
      return;
    }
  }

  // PM restriction: can only update tasks in projects they created
  if (user.role === 'PROJECT_MANAGER' && task.project_creator_id !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied: You can only update tasks in your projects.' },
    });
    return;
  }

  const prevStatus = task.status;
  if (prevStatus === status) {
    res.json({ success: true, data: task });
    return;
  }

  // If moved to DONE, clear is_overdue flag
  const isOverdue = status === 'DONE' ? false : task.is_overdue;

  await query(
    `UPDATE tasks
     SET status = $1, is_overdue = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [status, isOverdue, id]
  );

  const updatedTask = await queryOne<TaskRow>(
    `SELECT t.*, p.title as project_title, p.created_by as project_creator_id,
            u.full_name as assignee_name, u.email as assignee_email
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     LEFT JOIN users u ON t.assigned_to = u.id
     WHERE t.id = $1`,
    [id]
  );

  // Formatted message: "Ravi moved Task #12 from In Progress → In Review"
  const formattedPrevStatus = formatStatus(prevStatus);
  const formattedNewStatus = formatStatus(status);
  const message = `${user.fullName} moved "${task.title}" from ${formattedPrevStatus} → ${formattedNewStatus}`;

  // Record status change in database (stored, not derived!)
  const activity = await logActivity({
    taskId: id,
    projectId: task.project_id,
    userId: user.id,
    actionType: 'STATUS_CHANGE',
    previousStatus: prevStatus,
    newStatus: status,
    message,
  });

  // Requirement: "When a task they own is moved to In Review, the PM receives a notification"
  if (status === 'IN_REVIEW' && task.project_creator_id) {
    await createNotification({
      userId: task.project_creator_id,
      title: 'Task Ready for Review',
      message: `${user.fullName} moved "${task.title}" to In Review.`,
      taskId: id,
      projectId: task.project_id,
    });
  }

  // Real-time WebSocket broadcast to all users viewing this project and role-filtered activity feed
  await wsManager.broadcastActivityAndTaskUpdate({
    activity,
    task: updatedTask,
    projectCreatorId: task.project_creator_id!,
    taskAssigneeId: task.assigned_to,
  });

  res.json({
    success: true,
    data: updatedTask,
  });
}

export async function deleteTask(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;

  const task = await queryOne<TaskRow>(
    `SELECT t.*, p.created_by as project_creator_id
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     WHERE t.id = $1`,
    [id]
  );

  if (!task) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found.' } });
    return;
  }

  if (user.role === 'DEVELOPER') {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Developers cannot delete tasks.' } });
    return;
  }

  if (user.role === 'PROJECT_MANAGER' && task.project_creator_id !== user.id) {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only delete tasks in your projects.' } });
    return;
  }

  await query('DELETE FROM tasks WHERE id = $1', [id]);

  res.json({ success: true, message: 'Task deleted successfully.' });
}

function formatStatus(status: string): string {
  switch (status) {
    case 'TODO': return 'To Do';
    case 'IN_PROGRESS': return 'In Progress';
    case 'IN_REVIEW': return 'In Review';
    case 'DONE': return 'Done';
    default: return status;
  }
}
