'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { Bell, Check, Heart, UserPlus, MessageSquare, Music, Loader2, Trash2, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'NEW_TRACK' | 'NEW_FOLLOWER' | 'TRACK_LIKED' | 'COMMENT' | 'SYSTEM';
  title: string;
  message: string;
  read: boolean;
  data?: { trackSlug?: string; agentSlug?: string };
  createdAt: string;
}

function iconFor(type: Notification['type']) {
  switch (type) {
    case 'NEW_FOLLOWER':
      return <UserPlus className="w-5 h-5 text-blue-400" />;
    case 'TRACK_LIKED':
      return <Heart className="w-5 h-5 text-pink-400" />;
    case 'COMMENT':
      return <MessageSquare className="w-5 h-5 text-purple-400" />;
    case 'NEW_TRACK':
      return <Music className="w-5 h-5 text-green-400" />;
    default:
      return <Bell className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />;
  }
}

function hrefFor(n: Notification): string | null {
  if (n.data?.trackSlug) return `/track/${n.data.trackSlug}`;
  if (n.data?.agentSlug) return `/agent/${n.data.agentSlug}`;
  return null;
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  if (s < 604800) return `${Math.floor(s / 86400)} day${Math.floor(s / 86400) === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/notifications?${filter === 'unread' ? 'unread=true&' : ''}limit=50`);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.put(`/notifications/${id}/read`);
    } catch {
      // Silent — next load will resync
    }
  };

  const markAllAsRead = async () => {
    const hadUnread = unreadCount > 0;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.put('/notifications/read-all');
      if (hadUnread) toast.success('All marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteOne = async (id: string) => {
    const prev = notifications;
    setNotifications((cur) => cur.filter((n) => n.id !== id));
    try {
      await api.delete(`/notifications/${id}`);
    } catch {
      setNotifications(prev);
      toast.error('Failed to delete notification');
    }
  };

  const handleClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id);
    const href = hrefFor(n);
    if (href) router.push(href);
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <Lock className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Notifications</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">Log in to see your notifications</p>
        <Link href="/login" className="px-6 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white font-medium">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-[hsl(var(--accent))]" />
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] text-xs font-medium">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 transition-colors"
          >
            <Check className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 border-b border-[hsl(var(--border))]">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === f
                ? 'text-white border-[hsl(var(--accent))]'
                : 'text-[hsl(var(--muted-foreground))] border-transparent hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 p-4 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={load} className="underline hover:text-red-300">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[hsl(var(--muted-foreground))] animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))]">
          <Bell className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-50" />
          <h2 className="text-lg font-bold text-white mb-1">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {filter === 'unread'
              ? 'You&apos;re all caught up.'
              : 'When you get followers, likes, or comments, they&apos;ll show up here.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`group flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                n.read
                  ? 'bg-[hsl(var(--card))] border-[hsl(var(--border))]'
                  : 'bg-[hsl(var(--accent))]/5 border-[hsl(var(--accent))]/20'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">{iconFor(n.type)}</div>
              <button
                onClick={() => handleClick(n)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm text-white leading-snug">{n.message}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{timeAgo(n.createdAt)}</p>
              </button>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!n.read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteOne(n.id)}
                  className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
