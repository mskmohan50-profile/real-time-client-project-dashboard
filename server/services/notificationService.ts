import { query, queryOne } from '../db/index.ts';
import { NotificationRow } from '../types.ts';
import { wsManager } from './websocketService.ts';

export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  taskId?: string | null;
  projectId?: string | null;
}): Promise<NotificationRow> {
  const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const { userId, title, message, taskId, projectId } = params;

  await query(
    `INSERT INTO notifications (id, user_id, title, message, task_id, project_id, is_read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, FALSE, CURRENT_TIMESTAMP)`,
    [id, userId, title, message, taskId || null, projectId || null]
  );

  const notif = await queryOne<NotificationRow>(
    'SELECT * FROM notifications WHERE id = $1',
    [id]
  );

  const unreadCount = await getUnreadNotificationCount(userId);
  wsManager.sendNotificationToUser(userId, notif!, unreadCount);

  return notif!;
}

export async function getUserNotifications(userId: string, limit: number = 30): Promise<NotificationRow[]> {
  const { rows } = await query<NotificationRow>(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const res = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return res ? parseInt(res.count, 10) : 0;
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
  await query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
    [notificationId, userId]
  );

  const unreadCount = await getUnreadNotificationCount(userId);
  wsManager.updateNotificationCount(userId, unreadCount);
  return true;
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  await query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );

  wsManager.updateNotificationCount(userId, 0);
  return true;
}
