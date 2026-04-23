'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, Wand2, Save, Check, Radio } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { usePlayerStore } from '@/lib/store/playerStore';
import { toast } from '@/lib/store/toastStore';

const SUGGESTIONS = [
  'late-night focus session, lo-fi with rain',
  'sunday morning coffee, mellow jazz',
  'workout sprint, hard electronic',
  'rainy drive home, cinematic synthwave',
  'happy birthday party, upbeat pop',
  'reading sci-fi, ambient and dreamy',
];

export function VibePromptTile() {
  const { isAuthenticated } = useAuthStore();
  const { playTrack, appendToQueue } = usePlayerStore();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; tracks: any[]; playlist: any | null } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = prompt.trim();
    if (!value || loading) return;
    if (!isAuthenticated) {
      toast.warning('Log in to generate a vibe playlist.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/ai/playlist/from-prompt', { prompt: value, limit: 20 });
      const tracks = res.data?.tracks || [];
      if (tracks.length === 0) {
        toast.warning('No matching tracks yet — try a different vibe or generate one in /create.');
        return;
      }
      setResult({ title: res.data.title, tracks, playlist: null });
      // Auto-play the first, queue the rest behind it.
      playTrack(tracks[0], tracks);
      toast.success(`Now playing: ${res.data.title}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Could not build playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const res = await api.post('/ai/playlist/from-prompt', { prompt, limit: 20, save: true });
      setResult({ ...result, playlist: res.data.playlist });
      toast.success('Saved to your library');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const applySuggestion = (s: string) => {
    setPrompt(s);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-600/15 via-fuchsia-500/10 to-blue-500/15 backdrop-blur p-6 md:p-8">
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-pink-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-pink-300" />
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-pink-200/80">
            Vibe → Playlist (AI)
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-outfit font-black text-white tracking-tight leading-tight">
          What do you want to hear right now?
        </h2>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col sm:flex-row gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. late-night focus session, lo-fi with rain"
            maxLength={500}
            className="flex-1 h-12 px-4 rounded-xl bg-black/30 text-white placeholder:text-white/30 border border-white/10 focus:border-white/30 focus:outline-none text-sm"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="h-12 px-5 rounded-xl bg-white text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] transition-transform"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Conjuring…</>
            ) : (
              <><Wand2 className="w-4 h-4" /> Generate</>
            )}
          </button>
        </form>

        {!result && (
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => applySuggestion(s)}
                className="text-[11px] px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {result && (
          <div className="mt-5 rounded-2xl bg-black/30 border border-white/10 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-pink-300" />
                  <span className="text-white text-base font-bold">{result.title}</span>
                  <span className="text-white/40 text-xs">{result.tracks.length} tracks</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {result.playlist ? (
                  <Link
                    href={`/playlist/${result.playlist.slug}`}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-green-500/15 text-green-300 text-xs font-semibold hover:bg-green-500/20"
                  >
                    <Check className="w-3.5 h-3.5" /> Saved · Open
                  </Link>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/10 text-white text-xs font-semibold hover:bg-white/20 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saving ? 'Saving…' : 'Save to library'}
                  </button>
                )}
                <button
                  onClick={() => { appendToQueue(result.tracks); toast.success('Queued'); }}
                  className="text-xs text-white/60 hover:text-white px-2"
                >
                  Add to queue
                </button>
              </div>
            </div>
            <ol className="text-sm text-white/80 space-y-1">
              {result.tracks.slice(0, 6).map((t, i) => (
                <li key={t.id} className="truncate">
                  <span className="text-white/40 mr-2">{i + 1}.</span>
                  <Link href={`/track/${t.slug}`} className="hover:underline">{t.title}</Link>
                  {t.agent?.name && <span className="text-white/40"> · {t.agent.name}</span>}
                </li>
              ))}
              {result.tracks.length > 6 && (
                <li className="text-xs text-white/40">+ {result.tracks.length - 6} more in your queue</li>
              )}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
