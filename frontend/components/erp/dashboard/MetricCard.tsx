'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideProps } from 'lucide-react';

export const MetricCard = ({ title, value, icon: Icon }: { title: string, value: string, icon: React.ComponentType<LucideProps> }) => (
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