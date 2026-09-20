import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config.ts';
import { UserRole, ActivityLogRow, NotificationRow } from '../types.ts';
import { queryOne } from '../db/index.ts';

export interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  fullName: string;
  role: UserRole;
  currentProjectId?: string;
  connectedAt: Date;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ConnectedClient>();

  public initialize(server: http.Server): WebSocketServer {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const token = url.searchParams.get('token');

      if (token) {
        this.authenticateClient(ws, token);
      }

      ws.on('message', async (rawMessage: string) => {
        try {
          const payload = JSON.parse(rawMessage.toString());
          await this.handleClientMessage(ws, payload);
        } catch (err) {
          console.error('Error handling WebSocket message:', err);
        }
      });

      ws.on('close', () => {
        const client = this.clients.get(ws);
        this.clients.delete(ws);
        if (client) {
          this.broadcastPresence();
        }
      });

      ws.on('error', (err) => {
        console.error('WebSocket connection error:', err);
      });
    });

    return this.wss;
  }

  private async authenticateClient(ws: WebSocket, token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, config.jwtAccessSecret) as {
        userId: string;
        email: string;
        role: UserRole;
        fullName: string;
      };

      const user = await queryOne<{
        id: string;
        full_name: string;
        role: UserRole;
      }>('SELECT id, full_name, role FROM users WHERE id = $1', [decoded.userId]);

      if (!user) {
        ws.send(JSON.stringify({ type: 'auth_error', message: 'User not found' }));
        return false;
      }

      const clientInfo: ConnectedClient = {
        ws,
        userId: user.id,
        fullName: user.full_name,
        role: user.role,
        connectedAt: new Date(),
      };

      this.clients.set(ws, clientInfo);

      ws.send(
        JSON.stringify({
          type: 'authenticated',
          user: {
            id: user.id,
            fullName: user.full_name,
            role: user.role,
          },
          onlineCount: this.getUniqueOnlineUsersCount(),
        })
      );

      this.broadcastPresence();
      return true;
    } catch {
      ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid authentication token' }));
      return false;
    }
  }

  private async handleClientMessage(ws: WebSocket, payload: any): Promise<void> {
    switch (payload.type) {
      case 'auth':
        if (payload.token) {
          await this.authenticateClient(ws, payload.token);
        }
        break;

      case 'join_project':
        const client = this.clients.get(ws);
        if (client && payload.projectId) {
          client.currentProjectId = payload.projectId;
          ws.send(JSON.stringify({ type: 'joined_project', projectId: payload.projectId }));
        }
        break;

      case 'leave_project':
        const currentClient = this.clients.get(ws);
        if (currentClient) {
          currentClient.currentProjectId = undefined;
          ws.send(JSON.stringify({ type: 'left_project' }));
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      default:
        break;
    }
  }

  public getUniqueOnlineUsersCount(): number {
    const uniqueUserIds = new Set<string>();
    for (const client of this.clients.values()) {
      uniqueUserIds.add(client.userId);
    }
    return uniqueUserIds.size;
  }

  public getOnlineUsers(): Array<{ id: string; fullName: string; role: UserRole }> {
    const userMap = new Map<string, { id: string; fullName: string; role: UserRole }>();
    for (const client of this.clients.values()) {
      userMap.set(client.userId, {
        id: client.userId,
        fullName: client.fullName,
        role: client.role,
      });
    }
    return Array.from(userMap.values());
  }

  public broadcastPresence(): void {
    const count = this.getUniqueOnlineUsersCount();
    const onlineUsers = this.getOnlineUsers();
    const payload = JSON.stringify({
      type: 'presence_update',
      onlineCount: count,
      onlineUsers,
    });

    for (const [ws] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  public async broadcastActivityAndTaskUpdate(params: {
    activity: ActivityLogRow;
    task: any;
    projectCreatorId: string;
    taskAssigneeId: string | null;
  }): Promise<void> {
    const { activity, task, projectCreatorId, taskAssigneeId } = params;

    for (const [ws, client] of this.clients.entries()) {
      if (ws.readyState !== WebSocket.OPEN) continue;

      const isViewingProject = client.currentProjectId === task.project_id;
      const isAdmin = client.role === 'ADMIN';
      const isProjectPM = client.role === 'PROJECT_MANAGER' && client.userId === projectCreatorId;
      const isAssignedDev = client.role === 'DEVELOPER' && client.userId === taskAssigneeId;

      if (isViewingProject || isAdmin || isProjectPM || isAssignedDev) {
        ws.send(
          JSON.stringify({
            type: 'task:updated',
            task,
            projectId: task.project_id,
          })
        );
      }

      let canReceiveActivity = false;
      if (client.role === 'ADMIN') {
        canReceiveActivity = true;
      } else if (client.role === 'PROJECT_MANAGER') {
        canReceiveActivity = client.userId === projectCreatorId;
      } else if (client.role === 'DEVELOPER') {
        canReceiveActivity = client.userId === taskAssigneeId;
      }

      if (canReceiveActivity) {
        ws.send(
          JSON.stringify({
            type: 'activity:new',
            activity,
          })
        );
      }
    }
  }

  public sendNotificationToUser(userId: string, notification: NotificationRow, unreadCount: number): void {
    for (const [ws, client] of this.clients.entries()) {
      if (client.userId === userId && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'notification:new',
            notification,
            unreadCount,
          })
        );
      }
    }
  }

  public updateNotificationCount(userId: string, unreadCount: number): void {
    for (const [ws, client] of this.clients.entries()) {
      if (client.userId === userId && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'notification:count_update',
            unreadCount,
          })
        );
      }
    }
  }
}

export const wsManager = new WebSocketManager();
