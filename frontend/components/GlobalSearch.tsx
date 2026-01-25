'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { FileText, User } from 'lucide-react';
import api from '@/lib/api';

type SearchResult = {
  id: string;
  type: 'Lead' | 'Invoice';
  title: string;
  url: string;
};

interface GlobalSearchProps {
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

export function GlobalSearch({ open: externalOpen, setOpen: externalSetOpen }: GlobalSearchProps = {}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external state if provided, otherwise use internal state
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = externalSetOpen || setInternalOpen;

  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (debouncedQuery) {
      const fetchResults = async () => {
        try {
          const response = await api.get(`/search?q=${debouncedQuery}`);
          setResults(response.data);
        } catch (error) {
          console.error('Failed to fetch search results:', error);
        }
      };
      fetchResults();
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const handleSelect = (url: string) => {
    router.push(url);
    setIsOpen(false);
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <CommandInput
        placeholder="Search for anything..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading="Results">
            {results.map((result) => (
              <CommandItem
                key={result.id}
                onSelect={() => handleSelect(result.url)}
                value={result.title}
              >
                {result.type === 'Lead' ? <User className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
                <span>{result.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export default GlobalSearch;

