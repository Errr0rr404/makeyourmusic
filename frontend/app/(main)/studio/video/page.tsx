'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { Sparkles, Film, Wand2, Loader2, Download, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type VideoStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
interface VideoGen {
  id: string;
  status: VideoStatus;
  prompt?: string | null;
  title?: string | null;
  imageRefUrl?: string | null;
  videoUrl?: string | null;
  errorMessage?: string | null;
  createdAt?: string;
}

const RESOLUTIONS = ['720P', '768P', '1080P'] as const;
type Resolution = typeof RESOLUTIONS[number];

const MAX_PROMPT = 1500;

export default function VideoStudioPage() {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [imageRefUrl, setImageRefUrl] = useState('');
  const [resolution, setResolution] = useState<Resolution>('768P');
  const [duration, setDuration] = useState<6 | 10>(6);
  const [submitting, setSubmitting] = useState(false);
  const [gen, setGen] = useState<VideoGen | null>(null);
  const [error, setError] = useState('');
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
    };
  }, []);

  const startPolling = (id: string) => {
    const tick = async () => {
      try {
        const r = await api.get(`/ai/video/${id}`);
        const latest: VideoGen = r.data.generation;
        setGen(latest);
        if (latest.status === 'PENDING' || latest.status === 'PROCESSING') {
          pollTimerRef.current = window.setTimeout(tick, 5000);
        }
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to fetch status');
      }
    };
    pollTimerRef.current = window.setTimeout(tick, 3000);
  };

  const onSubmit = async () => {
    if (!prompt.trim()) {
      setError('Prompt is required');
      return;
    }
    if (prompt.length > MAX_PROMPT) {
      setError(`Prompt must be ${MAX_PROMPT} characters or less`);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/ai/video', {
        title: title.trim() || undefined,
        prompt: prompt.trim(),
        imageRefUrl: imageRefUrl || undefined,
        resolution,
        duration,
      });
      const created: VideoGen = res.data.generation;
      setGen(created);
      toast.success('Video generation started');
      startPolling(created.id);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to start video generation';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current);
    setGen(null);
    setError('');
  };

  const isWorking = gen && (gen.status === 'PENDING' || gen.status === 'PROCESSING');
  const isDone = gen && gen.status === 'COMPLETED' && gen.videoUrl;
  const failed = gen && gen.status === 'FAILED';

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
        Turn ideas into cinematic short clips. Optionally provide a reference image.
      </p>

      {!gen && (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 sm:p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Title <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 200))}
              placeholder="e.g. Neon Skyline"
              className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Prompt <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the scene, lighting, mood, motion…"
              rows={5}
              className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
            />
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1 text-right">
              {prompt.length}/{MAX_PROMPT}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Reference image <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional, used as first frame)</span>
            </label>
            <ImageUpload
              value={imageRefUrl}
              onChange={setImageRefUrl}
              label="Upload reference image"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Resolution</label>
              <div className="flex gap-2">
                {RESOLUTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResolution(r)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      resolution === r
                        ? 'bg-purple-500 text-white'
                        : 'bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Duration</label>
              <div className="flex gap-2">
                {[6, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d as 6 | 10)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      duration === d
                        ? 'bg-purple-500 text-white'
                        : 'bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]'
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            disabled={submitting || !prompt.trim()}
            onClick={onSubmit}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] transition-transform"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" /> Generate video
              </>
            )}
          </button>
        </div>
      )}

      {gen && (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Film className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white font-semibold truncate">{gen.title || 'Untitled video'}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">{gen.prompt}</div>
            </div>
          </div>

          {isWorking && (
            <div className="flex items-center gap-3 text-sm text-purple-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Rendering your video… this usually takes 1-3 minutes.</span>
            </div>
          )}

          {failed && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{gen.errorMessage || 'Video generation failed'}</span>
            </div>
          )}

          {isDone && gen.videoUrl && (
            <>
              <video
                src={gen.videoUrl}
                controls
                playsInline
                className="w-full aspect-video rounded-lg bg-black"
              />
              <a
                href={gen.videoUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-purple-300 hover:text-purple-200"
              >
                <Download className="w-4 h-4" /> Download video
              </a>
            </>
          )}

          <button
            type="button"
            onClick={reset}
            className="w-full px-4 py-2.5 rounded-lg border border-[hsl(var(--border))] text-sm font-medium text-white hover:bg-[hsl(var(--accent))] transition-colors"
          >
            Generate another
          </button>
        </div>
      )}
    </div>
  );
}
