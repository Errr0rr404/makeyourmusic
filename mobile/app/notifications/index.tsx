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
import { useTokens } from '../../lib/theme';

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
  const tokens = useTokens();
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Lock size={48} color={tokens.textMute} />
          <Text style={{ color: tokens.text, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 }}>
            Notifications
          </Text>
          <Text style={{ color: tokens.textMute, fontSize: 14, marginBottom: 24 }}>
            Log in to see notifications
          </Text>
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
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back">
            <ArrowLeft size={20} color={tokens.textMute} />
          </TouchableOpacity>
          <Text style={{ color: tokens.text, fontSize: 18, fontWeight: '700' }}>Notifications</Text>
          {unreadCount > 0 && (
            <View
              style={{
                backgroundColor: tokens.accentSoft,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: tokens.brand, fontSize: 11, fontWeight: '700' }}>
                {unreadCount} unread
              </Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} className="flex-row items-center gap-1">
            <Check size={14} color={tokens.brand} />
            <Text style={{ color: tokens.brand, fontSize: 12, fontWeight: '700' }}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', gap: 4, marginHorizontal: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
        {(['all', 'unread'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomWidth: 2,
              marginBottom: -1,
              borderBottomColor: filter === f ? tokens.brand : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: filter === f ? '700' : '500',
                color: filter === f ? tokens.text : tokens.textMute,
              }}
            >
              {f === 'all' ? 'All' : `Unread (${unreadCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            backgroundColor: 'rgba(244, 63, 94, 0.12)',
            borderColor: 'rgba(244, 63, 94, 0.3)',
            borderWidth: 1,
            borderRadius: tokens.radiusMd,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={14} color="#f87171" />
          <Text style={{ color: '#f87171', fontSize: 13, flex: 1 }}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={{ color: '#fda4af', fontSize: 12, textDecorationLine: 'underline' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={tokens.brand} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View
            style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: tokens.accentSoft,
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}
          >
            <Bell size={24} color={tokens.brand} />
          </View>
          <Text style={{ color: tokens.text, fontSize: 16, fontWeight: '700', marginBottom: 4, textAlign: 'center' }}>
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </Text>
          <Text style={{ color: tokens.textMute, fontSize: 13, marginTop: 4, textAlign: 'center', maxWidth: 280 }}>
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
              tintColor={tokens.brand}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleOpen(item)}
              onLongPress={() => deleteNotif(item)}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: tokens.border,
                backgroundColor: !item.read ? tokens.accentSoft : 'transparent',
              }}
            >
              <View style={{ marginTop: 4 }}>{iconFor(item.type)}</View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: tokens.text, fontSize: 14 }} numberOfLines={2}>
                  {item.message}
                </Text>
                <Text style={{ color: tokens.textMute, fontSize: 12, marginTop: 2 }}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.read && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.brand, marginTop: 8 }} />
              )}
              <TouchableOpacity
                onPress={() => deleteNotif(item)}
                style={{ padding: 4, marginLeft: 4 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Delete notification"
              >
                <Trash2 size={14} color={tokens.textMute} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </ScreenContainer>
  );
}
