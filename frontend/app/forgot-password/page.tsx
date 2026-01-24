'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, Brain } from 'lucide-react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Password reset link sent to your email.');
      setIsSubmitted(true);
    } catch (err: unknown) {
      const errorMessage = 'Failed to send password reset link. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Forgot password error:', err);
    } finally {
      setIsLoading(false);
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
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold">Forgot Password</CardTitle>
                <CardDescription>
                  {isSubmitted 
                    ? "Check your inbox for a password reset link."
                    : "Enter your email to receive a password reset link."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-6">
                      If you don't see the email, please check your spam folder.
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
                      <FormField id="email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" icon={Mail} error={!!error} />
                    </div>
                    <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading} size="lg">
                      {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                  </form>
                )}
                {!isSubmitted && (
                  <div className="mt-6 text-center text-sm">
                    <Link href="/login" className="text-primary hover:underline flex items-center justify-center">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Login
                    </Link>
                  </div>
                )}
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
