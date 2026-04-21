'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Heart, UserPlus, MessageSquare, Music, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';

interface Notification {
  id: string;
  type: 'NEW_TRACK' | 'NEW_FOLLOWER' | 'TRACK_LIKED' | 'COMMENT' | 'SYSTEM';
  title: string;
  message: string;
  read: boolean;
  data?: { trackSlug?: string; agentSlug?: string; commentId?: string };
  createdAt: string;
}

const POLL_INTERVAL_MS = 60_000;

function iconFor(type: Notification['type']) {
  switch (type) {
    case 'NEW_FOLLOWER':
      return <UserPlus className="w-4 h-4 text-blue-400" />;
    case 'TRACK_LIKED':
      return <Heart className="w-4 h-4 text-pink-400" />;
    case 'COMMENT':
      return <MessageSquare className="w-4 h-4 text-purple-400" />;
    case 'NEW_TRACK':
      return <Music className="w-4 h-4 text-green-400" />;
    default:
      return <Bell className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />;
  }
}

function hrefFor(n: Notification): string {
  if (n.data?.trackSlug) return `/track/${n.data.trackSlug}`;
  if (n.data?.agentSlug) return `/agent/${n.data.agentSlug}`;
  return '/notifications';
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch {
      // Non-critical
    }
  }, [isAuthenticated]);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=10');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadUnreadCount]);

  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.put(`/notifications/${id}/read`);
    } catch {
      // Revert handled by next poll
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.put('/notifications/read-all');
    } catch {
      // Revert handled by next poll
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-white/5 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[360px] max-w-[92vw] bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[hsl(var(--accent))] hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-[hsl(var(--muted-foreground))] animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-[hsl(var(--muted-foreground))] mx-auto mb-2 opacity-50" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  No notifications yet
                </p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={hrefFor(n)}
                      onClick={() => {
                        if (!n.read) markAsRead(n.id);
                        setOpen(false);
                      }}
                      className={`flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-[hsl(var(--border))] last:border-b-0 ${
                        !n.read ? 'bg-[hsl(var(--accent))]/5' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">{iconFor(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white leading-snug">{n.message}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--accent))] flex-shrink-0 mt-1.5" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-4 py-3 border-t border-[hsl(var(--border))]">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-sm text-[hsl(var(--accent))] hover:underline"
            >
              See all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
