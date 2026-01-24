'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Lead, LeadStatus } from '@prisma/client';
import { MoreHorizontal, ArrowUpDown, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const statusVariantMap: { [key in LeadStatus]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  NEW: 'default',
  CONTACTED: 'secondary',
  QUALIFIED: 'outline',
  CLOSED_WON: 'default',
  CLOSED_LOST: 'destructive',
};

type ActionHandlers = {
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
};

export const getColumns = ({ onEdit, onDelete, onConvert }: ActionHandlers): ColumnDef<Lead>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
  },
  {
    accessorKey: 'source',
    header: 'Source',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as LeadStatus;
      return <Badge variant={statusVariantMap[status]}>{status.replace('_', ' ')}</Badge>;
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    cell: ({ row }) => new Date(row.getValue('createdAt')).toLocaleDateString(),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const lead = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(lead)}>
              Edit
            </DropdownMenuItem>
            {lead.status !== 'CLOSED_WON' && (
              <DropdownMenuItem onClick={() => onConvert(lead)}>
                <ChevronsRight className="mr-2 h-4 w-4" />
                Convert to Customer
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => onDelete(lead)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];