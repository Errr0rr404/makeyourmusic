'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { toast } from 'sonner';
import {
  Sparkles, Film, Lock, Loader2, AlertCircle, CheckCircle2, Image as ImageIcon,
  Download, Wand2,
} from 'lucide-react';

interface VideoGen {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  prompt?: string | null;
  title?: string | null;
  videoUrl?: string | null;
  errorMessage?: string | null;
}

export default function VideoStudioPage() {
  const { isAuthenticated } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [imageRefUrl, setImageRefUrl] = useState('');
  const [gen, setGen] = useState<VideoGen | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const pollRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  const poll = (id: string) => {
    const tick = async () => {
      try {
        const res = await api.get(`/ai/video/${id}`);
        const g: VideoGen = res.data.generation;
        setGen(g);
        if (g.status === 'COMPLETED' || g.status === 'FAILED') {
          stopPolling();
          return;
        }
      } catch {
        // transient
      }
      pollRef.current = window.setTimeout(tick, 10000);
    };
    tick();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Describe the video you want');
      return;
    }
    setError('');
    setStarting(true);
    try {
      const res = await api.post('/ai/video', {
        title: title || undefined,
        prompt,
        imageRefUrl: imageRefUrl || undefined,
      });
      const g: VideoGen = res.data.generation;
      setGen(g);
      poll(g.id);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to start generation';
      setError(msg);
    } finally {
      setStarting(false);
    }
  };

  const handleReset = () => {
    stopPolling();
    setGen(null);
    setPrompt('');
    setTitle('');
    setImageRefUrl('');
    setError('');
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <Lock className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">AI Video Generation</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">Log in to generate videos</p>
        <Link href="/login" className="px-6 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white font-medium">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-purple-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
          AI Video Studio
        </span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Generate a video</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
        Text-to-video with optional image reference. Typically takes 2–5 minutes.
      </p>

      {!gen && (
        <div className="space-y-4 p-5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">What should the video show?</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="e.g. a neon-lit city street at night, camera slowly tracking forward, cinematic, 4k"
              className="w-full px-4 py-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none resize-none"
              autoFocus
            />
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{prompt.length}/2000</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Title <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional)</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Name your video"
              className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              <ImageIcon className="inline w-4 h-4 mr-1" />
              Starting frame <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional — for image-to-video)</span>
            </label>
            <div className="w-48">
              <ImageUpload
                value={imageRefUrl}
                onChange={setImageRefUrl}
                aspectRatio="video"
                maxSizeMB={8}
                label="Upload image"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleGenerate}
              disabled={starting || !prompt.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
            >
              {starting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</>
              ) : (
                <><Wand2 className="w-4 h-4" /> Generate video</>
              )}
            </button>
          </div>
        </div>
      )}

      {gen && (
        <div className="p-5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
          {gen.status === 'COMPLETED' && gen.videoUrl ? (
            <>
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                <div>
                  <h2 className="text-lg font-bold text-white">Your video is ready</h2>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{gen.title || gen.prompt}</p>
                </div>
              </div>
              <video controls src={gen.videoUrl} className="w-full rounded-lg bg-black" />
              <div className="flex gap-3 mt-4">
                <a
                  href={gen.videoUrl}
                  download
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium"
                >
                  <Wand2 className="w-4 h-4" /> Generate another
                </button>
              </div>
            </>
          ) : gen.status === 'FAILED' ? (
            <div className="text-center py-8">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-white mb-2">Generation failed</h2>
              <p className="text-sm text-red-400 mb-4">{gen.errorMessage || 'Unknown error'}</p>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Film className="w-7 h-7 text-white" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">
                {gen.status === 'PROCESSING' ? 'Rendering…' : 'Queued…'}
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Video generation takes 2–5 minutes. You can leave this page and come back.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
