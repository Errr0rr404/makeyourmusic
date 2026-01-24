'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, FileText, Receipt, BarChart3, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';
import api from '@/lib/api';

export default function AccountingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const hasAccess = ['ADMIN', 'MASTERMIND', 'CFO', 'ANALYST'].includes(user?.role || '');
    if (!hasAccess) {
      router.push('/erp');
      return;
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  const fetchStats = async () => {
    try {
      // Fetch financial reports for stats
      await api.get('/erp/accounting/reports?type=balance_sheet');
      // In a real implementation, calculate from actual data
      setStats({
        totalAssets: 100000,
        totalLiabilities: 40000,
        totalEquity: 60000,
        totalRevenue: 50000,
        totalExpenses: 30000,
        netIncome: 20000,
      });
    } catch (error) {
      console.error('Failed to fetch accounting stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <DollarSign className="h-8 w-8 text-primary" />
                Accounting & Finance
              </h1>
              <p className="text-muted-foreground mt-1">Manage your financial operations</p>
            </div>
            <Button asChild>
              <Link href="/erp">Back to ERP</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Assets</p>
              <p className="text-2xl font-bold text-green-600">${stats.totalAssets.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-600">${stats.totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Net Income</p>
              <p className="text-2xl font-bold text-purple-600">${stats.netIncome.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
            <TabsTrigger value="journal-entries">Journal Entries</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="reports">Financial Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <Link href="/erp/accounting/chart-of-accounts/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Account
                    </Link>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <Link href="/erp/accounting/journal-entries/new">
                      <FileText className="h-4 w-4 mr-2" />
                      Create Journal Entry
                    </Link>
                  </Button>
                  <Button className="w-full justify-start" variant="outline" asChild>
                    <Link href="/erp/accounting/invoices/new">
                      <Receipt className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="chart-of-accounts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Chart of Accounts</CardTitle>
                  <Button asChild>
                    <Link href="/erp/accounting/chart-of-accounts/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Account
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Chart of accounts will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="journal-entries">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Journal Entries</CardTitle>
                  <Button asChild>
                    <Link href="/erp/accounting/journal-entries/new">
                      <Plus className="h-4 w-4 mr-2" />
                      New Entry
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Journal entries will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Invoices</CardTitle>
                  <Button asChild>
                    <Link href="/erp/accounting/invoices/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Invoice
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Invoices will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
                <CardDescription>Generate and view financial reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Balance Sheet
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Income Statement
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Cash Flow Statement
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
