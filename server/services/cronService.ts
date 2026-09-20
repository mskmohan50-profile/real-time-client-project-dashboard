import cron from 'node-cron';
import { query } from '../db/index.ts';
import { logActivity } from './activityService.ts';
import { createNotification } from './notificationService.ts';
import { wsManager } from './websocketService.ts';

export async function runOverdueScan(): Promise<{ flaggedCount: number; taskIds: string[] }> {
  try {
    const { rows: overdueTasks } = await query<{
      id: string;
      title: string;
      project_id: string;
      assigned_to: string | null;
      status: string;
      priority: string;
      due_date: string;
      project_creator_id: string;
      project_title: string;
      assignee_name: string | null;
    }>(
      `SELECT t.*, p.created_by as project_creator_id, p.title as project_title,
              u.full_name as assignee_name
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assigned_to = u.id
       WHERE t.due_date < CURRENT_TIMESTAMP
         AND t.status != 'DONE'
         AND t.is_overdue = FALSE`
    );

    if (overdueTasks.length === 0) {
      return { flaggedCount: 0, taskIds: [] };
    }

    const flaggedIds: string[] = [];

    for (const task of overdueTasks) {
      await query(
        'UPDATE tasks SET is_overdue = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [task.id]
      );
      flaggedIds.push(task.id);
      const activity = await logActivity({
        taskId: task.id,
        projectId: task.project_id,
        userId: task.project_creator_id, 
        actionType: 'FLAGGED_OVERDUE',
        previousStatus: task.status,
        newStatus: task.status,
        message: `Task "${task.title}" has passed its due date and was flagged as Overdue by background scheduler`,
      });
      if (task.assigned_to) {
        await createNotification({
          userId: task.assigned_to,
          title: 'Task Overdue Alert',
          message: `Your assigned task "${task.title}" in project "${task.project_title}" is now overdue.`,
          taskId: task.id,
          projectId: task.project_id,
        });
      }

      await createNotification({
        userId: task.project_creator_id,
        title: 'Project Task Overdue',
        message: `Task "${task.title}" in your project "${task.project_title}" is overdue.`,
        taskId: task.id,
        projectId: task.project_id,
      });

      const updatedTask = {
        ...task,
        is_overdue: true,
      };

      await wsManager.broadcastActivityAndTaskUpdate({
        activity,
        task: updatedTask,
        projectCreatorId: task.project_creator_id,
        taskAssigneeId: task.assigned_to,
      });
    }

    console.log(`[Overdue Cron Job] Successfully flagged ${flaggedIds.length} tasks as overdue.`);
    return { flaggedCount: flaggedIds.length, taskIds: flaggedIds };
  } catch (err) {
    console.error('[Overdue Cron Job] Error running overdue task scan:', err);
    return { flaggedCount: 0, taskIds: [] };
  }
}

export function startOverdueScheduler(): any {
  const task = cron.schedule('* * * * *', async () => {
    await runOverdueScan();
  });

  console.log('[Scheduler] Background overdue task scheduler initialized (running every 60s).');
  return task;
}
