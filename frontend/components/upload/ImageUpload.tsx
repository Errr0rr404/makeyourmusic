'use client';

import { useState, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { X, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  aspectRatio?: 'square' | 'video' | 'banner';
  label?: string;
  maxSizeMB?: number;
  className?: string;
}

const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function ImageUpload({
  value,
  onChange,
  aspectRatio = 'square',
  label = 'Upload image',
  maxSizeMB = 8,
  className = '',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const aspectClass =
    aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'video'
        ? 'aspect-video'
        : 'aspect-[3/1]';

  const handleFile = useCallback(
    async (file: File) => {
      setError('');
      if (!ACCEPT_TYPES.includes(file.type)) {
        setError('Please upload a JPG, PNG, WEBP, or GIF image');
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Image must be under ${maxSizeMB}MB`);
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onChange(res.data.url);
      } catch (err) {
        const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
        setError(anyErr.response?.data?.error || anyErr.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [maxSizeMB, onChange]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const clear = () => {
    onChange('');
    setError('');
  };

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => !value && !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!value && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`
          relative ${aspectClass} w-full rounded-xl overflow-hidden border-2 border-dashed transition-colors
          ${
            value
              ? 'border-transparent'
              : dragActive
                ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5'
                : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary))] hover:border-white/30 cursor-pointer'
          }
        `}
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {!uploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clear();
                }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-colors"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              disabled={uploading}
              className="absolute bottom-2 right-2 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white text-xs font-medium transition-colors"
            >
              Replace
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            {uploading ? (
              <>
                <Loader2 className="w-6 h-6 text-[hsl(var(--accent))] animate-spin mb-2" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Uploading…</p>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--accent))]/10 flex items-center justify-center mb-2">
                  <ImageIcon className="w-5 h-5 text-[hsl(var(--accent))]" />
                </div>
                <p className="text-sm font-medium text-white mb-1">{label}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Drag &amp; drop or click · JPG, PNG, WEBP, GIF · &lt;{maxSizeMB}MB
                </p>
              </>
            )}
          </div>
        )}

        {uploading && value && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_TYPES.join(',')}
          onChange={onInputChange}
          className="hidden"
          aria-label={label}
        />
      </div>

      {error && (
        <div className="mt-2 flex items-start gap-2 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
