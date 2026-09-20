import { Router } from 'express';
import { z } from 'zod';
import { login, refreshToken, logout, getMe, quickLogin } from '../controllers/authController.ts';
import { authenticateToken } from '../middleware/auth.ts';
import { validateBody } from '../middleware/validate.ts';
import { query } from '../db/index.ts';
import { config } from '../config.ts';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

const quickLoginSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

router.post('/login', validateBody(loginSchema), login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticateToken, getMe);
router.post('/quick-login', validateBody(quickLoginSchema), quickLogin);

router.get('/personas', async (_req, res) => {
  if (config.isProduction) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found.' } });
    return;
  }

  const { rows } = await query<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    avatar_url: string | null;
  }>('SELECT id, email, full_name, role, avatar_url FROM users ORDER BY role ASC, full_name ASC');

  const mapped = rows.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    full_name: u.full_name,
    role: u.role,
    avatarUrl: u.avatar_url || undefined,
    avatar_url: u.avatar_url || undefined,
  }));

  res.json({ success: true, data: mapped });
});

export default router;