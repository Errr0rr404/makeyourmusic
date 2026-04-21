'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { toast } from 'sonner';
import {
  Sparkles, Music, Wand2, Lock, Loader2, ChevronLeft, ChevronRight,
  Globe, LockKeyhole, CheckCircle2, AlertCircle, RotateCcw,
  Zap, FileText, Settings2, Headphones, Clock, Play, Pause,
  Bot, BookOpen, Flame,
} from 'lucide-react';

type Step = 'idea' | 'lyrics' | 'style' | 'generate' | 'publish';

interface Agent {
  id: string;
  name: string;
  slug: string;
  avatar: string | null;
}
interface Genre {
  id: string;
  name: string;
  slug: string;
}

interface Generation {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  audioUrl?: string | null;
  errorMessage?: string | null;
  durationSec?: number | null;
  title?: string | null;
  lyrics?: string | null;
}

interface Usage {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
  tier: 'FREE' | 'PREMIUM';
}

const GENRE_OPTIONS = ['Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Indie', 'Folk', 'Jazz', 'Classical', 'Lo-Fi', 'Metal', 'Country', 'Soul', 'Funk', 'Reggae'];
const MOOD_OPTIONS = ['Happy', 'Sad', 'Energetic', 'Calm', 'Romantic', 'Dark', 'Epic', 'Nostalgic', 'Dreamy', 'Aggressive'];

