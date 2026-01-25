'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useERPDashboard } from '@/hooks/useERPDashboard';
import { AIAssistantChat } from '@/components/ai/AIAssistantChat';
import { LiveAnalyticsDashboard } from '@/components/analytics/LiveAnalyticsDashboard';
import { ActiveUsers } from '@/lib/collaboration/useCollaboration';
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
  Globe,
  Zap,
} from '@/components/erp/dashboard';

export default function ERPDashboard() {
  const { user, stats, loading } = useERPDashboard();
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading Kairux Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
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
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">Welcome back, {user?.firstName || 'User'}!</h1>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Premium
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Your business is in flow • Real-time insights powered by AI
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Active Collaborators */}
                <ActiveUsers limit={5} />

                {/* AI Assistant Toggle */}
                <Button
                  onClick={() => setShowAIAssistant(true)}
                  size="lg"
                  className="gap-2"
                >
                  <Brain className="h-5 w-5" />
                  AI Assistant
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Main Dashboard Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Live Analytics</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Metrics */}
              {stats ? (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.1 },
                    },
                  }}
                  initial="hidden"
                  animate="show"
                >
                  <MetricCard title="Total Users" value={stats.stats.totalUsers.toString()} icon={Users} />
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
                <h2 className="text-2xl font-bold mb-4">Recent Users</h2>
                <Card>
                  <CardContent className="p-4 space-y-4">
                    {stats?.recentUsers?.map(activity => (
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
            </TabsContent>

            {/* Live Analytics Tab */}
            <TabsContent value="analytics">
              <LiveAnalyticsDashboard />
            </TabsContent>

            {/* AI Insights Tab */}
            <TabsContent value="insights">
              <Card>
                <CardContent className="p-6 text-center">
                  <Brain className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">AI Insights</h3>
                  <p className="text-muted-foreground mb-6">
                    Get intelligent recommendations and predictions for your business
                  </p>
                  <Button onClick={() => setShowAIAssistant(true)} size="lg">
                    Open AI Assistant
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardContent className="p-6 text-center">
                  <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Enterprise Security</h3>
                  <p className="text-muted-foreground mb-6">
                    Advanced audit trails, access control, and security monitoring
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Button variant="outline" size="lg">
                      View Audit Logs
                    </Button>
                    <Button variant="outline" size="lg">
                      Security Alerts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* AI Assistant Chat */}
      {showAIAssistant && (
        <AIAssistantChat
          onClose={() => setShowAIAssistant(false)}
          defaultOpen={true}
        />
      )}
    </>
  );
}
