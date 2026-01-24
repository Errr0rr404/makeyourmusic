'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, FileText, Users, Package, DollarSign, Briefcase, TrendingUp, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  type: 'lead' | 'opportunity' | 'project' | 'invoice' | 'purchase-order' | 'employee' | 'customer' | 'product';
  title: string;
  subtitle?: string;
  url: string;
  icon: React.ComponentType<any>;
}

export default function GlobalSearch({ open, setOpen }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const searchModules: SearchResult[] = [
    { id: 'crm', type: 'lead', title: 'CRM - Leads', subtitle: 'Manage customer leads', url: '/erp/crm/leads', icon: Users },
    { id: 'opportunities', type: 'opportunity', title: 'CRM - Opportunities', subtitle: 'Sales opportunities', url: '/erp/crm/opportunities', icon: TrendingUp },
    { id: 'projects', type: 'project', title: 'Projects', subtitle: 'Project management', url: '/erp/projects', icon: Briefcase },
    { id: 'invoices', type: 'invoice', title: 'Accounting - Invoices', subtitle: 'Financial invoices', url: '/erp/accounting/invoices', icon: FileText },
    { id: 'purchase-orders', type: 'purchase-order', title: 'Purchase Orders', subtitle: 'Supply chain management', url: '/erp/inventory/purchase-orders', icon: Package },
    { id: 'employees', type: 'employee', title: 'HR - Employees', subtitle: 'Employee management', url: '/erp/hr/employees', icon: Users },
    { id: 'payroll', type: 'employee', title: 'HR - Payroll', subtitle: 'Payroll management', url: '/erp/payroll', icon: DollarSign },
    { id: 'calendar', type: 'employee', title: 'Calendar', subtitle: 'Schedule and events', url: '/erp/calendar', icon: Calendar },
  ];

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);

    // Filter modules based on query
    const filtered = searchModules.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Simulate async search - in a real app, you'd fetch from API
    setTimeout(() => {
      setResults(filtered);
      setLoading(false);
    }, 200);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, handleSearch]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.url);
    setOpen(false);
    setQuery('');
  };

  const handleClose = () => {
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, setOpen]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-lg font-semibold">Search ERP Modules</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search modules, leads, projects, invoices..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto border-t">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 hover:bg-accent transition-colors text-left",
                    "focus:bg-accent focus:outline-none"
                  )}
                >
                  <div className="mt-0.5 rounded-md bg-primary/10 p-2">
                    <result.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query ? (
            <div className="p-8 text-center">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching for modules, leads, or projects</p>
            </div>
          ) : (
            <div className="p-4">
              <p className="text-xs text-muted-foreground mb-3 px-2">Quick Access</p>
              <div className="space-y-1">
                {searchModules.slice(0, 5).map((module) => (
                  <button
                    key={module.id}
                    onClick={() => handleSelect(module)}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent transition-colors text-left",
                      "focus:bg-accent focus:outline-none"
                    )}
                  >
                    <div className="rounded-md bg-primary/10 p-1.5">
                      <module.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{module.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2 bg-muted/50">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-background border rounded">⌘ K</kbd> to toggle search
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
