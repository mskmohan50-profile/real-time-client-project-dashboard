import { Router } from 'express';
import { z } from 'zod';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from '../controllers/taskController.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { requireRole } from '../middleware/rbac.ts';
import { validateBody } from '../middleware/validate.ts';
import { runOverdueScan } from '../services/cronService.ts';

const router = Router();

router.use(authenticateToken);

const createTaskSchema = z.object({
  project_id: z.string().min(1, 'Project ID is required'),
  title: z.string().min(2, 'Task title is required'),
  description: z.string().optional(),
  assigned_to: z.string().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  due_date: z.string().min(4, 'Valid due date is required'),
});

const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  assigned_to: z.string().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  due_date: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
});

router.get('/', getTasks);
router.get('/:id', getTaskById);
router.post('/', requireRole(['ADMIN', 'PROJECT_MANAGER']), validateBody(createTaskSchema), createTask);
router.put('/:id', requireRole(['ADMIN', 'PROJECT_MANAGER']), validateBody(updateTaskSchema), updateTask);
router.patch('/:id/status', validateBody(updateStatusSchema), updateTaskStatus);
router.delete('/:id', requireRole(['ADMIN', 'PROJECT_MANAGER']), deleteTask);

router.post('/run-overdue-scan', async (_req, res) => {
  const result = await runOverdueScan();
  res.json({
    success: true,
    message: `Overdue scan complete. Flagged ${result.flaggedCount} overdue task(s).`,
    data: result,
  });
});

export default router;
