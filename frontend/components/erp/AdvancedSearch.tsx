'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Filter, Download } from 'lucide-react';

interface SearchField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'daterange';
  options?: Array<{ value: string; label: string }>;
}

type Filters = Record<string, string | number | undefined>;

interface AdvancedSearchProps {
  fields: SearchField[];
  onSearch: (filters: Filters) => void;
  onExport?: () => void;
  onReset?: () => void;
}

export default function AdvancedSearch({ fields, onSearch, onExport, onReset }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<Filters>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFieldChange = (fieldName: string, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSearch = () => {
    // Remove empty filters
    const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Filters);

    onSearch(activeFilters);
  };

  const handleReset = () => {
    setFilters({});
    if (onReset) {
      onReset();
    }
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '' && v !== null && v !== undefined);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Search
          </CardTitle>
          <div className="flex items-center gap-2">
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.type === 'text' && (
                  <Input
                    id={field.name}
                    type="text"
                    value={filters[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={`Search ${field.label.toLowerCase()}...`}
                  />
                )}
                {field.type === 'number' && (
                  <Input
                    id={field.name}
                    type="number"
                    value={filters[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                  />
                )}
                {field.type === 'date' && (
                  <Input
                    id={field.name}
                    type="date"
                    value={filters[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  />
                )}
                {field.type === 'select' && field.options && (
                  <Select
                    value={String(filters[field.name] || '')}
                    onValueChange={(value) => handleFieldChange(field.name, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All</SelectItem>
                      {field.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {field.type === 'daterange' && (
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={filters[`${field.name}_from`] || ''}
                      onChange={(e) => handleFieldChange(`${field.name}_from`, e.target.value)}
                      placeholder="From"
                    />
                    <Input
                      type="date"
                      value={filters[`${field.name}_to`] || ''}
                      onChange={(e) => handleFieldChange(`${field.name}_to`, e.target.value)}
                      placeholder="To"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {hasActiveFilters && (
                <span>
                  {Object.keys(filters).filter(k => filters[k]).length} active filter(s)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} disabled={!hasActiveFilters}>
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
