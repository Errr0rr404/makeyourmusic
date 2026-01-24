'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Download,
  Play,
  Clock,
  Star,
  Folder,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { hasERPAccess } from '@/lib/erp/permissions';
import { REPORT_TEMPLATES, type ReportDefinition, type ReportType } from '@/lib/erp/reportBuilder';
import Link from 'next/link';

const REPORT_CATEGORIES: { type: ReportType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'FINANCIAL', label: 'Financial', icon: DollarSign, color: 'text-green-600 bg-green-100' },
  { type: 'SALES', label: 'Sales', icon: TrendingUp, color: 'text-blue-600 bg-blue-100' },
  { type: 'INVENTORY', label: 'Inventory', icon: Package, color: 'text-purple-600 bg-purple-100' },
  { type: 'HR', label: 'Human Resources', icon: Users, color: 'text-orange-600 bg-orange-100' },
  { type: 'PROJECT', label: 'Projects', icon: BarChart3, color: 'text-cyan-600 bg-cyan-100' },
  { type: 'CRM', label: 'CRM', icon: Users, color: 'text-pink-600 bg-pink-100' },
  { type: 'COMPLIANCE', label: 'Compliance', icon: Shield, color: 'text-red-600 bg-red-100' },
];

export default function ReportsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ReportType | 'ALL'>('ALL');
  const [savedReports, setSavedReports] = useState<Partial<ReportDefinition>[]>([]);
  const [recentReports, setRecentReports] = useState<Partial<ReportDefinition>[]>([]);
  const [favoriteReports, setFavoriteReports] = useState<Partial<ReportDefinition>[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!user?.role || !hasERPAccess(user.role)) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, user, router]);

  // Filter templates based on search and type
  const filteredTemplates = REPORT_TEMPLATES.filter((template) => {
    const matchesSearch =
      searchTerm === '' ||
      template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'ALL' || template.type === selectedType;

    return matchesSearch && matchesType;
  });

  const getTypeInfo = (type: ReportType) => {
    return REPORT_CATEGORIES.find((c) => c.type === type) || REPORT_CATEGORIES[0];
  };

  if (!user || !hasERPAccess(user.role)) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate, schedule, and export business reports
          </p>
        </div>
        <Button asChild>
          <Link href="/erp/reports/builder">
            <Plus className="h-4 w-4 mr-2" />
            Create Report
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Reports</p>
              <p className="text-2xl font-bold">{REPORT_TEMPLATES.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Star className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Favorites</p>
              <p className="text-2xl font-bold">{favoriteReports.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Run Today</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {REPORT_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const count = REPORT_TEMPLATES.filter((t) => t.type === category.type).length;
          return (
            <Card
              key={category.type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedType === category.type ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedType(selectedType === category.type ? 'ALL' : category.type)}
            >
              <CardContent className="p-4 text-center">
                <div className={`inline-flex p-2 rounded-lg ${category.color} mb-2`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">{category.label}</p>
                <p className="text-xs text-muted-foreground">{count} reports</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <Tabs defaultValue="templates" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="saved">My Reports</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template, index) => {
              const typeInfo = getTypeInfo(template.type!);
              const Icon = typeInfo.icon;
              return (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline">{template.type}</Badge>
                    </div>
                    <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>{template.columns?.length || 0} columns</span>
                      {template.visualizations && template.visualizations.length > 0 && (
                        <span className="flex items-center gap-1">
                          <PieChart className="h-3 w-3" />
                          {template.visualizations.length} charts
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1">
                        <Play className="h-4 w-4 mr-2" />
                        Run
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Star className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reports found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved">
          <Card>
            <CardContent className="py-12 text-center">
              <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No saved reports yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create a custom report or save a template with your preferences
              </p>
              <Button asChild>
                <Link href="/erp/reports/builder">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No scheduled reports</p>
              <p className="text-sm text-muted-foreground mb-4">
                Schedule reports to be automatically generated and emailed
              </p>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No report history</p>
              <p className="text-sm text-muted-foreground">
                Run a report to see it in your history
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
