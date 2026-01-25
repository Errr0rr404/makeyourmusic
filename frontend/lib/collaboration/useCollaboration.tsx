// Real-time Collaboration System for Kairux
// Enables live editing, presence detection, and comments across all modules

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  currentPage: string;
  lastActivity: Date;
}

interface CollaborationEvent {
  type: 'edit' | 'comment' | 'cursor' | 'presence';
  userId: string;
  data: unknown;
  timestamp: Date;
}

class CollaborationService {
  private socket: Socket | null = null;
  private activeUsers: Map<string, CollaborationUser> = new Map();
  private callbacks: Map<string, ((data?: unknown) => void)[]> = new Map();

  connect(userId: string, userName: string) {
    if (this.socket?.connected) return;

    this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001', {
      auth: { userId, userName },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Collaboration connected');
    });

    this.socket.on('user:joined', (user: CollaborationUser) => {
      this.activeUsers.set(user.id, user);
      this.emit('user:joined', user);
    });

    this.socket.on('user:left', (userId: string) => {
      this.activeUsers.delete(userId);
      this.emit('user:left', userId);
    });

    this.socket.on('document:edit', (event: CollaborationEvent) => {
      this.emit('document:edit', event);
    });

    this.socket.on('comment:added', (event: CollaborationEvent) => {
      this.emit('comment:added', event);
    });

    this.socket.on('cursor:moved', (event: CollaborationEvent) => {
      this.emit('cursor:moved', event);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.activeUsers.clear();
  }

  // Broadcast document edits
  broadcastEdit(documentId: string, changes: unknown) {
    this.socket?.emit('document:edit', { documentId, changes });
  }

  // Broadcast comments
  addComment(documentId: string, comment: unknown) {
    this.socket?.emit('comment:add', { documentId, comment });
  }

  // Broadcast cursor position
  updateCursor(documentId: string, position: unknown) {
    this.socket?.emit('cursor:update', { documentId, position });
  }

  // Broadcast presence (current page)
  updatePresence(page: string) {
    this.socket?.emit('presence:update', { page });
  }

  // Get active users
  getActiveUsers(): CollaborationUser[] {
    return Array.from(this.activeUsers.values());
  }

  // Event subscription
  on(event: string, callback: (data?: unknown) => void) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);

    return () => this.off(event, callback);
  }

  off(event: string, callback: (data?: unknown) => void) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private emit(event: string, data: unknown) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

// Singleton instance
export const collaborationService = new CollaborationService();

// React Hook for Collaboration
export function useCollaboration(documentId?: string) {
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Auto-connect when user is available
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      collaborationService.connect(userData.id, userData.name);
      setIsConnected(true);
    }

    return () => {
      if (!documentId) {
        collaborationService.disconnect();
      }
    };
  }, [documentId]);

  useEffect(() => {
    const unsubscribeJoin = collaborationService.on('user:joined', () => {
      setActiveUsers(collaborationService.getActiveUsers());
    });

    const unsubscribeLeave = collaborationService.on('user:left', () => {
      setActiveUsers(collaborationService.getActiveUsers());
    });

    return () => {
      unsubscribeJoin();
      unsubscribeLeave();
    };
  }, []);

  const broadcastEdit = useCallback((changes: unknown) => {
    if (documentId) {
      collaborationService.broadcastEdit(documentId, changes);
    }
  }, [documentId]);

  const addComment = useCallback((comment: unknown) => {
    if (documentId) {
      collaborationService.addComment(documentId, comment);
    }
  }, [documentId]);

  const updateCursor = useCallback((position: unknown) => {
    if (documentId) {
      collaborationService.updateCursor(documentId, position);
    }
  }, [documentId]);

  return {
    activeUsers,
    isConnected,
    broadcastEdit,
    addComment,
    updateCursor,
    updatePresence: collaborationService.updatePresence.bind(collaborationService),
  };
}

// Component to show active users
export function ActiveUsers({ limit = 5 }: { limit?: number }) {
  const { activeUsers } = useCollaboration();
  const displayUsers = activeUsers.slice(0, limit);
  const remaining = activeUsers.length - limit;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {displayUsers.map(user => (
          <div
            key={user.id}
            className="w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {remaining > 0 && (
          <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-semibold">
            +{remaining}
          </div>
        )}
      </div>
      {activeUsers.length > 0 && (
        <span className="text-sm text-muted-foreground">
          {activeUsers.length} active
        </span>
      )}
    </div>
  );
}
