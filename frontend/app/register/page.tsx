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
import { Mail, Lock, User, ArrowRight, Shield } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    // Validate password strength (must match backend requirements)
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      toast.error('Password must contain at least one uppercase letter');
      return;
    }
    
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      toast.error('Password must contain at least one lowercase letter');
      return;
    }
    
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      toast.error('Password must contain at least one number');
      return;
    }

    try {
      await register(email, password, name);
      toast.success('Account created successfully!');
      router.push('/erp');
    } catch (err: any) {
      setError(err || 'Registration failed');
      toast.error(err || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
            <CardDescription>
              Sign up to access the ERP platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div 
                  className="bg-destructive/10 text-destructive text-sm p-3 rounded-md"
                  role="alert"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="register-name" className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" aria-hidden="true" />
                  Full Name <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <Input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  autoComplete="name"
                  className="min-h-[48px] text-base"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="register-email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  Email <span className="text-destructive" aria-label="required">*</span>
                </label>
                <Input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="min-h-[48px] text-base"
                  aria-required="true"
                  aria-invalid={error ? 'true' : 'false'}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="register-password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Password <span className="text-destructive" aria-label="required">*</span>
                </label>
                <Input
                  id="register-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters, uppercase, lowercase, number"
                  minLength={8}
                  autoComplete="new-password"
                  className="min-h-[48px] text-base"
                  aria-required="true"
                  aria-invalid={error ? 'true' : 'false'}
                  aria-describedby="password-requirements"
                />
                <p id="password-requirements" className="text-xs text-muted-foreground">
                  Password must be at least 8 characters, contain uppercase, lowercase, and a number
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="register-confirm-password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Confirm Password <span className="text-destructive" aria-label="required">*</span>
                </label>
                <Input
                  id="register-confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  className="min-h-[48px] text-base"
                  aria-required="true"
                  aria-invalid={error && password !== confirmPassword ? 'true' : 'false'}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full min-h-[48px]" 
                disabled={isLoading} 
                size="lg"
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <span aria-live="polite" aria-atomic="true">Creating account...</span>
                    <span className="sr-only">Please wait</span>
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm space-y-3">
              <div className="flex items-center justify-center text-xs text-muted-foreground">
                <Shield className="h-3 w-3 mr-1 text-green-600" aria-hidden="true" />
                <span>Your password is encrypted and secure</span>
              </div>
              <div>
                <span className="text-muted-foreground">Already have an account? </span>
                <Link 
                  href="/login" 
                  className="text-primary hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded px-1 min-h-[44px] inline-flex items-center"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
