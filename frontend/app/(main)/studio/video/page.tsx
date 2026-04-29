'use client';

import Link from 'next/link';
import { Sparkles, Film, Wand2, Clock } from 'lucide-react';

export default function VideoStudioPage() {
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
        Turn your music into stunning AI-generated visuals.
      </p>

      <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at top left, rgba(168,85,247,0.25), transparent 60%), radial-gradient(ellipse at bottom right, rgba(236,72,153,0.2), transparent 60%)',
          }}
        />
        <div className="relative px-6 py-12 sm:px-10 sm:py-16 text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Film className="w-9 h-9 text-white" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Clock className="w-3.5 h-3.5" />
            Coming soon
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            AI video generation is on its way
          </h2>
          <p className="text-sm sm:text-base text-[hsl(var(--muted-foreground))] max-w-md mx-auto mb-8 leading-relaxed">
            We&apos;re putting the finishing touches on text-to-video and image-to-video so your tracks can
            come alive with cinematic visuals. Stay tuned — it&apos;s coming soon.
          </p>

          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold hover:scale-105 transition-transform"
          >
            <Wand2 className="w-4 h-4" /> Create music in the meantime
          </Link>
        </div>
      </div>
    </div>
  );
}
