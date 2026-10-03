type WebSocketListener = (data: any) => void;

class RealtimeWebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Set<WebSocketListener> = new Set();
  private reconnectInterval: number = 3000;
  private isConnecting: boolean = false;
  private role: string = 'CITIZEN';

  connect(role: string = 'CITIZEN', userId?: string) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.role = role;
    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/api/ws?role=${role}${userId ? `&user_id=${userId}` : ''}`;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnecting = false;
        console.log('[WS] Connected to live emergency telemetry');
      };

      this.socket.onmessage = (event) => {
        try {
          if (event.data === 'pong') return;
          const parsed = JSON.parse(event.data);
          this.listeners.forEach((listener) => listener(parsed));
        } catch (e) {
          // Non-JSON message
        }
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.socket = null;
        setTimeout(() => this.connect(this.role, userId), this.reconnectInterval);
      };

      this.socket.onerror = () => {
        if (this.socket) this.socket.close();
      };
    } catch (err) {
      this.isConnecting = false;
      setTimeout(() => this.connect(this.role, userId), this.reconnectInterval);
    }
  }

  subscribe(listener: WebSocketListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const wsService = new RealtimeWebSocketService();
