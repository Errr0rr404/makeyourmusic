'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ArrowLeft, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';
import api from '@/lib/api';

interface ChartOfAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  accountType: string;
  category: string;
  balance: number;
  parentAccountId?: string;
  isActive: boolean;
}

export default function ChartOfAccountsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

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

    fetchAccounts();
  }, [isAuthenticated, user, router]);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/erp/accounting/chart-of-accounts');
      setAccounts(response.data.accounts || []);
    } catch (error) {
      console.error('Failed to fetch chart of accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.accountNumber.includes(searchTerm);
    const matchesType = filterType === 'ALL' || account.accountType === filterType;
    return matchesSearch && matchesType;
  });

  // Group accounts by type
  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const type = account.accountType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(account);
    return acc;
  }, {} as Record<string, ChartOfAccount[]>);

  // Calculate totals by type
  const totals = Object.keys(groupedAccounts).reduce((acc, type) => {
    acc[type] = groupedAccounts[type].reduce((sum, account) => sum + account.balance, 0);
    return acc;
  }, {} as Record<string, number>);

  const accountTypes = ['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      ASSET: 'text-green-600',
      LIABILITY: 'text-red-600',
      EQUITY: 'text-blue-600',
      REVENUE: 'text-emerald-600',
      EXPENSE: 'text-orange-600',
    };
    return colors[type] || 'text-gray-600';
  };

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      ASSET: 'bg-green-100 text-green-800',
      LIABILITY: 'bg-red-100 text-red-800',
      EQUITY: 'bg-blue-100 text-blue-800',
      REVENUE: 'bg-emerald-100 text-emerald-800',
      EXPENSE: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading Chart of Accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" asChild>
                <Link href="/erp/accounting">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  Chart of Accounts
                </h1>
                <p className="text-muted-foreground mt-1">Manage your accounting structure</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/erp/accounting">Back to Accounting</Link>
              </Button>
              <Button asChild>
                <Link href="/erp/accounting/chart-of-accounts/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Account
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((type) => (
            <Card key={type}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{type}S</p>
                    <p className={`text-2xl font-bold ${getTypeColor(type)}`}>
                      ${(totals[type] || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {groupedAccounts[type]?.length || 0} accounts
                    </p>
                  </div>
                  {type === 'ASSET' || type === 'REVENUE' ? (
                    <TrendingUp className={`h-8 w-8 ${getTypeColor(type)}`} />
                  ) : (
                    <TrendingDown className={`h-8 w-8 ${getTypeColor(type)}`} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by account name or number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {accountTypes.map((type) => (
                  <Button
                    key={type}
                    variant={filterType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Accounts List ({filteredAccounts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-3 font-semibold">Account #</th>
                    <th className="pb-3 font-semibold">Account Name</th>
                    <th className="pb-3 font-semibold">Type</th>
                    <th className="pb-3 font-semibold">Category</th>
                    <th className="pb-3 font-semibold text-right">Balance</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No accounts found. Create your first account to get started.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((account) => (
                      <tr key={account.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 font-mono">{account.accountNumber}</td>
                        <td className="py-3 font-medium">{account.accountName}</td>
                        <td className="py-3">
                          <Badge className={getTypeBadgeColor(account.accountType)}>
                            {account.accountType}
                          </Badge>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {account.category.replace(/_/g, ' ')}
                        </td>
                        <td className={`py-3 text-right font-mono ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${Math.abs(account.balance).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <Badge variant={account.isActive ? 'default' : 'secondary'}>
                            {account.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/erp/accounting/chart-of-accounts/${account.id}`}>
                                View
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/erp/accounting/chart-of-accounts/${account.id}/edit`}>
                                Edit
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
