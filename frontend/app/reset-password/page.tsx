'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import { Lock, ArrowLeft, Brain } from 'lucide-react';
import api from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (!token) {
      setError('Invalid or missing password reset token.');
      setIsLoading(false);
      return;
    }

    try {
      await api.post('/auth/reset-password', { token, password });
      toast.success('Password has been reset successfully!');
      setIsSuccess(true);
    } catch (err: unknown) {
      const errorMessage = 'Failed to reset password. The link may be expired.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Reset password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">Reset Password</CardTitle>
        <CardDescription>
          {isSuccess ? "Your password has been changed." : "Enter your new password below."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <div className="text-center">
            <p className="text-muted-foreground mb-6">
              You can now log in with your new password.
            </p>
            <Button asChild className="w-full">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </Button>
          </div>
        ) : (
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
              <FormField id="password" type="password" value={password} onChange={setPassword} placeholder="New Password" icon={Lock} error={!!error} />
            </div>
            <div className="space-y-2">
              <FormField id="confirmPassword" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm New Password" icon={Lock} error={!!error} />
            </div>
            <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading} size="lg">
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
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
          <h1 className="text-5xl font-bold tracking-tighter">AI Cloud ERP</h1>
          <p className="text-xl text-muted-foreground mt-4">
            The intelligent, automated future of business management.
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
            <Suspense fallback={
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-bold">Loading...</CardTitle>
                </CardHeader>
                <CardContent className="h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </CardContent>
              </Card>
            }>
              <ResetPasswordForm />
            </Suspense>
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
