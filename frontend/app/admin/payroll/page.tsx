'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  FileText,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface OverviewData {
  totalEmployees: number;
  totalPayrolls: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalHours: number;
  totalOvertimeHours: number;
  byStatus: Record<string, number>;
  recentPayrolls: Array<{
    id: string;
    employee: {
      name: string;
      employeeId: string;
    };
    payPeriod: string;
    netPay: number;
    status: string;
    createdAt: string;
  }>;
}

export default function AdminPayrollOverviewPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/reports/admin/overview');
      setOverview(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load overview');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!overview) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-3xl font-bold">Payroll Overview</h1>
          <p className="text-muted-foreground mt-1">
            Overview of payroll activity and statistics
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">Active employees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payrolls</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalPayrolls}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gross Pay</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(overview.totalGrossPay)}
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Net Pay</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(overview.totalNetPay)}
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Hours Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Hours Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Hours</span>
                <span className="font-semibold">{overview.totalHours.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overtime Hours</span>
                <span className="font-semibold text-orange-600">
                  {overview.totalOvertimeHours.toFixed(1)}h
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Regular Hours</span>
                <span className="font-semibold">
                  {(overview.totalHours - overview.totalOvertimeHours).toFixed(1)}h
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payroll Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(overview.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{status}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Payrolls */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payroll Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.recentPayrolls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent payrolls
              </div>
            ) : (
              <div className="space-y-4">
                {overview.recentPayrolls.map((payroll) => (
                  <div
                    key={payroll.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{payroll.employee.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {payroll.payPeriod} • {formatDate(payroll.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          {formatCurrency(payroll.netPay)}
                        </div>
                        <div className="text-xs text-muted-foreground">{payroll.status}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
