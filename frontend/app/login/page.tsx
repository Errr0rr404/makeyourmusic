'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/store/authStore';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight, Brain } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      await login(email, password);
      toast.success('Welcome back!');
      router.replace('/erp');
    } catch (err: unknown) {
      const errorMessage = typeof err === 'string' ? err : (err as Error)?.message || 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="hidden bg-muted lg:flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <Brain className="h-24 w-24 text-primary mx-auto mb-6" />
          <h1 className="text-5xl font-bold tracking-tighter">Kairux</h1>
          <p className="text-xl text-muted-foreground mt-4">
            Business in Flow
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Where business connects and flows seamlessly
          </p>
        </motion.div>
      </div>
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold">Welcome Back</CardTitle>
                <CardDescription>Sign in to access your dashboard.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-destructive/10 text-destructive text-sm p-3 rounded-md text-center"
                      role="alert"
                    >
                      {error}
                    </motion.div>
                  )}
                  <div className="space-y-2">
                    <FormField id="email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" icon={Mail} error={!!error} />
                  </div>
                  <div className="space-y-2">
                    <FormField id="password" type="password" value={password} onChange={setPassword} placeholder="Enter your password" icon={Lock} error={!!error} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div />
                    <Link href="/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading} size="lg">
                    {isLoading ? 'Signing in...' : 'Sign In'}
                    {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>
                </form>
                <div className="mt-6 text-center text-sm">
                  Don't have an account?{' '}
                  <Link href="/register" className="font-medium text-primary hover:underline">
                    Sign up
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const FormField = ({ id, type, value, onChange, placeholder, icon: Icon, error }: { id: string, type: string, value: string, onChange: (value: string) => void, placeholder: string, icon: React.ComponentType<any>, error: boolean }) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
    <Input
      id={id}
      type={type}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-invalid={error}
      className="pl-10 h-12 text-base"
    />
  </div>
);
