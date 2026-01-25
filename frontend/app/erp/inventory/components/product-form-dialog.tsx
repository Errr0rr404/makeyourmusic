'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Product } from '@/generated/prisma';
import api from '@/lib/api';

interface ProductFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  product?: Product | null;
}

export function ProductFormDialog({
  isOpen,
  onClose,
  onSuccess,
  product,
}: ProductFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setSku(product.sku);
      setPrice(Number(product.price));
      setStock(product.stock);
    } else {
      setName('');
      setDescription('');
      setSku('');
      setPrice(0);
      setStock(0);
    }
  }, [product]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name) newErrors.name = 'Name is required';
    if (!sku) newErrors.sku = 'SKU is required';
    if (price <= 0) newErrors.price = 'Price must be positive';
    if (stock < 0) newErrors.stock = 'Stock cannot be negative';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const productData = { name, description, sku, price, stock };

    try {
      let response;
      if (product) {
        response = await api.put(`/erp/inventory/products/${product.id}`, productData);
      } else {
        response = await api.post('/erp/inventory/products', productData);
      }
      onSuccess(response.data);
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Create a New Product'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Form fields... */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
            {errors.name && <p className="col-span-4 text-red-500 text-xs">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sku" className="text-right">SKU</Label>
            <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} className="col-span-3" />
            {errors.sku && <p className="col-span-4 text-red-500 text-xs">{errors.sku}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">Price</Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="col-span-3" />
            {errors.price && <p className="col-span-4 text-red-500 text-xs">{errors.price}</p>}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="stock" className="text-right">Stock</Label>
            <Input id="stock" type="number" value={stock} onChange={(e) => setStock(Number(e.target.value))} className="col-span-3" />
            {errors.stock && <p className="col-span-4 text-red-500 text-xs">{errors.stock}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button onClick={handleSubmit}>{product ? 'Save Changes' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}