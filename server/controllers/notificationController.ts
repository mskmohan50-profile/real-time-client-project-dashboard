import { Response } from 'express';
import { AuthenticatedRequest } from '../types.ts';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from '../services/notificationService.ts';

export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;

  const notifications = await getUserNotifications(user.id, limit);
  const unreadCount = await getUnreadNotificationCount(user.id);

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
    },
  });
}

export async function markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;

  await markNotificationAsRead(user.id, id);

  res.json({
    success: true,
    message: 'Notification marked as read.',
  });
}

export async function markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;

  await markAllNotificationsAsRead(user.id);

  res.json({
    success: true,
    message: 'All notifications marked as read.',
  });
}
