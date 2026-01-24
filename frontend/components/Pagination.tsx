'use client';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
  const [jumpPage, setJumpPage] = useState('');

  if (totalPages <= 1) return null;

  const handleJump = () => {
    const page = parseInt(jumpPage);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpPage('');
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav 
      aria-label="Pagination" 
      className={`flex flex-col sm:flex-row items-center justify-center gap-4 ${className}`}
    >
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="min-h-[44px] min-w-[44px]"
          aria-label="Go to first page"
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="min-h-[44px] min-w-[44px]"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex items-center gap-1 flex-wrap justify-center">
        {pageNumbers.map((page, index) => (
          <div key={index}>
            {page === '...' ? (
              <span className="px-4 py-2 text-muted-foreground min-h-[44px] flex items-center">
                ...
              </span>
            ) : (
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className={`min-h-[44px] min-w-[44px] ${currentPage === page ? '' : ''}`}
                  aria-label={`Go to page ${page}${currentPage === page ? ' (current page)' : ''}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </Button>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="min-h-[44px] min-w-[44px]"
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="min-h-[44px] min-w-[44px]"
          aria-label="Go to last page"
        >
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {totalPages > 10 && (
        <div className="flex items-center gap-2">
          <label htmlFor="jump-page" className="sr-only">
            Jump to page
          </label>
          <span className="text-sm text-muted-foreground hidden sm:inline">Jump to:</span>
          <Input
            id="jump-page"
            type="number"
            min="1"
            max={totalPages}
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleJump();
              }
            }}
            placeholder="Page"
            className="w-20 min-h-[44px] text-base"
            aria-label={`Enter page number between 1 and ${totalPages}`}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleJump}
            className="min-h-[44px]"
            aria-label="Jump to page"
          >
            Go
          </Button>
        </div>
      )}

      <div className="text-sm text-muted-foreground px-4 py-2 min-h-[44px] flex items-center" aria-live="polite">
        Page {currentPage} of {totalPages}
      </div>
    </nav>
  );
}
