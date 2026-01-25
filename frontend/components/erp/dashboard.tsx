// ERP Dashboard Components
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { LucideProps } from 'lucide-react';
import {
  DollarSign,
  Users,
  Package,
  CheckSquare,
  FileBarChart,
  Briefcase,
  BarChart3,
  Settings,
  Workflow,
  Brain,
  Target,
  Shield,
  FolderTree,
  ShieldCheck,
  FileText,
  Globe,
  Zap,
} from 'lucide-react';

// Export icons
export {
  DollarSign,
  Users,
  Package,
  CheckSquare,
  FileBarChart,
  Briefcase,
  BarChart3,
  Settings,
  Workflow,
  Brain,
  Target,
  Shield,
  FolderTree,
  ShieldCheck,
  FileText,
  Globe,
  Zap,
};

export const MetricCard = ({
  title,
  value,
  icon: Icon
}: {
  title: string;
  value: string;
  icon: React.ComponentType<LucideProps>;
}) => (
  <motion.div variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }}>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  </motion.div>
);

export const ModuleCard = ({
  href,
  icon: Icon,
  title,
  description,
  badge
}: {
  href: string;
  icon: React.ComponentType<LucideProps>;
  title: string;
  description: string;
  badge?: number;
}) => (
  <motion.div whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}>
    <Link href={href} aria-label={`Access ${title}`}>
      <Card className="h-full group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            {badge !== undefined && badge > 0 && (
              <Badge variant="destructive" className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  </motion.div>
);

export const ActivityIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'ADMIN': return <ShieldCheck className="h-4 w-4 text-primary" />;
    case 'USER': return <Users className="h-4 w-4 text-primary" />;
    default: return <FileText className="h-4 w-4 text-primary" />;
  }
};
