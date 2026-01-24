'use client';

import { Users, FileText, ShieldCheck } from './icons';

export const ActivityIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'ADMIN': return <ShieldCheck className="h-4 w-4 text-primary" />;
    case 'USER': return <Users className="h-4 w-4 text-primary" />;
    default: return <FileText className="h-4 w-4 text-primary" />;
  }
};