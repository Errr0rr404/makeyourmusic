import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore, getApi } from '@makeyourmusic/shared';
import {
  ArrowLeft, Bell, Heart, UserPlus, MessageSquare, Music, Check,
  Trash2, Lock, AlertCircle,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Button } from '../../components/ui/Button';

type NotifType = 'NEW_TRACK' | 'NEW_FOLLOWER' | 'TRACK_LIKED' | 'COMMENT' | 'SYSTEM';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  read: boolean;
  data?: { trackSlug?: string; agentSlug?: string; commentId?: string };
  createdAt: string;
}

function iconFor(type: NotifType) {
  switch (type) {
    case 'NEW_FOLLOWER':
      return <UserPlus size={18} color="#60a5fa" />;
    case 'TRACK_LIKED':
      return <Heart size={18} color="#f472b6" />;
    case 'COMMENT':
      return <MessageSquare size={18} color="#a855f7" />;
    case 'NEW_TRACK':
      return <Music size={18} color="#4ade80" />;
    default:
      return <Bell size={18} color="#a1a1aa" />;
  }
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setError(null);
    try {
      const res = await getApi().get(
        `/notifications?limit=50${filter === 'unread' ? '&unread=true' : ''}`
      );
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleOpen = async (n: Notification) => {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      getApi().put(`/notifications/${n.id}/read`).catch(() => {});
    }
    if (n.data?.trackSlug) {
      router.push(`/track/${n.data.trackSlug}`);
    } else if (n.data?.agentSlug) {
      router.push(`/agent/${n.data.agentSlug}`);
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
    try {
      await getApi().put('/notifications/read-all');
    } catch {
      /* silent — next load resyncs */
    }
  };

  const deleteNotif = async (n: Notification) => {
    const prev = notifications;
    setNotifications((cur) => cur.filter((x) => x.id !== n.id));
    try {
      await getApi().delete(`/notifications/${n.id}`);
    } catch {
      setNotifications(prev);
      Alert.alert('Error', 'Could not delete notification');
    }
  };

  if (!isAuthenticated) {
    return (
      <ScreenContainer scrollable={false}>
        <View className="flex-1 items-center justify-center px-6">
          <Lock size={48} color="#71717a" />
          <Text className="text-mym-text text-xl font-bold mt-4 mb-2">Notifications</Text>
          <Text className="text-mym-muted text-sm mb-6">Log in to see notifications</Text>
          <Button title="Sign in" onPress={() => router.push('/(auth)/login')} size="lg" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable={false}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={20} color="#a1a1aa" />
          </TouchableOpacity>
          <Text className="text-mym-text text-lg font-bold">Notifications</Text>
          {unreadCount > 0 && (
            <View className="bg-mym-accent/20 px-2 py-0.5 rounded-full">
              <Text className="text-mym-accent text-xs font-semibold">{unreadCount} unread</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} className="flex-row items-center gap-1">
            <Check size={14} color="#8b5cf6" />
            <Text className="text-mym-accent text-xs font-semibold">Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View className="flex-row gap-1 mx-4 mb-2 border-b border-mym-border">
        {(['all', 'unread'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            className={`px-3 py-2 border-b-2 -mb-px ${filter === f ? 'border-mym-accent' : 'border-transparent'}`}
          >
            <Text className={`text-sm capitalize ${filter === f ? 'text-mym-text font-semibold' : 'text-mym-muted'}`}>
              {f === 'all' ? 'All' : `Unread (${unreadCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View className="mx-4 mb-3 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2 flex-row items-center gap-2">
          <AlertCircle size={14} color="#f87171" />
          <Text className="text-red-400 text-sm flex-1">{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text className="text-red-300 text-xs underline">Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#8b5cf6" size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Bell size={42} color="#71717a" />
          <Text className="text-mym-text text-lg font-bold mt-3">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </Text>
          <Text className="text-mym-muted text-sm mt-1 text-center">
            {filter === 'unread'
              ? "You're all caught up."
              : "When you get followers, likes, or comments, they'll show up here."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ paddingBottom: 140 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#8b5cf6"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleOpen(item)}
              onLongPress={() => deleteNotif(item)}
              className={`flex-row items-start gap-3 px-4 py-3 border-b border-mym-border/60 ${!item.read ? 'bg-mym-accent/5' : ''}`}
            >
              <View className="mt-1">{iconFor(item.type)}</View>
              <View className="flex-1 min-w-0">
                <Text className="text-mym-text text-sm" numberOfLines={2}>
                  {item.message}
                </Text>
                <Text className="text-mym-muted text-xs mt-0.5">{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.read && <View className="w-2 h-2 rounded-full bg-mym-accent mt-2" />}
              <TouchableOpacity
                onPress={() => deleteNotif(item)}
                className="p-1 ml-1"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={14} color="#71717a" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </ScreenContainer>
  );
}
