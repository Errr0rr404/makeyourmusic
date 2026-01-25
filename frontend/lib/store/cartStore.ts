import { create } from 'zustand';
import api from '../api';

export interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: string;
    imageUrls: string[];
    stock: number;
  };
}

interface CartStore {
  items: CartItem[];
  total: string;
  isLoading: boolean;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  total: '0.00',
  isLoading: false,

  fetchCart: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/cart');
      // Ensure items and total are valid
      const items = Array.isArray(response.data.items) ? response.data.items : [];
      const total = response.data.total || '0.00';
      
      set({
        items,
        total: typeof total === 'string' ? total : parseFloat(total).toFixed(2),
        isLoading: false,
      });
    } catch (error: unknown) {
      // If unauthorized, clear cart
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        set({ items: [], total: '0.00', isLoading: false });
      } else {
        console.error('Failed to fetch cart:', error);
        set({ isLoading: false });
      }
    }
  },

  addToCart: async (productId: string, quantity = 1) => {
    if (!productId || typeof productId !== 'string') {
      throw new Error('Product ID is required');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Quantity must be a positive integer');
    }
    
    // Optimistic UI update - update state immediately
    const currentItems = get().items;

    try {
      await api.post('/cart', { productId, quantity });
      // Refresh cart to get accurate data from server
      await get().fetchCart();
    } catch (error: unknown) {
      // Revert optimistic update on error
      set({ items: currentItems });
      console.error('Failed to add to cart:', error);
      throw error;
    }
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('Item ID is required');
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error('Quantity must be a positive integer');
    }
    
    try {
      await api.put(`/cart/${itemId}`, { quantity });
      await get().fetchCart();
    } catch (error: unknown) {
      console.error('Failed to update cart:', error);
      throw error;
    }
  },

  removeFromCart: async (itemId: string) => {
    if (!itemId || typeof itemId !== 'string') {
      throw new Error('Item ID is required');
    }
    
    try {
      await api.delete(`/cart/${itemId}`);
      await get().fetchCart();
    } catch (error: unknown) {
      // If item not found, still refresh cart to sync state
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        await get().fetchCart();
        return;
      }
      console.error('Failed to remove from cart:', error);
      throw error;
    }
  },

  clearCart: () => {
    set({ items: [], total: '0.00' });
  },
}));
