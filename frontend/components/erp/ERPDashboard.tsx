'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Users, ShoppingCart, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardStats {
  revenue: { total: number; change: number; trend: 'up' | 'down' };
  expenses: { total: number; change: number; trend: 'up' | 'down' };
  netIncome: { total: number; change: number; trend: 'up' | 'down' };
  customers: { total: number; change: number; trend: 'up' | 'down' };
  orders: { total: number; change: number; trend: 'up' | 'down' };
  inventory: { total: number; change: number; trend: 'up' | 'down' };
}

interface ChartData {
  revenueByMonth: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
  salesByCategory: Array<{ name: string; value: number }>;
  customerGrowth: Array<{ month: string; customers: number }>;
  topProducts: Array<{ name: string; sales: number; profit: number }>;
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export default function ERPDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    revenue: { total: 0, change: 0, trend: 'up' },
    expenses: { total: 0, change: 0, trend: 'up' },
    netIncome: { total: 0, change: 0, trend: 'up' },
    customers: { total: 0, change: 0, trend: 'up' },
    orders: { total: 0, change: 0, trend: 'up' },
    inventory: { total: 0, change: 0, trend: 'up' },
  });

  const [chartData, setChartData] = useState<ChartData>({
    revenueByMonth: [],
    salesByCategory: [],
    customerGrowth: [],
    topProducts: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // In production, fetch real data from API
      // For now, using sample data to demonstrate functionality

      setStats({
        revenue: { total: 125000, change: 12.5, trend: 'up' },
        expenses: { total: 85000, change: 8.2, trend: 'up' },
        netIncome: { total: 40000, change: 22.3, trend: 'up' },
        customers: { total: 1250, change: 15.7, trend: 'up' },
        orders: { total: 342, change: -5.2, trend: 'down' },
        inventory: { total: 45000, change: 3.1, trend: 'up' },
      });

      setChartData({
        revenueByMonth: [
          { month: 'Jan', revenue: 45000, expenses: 30000, profit: 15000 },
          { month: 'Feb', revenue: 52000, expenses: 32000, profit: 20000 },
          { month: 'Mar', revenue: 48000, expenses: 31000, profit: 17000 },
          { month: 'Apr', revenue: 61000, expenses: 35000, profit: 26000 },
          { month: 'May', revenue: 55000, expenses: 33000, profit: 22000 },
          { month: 'Jun', revenue: 67000, expenses: 38000, profit: 29000 },
        ],
        salesByCategory: [
          { name: 'Electronics', value: 35000 },
          { name: 'Clothing', value: 28000 },
          { name: 'Home & Garden', value: 22000 },
          { name: 'Sports', value: 18000 },
          { name: 'Books', value: 12000 },
          { name: 'Other', value: 10000 },
        ],
        customerGrowth: [
          { month: 'Jan', customers: 1000 },
          { month: 'Feb', customers: 1050 },
          { month: 'Mar', customers: 1100 },
          { month: 'Apr', customers: 1150 },
          { month: 'May', customers: 1200 },
          { month: 'Jun', customers: 1250 },
        ],
        topProducts: [
          { name: 'Product A', sales: 15000, profit: 4500 },
          { name: 'Product B', sales: 12000, profit: 3600 },
          { name: 'Product C', sales: 10000, profit: 3000 },
          { name: 'Product D', sales: 8500, profit: 2550 },
          { name: 'Product E', sales: 7000, profit: 2100 },
        ],
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Total Revenue"
          value={stats.revenue.total}
          change={stats.revenue.change}
          trend={stats.revenue.trend}
          icon={<DollarSign className="h-6 w-6" />}
          color="green"
        />
        <KPICard
          title="Total Expenses"
          value={stats.expenses.total}
          change={stats.expenses.change}
          trend={stats.expenses.trend}
          icon={<ShoppingCart className="h-6 w-6" />}
          color="red"
        />
        <KPICard
          title="Net Income"
          value={stats.netIncome.total}
          change={stats.netIncome.change}
          trend={stats.netIncome.trend}
          icon={<TrendingUp className="h-6 w-6" />}
          color="purple"
        />
        <KPICard
          title="Total Customers"
          value={stats.customers.total}
          change={stats.customers.change}
          trend={stats.customers.trend}
          icon={<Users className="h-6 w-6" />}
          color="blue"
          isCurrency={false}
        />
        <KPICard
          title="Total Orders"
          value={stats.orders.total}
          change={stats.orders.change}
          trend={stats.orders.trend}
          icon={<Package className="h-6 w-6" />}
          color="orange"
          isCurrency={false}
        />
        <KPICard
          title="Inventory Value"
          value={stats.inventory.total}
          change={stats.inventory.change}
          trend={stats.inventory.trend}
          icon={<Package className="h-6 w-6" />}
          color="cyan"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly comparison for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Distribution of sales across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.salesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.salesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Growth</CardTitle>
            <CardDescription>Total customers over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="customers" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Sales</CardTitle>
            <CardDescription>Best performing products</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#10b981" />
                <Bar dataKey="profit" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface KPICardProps {
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  color: 'green' | 'red' | 'blue' | 'purple' | 'orange' | 'cyan';
  isCurrency?: boolean;
}

function KPICard({ title, value, change, trend, icon, color, isCurrency = true }: KPICardProps) {
  const colorClasses = {
    green: 'text-green-600 bg-green-100',
    red: 'text-red-600 bg-red-100',
    blue: 'text-blue-600 bg-blue-100',
    purple: 'text-purple-600 bg-purple-100',
    orange: 'text-orange-600 bg-orange-100',
    cyan: 'text-cyan-600 bg-cyan-100',
  };

  const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';
  const TrendIcon = trend === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-2">
              {isCurrency ? `$${value.toLocaleString()}` : value.toLocaleString()}
            </p>
            <div className={`flex items-center mt-2 text-sm ${trendColor}`}>
              <TrendIcon className="h-4 w-4 mr-1" />
              <span>{Math.abs(change)}%</span>
              <span className="ml-1 text-muted-foreground">vs last period</span>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
