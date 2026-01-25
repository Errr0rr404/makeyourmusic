'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';
import api from '@/lib/api';

export default function AIInsightsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const hasAccess = ['ADMIN', 'MASTERMIND', 'CFO', 'SALES_MANAGER', 'ANALYST'].includes(user?.role || '');
    if (!hasAccess) {
      router.push('/erp');
      return;
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInsights();
    }
  }, [isAuthenticated]);

  const fetchInsights = async () => {
    try {
      const response = await api.get('/erp/ai/insights');
      if (response.data) {
        setInsights(response.data);
      } else {
        throw new Error('Invalid response data');
      }
    } catch (error: any) {
      console.error('Failed to fetch AI insights:', error);
      // Set default insights on error
      setInsights({
        salesForecast: { nextMonth: 0, nextQuarter: 0, trend: 'STABLE' },
        churnPrediction: { risk: 0, atRiskCustomers: 0, totalCustomers: 0 },
        topOpportunities: [],
        demandForecast: { topProducts: [], overallTrend: 'STABLE' },
        recommendations: ['Unable to load insights. Please try again later.'],
      });
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
                <Sparkles className="h-8 w-8 text-primary" />
                AI Insights
              </h1>
              <p className="text-muted-foreground mt-1">AI-powered predictions and recommendations</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/erp">Back to ERP</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {insights && (
          <div className="space-y-6">
            {/* Sales Forecast */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Sales Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Next Month</p>
                    <p className="text-2xl font-bold">${insights.salesForecast?.nextMonth?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Quarter</p>
                    <p className="text-2xl font-bold">${insights.salesForecast?.nextQuarter?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trend</p>
                    <p className="text-2xl font-bold capitalize">{insights.salesForecast?.trend || 'STABLE'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Churn Prediction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Churn Prediction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Churn Risk</p>
                    <p className="text-2xl font-bold text-red-600">{insights.churnPrediction?.risk || 0}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">At-Risk Customers</p>
                    <p className="text-2xl font-bold">{insights.churnPrediction?.atRiskCustomers || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Customers</p>
                    <p className="text-2xl font-bold">{insights.churnPrediction?.totalCustomers || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Top Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.topOpportunities && insights.topOpportunities.length > 0 ? (
                  <div className="space-y-2">
                    {insights.topOpportunities.map((opp: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="font-semibold">{opp.name}</p>
                          <p className="text-sm text-muted-foreground">{opp.stage} • {opp.probability}% probability</p>
                        </div>
                        <p className="font-bold">${opp.amount?.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No opportunities found</p>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            {insights.recommendations && insights.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insights.recommendations.map((rec: any, index: number) => (
                      <li key={index} className="flex flex-col gap-1 border-b pb-2 last:border-b-0 last:pb-0">
                        {typeof rec === 'string' ? (
                          <span className="flex items-start gap-2"><span className="text-primary">•</span><span>{rec}</span></span>
                        ) : (
                          <>
                            <span className="font-semibold text-primary">{rec.title || rec.type || 'Recommendation'}</span>
                            {rec.description && <span className="text-muted-foreground">{rec.description}</span>}
                            {rec.priority && <span className="text-xs text-yellow-600">Priority: {rec.priority}</span>}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
