import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.ts';
import { AuthenticatedRequest, AuthUser } from '../types.ts';
import { queryOne } from '../db/index.ts';

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is required.',
      },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret) as {
      userId: string;
      email: string;
      role: any;
      fullName: string;
    };

    const user = await queryOne<{
      id: string;
      email: string;
      full_name: string;
      role: any;
      avatar_url: string | null;
    }>(
      'SELECT id, email, full_name, role, avatar_url FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account no longer exists.',
        },
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      avatarUrl: user.avatar_url || undefined,
    };

    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED_OR_INVALID',
        message: err.name === 'TokenExpiredError' ? 'Access token expired.' : 'Invalid access token.',
      },
    });
  }
}
