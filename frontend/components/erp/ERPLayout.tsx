'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DollarSign,
  Users,
  Package,
  FileText,
  BarChart3,
  Briefcase,
  Brain,
  Workflow,
  Target,
  FolderTree,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Settings,
  HelpCircle,
  Shield,
  Clock,
  CheckSquare,
  Home,
  LogOut,
  User,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { useERPModules } from '@/lib/erp/useERPModules';
import { cn } from '@/lib/utils';
import { approvalWorkflow } from '@/lib/erp/approvalWorkflow';

interface ERPLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/erp' },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: DollarSign,
    href: '/erp/accounting',
    children: [
      { id: 'chart-of-accounts', label: 'Chart of Accounts', icon: FolderTree, href: '/erp/accounting/chart-of-accounts' },
      { id: 'journal-entries', label: 'Journal Entries', icon: FileText, href: '/erp/accounting/journal-entries' },
      { id: 'invoices', label: 'Invoices', icon: FileText, href: '/erp/accounting/invoices' },
      { id: 'bills', label: 'Bills & Expenses', icon: DollarSign, href: '/erp/accounting/bills' },
      { id: 'reports', label: 'Financial Reports', icon: BarChart3, href: '/erp/accounting/reports' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: Target,
    href: '/erp/crm',
    children: [
      { id: 'leads', label: 'Leads', icon: Users, href: '/erp/crm/leads' },
      { id: 'opportunities', label: 'Opportunities', icon: Target, href: '/erp/crm/opportunities' },
      { id: 'customers', label: 'Customers', icon: Users, href: '/erp/crm/customers' },
      { id: 'campaigns', label: 'Campaigns', icon: Briefcase, href: '/erp/crm/campaigns' },
    ],
  },
  {
    id: 'hr',
    label: 'Human Resources',
    icon: Users,
    href: '/erp/hr',
    children: [
      { id: 'employees', label: 'Employees', icon: Users, href: '/erp/hr/employees' },
      { id: 'departments', label: 'Departments', icon: Building2, href: '/erp/hr/departments' },
      { id: 'payroll', label: 'Payroll', icon: DollarSign, href: '/erp/hr/payroll' },
      { id: 'leave', label: 'Leave Management', icon: Clock, href: '/erp/hr/leave' },
      { id: 'attendance', label: 'Attendance', icon: CheckSquare, href: '/erp/hr/attendance' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    href: '/erp/inventory',
    children: [
      { id: 'products', label: 'Products', icon: Package, href: '/erp/inventory/products' },
      { id: 'locations', label: 'Locations', icon: Building2, href: '/erp/inventory/locations' },
      { id: 'transfers', label: 'Transfers', icon: Package, href: '/erp/inventory/transfers' },
      { id: 'purchase-orders', label: 'Purchase Orders', icon: FileText, href: '/erp/inventory/purchase-orders' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: Briefcase,
    href: '/erp/projects',
    children: [
      { id: 'all-projects', label: 'All Projects', icon: Briefcase, href: '/erp/projects' },
      { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: '/erp/projects/tasks' },
      { id: 'timesheets', label: 'Timesheets', icon: Clock, href: '/erp/projects/timesheets' },
    ],
  },
  { id: 'documents', label: 'Documents', icon: FolderTree, href: '/erp/documents' },
  { id: 'workflows', label: 'Workflows', icon: Workflow, href: '/erp/workflows' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/erp/analytics' },
  { id: 'ai-insights', label: 'AI Insights', icon: Brain, href: '/erp/ai-insights' },
];

const QUICK_ACTIONS: NavItem[] = [
  { id: 'approvals', label: 'Approvals', icon: CheckSquare, href: '/erp/approvals' },
  { id: 'audit-log', label: 'Audit Log', icon: Shield, href: '/erp/audit' },
  { id: 'reports', label: 'Reports', icon: FileText, href: '/erp/reports' },
];

export default function ERPLayout({ children }: ERPLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { enabledModules, loading: modulesLoading } = useERPModules(user?.role);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [notifications, setNotifications] = useState(0);

  // Load pending approvals count
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const pending = await approvalWorkflow.getMyPendingApprovals();
        setPendingApprovals(pending.length);
      } catch (error) {
        console.error('Failed to load pending approvals:', error);
      }
    };

    loadPendingCount();
    // Refresh every 5 minutes
    const interval = setInterval(loadPendingCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-expand active section
  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.href))) {
        setExpandedItems((prev) => new Set(prev).add(item.id));
      }
    });
  }, [pathname]);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isModuleEnabled = (moduleId: string): boolean => {
    const moduleMap: Record<string, string> = {
      accounting: 'accounting',
      crm: 'crm',
      hr: 'hr',
      inventory: 'inventory',
      projects: 'projects',
      documents: 'documents',
      workflows: 'workflows',
      analytics: 'analytics',
      'ai-insights': 'ai-insights',
    };

    const mappedId = moduleMap[moduleId];
    if (!mappedId) return true; // Always show dashboard and quick actions

    return enabledModules.includes(mappedId as typeof enabledModules[number]);
  };

  const filteredNavItems = NAV_ITEMS.filter((item) => isModuleEnabled(item.id));

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 64 : 280 }}
          className="border-r bg-card flex flex-col"
        >
          {/* Logo/Brand */}
          <div className="h-16 flex items-center justify-between px-4 border-b">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Building2 className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">ERP System</span>
              </motion.div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(collapsed && 'mx-auto')}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Search */}
          {!collapsed && (
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1 px-2">
            <nav className="space-y-1 py-2">
              {filteredNavItems.map((item) => (
                <div key={item.id}>
                  {item.children ? (
                    <>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                                pathname === item.href || pathname.startsWith(item.href + '/')
                                  ? 'bg-primary text-primary-foreground'
                                  : 'hover:bg-muted'
                              )}
                            >
                              <item.icon className="h-5 w-5 shrink-0" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleExpanded(item.id)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                              pathname.startsWith(item.href)
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-muted'
                            )}
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                            <ChevronRight
                              className={cn(
                                'h-4 w-4 transition-transform',
                                expandedItems.has(item.id) && 'rotate-90'
                              )}
                            />
                          </button>
                          <AnimatePresence>
                            {expandedItems.has(item.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-4 pl-4 border-l space-y-1 mt-1">
                                  {item.children.map((child) => (
                                    <Link
                                      key={child.id}
                                      href={child.href}
                                      className={cn(
                                        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                                        pathname === child.href
                                          ? 'bg-primary text-primary-foreground'
                                          : 'hover:bg-muted text-muted-foreground'
                                      )}
                                    >
                                      <child.icon className="h-4 w-4 shrink-0" />
                                      <span>{child.label}</span>
                                    </Link>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </>
                  ) : (
                    collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              'flex items-center justify-center gap-3 px-3 py-2 rounded-md transition-colors',
                              pathname === item.href
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            )}
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {item.badge && item.badge > 0 && (
                              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                                {item.badge}
                              </Badge>
                            )}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                          pathname === item.href
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <Badge variant="destructive" className="ml-auto">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    )
                  )}
                </div>
              ))}
            </nav>

            {/* Quick Actions */}
            {!collapsed && (
              <>
                <Separator className="my-4" />
                <div className="px-3 mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Quick Actions
                  </p>
                </div>
                <nav className="space-y-1">
                  {QUICK_ACTIONS.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                        pathname === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.id === 'approvals' && pendingApprovals > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {pendingApprovals}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </nav>
              </>
            )}
          </ScrollArea>

          {/* User Section */}
          <div className="border-t p-4">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-full">
                    <User className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {user?.name || user?.email}
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </motion.aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className="h-16 border-b bg-card flex items-center justify-between px-6">
            <div>
              <h1 className="text-lg font-semibold">
                {NAV_ITEMS.find((item) => pathname.startsWith(item.href) && item.href !== '/erp')?.label ||
                  'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
