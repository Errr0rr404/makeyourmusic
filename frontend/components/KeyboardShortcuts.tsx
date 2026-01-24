'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Keyboard shortcuts component
 * Handles common keyboard shortcuts for better UX
 */
export default function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable]')
      ) {
        return;
      }

      // Modifier keys
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      // Navigation shortcuts
      if (isCtrlOrCmd) {
        switch (e.key.toLowerCase()) {
          case 'k':
            // Cmd/Ctrl + K: Open search
            e.preventDefault();
            const searchButton = document.querySelector('[aria-label*="search" i], [aria-label*="Search" i]') as HTMLElement;
            if (searchButton) {
              searchButton.click();
            }
            break;
          case 'h':
            // Cmd/Ctrl + H: Go to home
            e.preventDefault();
            router.push('/');
            break;
        }
      }

      // Slash for search (when not typing)
      if (e.key === '/' && !isCtrlOrCmd && !isAlt) {
        e.preventDefault();
        const searchButton = document.querySelector('[aria-label*="search" i], [aria-label*="Search" i]') as HTMLElement;
        if (searchButton) {
          searchButton.click();
          // Focus the search input if it exists
          setTimeout(() => {
            const searchInput = document.querySelector('input[type="search"], #search-autocomplete') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
            }
          }, 100);
        }
      }

      // Escape to close modals/dialogs
      if (e.key === 'Escape') {
        // Close any open dialogs/menus
        const closeButtons = document.querySelectorAll('[aria-label*="close" i], [aria-label*="Close" i]');
        if (closeButtons.length > 0) {
          const lastCloseButton = closeButtons[closeButtons.length - 1] as HTMLElement;
          lastCloseButton.click();
        }
      }

      // Alt + P: Go to products
      if (isAlt && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        router.push('/products');
      }

      // Alt + C: Go to cart
      if (isAlt && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        router.push('/cart');
      }

      // Alt + A: Go to account
      if (isAlt && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        router.push('/account');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);

  // Show keyboard shortcuts help (optional - can be toggled)
  return null;
}
