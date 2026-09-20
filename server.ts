import express from 'express';
import http from 'http';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';

import { config } from './server/config.ts';
import { initDb } from './server/db/index.ts';
import { seedDatabase } from './server/db/seed.ts';
import { wsManager } from './server/services/websocketService.ts';
import { startOverdueScheduler } from './server/services/cronService.ts';

import authRoutes from './server/routes/authRoutes.ts';
import projectRoutes from './server/routes/projectRoutes.ts';
import taskRoutes from './server/routes/taskRoutes.ts';
import activityRoutes from './server/routes/activityRoutes.ts';
import notificationRoutes from './server/routes/notificationRoutes.ts';
import dashboardRoutes from './server/routes/dashboardRoutes.ts';

async function startServer() {
  const app = express();
  const PORT = config.port;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  try {
    await initDb();
    await seedDatabase();
  } catch (err) {
    console.error('Failed to initialize or seed database:', err);
  }
  const server = http.createServer(app);

  wsManager.initialize(server);
  startOverdueScheduler();

  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      engine: 'PostgreSQL (PGlite Relational Engine)',
      realtime: 'Native WebSocket',
      scheduler: 'node-cron',
      timestamp: new Date().toISOString(),
    });
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected server error occurred.',
      },
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
  console.log(`Agency Dashboard Server running at http://localhost:${PORT}`);
  console.log(`WebSocket server listening at ws://localhost:${PORT}/ws`);
});
}

startServer();
