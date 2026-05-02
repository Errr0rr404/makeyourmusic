'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

export type VideoStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface VideoGen {
  id: string;
  status: VideoStatus;
  prompt?: string | null;
  title?: string | null;
  imageRefUrl?: string | null;
  videoUrl?: string | null;
  errorMessage?: string | null;
  createdAt?: string;
}

interface Options {
  // The endpoint the hook should poll. Defaults to `/ai/video/<id>`; the
  // music-video flow uses `/ai/music-video/<trackId>` (which returns the
  // latest gen for the track without needing the gen id).
  pollUrl?: (id: string) => string;
  intervalMs?: number;
}

export function useVideoGenerationPolling(
  generationId: string | null,
  options: Options = {}
) {
  const intervalMs = options.intervalMs ?? 5000;
  const pollUrl = options.pollUrl;

  const [gen, setGen] = useState<VideoGen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!generationId) {
      setGen(null);
      return;
    }
    let active = true;
    cancelledRef.current = false;
    const getPollUrl = pollUrl ?? ((id: string) => `/ai/video/${id}`);
    const tick = async () => {
      if (cancelledRef.current || !active) return;
      try {
        const r = await api.get(getPollUrl(generationId));
        if (cancelledRef.current || !active) return;
        const next: VideoGen | null = r.data.generation || null;
        setGen(next);
        if (next && (next.status === 'PENDING' || next.status === 'PROCESSING')) {
          timerRef.current = window.setTimeout(tick, intervalMs);
        }
      } catch (err) {
        if (cancelledRef.current || !active) return;
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to load video status';
        setError(msg);
      }
    };
    tick();
    return () => {
      active = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [generationId, intervalMs, pollUrl]);

  return { gen, error };
}
