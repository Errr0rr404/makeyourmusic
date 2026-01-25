// Real-time Business Analytics Dashboard
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Users,
  ShoppingCart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LucideProps } from 'lucide-react';

interface LiveMetric {
  label: string;
  value: string | number;
  change: number;
  changeLabel: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<LucideProps>;
  color: string;
}

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

interface Event {
  id: number;
  icon: string;
  text: string;
  color: string;
  time: Date;
}

export function LiveAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<LiveMetric[]>([]);
  const [revenueData, setRevenueData] = useState<ChartDataPoint[]>([]);
  const [activityData, setActivityData] = useState<ChartDataPoint[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Simulate real-time data updates
  useEffect(() => {
    const updateData = () => {
      // Live metrics
      setMetrics([
        {
          label: 'Revenue Today',
          value: `$${(Math.random() * 50000 + 30000).toFixed(0)}`,
          change: Math.random() * 20 - 5,
          changeLabel: 'vs yesterday',
          trend: Math.random() > 0.5 ? 'up' : 'down',
          icon: DollarSign,
          color: 'text-green-500',
        },
        {
          label: 'Active Users',
          value: Math.floor(Math.random() * 500 + 1200),
          change: Math.random() * 15 - 3,
          changeLabel: 'vs last hour',
          trend: 'up',
          icon: Users,
          color: 'text-blue-500',
        },
        {
          label: 'Orders',
          value: Math.floor(Math.random() * 50 + 120),
          change: Math.random() * 25 - 10,
          changeLabel: 'vs last hour',
          trend: Math.random() > 0.3 ? 'up' : 'down',
          icon: ShoppingCart,
          color: 'text-purple-500',
        },
        {
          label: 'System Load',
          value: `${(Math.random() * 30 + 50).toFixed(1)}%`,
          change: Math.random() * 10 - 5,
          changeLabel: 'CPU usage',
          trend: 'neutral',
          icon: Activity,
          color: 'text-orange-500',
        },
      ]);

      // Revenue trend data (last 24 hours)
      const hours = Array.from({ length: 24 }, (_, i) => {
        const hour = (new Date().getHours() - 23 + i + 24) % 24;
        const revenue = Math.floor(Math.random() * 5000 + 2000);
        return {
          name: `${hour}:00`,
          value: revenue,
          revenue,
          orders: Math.floor(Math.random() * 50 + 20),
        };
      });
      setRevenueData(hours);

      // Activity data (last 7 days)
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const activity = days.map(day => {
        const users = Math.floor(Math.random() * 2000 + 1000);
        return {
          name: day,
          value: users,
          users,
          sessions: Math.floor(Math.random() * 5000 + 2000),
          revenue: Math.floor(Math.random() * 50000 + 30000),
        };
      });
      setActivityData(activity);

      setLastUpdate(new Date());
    };

    updateData();
    const interval = setInterval(updateData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Live Update Indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Live Analytics</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">
            Live • Updated {formatTime(lastUpdate)}
          </span>
        </div>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <LiveMetricCard key={i} metric={metric} delay={i * 0.1} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue Trend (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Events Stream */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Real-time Events</CardTitle>
        </CardHeader>
        <CardContent>
          <EventsStream />
        </CardContent>
      </Card>
    </div>
  );
}

function LiveMetricCard({ metric, delay }: { metric: LiveMetric; delay: number }) {
  const Icon = metric.icon;
  const isPositive = metric.trend === 'up';
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-lg bg-muted ${metric.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <Badge variant={isPositive ? 'default' : 'destructive'} className="text-xs">
              <TrendIcon className="h-3 w-3 mr-1" />
              {Math.abs(metric.change).toFixed(1)}%
            </Badge>
          </div>
          <p className="text-2xl font-bold mb-1">{metric.value}</p>
          <p className="text-xs text-muted-foreground">{metric.label}</p>
          <p className="text-xs text-muted-foreground mt-1">{metric.changeLabel}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EventsStream() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const eventTypes = [
      { icon: '💰', text: 'New order received', color: 'text-green-600' },
      { icon: '👤', text: 'New user registered', color: 'text-blue-600' },
      { icon: '📦', text: 'Product shipped', color: 'text-purple-600' },
      { icon: '💳', text: 'Payment processed', color: 'text-green-600' },
      { icon: '📧', text: 'Email campaign sent', color: 'text-orange-600' },
    ];

    const addEvent = () => {
      const event = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      if (event) {
        const newEvent: Event = {
          id: Date.now(),
          ...event,
          time: new Date(),
        };
        setEvents(prev => [newEvent, ...prev].slice(0, 5));
      }
    };

    const interval = setInterval(addEvent, 3000);
    addEvent(); // Initial event

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <span className="text-xl">{event.icon}</span>
          <div className="flex-1">
            <p className={`text-sm font-medium ${event.color}`}>{event.text}</p>
            <p className="text-xs text-muted-foreground">{formatTime(event.time)}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return date.toLocaleTimeString();
}
