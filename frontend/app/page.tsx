'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { LayoutDashboard, TrendingUp, Users, DollarSign, Package, BarChart3, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimatedBackground from '@/components/AnimatedBackground';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/erp');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-background via-background to-muted overflow-hidden">
      <AnimatedBackground />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 sm:py-24 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm text-primary text-sm font-medium mb-8"
          >
            <CheckCircle className="h-4 w-4" />
            Kairux - Business in Flow
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 drop-shadow-sm"
          >
            Where Business Connects
            <span className="block text-primary mt-2">and Flows Seamlessly</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 drop-shadow-sm"
          >
            AI-powered Cloud ERP that brings harmony to your operations. From CRM to Accounting,
            HR to Inventory - everything flows together effortlessly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/login">
                <LayoutDashboard className="mr-2 h-5 w-5" />
                Access Dashboard
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8">
              <Link href="/about">About Us</Link>
            </Button>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-16"
          >
            <FeatureCard
              icon={TrendingUp}
              title="CRM & Sales"
              description="Manage leads, opportunities, and customer relationships"
            />
            <FeatureCard
              icon={DollarSign}
              title="Accounting"
              description="Complete financial management and reporting"
            />
            <FeatureCard
              icon={Users}
              title="Human Resources"
              description="Employee management, payroll, and attendance"
            />
            <FeatureCard
              icon={Package}
              title="Inventory"
              description="Track products, purchase orders, and suppliers"
            />
            <FeatureCard
              icon={BarChart3}
              title="Analytics"
              description="Real-time insights and business intelligence"
            />
            <FeatureCard
              icon={LayoutDashboard}
              title="Project Management"
              description="Track projects, tasks, and team productivity"
            />
          </motion.div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="border-t bg-muted/50 backdrop-blur-sm relative z-10">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <StatCard number="100%" title="Integrated" />
            <StatCard number="24/7" title="Access" />
            <StatCard number="Real-time" title="Data" />
            <StatCard number="Secure" title="Platform" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border bg-card/80 backdrop-blur-sm hover:shadow-lg transition-shadow relative z-10">
      <div className="rounded-full w-12 h-12 bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StatCard({ number, title }: { number: string; title: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-primary mb-1">{number}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </div>
  );
}
