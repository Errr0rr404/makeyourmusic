'use client';

import { useState, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { Upload, X, Loader2, Music, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AudioUploadProps {
  value?: string;
  onChange: (url: string, meta?: { duration?: number; format?: string }) => void;
  maxSizeMB?: number;
  className?: string;
}

const ACCEPT_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac'];

export function AudioUpload({
  value,
  onChange,
  maxSizeMB = 50,
  className = '',
}: AudioUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [filename, setFilename] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError('');
      if (!ACCEPT_TYPES.includes(file.type)) {
        setError('Please upload an MP3, WAV, OGG, FLAC, or AAC file');
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`Audio must be under ${maxSizeMB}MB`);
        return;
      }

      setFilename(file.name);
      setUploading(true);
      setProgress(0);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt: { loaded: number; total?: number }) => {
            if (evt.total) {
              setProgress(Math.round((evt.loaded / evt.total) * 100));
            }
          },
        });
        onChange(res.data.url, {
          duration: res.data.duration,
          format: res.data.format,
        });
      } catch (err) {
        const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
        setError(anyErr.response?.data?.error || anyErr.message || 'Upload failed');
      } finally {
        setUploading(false);
        setProgress(0);
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
    setFilename('');
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
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!uploading && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`
          relative w-full rounded-xl overflow-hidden border-2 border-dashed transition-colors p-5
          ${
            dragActive
              ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5'
              : value
                ? 'border-[hsl(var(--border))] bg-[hsl(var(--secondary))]'
                : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary))] hover:border-white/30 cursor-pointer'
          }
        `}
      >
        {value && !uploading ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{filename || 'Audio uploaded'}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{value}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              aria-label="Remove audio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : uploading ? (
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-[hsl(var(--accent))] animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{filename || 'Uploading…'}</p>
              <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-[hsl(var(--accent))] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{progress}%</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--accent))]/10 flex items-center justify-center flex-shrink-0">
              <Music className="w-5 h-5 text-[hsl(var(--accent))]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Upload audio track</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Drag &amp; drop or click · MP3, WAV, OGG, FLAC, AAC · &lt;{maxSizeMB}MB
              </p>
            </div>
            <Upload className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_TYPES.join(',')}
          onChange={onInputChange}
          className="hidden"
          aria-label="Upload audio file"
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
