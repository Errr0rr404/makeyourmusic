'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  User,
  Activity,
  Shield,
  AlertTriangle,
  Info,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import type { DateRange } from 'react-day-picker';
import {
  fetchAuditLogs,
  fetchAuditStats,
  exportAuditLogs,
  type AuditLogEntry,
  type AuditLogFilter,
  type AuditLogStats,
  type AuditAction,
  type AuditModule,
  type AuditSeverity,
} from '@/lib/erp/auditLog';
import toast from 'react-hot-toast';

interface AuditLogViewerProps {
  defaultFilter?: AuditLogFilter;
  showStats?: boolean;
  compact?: boolean;
}

const ACTIONS: AuditAction[] = [
  'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
  'EXPORT', 'IMPORT', 'APPROVE', 'REJECT', 'SUBMIT', 'CANCEL',
  'ARCHIVE', 'RESTORE', 'PERMISSION_CHANGE', 'CONFIG_CHANGE',
];

const MODULES: AuditModule[] = [
  'ACCOUNTING', 'CRM', 'HR', 'INVENTORY', 'PROJECTS',
  'WORKFLOWS', 'DOCUMENTS', 'ANALYTICS', 'SYSTEM', 'AUTH',
];

const SEVERITIES: AuditSeverity[] = ['INFO', 'WARNING', 'CRITICAL'];

export default function AuditLogViewer({
  defaultFilter = {},
  showStats = true,
  compact = false,
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = compact ? 10 : 25;

  const [filter, setFilter] = useState<AuditLogFilter>({
    ...defaultFilter,
    startDate: defaultFilter.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: defaultFilter.endDate || new Date(),
  });

  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsResult, statsResult] = await Promise.all([
        fetchAuditLogs(filter, page, pageSize),
        showStats ? fetchAuditStats(filter.startDate, filter.endDate) : Promise.resolve(null),
      ]);

      setLogs(logsResult.logs);
      setTotal(logsResult.total);
      setTotalPages(logsResult.totalPages);
      if (statsResult) setStats(statsResult);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filter, page, pageSize, showStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async (exportFormat: 'csv' | 'json' | 'pdf') => {
    setExporting(true);
    try {
      const blob = await exportAuditLogs(filter, exportFormat);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  };

  const getSeverityColor = (severity: AuditSeverity) => {
    const colors: Record<AuditSeverity, string> = {
      INFO: 'bg-blue-100 text-blue-700',
      WARNING: 'bg-yellow-100 text-yellow-700',
      CRITICAL: 'bg-red-100 text-red-700',
    };
    return colors[severity];
  };

  const getSeverityIcon = (severity: AuditSeverity) => {
    switch (severity) {
      case 'INFO':
        return <Info className="h-4 w-4" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4" />;
      case 'CRITICAL':
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">{/* Stats Cards */}
      {showStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Actions</p>
                  <p className="text-2xl font-bold">{stats.totalActions.toLocaleString()}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical Events</p>
                  <p className="text-2xl font-bold text-red-600">{stats.criticalEvents}</p>
                </div>
                <Shield className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed Actions</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.failedActions}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{stats.topUsers.length}</p>
                </div>
                <User className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Audit Log</CardTitle>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" disabled={exporting}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleExport('csv')}
                    >
                      Export as CSV
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleExport('json')}
                    >
                      Export as JSON
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleExport('pdf')}
                    >
                      Export as PDF
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Bar */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={filter.searchTerm || ''}
                  onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Range */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[240px] justify-start">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {filter.startDate && filter.endDate ? (
                    <>
                      {format(filter.startDate, 'MMM d')} - {format(filter.endDate, 'MMM d, yyyy')}
                    </>
                  ) : (
                    'Select date range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: filter.startDate,
                    to: filter.endDate,
                  }}
                  onSelect={(range: DateRange | undefined) => {
                    setFilter({
                      ...filter,
                      startDate: range?.from,
                      endDate: range?.to,
                    });
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Action Filter */}
            <Select
              value={filter.action?.join(',') || 'all'}
              onValueChange={(v) =>
                setFilter({
                  ...filter,
                  action: v === 'all' ? undefined : (v.split(',') as AuditAction[]),
                })
              }
            >
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {ACTIONS.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Module Filter */}
            <Select
              value={filter.module?.join(',') || 'all'}
              onValueChange={(v) =>
                setFilter({
                  ...filter,
                  module: v === 'all' ? undefined : (v.split(',') as AuditModule[]),
                })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {MODULES.map((mod) => (
                  <SelectItem key={mod} value={mod}>
                    {mod}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Severity Filter */}
            <Select
              value={filter.severity?.join(',') || 'all'}
              onValueChange={(v) =>
                setFilter({
                  ...filter,
                  severity: v === 'all' ? undefined : (v.split(',') as AuditSeverity[]),
                })
              }
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                {SEVERITIES.map((sev) => (
                  <SelectItem key={sev} value={sev}>
                    {sev}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Log List */}
          <ScrollArea className={compact ? 'h-[400px]' : 'h-[600px]'}>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No audit logs found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div
                      className="p-3 flex items-center gap-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <div className={`p-2 rounded-full ${getSeverityColor(log.severity)}`}>
                        {getSeverityIcon(log.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.action}</span>
                          <Badge variant="outline">{log.module}</Badge>
                          {!log.success && (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {log.description}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{log.userName || log.userId}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}</span>
                        </div>
                      </div>
                      <div>
                        {expandedLog === log.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedLog === log.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="border-t bg-muted/30 p-4"
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Resource Type</p>
                            <p className="font-medium">{log.resourceType}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Resource ID</p>
                            <p className="font-medium font-mono text-xs">
                              {log.resourceId || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">IP Address</p>
                            <p className="font-medium">{log.ipAddress || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Session ID</p>
                            <p className="font-medium font-mono text-xs">
                              {log.sessionId?.slice(0, 16) || 'N/A'}...
                            </p>
                          </div>
                        </div>

                        {(log.previousValue && log.newValue) ? (
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-muted-foreground text-sm mb-2">Previous Value</p>
                              <pre className="bg-red-50 p-2 rounded text-xs overflow-auto max-h-32">
                                {JSON.stringify(log.previousValue, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-sm mb-2">New Value</p>
                              <pre className="bg-green-50 p-2 rounded text-xs overflow-auto max-h-32">
                                {JSON.stringify(log.newValue, null, 2)}
                              </pre>
                            </div>
                          </div>
                        ) : null}

                        {log.errorMessage && (
                          <div className="mt-4">
                            <p className="text-muted-foreground text-sm mb-2">Error Message</p>
                            <pre className="bg-red-50 text-red-700 p-2 rounded text-xs">
                              {log.errorMessage}
                            </pre>
                          </div>
                        )}

                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="mt-4">
                            <p className="text-muted-foreground text-sm mb-2">Additional Metadata</p>
                            <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
