import { Router } from 'express';
import { z } from 'zod';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getClients,
} from '../controllers/projectController.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { requireRole } from '../middleware/rbac.ts';
import { validateBody } from '../middleware/validate.ts';

const router = Router();

router.use(authenticateToken);

const createProjectSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  client_id: z.string().min(1, 'Client ID is required'),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']).optional(),
});

const updateProjectSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED']).optional(),
});

router.get('/', getProjects);
router.get('/clients', getClients);
router.get('/:id', getProjectById);
router.post('/', requireRole(['ADMIN', 'PROJECT_MANAGER']), validateBody(createProjectSchema), createProject);
router.put('/:id', requireRole(['ADMIN', 'PROJECT_MANAGER']), validateBody(updateProjectSchema), updateProject);
router.delete('/:id', requireRole(['ADMIN', 'PROJECT_MANAGER']), deleteProject);

export default router;
