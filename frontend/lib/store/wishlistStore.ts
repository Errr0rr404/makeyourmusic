import { create } from 'zustand';
import api from '../api';

interface WishlistStore {
  wishlist: string[]; // Product IDs
  loading: boolean;
  fetchWishlist: () => Promise<void>;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  checkWishlist: (productId: string) => Promise<void>;
}

export const useWishlistStore = create<WishlistStore>((set, get) => ({
  wishlist: [],
  loading: false,

  fetchWishlist: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/wishlist');
      if (response.data?.items) {
        set({
          wishlist: response.data.items.map((item: any) => item.product.id),
          loading: false,
        });
      }
    } catch (error) {
      set({ loading: false });
    }
  },

  addToWishlist: async (productId: string) => {
    // Optimistic UI update - update state immediately
    const currentWishlist = get().wishlist;
    if (currentWishlist.includes(productId)) {
      return; // Already in wishlist
    }
    
    // Update state immediately
    set({ wishlist: [...currentWishlist, productId] });
    
    try {
      await api.post(`/wishlist/${productId}`);
      // State already updated, no need to refresh
    } catch (error: any) {
      // Revert optimistic update on error
      set({ wishlist: currentWishlist });
      throw error;
    }
  },

  removeFromWishlist: async (productId: string) => {
    // Optimistic UI update - update state immediately
    const currentWishlist = get().wishlist;
    const updatedWishlist = currentWishlist.filter((id) => id !== productId);
    
    // Update state immediately
    set({ wishlist: updatedWishlist });
    
    try {
      await api.delete(`/wishlist/${productId}`);
      // State already updated, no need to refresh
    } catch (error: any) {
      // Revert optimistic update on error
      set({ wishlist: currentWishlist });
      throw error;
    }
  },

  isInWishlist: (productId: string) => {
    return get().wishlist.includes(productId);
  },

  checkWishlist: async (productId: string) => {
    try {
      const response = await api.get(`/wishlist/check/${productId}`);
      if (response.data?.inWishlist) {
        set((state) => {
          if (!state.wishlist.includes(productId)) {
            return { wishlist: [...state.wishlist, productId] };
          }
          return state;
        });
      } else {
        set((state) => ({
          wishlist: state.wishlist.filter((id) => id !== productId),
        }));
      }
    } catch (error) {
      // Ignore errors
    }
  },
}));
