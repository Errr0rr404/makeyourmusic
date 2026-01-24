'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Bell, Loader2, ArrowLeft, Plus, Calendar, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Notification {
  id: string;
  userId?: string | null;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newNotification, setNewNotification] = useState({
    userId: '',
    title: '',
    message: '',
    type: 'INFO',
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      router.push('/manage');
      return;
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchNotifications();
    }
  }, [isAuthenticated, user]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/admin/all');
      setNotifications(response.data.notifications || []);
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
      toast.error(error.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotification = async () => {
    if (!newNotification.title.trim() || !newNotification.message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    try {
      setCreating(true);
      const payload = {
        userId: newNotification.userId.trim(),
        title: newNotification.title.trim(),
        message: newNotification.message.trim(),
        type: newNotification.type,
      };

      await api.post('/notifications', payload);
      toast.success('Notification created successfully');
      setDialogOpen(false);
      setNewNotification({
        userId: '',
        title: '',
        message: '',
        type: 'INFO',
      });
      fetchNotifications();
    } catch (error: any) {
      console.error('Failed to create notification:', error);
      toast.error(error.response?.data?.error || 'Failed to create notification');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteNotification = async () => {
    if (!notificationToDelete) return;

    try {
      await api.delete(`/notifications/${notificationToDelete}`);
      toast.success('Notification deleted');
      fetchNotifications();
      setNotificationToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete notification:', error);
      toast.error(error.response?.data?.error || 'Failed to delete notification');
    }
  };

  const openDeleteDialog = (id: string) => {
    setNotificationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      INFO: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      SUCCESS: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      WARNING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <h1 className="text-3xl font-bold">Notifications</h1>
              <p className="text-muted-foreground mt-1">
                Manage system notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    ({unreadCount} unread)
                  </span>
                )}
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Notification
            </Button>
          </div>

          {/* Notifications List */}
          {loading ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              </CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No notifications found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card key={notification.id} className={!notification.read ? 'border-primary' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-semibold">{notification.title}</h3>
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${getTypeColor(
                                  notification.type
                                )}`}
                              >
                                {notification.type}
                              </span>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-primary rounded-full" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(notification.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {notification.user && (
                            <span>
                              To: {notification.user.name || notification.user.email}
                            </span>
                          )}
                          {!notification.userId && <span>System notification</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(notification.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Create Notification Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Notification</DialogTitle>
            <DialogDescription>
              Send a notification to a specific user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                User ID *
              </label>
              <Input
                value={newNotification.userId}
                onChange={(e) =>
                  setNewNotification({ ...newNotification, userId: e.target.value })
                }
                placeholder="Enter user ID to send notification"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the user ID of the recipient
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Title *</label>
              <Input
                value={newNotification.title}
                onChange={(e) =>
                  setNewNotification({ ...newNotification, title: e.target.value })
                }
                placeholder="Notification title"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message *</label>
              <Textarea
                value={newNotification.message}
                onChange={(e) =>
                  setNewNotification({ ...newNotification, message: e.target.value })
                }
                placeholder="Notification message"
                rows={4}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <select
                value={newNotification.type}
                onChange={(e) =>
                  setNewNotification({ ...newNotification, type: e.target.value })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="INFO">Info</option>
                <option value="SUCCESS">Success</option>
                <option value="WARNING">Warning</option>
                <option value="ERROR">Error</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateNotification}
              disabled={creating || !newNotification.userId.trim() || !newNotification.title.trim() || !newNotification.message.trim()}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Notification'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Notification Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Notification"
        description="Are you sure you want to delete this notification? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteNotification}
      />
    </div>
  );
}
