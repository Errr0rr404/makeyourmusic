'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  Brain,
  FolderTree,
  Sparkles,
  Receipt,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';
import api from '@/lib/api';

interface ERPStats {
  totalRevenue: number;
  netProfit: number;
  activeProjects: number;
  openOpportunities: number;
  revenueTrend: number;
  profitTrend: number;
  projectsTrend: number;
  opportunitiesTrend: number;
  recentActivities: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }[];
  aiInsights: {
    salesForecast: number;
    topOpportunity: string;
  };
}

export default function ERPDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, fetchUser } = useAuthStore();
  const [stats, setStats] = useState<ERPStats | null>(null);
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
      // In a real app, this would fetch from '/erp/dashboard-stats'
      // For now, we'll use mock data to demonstrate the UI.
      const mockStats: ERPStats = {
        totalRevenue: 125430.50,
        netProfit: 45230.80,
        activeProjects: 12,
        openOpportunities: 34,
        revenueTrend: 12.5,
        profitTrend: 8.2,
        projectsTrend: -5,
        opportunitiesTrend: 15,
        recentActivities: [
          { id: '1', type: 'INVOICE', description: 'Invoice #INV-001 created for "Tech Corp"', timestamp: new Date(Date.now() - 3600000).toISOString() },
          { id: '2', type: 'PROJECT', description: 'Project "New Website" status updated to "In Progress"', timestamp: new Date(Date.now() - 7200000).toISOString() },
          { id: '3', type: 'LEAD', description: 'New lead "John Doe" from "Web Form" added', timestamp: new Date(Date.now() - 10800000).toISOString() },
        ],
        aiInsights: {
          salesForecast: 150000,
          topOpportunity: 'Upgrade deal with "Innovate LLC"',
        },
      };
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch ERP stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading || !hasCheckedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading ERP Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user?.name || 'User'}!</h1>
              <p className="text-muted-foreground mt-1">
                Here's a snapshot of your business performance.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {stats && (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
            initial="hidden"
            animate="show"
          >
            <MetricCard title="Total Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} trend={stats.revenueTrend} icon={DollarSign} />
            <MetricCard title="Net Profit" value={`$${stats.netProfit.toLocaleString()}`} trend={stats.profitTrend} icon={TrendingUp} />
            <MetricCard title="Active Projects" value={stats.activeProjects.toString()} trend={stats.projectsTrend} icon={FolderTree} />
            <MetricCard title="Open Opportunities" value={stats.openOpportunities.toString()} trend={stats.opportunitiesTrend} icon={Users} />
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <motion.div className="lg:col-span-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
            <h2 className="text-2xl font-bold mb-4">ERP Modules</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ModuleCard href="/erp/accounting" icon={DollarSign} title="Accounting" description="Manage finances, invoices, and expenses" />
              <ModuleCard href="/erp/crm" icon={Users} title="CRM" description="Manage customer relationships and leads" />
              <ModuleCard href="/erp/projects" icon={FolderTree} title="Projects" description="Manage projects, tasks, and timelines" />
              <ModuleCard href="/erp/ai-insights" icon={Sparkles} title="AI Insights" description="Get AI-powered business insights" />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
            <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
            <Card>
              <CardContent className="p-4 space-y-4">
                {stats?.recentActivities.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <ActivityIcon type={activity.type} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {stats?.aiInsights && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card className="mb-8 border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
                  <Sparkles className="h-5 w-5" />
                  AI-Powered Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sales Forecast (Next Month)</p>
                    <p className="text-xl font-bold">${stats.aiInsights.salesForecast.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Top Opportunity</p>
                    <p className="text-lg font-semibold">{stats.aiInsights.topOpportunity}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

const MetricCard = ({ title, value, trend, icon: Icon }: { title: string, value: string, trend: number, icon: React.ComponentType<LucideProps> }) => (
  <motion.div variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
          {trend >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          {Math.abs(trend)}% from last month
        </p>
      </CardContent>
    </Card>
  </motion.div>
);

const ModuleCard = ({ href, icon: Icon, title, description }: { href: string, icon: React.ComponentType<LucideProps>, title: string, description: string }) => (
  <motion.div whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}>
    <Link href={href} aria-label={`Access ${title}`}>
      <Card className="h-full group">
        <CardContent className="p-6">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  </motion.div>
);

const ActivityIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'INVOICE': return <Receipt className="h-4 w-4 text-primary" />;
    case 'PROJECT': return <FolderTree className="h-4 w-4 text-primary" />;
    case 'LEAD': return <Users className="h-4 w-4 text-primary" />;
    default: return <FileText className="h-4 w-4 text-primary" />;
  }
};
