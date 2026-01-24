'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, ArrowLeft, CheckCheck, Trash2 } from 'lucide-react';
import { useNotificationStore } from '@/lib/store/notificationStore';
import { useAuthStore } from '@/lib/store/authStore';

const formatTimeAgo = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
};

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchNotifications();
  }, [isAuthenticated, router, fetchNotifications]);

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Link href="/account">
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Back to account</span>
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-muted-foreground">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                className="min-h-[44px]"
                aria-label="Mark all as read"
              >
                <CheckCheck className="h-4 w-4 mr-2" aria-hidden="true" />
                Mark all read
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" aria-hidden="true" />
                <h3 className="text-xl font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  You'll see notifications about your orders, payments, and account updates here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {unreadNotifications.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">Unread</h2>
                  <div className="space-y-3">
                    {unreadNotifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <Card
                          className={`cursor-pointer hover:shadow-md transition-shadow ${
                            !notification.read ? 'border-primary/50 bg-primary/5' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={`font-semibold ${!notification.read ? 'text-primary' : ''}`}>
                                    {notification.title}
                                  </h3>
                                  {!notification.read && (
                                    <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatTimeAgo(notification.createdAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await markAsRead(notification.id);
                                    }}
                                    aria-label="Mark as read"
                                  >
                                    <CheckCheck className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await deleteNotification(notification.id);
                                  }}
                                  aria-label="Delete notification"
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {readNotifications.length > 0 && (
                <div>
                  {unreadNotifications.length > 0 && <h2 className="text-lg font-semibold mb-3 mt-8">Read</h2>}
                  <div className="space-y-3">
                    {readNotifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <Card
                          className="cursor-pointer hover:shadow-md transition-shadow opacity-75"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold mb-1">{notification.title}</h3>
                                <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatTimeAgo(notification.createdAt)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await deleteNotification(notification.id);
                                }}
                                aria-label="Delete notification"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
