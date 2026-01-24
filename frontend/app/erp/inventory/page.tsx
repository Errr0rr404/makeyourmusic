'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import api from '@/lib/api';
import { Product } from '@prisma/client';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { ProductFormDialog } from './components/product-form-dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/erp/inventory/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateClick = () => {
    setSelectedProduct(null);
    setFormModalOpen(true);
  };

  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setFormModalOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setSelectedProduct(product);
    setConfirmDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;
    try {
      await api.delete(`/erp/inventory/products/${selectedProduct.id}`);
      setProducts(products.filter((p) => p.id !== selectedProduct.id));
      setConfirmDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleSuccess = (updatedProduct: Product) => {
    if (selectedProduct) {
      setProducts(products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    } else {
      setProducts([updatedProduct, ...products]);
    }
    setSelectedProduct(null);
  };

  const columns = useMemo(() => getColumns({ onEdit: handleEditClick, onDelete: handleDeleteClick }), [products]);

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <Button onClick={handleCreateClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>
      <DataTable columns={columns} data={products} />
      <ProductFormDialog
        isOpen={isFormModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={handleSuccess}
        product={selectedProduct}
      />
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Are you sure?"
        description={`This will permanently delete the product "${selectedProduct?.name}".`}
      />
    </div>
  );
}