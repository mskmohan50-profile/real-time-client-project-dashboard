import { Response } from 'express';
import { AuthenticatedRequest } from '../types.ts';
import { getFilteredActivityFeed } from '../services/activityService.ts';

export async function getActivityFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const since = req.query.since as string | undefined;
  const projectId = req.query.projectId as string | undefined;

  const logs = await getFilteredActivityFeed(user, {
    limit,
    since,
    projectId,
  });

  res.json({
    success: true,
    data: logs,
  });
}
