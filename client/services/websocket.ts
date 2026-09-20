import { getAccessToken } from './api.ts';

type WebSocketEventListener = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private listeners = new Map<string, Set<WebSocketEventListener>>();
  private currentProjectId: string | null = null;
  private isExplicitDisconnect = false;
  private connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitDisconnect = false;
    this.setStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = getAccessToken();
    const wsUrl = `${protocol}//${host}/ws${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        if (token) {
          this.send({ type: 'auth', token });
        }
        if (this.currentProjectId) {
          this.send({ type: 'join_project', projectId: this.currentProjectId });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.emit(message.type, message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.ws = null;
        if (!this.isExplicitDisconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket encountered error:', err);
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      this.scheduleReconnect();
    }
  }

  private setStatus(status: 'connected' | 'connecting' | 'disconnected'): void {
    this.connectionStatus = status;
    this.emit('connection_status', { status });
  }

  public getStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.connectionStatus;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2500);
  }

  public disconnect(): void {
    this.isExplicitDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  public send(payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  public joinProject(projectId: string): void {
    this.currentProjectId = projectId;
    this.send({ type: 'join_project', projectId });
  }

  public leaveProject(): void {
    this.currentProjectId = null;
    this.send({ type: 'leave_project' });
  }

  public authenticate(token: string): void {
    this.send({ type: 'auth', token });
  }

  public on(event: string, listener: WebSocketEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    return () => {
      this.off(event, listener);
    };
  }

  public off(event: string, listener: WebSocketEventListener): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (err) {
          console.error(`Error in WebSocket listener for ${event}:`, err);
        }
      });
    }
  }
}

export const wsClient = new WebSocketClient();
