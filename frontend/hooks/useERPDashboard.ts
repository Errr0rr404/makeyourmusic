'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import api from '@/lib/api';

interface DashboardStats {
  stats: {
    totalUsers: number;
  };
  recentUsers: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
  }[];
}

export const useERPDashboard = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, fetchUser } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token && !user && !authLoading) {
          try {
            await fetchUser();
          } catch (error) {
            console.error('[ERP] Failed to fetch user:', error);
          }
        }
      }
      setHasCheckedAuth(true);
    };

    initAuth();
  }, [user, authLoading, fetchUser]);

  useEffect(() => {
    if (!hasCheckedAuth || authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router, authLoading, hasCheckedAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchERPStats();
    }
  }, [isAuthenticated]);

  const fetchERPStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch ERP stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return useMemo(() => ({
    user,
    stats,
    loading: loading || authLoading || !hasCheckedAuth,
  }), [user, stats, loading, authLoading, hasCheckedAuth]);
};