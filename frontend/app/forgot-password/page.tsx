'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await api.post('/password-reset/request', { email });
      setSent(true);
      toast.success('If an account exists with this email, a password reset link has been sent');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <Mail className="h-16 w-16 mx-auto mb-4 text-green-500" aria-hidden="true" />
              <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
              <p className="text-muted-foreground mb-6" role="status" aria-live="polite">
                We've sent a password reset link to {email}
              </p>
              <Link href="/login">
                <Button className="min-h-[48px]">Back to Login</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" aria-hidden="true" />
              Forgot Password
            </CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <label htmlFor="reset-email" className="text-sm font-medium">
                  Email address <span className="text-destructive" aria-label="required">*</span>
                </label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="min-h-[48px] text-base"
                  aria-required="true"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full min-h-[48px]" 
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <span aria-live="polite" aria-atomic="true">Sending...</span>
                    <span className="sr-only">Please wait</span>
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="min-h-[44px]">
                  <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
