'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';

interface AnalyticsData {
  totalRevenue: number;
  newLeadsThisMonth: number;
  leadConversionRate: number;
  salesByMonth: { name: string; total: number }[];
  topProducts: { name: string; quantity: number | null }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/erp/analytics/dashboard');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  if (!data) {
    return <div>Failed to load data.</div>;
  }
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Business Analytics</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{formatCurrency(data.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>New Leads (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{data.newLeadsThisMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lead Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{data.leadConversionRate.toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Sales (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="total" fill="#8884d8" name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.topProducts.map((product, index) => (
                <li key={index} className="flex justify-between">
                  <span>{product.name}</span>
                  <span className="font-semibold">{product.quantity} units</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}