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
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error.response?.data?.error || error.message || 'Failed to load notifications');
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
        <Lock className="w-12 h-12 text-[color:var(--text-mute)] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[color:var(--text)] mb-2">Notifications</h2>
        <p className="text-[color:var(--text-mute)] mb-4">Log in to see your notifications</p>
        <Link href="/login" className="mym-cta">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Bell className="w-6 h-6 text-[color:var(--brand)]" />
          <h1 className="text-2xl font-bold text-[color:var(--text)] leading-tight">Notifications</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand)] text-xs font-semibold">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[color:var(--text-mute)] hover:text-[color:var(--text)] hover:bg-[color:var(--bg-elev-2)] transition-colors sm:w-auto sm:py-1.5"
          >
            <Check className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 border-b border-[color:var(--stroke)]">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              filter === f
                ? 'text-[color:var(--text)] border-[color:var(--brand)]'
                : 'text-[color:var(--text-mute)] border-transparent hover:text-[color:var(--text)]'
            }`}
          >
            {f === 'all' ? 'All' : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex flex-col gap-3 p-4 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={load} className="underline hover:text-rose-300">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[color:var(--text-mute)] animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 rounded-2xl bg-[color:var(--bg-elev-1)] border border-[color:var(--stroke)]">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
               style={{ background: 'var(--aurora)', opacity: 0.18 }}>
            <Bell className="w-6 h-6 text-[color:var(--brand)]" />
          </div>
          <h2 className="text-lg font-bold text-[color:var(--text)] mb-1">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h2>
          <p className="text-sm text-[color:var(--text-mute)] max-w-sm mx-auto">
            {filter === 'unread'
              ? "You're all caught up."
              : "When you get followers, likes, or comments, they'll show up here."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`group flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                n.read
                  ? 'bg-[color:var(--bg-elev-1)] border-[color:var(--stroke)]'
                  : 'bg-[color:var(--brand-soft)] border-[color:var(--brand)]/20'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">{iconFor(n.type)}</div>
              <button
                onClick={() => handleClick(n)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm text-[color:var(--text)] leading-snug">{n.message}</p>
                <p className="text-xs text-[color:var(--text-mute)] mt-1">{timeAgo(n.createdAt)}</p>
              </button>
              <div className="flex items-center gap-1 md:opacity-60 md:group-hover:opacity-100 md:transition-opacity">
                {!n.read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="p-2 rounded-lg text-[color:var(--text-mute)] hover:text-[color:var(--text)] hover:bg-[color:var(--bg-elev-2)]"
                    aria-label="Mark as read"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteOne(n.id)}
                  className="p-2 rounded-lg text-[color:var(--text-mute)] hover:text-rose-400 hover:bg-rose-500/10"
                  aria-label="Delete notification"
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
