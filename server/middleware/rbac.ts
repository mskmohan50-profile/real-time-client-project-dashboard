import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types.ts';
import { queryOne } from '../db/index.ts';

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required.',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Forbidden: role '${req.user.role}' lacks permissions for this resource. Required: ${allowedRoles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}

export async function requireProjectAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = req.user;
  const projectId = req.params.projectId || req.params.id || req.body.project_id;

  if (!user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  if (!projectId) {
    res.status(400).json({ success: false, error: { code: 'INVALID_PROJECT_ID', message: 'Project ID is required' } });
    return;
  }

  const project = await queryOne<{ id: string; created_by: string; title: string }>(
    'SELECT id, created_by, title FROM projects WHERE id = $1',
    [projectId]
  );

  if (!project) {
    res.status(404).json({ success: false, error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' } });
    return;
  }
  if (user.role === 'ADMIN') {
    (req as any).project = project;
    next();
    return;
  }

  if (user.role === 'PROJECT_MANAGER') {
    if (project.created_by !== user.id) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_PROJECT_ACCESS',
          message: 'Access denied: Project Managers may only access projects they created.',
        },
      });
      return;
    }
    (req as any).project = project;
    next();
    return;
  }

  if (user.role === 'DEVELOPER') {
    const assignedTask = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tasks WHERE project_id = $1 AND assigned_to = $2',
      [projectId, user.id]
    );
    if (!assignedTask || parseInt(assignedTask.count, 10) === 0) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_PROJECT_ACCESS',
          message: 'Access denied: Developers can only view projects containing tasks assigned to them.',
        },
      });
      return;
    }
    (req as any).project = project;
    next();
    return;
  }

  res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied.' } });
}
