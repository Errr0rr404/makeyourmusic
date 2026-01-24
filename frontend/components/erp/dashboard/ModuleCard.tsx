'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideProps } from 'lucide-react';

export const ModuleCard = ({ href, icon: Icon, title, description, badge }: { href: string, icon: React.ComponentType<LucideProps>, title: string, description: string, badge?: number }) => (
  <motion.div whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}>
    <Link href={href} aria-label={`Access ${title}`}>
      <Card className="h-full group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            {badge !== undefined && badge > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {badge}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  </motion.div>
);