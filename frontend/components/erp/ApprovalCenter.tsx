'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Check,
  X,
  Clock,
  ChevronRight,
  User,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Forward,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { approvalWorkflow, type PendingApproval, type ApprovalRequest, type ApprovalPriority, type ApprovalType, type ApprovalStats } from '@/lib/erp/approvalWorkflow';
import toast from 'react-hot-toast';

interface ApprovalCenterProps {
  userId: string;
  userRole: string;
  onApprovalAction?: () => void;
}

export default function ApprovalCenter({ userId, userRole, onApprovalAction }: ApprovalCenterProps) {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [myRequests, setMyRequests] = useState<ApprovalRequest[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<ApprovalPriority | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<ApprovalType | 'ALL'>('ALL');
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, requests, statistics] = await Promise.all([
        approvalWorkflow.getMyPendingApprovals(),
        approvalWorkflow.getMyRequests(),
        approvalWorkflow.getStats(),
      ]);
      setPendingApprovals(pending);
      setMyRequests(requests);
      setStats(statistics);
    } catch (error) {
      console.error('Failed to fetch approval data:', error);
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (requestId: string) => {
    setProcessingAction(true);
    try {
      await approvalWorkflow.approve(requestId, actionComment, userId);
      toast.success('Request approved');
      setActionComment('');
      setSelectedApproval(null);
      await fetchData();
      onApprovalAction?.();
    } catch (error) {
      console.error('Failed to approve:', error);
      toast.error('Failed to approve request');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!actionComment.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setProcessingAction(true);
    try {
      await approvalWorkflow.reject(requestId, actionComment, userId);
      toast.success('Request rejected');
      setActionComment('');
      setSelectedApproval(null);
      await fetchData();
      onApprovalAction?.();
    } catch (error) {
      console.error('Failed to reject:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleEscalate = async (requestId: string) => {
    setProcessingAction(true);
    try {
      await approvalWorkflow.escalate(requestId, actionComment || 'Escalated for review');
      toast.success('Request escalated');
      setActionComment('');
      setSelectedApproval(null);
      await fetchData();
      onApprovalAction?.();
    } catch (error) {
      console.error('Failed to escalate:', error);
      toast.error('Failed to escalate request');
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredApprovals = pendingApprovals.filter((approval) => {
    const matchesSearch =
      searchTerm === '' ||
      approval.request.resourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.request.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = priorityFilter === 'ALL' || approval.request.priority === priorityFilter;
    const matchesType = typeFilter === 'ALL' || approval.request.type === typeFilter;

    return matchesSearch && matchesPriority && matchesType;
  });

  const getPriorityColor = (priority: ApprovalPriority) => {
    const colors: Record<ApprovalPriority, string> = {
      LOW: 'bg-gray-100 text-gray-700',
      NORMAL: 'bg-blue-100 text-blue-700',
      HIGH: 'bg-orange-100 text-orange-700',
      URGENT: 'bg-red-100 text-red-700',
    };
    return colors[priority];
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      APPROVED: 'bg-green-100 text-green-700',
      REJECTED: 'bg-red-100 text-red-700',
      ESCALATED: 'bg-purple-100 text-purple-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats?.approved || 0}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats?.rejected || 0}</p>
              </div>
              <X className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Time</p>
                <p className="text-2xl font-bold">{stats?.averageApprovalTime?.toFixed(1) || 0}h</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approvals
            {pendingApprovals.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search approvals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as ApprovalPriority | 'ALL')}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ApprovalType | 'ALL')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
                <SelectItem value="PURCHASE_ORDER">Purchase Order</SelectItem>
                <SelectItem value="INVOICE">Invoice</SelectItem>
                <SelectItem value="LEAVE_REQUEST">Leave Request</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Approval List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Approval Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <AnimatePresence>
                    {filteredApprovals.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Check className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No pending approvals</p>
                      </div>
                    ) : (
                      filteredApprovals.map((approval, index) => (
                        <motion.div
                          key={approval.request.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-4 border rounded-lg mb-3 cursor-pointer transition-colors ${
                            selectedApproval?.request.id === approval.request.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedApproval(approval)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{approval.request.resourceName}</span>
                                <Badge className={getPriorityColor(approval.request.priority)}>
                                  {approval.request.priority}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{approval.request.description}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{approval.request.requesterName}</span>
                                <span>•</span>
                                <span>{new Date(approval.request.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {approval.request.amount && (
                                <span className="font-semibold">
                                  {approval.request.currency || '$'}
                                  {approval.request.amount.toLocaleString()}
                                </span>
                              )}
                              <Badge variant="outline">
                                Step {approval.request.currentStep}/{approval.request.totalSteps}
                              </Badge>
                            </div>
                          </div>
                          {approval.delegatedFrom && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-purple-600">
                              <Forward className="h-3 w-3" />
                              <span>Delegated from {approval.delegatedFrom.userName}</span>
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Detail Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Approval Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedApproval ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedApproval.request.resourceName}</h3>
                      <p className="text-sm text-muted-foreground">{selectedApproval.request.description}</p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Requester</p>
                        <p className="font-medium">{selectedApproval.request.requesterName}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium">{selectedApproval.request.type.replace('_', ' ')}</p>
                      </div>
                      {selectedApproval.request.amount && (
                        <>
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-medium text-lg">
                              {selectedApproval.request.currency || '$'}
                              {selectedApproval.request.amount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Due Date</p>
                            <p className="font-medium">
                              {selectedApproval.request.dueDate
                                ? new Date(selectedApproval.request.dueDate).toLocaleDateString()
                                : 'N/A'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <Separator />

                    {/* Approval History */}
                    {selectedApproval.request.history.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Approval History</h4>
                        <div className="space-y-2">
                          {selectedApproval.request.history.map((entry) => (
                            <div key={entry.id} className="flex items-center gap-2 text-sm">
                              <Badge className={getStatusColor(entry.action)}>{entry.action}</Badge>
                              <span>{entry.actorName}</span>
                              <span className="text-muted-foreground">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Actions */}
                    <div className="space-y-3">
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <textarea
                          placeholder="Add a comment (required for rejection)..."
                          value={actionComment}
                          onChange={(e) => setActionComment(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border rounded-md min-h-[80px] resize-none"
                        />
                      </div>

                      <div className="flex gap-2">
                        {selectedApproval.canApprove && (
                          <Button
                            className="flex-1"
                            onClick={() => handleApprove(selectedApproval.request.id)}
                            disabled={processingAction}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        )}
                        {selectedApproval.canReject && (
                          <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={() => handleReject(selectedApproval.request.id)}
                            disabled={processingAction}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        )}
                      </div>

                      {selectedApproval.canEscalate && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleEscalate(selectedApproval.request.id)}
                          disabled={processingAction}
                        >
                          <ArrowUpRight className="h-4 w-4 mr-2" />
                          Escalate
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ChevronRight className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select an approval to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="my-requests">
          <Card>
            <CardContent className="p-6">
              <ScrollArea className="h-[500px]">
                {myRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>You haven&apos;t submitted any approval requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myRequests.map((request) => (
                      <div key={request.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{request.resourceName}</span>
                              <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{request.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Submitted: {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            {request.amount && (
                              <span className="font-semibold">
                                {request.currency || '$'}
                                {request.amount.toLocaleString()}
                              </span>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              Step {request.currentStep}/{request.totalSteps}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
