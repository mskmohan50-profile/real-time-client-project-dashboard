import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config.ts';
import { query, queryOne } from '../db/index.ts';
import { AuthenticatedRequest, UserRow } from '../types.ts';
import { getUnreadNotificationCount } from '../services/notificationService.ts';

function generateAccessToken(user: { id: string; email: string; role: string; full_name: string }) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    },
    config.jwtAccessSecret,
    { expiresIn: '15m' }
  );
}

async function createAndStoreRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + config.refreshTokenExpiryDays * 24 * 60 * 60 * 1000);
  const id = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  await query(
    'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4)',
    [id, userId, token, expiresAt.toISOString()]
  );

  return token;
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await queryOne<UserRow>(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );

  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
    });
    return;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await createAndStoreRefreshToken(user.id);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: config.refreshTokenExpiryDays * 24 * 60 * 60 * 1000,
  });

  const unreadCount = await getUnreadNotificationCount(user.id);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        unreadNotifications: unreadCount,
      },
      accessToken,
    },
  });
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token provided in HttpOnly cookie.' },
    });
    return;
  }

  const storedToken = await queryOne<{ id: string; user_id: string; expires_at: string }>(
    'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token = $1',
    [token]
  );

  if (!storedToken) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is invalid or has been revoked.' },
    });
    return;
  }

  if (new Date(storedToken.expires_at) < new Date()) {
    await query('DELETE FROM refresh_tokens WHERE id = $1', [storedToken.id]);
    res.status(401).json({
      success: false,
      error: { code: 'EXPIRED_REFRESH_TOKEN', message: 'Refresh token has expired. Please sign in again.' },
    });
    return;
  }

  const user = await queryOne<UserRow>(
    'SELECT * FROM users WHERE id = $1',
    [storedToken.user_id]
  );

  if (!user) {
    res.status(401).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'Associated user account was not found.' },
    });
    return;
  }

  const newAccessToken = generateAccessToken(user);

  res.json({
    success: true,
    data: {
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
      },
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (token) {
    await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });

  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  const unreadCount = await getUnreadNotificationCount(req.user.id);

  res.json({
    success: true,
    data: {
      user: {
        ...req.user,
        unreadNotifications: unreadCount,
      },
    },
  });
}
export async function quickLogin(req: Request, res: Response): Promise<void> {
  if (config.isProduction) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Not found.' },
    });
    return;
  }

  const { userId } = req.body;

  const user = await queryOne<UserRow>(
    'SELECT * FROM users WHERE id = $1',
    [userId]
  );

  if (!user) {
    res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'Requested test persona not found.' },
    });
    return;
  }

  const accessToken = generateAccessToken(user);
  const refreshTokenVal = await createAndStoreRefreshToken(user.id);

  res.cookie('refreshToken', refreshTokenVal, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: config.refreshTokenExpiryDays * 24 * 60 * 60 * 1000,
  });

  const unreadCount = await getUnreadNotificationCount(user.id);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        unreadNotifications: unreadCount,
      },
      accessToken,
    },
  });
}