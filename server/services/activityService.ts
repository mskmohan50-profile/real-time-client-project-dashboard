import { query, queryOne } from '../db/index.ts';
import { ActivityLogRow, AuthUser } from '../types.ts';

export async function logActivity(params: {
  taskId?: string | null;
  projectId: string;
  userId: string;
  actionType: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  message: string;
}): Promise<ActivityLogRow> {
  const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const { taskId, projectId, userId, actionType, previousStatus, newStatus, message } = params;

  await query(
    `INSERT INTO activity_logs (id, task_id, project_id, user_id, action_type, previous_status, new_status, message, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
    [id, taskId || null, projectId, userId, actionType, previousStatus || null, newStatus || null, message]
  );

  const fullLog = await queryOne<ActivityLogRow>(
    `SELECT a.*, u.full_name as user_name, u.role as user_role, u.avatar_url as user_avatar,
            t.title as task_title, p.title as project_title
     FROM activity_logs a
     JOIN users u ON a.user_id = u.id
     JOIN projects p ON a.project_id = p.id
     LEFT JOIN tasks t ON a.task_id = t.id
     WHERE a.id = $1`,
    [id]
  );

  return fullLog!;
}

export async function getFilteredActivityFeed(
  user: AuthUser,
  options: { limit?: number; since?: string; projectId?: string } = {}
): Promise<ActivityLogRow[]> {
  const limit = options.limit || 20;

  if (user.role === 'ADMIN') {
    let sql = `
      SELECT a.*, u.full_name as user_name, u.role as user_role, u.avatar_url as user_avatar,
             t.title as task_title, p.title as project_title
      FROM activity_logs a
      JOIN users u ON a.user_id = u.id
      JOIN projects p ON a.project_id = p.id
      LEFT JOIN tasks t ON a.task_id = t.id
    `;
    const params: any[] = [];

    if (options.projectId) {
      params.push(options.projectId);
      sql += ` WHERE a.project_id = $${params.length}`;
    }

    if (options.since) {
      params.push(options.since);
      sql += params.length === 1 ? ` WHERE a.created_at > $${params.length}` : ` AND a.created_at > $${params.length}`;
    }

    params.push(limit);
    sql += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;

    const { rows } = await query<ActivityLogRow>(sql, params);
    return rows;
  }
  if (user.role === 'PROJECT_MANAGER') {
    let sql = `
      SELECT a.*, u.full_name as user_name, u.role as user_role, u.avatar_url as user_avatar,
             t.title as task_title, p.title as project_title
      FROM activity_logs a
      JOIN users u ON a.user_id = u.id
      JOIN projects p ON a.project_id = p.id
      LEFT JOIN tasks t ON a.task_id = t.id
      WHERE p.created_by = $1
    `;
    const params: any[] = [user.id];

    if (options.projectId) {
      params.push(options.projectId);
      sql += ` AND a.project_id = $${params.length}`;
    }

    if (options.since) {
      params.push(options.since);
      sql += ` AND a.created_at > $${params.length}`;
    }

    params.push(limit);
    sql += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;

    const { rows } = await query<ActivityLogRow>(sql, params);
    return rows;
  }

  if (user.role === 'DEVELOPER') {
    let sql = `
      SELECT a.*, u.full_name as user_name, u.role as user_role, u.avatar_url as user_avatar,
             t.title as task_title, p.title as project_title
      FROM activity_logs a
      JOIN users u ON a.user_id = u.id
      JOIN projects p ON a.project_id = p.id
      JOIN tasks t ON a.task_id = t.id
      WHERE t.assigned_to = $1
    `;
    const params: any[] = [user.id];

    if (options.projectId) {
      params.push(options.projectId);
      sql += ` AND a.project_id = $${params.length}`;
    }

    if (options.since) {
      params.push(options.since);
      sql += ` AND a.created_at > $${params.length}`;
    }

    params.push(limit);
    sql += ` ORDER BY a.created_at DESC LIMIT $${params.length}`;

    const { rows } = await query<ActivityLogRow>(sql, params);
    return rows;
  }

  return [];
}
