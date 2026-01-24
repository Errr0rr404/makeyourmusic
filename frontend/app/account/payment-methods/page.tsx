'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, CreditCard, ArrowLeft } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface SavedPaymentMethod {
  id: string;
  paymentMethod: string;
  last4?: string | null;
  brand?: string | null;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  isDefault: boolean;
  createdAt: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  STRIPE: 'Credit/Debit Card',
  PAYPAL: 'PayPal',
  APPLE_PAY: 'Apple Pay',
  GOOGLE_PAY: 'Google Pay',
  AMAZON_PAY: 'Amazon Pay',
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  ROCKET: 'Rocket',
  BITCOIN: 'Bitcoin',
  ETHEREUM: 'Ethereum',
};

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchPaymentMethods();
  }, [isAuthenticated, router]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await api.get('/payment-methods');
      if (response.data?.paymentMethods) {
        setPaymentMethods(response.data.paymentMethods);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/login');
      } else {
        toast.error('Failed to load payment methods');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.put(`/payment-methods/${id}`, { isDefault: true });
      toast.success('Default payment method updated');
      fetchPaymentMethods();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update payment method');
    }
  };

  const handleDelete = async () => {
    if (!methodToDelete) return;
    try {
      await api.delete(`/payment-methods/${methodToDelete}`);
      toast.success('Payment method deleted');
      fetchPaymentMethods();
      setMethodToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete payment method');
    }
  };

  const openDeleteDialog = (id: string) => {
    setMethodToDelete(id);
    setDeleteDialogOpen(true);
  };

  const formatPaymentMethod = (method: SavedPaymentMethod) => {
    const label = PAYMENT_METHOD_LABELS[method.paymentMethod] || method.paymentMethod;
    if (method.last4) {
      return `${label} •••• ${method.last4}`;
    }
    return label;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Link href="/account">
                <Button variant="outline" size="sm" className="self-start min-h-[48px]">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Account
                </Button>
              </Link>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold flex items-center gap-2">
                <CreditCard className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                Payment Methods
              </h1>
            </div>
          </div>

          <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 <strong>Tip:</strong> Payment methods are automatically saved when you complete a checkout. 
                You can also save them during checkout by checking the "Save for future use" option.
              </p>
            </CardContent>
          </Card>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="h-32 animate-pulse" />
              ))}
            </div>
          ) : paymentMethods.length === 0 ? (
            <Card className="p-12 text-center">
              <CardContent>
                <CreditCard className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">No saved payment methods</h2>
                <p className="text-muted-foreground mb-6">
                  Payment methods will be saved automatically when you complete a checkout, 
                  or you can save them during checkout by checking the "Save for future use" option.
                </p>
                <Link href="/products">
                  <Button className="min-h-[48px]">
                    Start Shopping
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method, index) => (
                <motion.div
                  key={method.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-semibold">{formatPaymentMethod(method)}</h3>
                            {method.isDefault && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          {method.brand && (
                            <p className="text-sm text-muted-foreground capitalize">{method.brand}</p>
                          )}
                          {method.expiryMonth && method.expiryYear && (
                            <p className="text-sm text-muted-foreground">
                              Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Added {new Date(method.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!method.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(method.id)}
                              className="min-h-[44px]"
                            >
                              Set Default
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(method.id)}
                            className="min-h-[44px] min-w-[44px]"
                            aria-label={`Delete payment method ${formatPaymentMethod(method)}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Delete Payment Method Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Payment Method"
        description="Are you sure you want to delete this payment method? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
