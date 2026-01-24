'use client';

import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useERPDashboard } from '@/hooks/useERPDashboard';
import { 
  MetricCard, 
  ModuleCard, 
  ActivityIcon,
  DollarSign,
  Users,
  Package,
  CheckSquare,
  FileBarChart,
  Briefcase,
  BarChart3,
  Settings,
  Workflow,
  Brain,
  Target,
  Shield,
  FolderTree,
} from '@/components/erp/dashboard';

export default function ERPDashboard() {
  const { user, stats, loading } = useERPDashboard();

  if (loading) {
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
        {stats ? (
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
            <MetricCard title="Total Users" value={stats.stats.totalUsers.toString()} icon={Users} />
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        )}

        {/* Core ERP Modules Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h2 className="text-2xl font-bold mb-6">Core ERP Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            <ModuleCard href="/erp/accounting" icon={DollarSign} title="Accounting" description="Manage finances, invoices, and expenses" />
            <ModuleCard href="/erp/crm" icon={Target} title="CRM" description="Customer relationships, leads & opportunities" />
            <ModuleCard href="/erp/hr" icon={Users} title="Human Resources" description="Employee management, payroll & attendance" />
            <ModuleCard href="/erp/inventory" icon={Package} title="Inventory" description="Products, stock levels & purchase orders" />
            <ModuleCard href="/erp/projects" icon={Briefcase} title="Projects" description="Project management, tasks & timesheets" />
            <ModuleCard href="/erp/documents" icon={FolderTree} title="Documents" description="Document management and storage" />
            <ModuleCard href="/erp/workflows" icon={Workflow} title="Workflows" description="Automate business processes" />
            <ModuleCard href="/erp/analytics" icon={BarChart3} title="Analytics" description="Business intelligence and insights" />
          </div>
        </motion.div>

        {/* Advanced Features Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <h2 className="text-2xl font-bold mb-6">Advanced Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            <ModuleCard href="/erp/ai-insights" icon={Brain} title="AI Insights" description="Intelligent business analytics and forecasting" />
            <ModuleCard href="/erp/approvals" icon={CheckSquare} title="Approvals" description="Review and approve pending requests" badge={0} />
            <ModuleCard href="/erp/audit" icon={Shield} title="Audit Log" description="Track system activity and changes" />
            <ModuleCard href="/erp/reports" icon={FileBarChart} title="Reports" description="Comprehensive business reports" />
            <ModuleCard href="/erp/settings" icon={Settings} title="Settings" description="System configuration and preferences" />
          </div>
        </motion.div>

        {/* Recent Activity Section */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
          <h2 className="text-2xl font-bold mb-4">Recent Users</h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              {stats?.recentUsers.map(activity => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <ActivityIcon type={activity.role} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{activity.name || activity.email}</p>
                    <p className="text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}