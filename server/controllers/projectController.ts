import { Response } from 'express';
import { AuthenticatedRequest, ProjectRow } from '../types.ts';
import { query, queryOne } from '../db/index.ts';
import { logActivity } from '../services/activityService.ts';

export async function getProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;

  let sql = `
    SELECT p.*,
           c.name as client_name, c.company as client_company,
           u.full_name as creator_name,
           COUNT(t.id)::int as total_tasks,
           COUNT(CASE WHEN t.status = 'DONE' THEN 1 END)::int as completed_tasks,
           COUNT(CASE WHEN t.is_overdue = TRUE AND t.status != 'DONE' THEN 1 END)::int as overdue_tasks
    FROM projects p
    JOIN clients c ON p.client_id = c.id
    JOIN users u ON p.created_by = u.id
    LEFT JOIN tasks t ON p.id = t.project_id
  `;

  const params: any[] = [];

  if (user.role === 'ADMIN') {
    // Admin sees all projects
    sql += ' GROUP BY p.id, c.name, c.company, u.full_name ORDER BY p.created_at DESC';
  } else if (user.role === 'PROJECT_MANAGER') {
    // PM sees ONLY their own created projects
    params.push(user.id);
    sql += ' WHERE p.created_by = $1 GROUP BY p.id, c.name, c.company, u.full_name ORDER BY p.created_at DESC';
  } else if (user.role === 'DEVELOPER') {
    // Developer sees only projects where they have assigned tasks
    params.push(user.id);
    sql += ` WHERE p.id IN (SELECT project_id FROM tasks WHERE assigned_to = $1)
             GROUP BY p.id, c.name, c.company, u.full_name ORDER BY p.created_at DESC`;
  }

  const { rows } = await query<ProjectRow>(sql, params);

  res.json({
    success: true,
    data: rows,
  });
}

export async function getProjectById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;

  const project = await queryOne<ProjectRow>(
    `SELECT p.*, c.name as client_name, c.company as client_company, c.email as client_email,
            u.full_name as creator_name, u.email as creator_email,
            COUNT(t.id)::int as total_tasks,
            COUNT(CASE WHEN t.status = 'DONE' THEN 1 END)::int as completed_tasks,
            COUNT(CASE WHEN t.is_overdue = TRUE AND t.status != 'DONE' THEN 1 END)::int as overdue_tasks
     FROM projects p
     JOIN clients c ON p.client_id = c.id
     JOIN users u ON p.created_by = u.id
     LEFT JOIN tasks t ON p.id = t.project_id
     WHERE p.id = $1
     GROUP BY p.id, c.name, c.company, c.email, u.full_name, u.email`,
    [id]
  );

  if (!project) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Project not found.' },
    });
    return;
  }

  // Strict API-level role permission check
  if (user.role === 'PROJECT_MANAGER' && project.created_by !== user.id) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied: You do not have permission to view projects created by other Project Managers.',
      },
    });
    return;
  }

  if (user.role === 'DEVELOPER') {
    const hasAssignedTask = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tasks WHERE project_id = $1 AND assigned_to = $2',
      [id, user.id]
    );
    if (!hasAssignedTask || parseInt(hasAssignedTask.count, 10) === 0) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: Developers can only access projects containing their assigned tasks.',
        },
      });
      return;
    }
  }

  res.json({
    success: true,
    data: project,
  });
}

export async function createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { title, description, client_id, status = 'ACTIVE' } = req.body;

  // Verify client exists
  const client = await queryOne('SELECT id, name FROM clients WHERE id = $1', [client_id]);
  if (!client) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_CLIENT', message: 'Specified client does not exist.' },
    });
    return;
  }

  const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  await query(
    `INSERT INTO projects (id, title, description, client_id, created_by, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [id, title, description || null, client_id, user.id, status]
  );

  const newProject = await queryOne<ProjectRow>(
    `SELECT p.*, c.name as client_name, c.company as client_company, u.full_name as creator_name
     FROM projects p
     JOIN clients c ON p.client_id = c.id
     JOIN users u ON p.created_by = u.id
     WHERE p.id = $1`,
    [id]
  );

  await logActivity({
    projectId: id,
    userId: user.id,
    actionType: 'PROJECT_CREATED',
    message: `${user.fullName} created new project "${title}"`,
  });

  res.status(201).json({
    success: true,
    data: newProject,
  });
}

export async function updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;
  const { title, description, status } = req.body;

  const project = await queryOne<ProjectRow>('SELECT * FROM projects WHERE id = $1', [id]);
  if (!project) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } });
    return;
  }

  if (user.role === 'PROJECT_MANAGER' && project.created_by !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied: You can only edit projects you created.' },
    });
    return;
  }

  await query(
    `UPDATE projects
     SET title = COALESCE($1, title),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [title, description, status, id]
  );

  const updated = await queryOne<ProjectRow>(
    `SELECT p.*, c.name as client_name, c.company as client_company, u.full_name as creator_name
     FROM projects p
     JOIN clients c ON p.client_id = c.id
     JOIN users u ON p.created_by = u.id
     WHERE p.id = $1`,
    [id]
  );

  await logActivity({
    projectId: id,
    userId: user.id,
    actionType: 'PROJECT_UPDATED',
    message: `${user.fullName} updated project details for "${updated!.title}"`,
  });

  res.json({
    success: true,
    data: updated,
  });
}

export async function deleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;

  const project = await queryOne<ProjectRow>('SELECT * FROM projects WHERE id = $1', [id]);
  if (!project) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found.' } });
    return;
  }

  if (user.role === 'PROJECT_MANAGER' && project.created_by !== user.id) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied: You can only delete projects you created.' },
    });
    return;
  }

  await query('DELETE FROM projects WHERE id = $1', [id]);

  res.json({
    success: true,
    message: 'Project and all associated tasks removed successfully.',
  });
}

export async function getClients(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { rows } = await query('SELECT * FROM clients ORDER BY name ASC');
  res.json({ success: true, data: rows });
}
