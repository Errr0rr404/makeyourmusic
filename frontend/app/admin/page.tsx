'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, DollarSign, TrendingUp, Briefcase, UserCheck } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';
import api from '@/lib/api';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalInvoices: 0,
    totalLeads: 0,
    totalProjects: 0,
    activePayrolls: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'ADMIN') {
      router.push('/erp');
      return;
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      fetchStats();
    }
  }, [isAuthenticated, user]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  const statsCards = [
    { label: 'Total Users', value: (stats.totalUsers ?? 0).toString(), icon: Users, link: '/admin/users', color: 'text-blue-600' },
    { label: 'Total Invoices', value: (stats.totalInvoices ?? 0).toString(), icon: FileText, link: '/erp/accounting', color: 'text-green-600' },
    { label: 'Total Leads', value: (stats.totalLeads ?? 0).toString(), icon: UserCheck, link: '/erp/crm', color: 'text-purple-600' },
    { label: 'Active Projects', value: (stats.totalProjects ?? 0).toString(), icon: Briefcase, link: '/erp/projects', color: 'text-orange-600' },
    { label: 'Active Payrolls', value: (stats.activePayrolls ?? 0).toString(), icon: DollarSign, link: '/erp/payroll', color: 'text-emerald-600' },
    { label: 'Total Revenue', value: `$${Number(stats.totalRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, link: '/erp/accounting', color: 'text-indigo-600' },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your ERP system</p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-5 w-5 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {statsCards.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link href={stat.link}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.label}
                      </CardTitle>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click to view details
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Link href="/admin/users">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-4 text-left border rounded-lg hover:bg-accent transition-colors"
                >
                  <Users className="inline-block mr-2 h-5 w-5" />
                  <span className="font-medium">Manage Users</span>
                </motion.button>
              </Link>
              <Link href="/erp/accounting">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-4 text-left border rounded-lg hover:bg-accent transition-colors"
                >
                  <DollarSign className="inline-block mr-2 h-5 w-5" />
                  <span className="font-medium">View Financial Reports</span>
                </motion.button>
              </Link>
              <Link href="/erp/payroll">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full p-4 text-left border rounded-lg hover:bg-accent transition-colors"
                >
                  <FileText className="inline-block mr-2 h-5 w-5" />
                  <span className="font-medium">Process Payroll</span>
                </motion.button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Environment</span>
                <span className="font-medium">Production</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Database</span>
                <span className="font-medium text-green-600">● Connected</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