export default function CreatePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [step, setStep] = useState<Step>('idea');

  // Form state
  const [idea, setIdea] = useState('');
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [style, setStyle] = useState('');
  const [language, setLanguage] = useState('English');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [durationSec, setDurationSec] = useState(120);

  // API state
  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  const [lyricsError, setLyricsError] = useState('');
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [genError, setGenError] = useState('');
  const [usage, setUsage] = useState<Usage | null>(null);

  // Publish state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [publishAgentId, setPublishAgentId] = useState('');
  const [publishGenreId, setPublishGenreId] = useState('');
  const [publishCover, setPublishCover] = useState('');
  const [publishPublic, setPublishPublic] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // Polling ref must be declared at top-level before any early return (rules-of-hooks)
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/ai/usage').then((r) => setUsage(r.data.usage)).catch(() => {});
    api.get('/agents/mine').then((r) => setAgents(r.data.agents || [])).catch(() => {});
    api.get('/genres').then((r) => setGenres(r.data.genres || [])).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearTimeout(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <Lock className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Create Music with AI</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">Log in to start generating tracks</p>
        <Link href="/login" className="px-6 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white font-medium">
          Log In
        </Link>
      </div>
    );
  }

  // ─── Step 1: Idea ──────────────────────────────────────
  const handleIdeaNext = () => {
    if (!idea.trim()) {
      toast.error('Tell us what the song is about');
      return;
    }
    if (!title.trim()) setTitle(idea.slice(0, 60));
    setStep('lyrics');
  };

  // ─── Step 2: Lyrics ────────────────────────────────────
  const handleGenerateLyrics = async () => {
    setLyricsError('');
    setGeneratingLyrics(true);
    try {
      const res = await api.post('/ai/lyrics', { idea, genre, mood, style, language });
      const generated = (res.data.lyrics || '').trim();
      if (!generated) {
        setLyricsError('The AI returned empty lyrics. Try a more specific idea.');
        return;
      }
      setLyrics(generated);
      toast.success('Lyrics generated — edit freely');
    } catch (err: any) {
      setLyricsError(err.response?.data?.error || err.message || 'Failed to generate lyrics');
    } finally {
      setGeneratingLyrics(false);
    }
  };

  // ─── Step 4: Generate music ────────────────────────────
  const stopPolling = () => {
    if (pollRef.current) {
      window.clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollGeneration = (id: string) => {
    const tick = async () => {
      try {
        const res = await api.get(`/ai/generations/${id}`);
        const g: Generation = res.data.generation;
        setGeneration(g);
        if (g.status === 'COMPLETED' || g.status === 'FAILED') {
          stopPolling();
          if (g.status === 'FAILED') {
            setGenError(g.errorMessage || 'Generation failed');
          } else {
            setStep('publish');
          }
          return;
        }
      } catch {
        // transient — keep polling
      }
      pollRef.current = window.setTimeout(tick, 3000);
    };
    tick();
  };

  const handleGenerate = async () => {
    if (!isInstrumental && !lyrics.trim()) {
      toast.error('Write or generate lyrics first');
      setStep('lyrics');
      return;
    }
    setGenError('');
    setStep('generate');
    try {
      const prompt = [genre, mood, style].filter(Boolean).join(', ') || undefined;
      const res = await api.post('/ai/music', {
        title,
        prompt,
        lyrics: isInstrumental ? undefined : lyrics,
        genre,
        mood,
        durationSec,
        isInstrumental,
      });
      const g: Generation = res.data.generation;
      setGeneration(g);
      if (res.data.usage) setUsage(res.data.usage);
      pollGeneration(g.id);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to start generation';
      setGenError(msg);
      if (err.response?.status === 429 && err.response?.data?.usage) {
        setUsage(err.response.data.usage);
      }
    }
  };

  // ─── Step 5: Publish ───────────────────────────────────
  const handlePublish = async () => {
    if (!generation || !generation.audioUrl) return;
    if (!publishAgentId) {
      toast.error('Pick which agent to publish this under');
      return;
    }
    setPublishing(true);
    try {
      const res = await api.post(`/ai/generations/${generation.id}/publish`, {
        title,
        agentId: publishAgentId,
        genreId: publishGenreId || undefined,
        coverArt: publishCover || undefined,
        isPublic: publishPublic,
        mood,
      });
      toast.success('Track published!');
      router.push(`/track/${res.data.track.slug}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleStartOver = () => {
    stopPolling();
    setGeneration(null);
    setGenError('');
    setStep('idea');
  };

  // ─── UI ────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <Header usage={usage} />
      <Stepper current={step} />

      <div className="mt-6">
        {step === 'idea' && (
          <IdeaStep
            idea={idea}
            setIdea={setIdea}
            title={title}
            setTitle={setTitle}
            onNext={handleIdeaNext}
          />
        )}

        {step === 'lyrics' && (
          <LyricsStep
            lyrics={lyrics}
            setLyrics={setLyrics}
            generating={generatingLyrics}
            error={lyricsError}
            isInstrumental={isInstrumental}
            setIsInstrumental={setIsInstrumental}
            onGenerate={handleGenerateLyrics}
            onBack={() => setStep('idea')}
            onNext={() => setStep('style')}
          />
        )}

        {step === 'style' && (
          <StyleStep
            genre={genre}
            setGenre={setGenre}
            mood={mood}
            setMood={setMood}
            style={style}
            setStyle={setStyle}
            durationSec={durationSec}
            setDurationSec={setDurationSec}
            language={language}
            setLanguage={setLanguage}
            onBack={() => setStep('lyrics')}
            onNext={handleGenerate}
            usage={usage}
          />
        )}

        {step === 'generate' && (
          <GenerateStep
            generation={generation}
            error={genError}
            onRetry={handleGenerate}
            onStartOver={handleStartOver}
            onBack={() => {
              stopPolling();
              setStep('style');
            }}
          />
        )}

        {step === 'publish' && generation?.audioUrl && (
          <PublishStep
            generation={generation}
            title={title}
            setTitle={setTitle}
            agents={agents}
            genres={genres}
            publishAgentId={publishAgentId}
            setPublishAgentId={setPublishAgentId}
            publishGenreId={publishGenreId}
            setPublishGenreId={setPublishGenreId}
            publishCover={publishCover}
            setPublishCover={setPublishCover}
            publishPublic={publishPublic}
            setPublishPublic={setPublishPublic}
            publishing={publishing}
            onPublish={handlePublish}
            onStartOver={handleStartOver}
            userId={user?.id || ''}
          />
        )}
      </div>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────

function Header({ usage }: { usage: Usage | null }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
            AI Music Studio
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Create a track</h1>
        <p className="text-sm text-white/50 mt-1">
          Write lyrics, pick a vibe, and let the AI compose your song
        </p>
      </div>
      {usage && (
        <div className="text-right">
          <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Today</p>
          <p className="text-lg font-bold text-white">
            {usage.used}<span className="text-white/40">/{usage.limit}</span>
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {usage.tier === 'PREMIUM' ? 'Premium' : 'Free tier'}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Stepper ─────────────────────────────────────────────

const STEPS: { key: Step; label: string; icon: any }[] = [
  { key: 'idea', label: 'Idea', icon: Zap },
  { key: 'lyrics', label: 'Lyrics', icon: FileText },
  { key: 'style', label: 'Style', icon: Settings2 },
  { key: 'generate', label: 'Generate', icon: Wand2 },
  { key: 'publish', label: 'Publish', icon: Headphones },
];

function Stepper({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-x-auto">
      {STEPS.map((s, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        const Icon = s.icon;
        return (
          <div key={s.key} className="flex items-center gap-2 flex-shrink-0">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                isActive
                  ? 'bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))]'
                  : isDone
                    ? 'text-green-400'
                    : 'text-[hsl(var(--muted-foreground))]'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span className="text-xs font-semibold whitespace-nowrap">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-[1px] ${isDone ? 'bg-green-400/50' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Idea ────────────────────────────────────────

function IdeaStep({
  idea, setIdea, title, setTitle, onNext,
}: {
  idea: string; setIdea: (v: string) => void;
  title: string; setTitle: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4 p-5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
      <div>
        <label className="block text-sm font-medium text-white mb-1.5">
          What&apos;s the song about?
        </label>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="e.g. a nostalgic drive through the city at midnight, neon signs reflecting in the rain, thinking about someone you used to know"
          className="w-full px-4 py-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none resize-none"
          autoFocus
        />
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
          {idea.length}/1000 — the more vivid, the better
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-1.5">
          Working title <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional)</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="You can change this later"
          className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          disabled={!idea.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next: Lyrics <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Lyrics ──────────────────────────────────────

function LyricsStep({
  lyrics, setLyrics, generating, error, isInstrumental, setIsInstrumental, onGenerate, onBack, onNext,
}: {
  lyrics: string; setLyrics: (v: string) => void;
  generating: boolean; error: string;
  isInstrumental: boolean; setIsInstrumental: (v: boolean) => void;
  onGenerate: () => void; onBack: () => void; onNext: () => void;
}) {
  return (
    <div className="space-y-4 p-5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Write or generate lyrics</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Use <code className="text-white/80">[Verse]</code>, <code className="text-white/80">[Chorus]</code>, etc. on their own lines for structure
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={isInstrumental}
            onChange={(e) => setIsInstrumental(e.target.checked)}
            className="w-4 h-4 rounded accent-[hsl(var(--accent))]"
          />
          <span className="text-xs text-white">Instrumental (no vocals)</span>
        </label>
      </div>

      {!isInstrumental && (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={onGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              ) : (
                <><Wand2 className="w-4 h-4" /> {lyrics ? 'Regenerate with AI' : 'Generate lyrics with AI'}</>
              )}
            </button>
            {lyrics && (
              <button
                onClick={() => setLyrics('')}
                className="text-xs text-[hsl(var(--muted-foreground))] hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={14}
            maxLength={3500}
            placeholder={`[Verse 1]\nNeon bleeds across the windshield glass\n...\n\n[Chorus]\n...`}
            className="w-full px-4 py-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm font-mono border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none resize-none"
          />
          <p className="text-xs text-[hsl(var(--muted-foreground))] text-right">
            {lyrics.length}/3500
          </p>
        </>
      )}

      {isInstrumental && (
        <div className="p-4 rounded-lg bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] text-sm text-[hsl(var(--muted-foreground))]">
          <BookOpen className="w-4 h-4 text-[hsl(var(--accent))] inline-block mr-2" />
          Instrumental mode — no lyrics needed. We&apos;ll generate a vocal-free track.
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!isInstrumental && !lyrics.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next: Style <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Style ───────────────────────────────────────

function StyleStep({
  genre, setGenre, mood, setMood, style, setStyle,
  durationSec, setDurationSec, language, setLanguage,
  onBack, onNext, usage,
}: {
  genre: string; setGenre: (v: string) => void;
  mood: string; setMood: (v: string) => void;
  style: string; setStyle: (v: string) => void;
  durationSec: number; setDurationSec: (v: number) => void;
  language: string; setLanguage: (v: string) => void;
  onBack: () => void; onNext: () => void;
  usage: Usage | null;
}) {
  const insufficientCredits = usage && usage.remaining <= 0;

  return (
    <div className="space-y-5 p-5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Pick the vibe</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          These hints shape the arrangement, instruments, and energy
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Genre</label>
        <div className="flex flex-wrap gap-2">
          {GENRE_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(genre === g ? '' : g)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                genre === g
                  ? 'bg-[hsl(var(--accent))] text-white'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Mood</label>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setMood(mood === m ? '' : m)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                mood === m
                  ? 'bg-[hsl(var(--accent))] text-white'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">Language (vocals)</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
          >
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
            <option>Korean</option>
            <option>Japanese</option>
            <option>Mandarin</option>
            <option>Portuguese</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">
            Target duration <span className="text-[hsl(var(--muted-foreground))]">({Math.floor(durationSec / 60)}:{(durationSec % 60).toString().padStart(2, '0')})</span>
          </label>
          <input
            type="range" min={30} max={240} step={15}
            value={durationSec}
            onChange={(e) => setDurationSec(parseInt(e.target.value))}
            className="w-full accent-[hsl(var(--accent))]"
          />
          <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))] mt-1">
            <span>0:30</span><span>4:00</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-1.5">
          Extra style notes <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional)</span>
        </label>
        <input
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          maxLength={300}
          placeholder='e.g. "dreamy synth pads, trap drums, female vocals"'
          className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
        />
      </div>

      {insufficientCredits && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Daily limit reached</p>
            <p className="text-xs text-amber-200/70">
              Used {usage.used}/{usage.limit} today. Resets {new Date(usage.resetsAt).toLocaleString()}.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!!insufficientCredits}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
        >
          <Wand2 className="w-4 h-4" /> Generate Music
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Generate (polling) ──────────────────────────

function GenerateStep({
  generation, error, onRetry, onStartOver, onBack,
}: {
  generation: Generation | null; error: string;
  onRetry: () => void; onStartOver: () => void; onBack: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const int = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(int);
  }, []);

  if (error) {
    return (
      <div className="text-center p-10 rounded-xl bg-[hsl(var(--card))] border border-red-500/20">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Generation failed</h2>
        <p className="text-sm text-red-400 mb-6">{error}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onBack} className="px-4 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white">
            Edit inputs
          </button>
          <button onClick={onRetry} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium">
            <RotateCcw className="w-4 h-4" /> Try again
          </button>
          <button onClick={onStartOver} className="px-4 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white">
            Start over
          </button>
        </div>
      </div>
    );
  }

  const status = generation?.status || 'PENDING';
  const label =
    status === 'PENDING' ? 'Queueing your track…'
    : status === 'PROCESSING' ? 'The AI is composing…'
    : status === 'COMPLETED' ? 'Ready!'
    : 'Working…';

  return (
    <div className="text-center p-10 rounded-xl bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-white/5">
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Wand2 className="w-9 h-9 text-white" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-white mb-2">{label}</h2>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">
        This usually takes 30–90 seconds. Feel free to leave this page — we&apos;ll save the result.
      </p>
      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-8">
        Elapsed: {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/studio/generations" className="text-sm text-[hsl(var(--accent))] hover:underline">
          View my generations →
        </Link>
      </div>
    </div>
  );
}

// ─── Step 5: Publish ─────────────────────────────────────

function PublishStep({
  generation, title, setTitle, agents, genres,
  publishAgentId, setPublishAgentId, publishGenreId, setPublishGenreId,
  publishCover, setPublishCover, publishPublic, setPublishPublic,
  publishing, onPublish, onStartOver, userId,
}: {
  generation: Generation; title: string; setTitle: (v: string) => void;
  agents: Agent[]; genres: Genre[];
  publishAgentId: string; setPublishAgentId: (v: string) => void;
  publishGenreId: string; setPublishGenreId: (v: string) => void;
  publishCover: string; setPublishCover: (v: string) => void;
  publishPublic: boolean; setPublishPublic: (v: boolean) => void;
  publishing: boolean; onPublish: () => void; onStartOver: () => void;
  userId: string;
}) {
  // Auto-pick first agent if any
  useEffect(() => {
    if (agents.length > 0 && !publishAgentId) {
      setPublishAgentId(agents[0]!.id);
    }
  }, [agents, publishAgentId, setPublishAgentId]);

  const hasAgents = agents.length > 0;

  return (
    <div className="space-y-5 p-5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Your track is ready</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Preview it, tweak the details, and publish.
          </p>
        </div>
      </div>

      {/* Audio preview */}
      <div className="p-4 rounded-lg bg-[hsl(var(--secondary))] border border-[hsl(var(--border))]">
        <audio controls src={generation.audioUrl!} className="w-full">
          Your browser does not support audio playback.
        </audio>
        {generation.durationSec && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {Math.floor(generation.durationSec / 60)}:
            {(generation.durationSec % 60).toString().padStart(2, '0')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-4">
        <div className="w-32">
          <label className="block text-sm font-medium text-white mb-1.5">Cover art</label>
          <ImageUpload
            value={publishCover}
            onChange={setPublishCover}
            aspectRatio="square"
            maxSizeMB={5}
            label="Upload"
          />
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Your track title"
              className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Genre</label>
            <select
              value={publishGenreId}
              onChange={(e) => setPublishGenreId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
            >
              <option value="">Select genre (optional)</option>
              {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-1.5">
          <Bot className="w-4 h-4 inline mr-1 text-[hsl(var(--accent))]" />
          Publish under agent
        </label>
        {hasAgents ? (
          <select
            value={publishAgentId}
            onChange={(e) => setPublishAgentId(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
          >
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        ) : (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
            <p className="text-amber-300 mb-2">You need an AI agent to publish.</p>
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-[hsl(var(--accent))] hover:underline text-xs">
              Create one in Creator Studio →
            </Link>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Visibility</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPublishPublic(true)}
            className={`p-4 rounded-lg border text-left transition-colors ${
              publishPublic
                ? 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))]'
                : 'bg-[hsl(var(--secondary))] border-[hsl(var(--border))] hover:border-white/20'
            }`}
          >
            <Globe className={`w-4 h-4 mb-2 ${publishPublic ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))]'}`} />
            <p className="text-sm font-semibold text-white">Public</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Anyone can discover and play</p>
          </button>
          <button
            onClick={() => setPublishPublic(false)}
            className={`p-4 rounded-lg border text-left transition-colors ${
              !publishPublic
                ? 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))]'
                : 'bg-[hsl(var(--secondary))] border-[hsl(var(--border))] hover:border-white/20'
            }`}
          >
            <LockKeyhole className={`w-4 h-4 mb-2 ${!publishPublic ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))]'}`} />
            <p className="text-sm font-semibold text-white">Private</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Only you can play it from your profile</p>
          </button>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={onStartOver}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Start over
        </button>
        <button
          onClick={onPublish}
          disabled={publishing || !hasAgents || !title.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
        >
          {publishing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
          ) : (
            <><Flame className="w-4 h-4" /> Publish track</>
          )}
        </button>
      </div>
    </div>
  );
}
