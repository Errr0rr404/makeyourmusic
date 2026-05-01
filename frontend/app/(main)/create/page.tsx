'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { AuthGateModal } from '@/components/auth/AuthGateModal';
import { toast } from 'sonner';
import {
  GENRE_TREE,
  MOOD_OPTIONS,
  ENERGY_OPTIONS,
  ERA_OPTIONS,
  VOCAL_STYLE_OPTIONS,
} from '@makeyourmusic/shared';
import {
  type LucideIcon,
  Sparkles, Wand2, Loader2, ChevronLeft, ChevronRight,
  Globe, LockKeyhole, CheckCircle2, AlertCircle, RotateCcw,
  Zap, FileText, Settings2, Headphones, Clock,
  Bot, BookOpen, Flame, Music2,
} from 'lucide-react';

// sessionStorage key for the in-progress draft. Survives the OAuth /
// /register bounce-out so anonymous users don't lose their idea + style +
// lyrics if they need to leave the page to authenticate.
const DRAFT_KEY = 'mym_create_draft_v1';
type PendingAction = 'generate' | 'lyrics' | null;

type Step = 'idea' | 'style' | 'lyrics' | 'generate' | 'publish';

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
  genre?: string | null;
  subGenre?: string | null;
  mood?: string | null;
  energy?: string | null;
  era?: string | null;
  vocalStyle?: string | null;
  vibeReference?: string | null;
  isInstrumental?: boolean;
  coverArt?: string | null;
  agentId?: string | null;
  agent?: { id: string } | null;
  track?: { slug: string } | null;
}

interface Usage {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
  tier: 'FREE' | 'PREMIUM';
}

export default function CreatePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<Step>('idea');

  // Form state
  const [idea, setIdea] = useState('');
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [genre, setGenre] = useState('');
  const [subGenre, setSubGenre] = useState('');
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState('');
  const [era, setEra] = useState('');
  const [vocalStyle, setVocalStyle] = useState('');
  const [vibeReference, setVibeReference] = useState('');
  const [style, setStyle] = useState('');
  const [language, setLanguage] = useState('English');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [durationSec, setDurationSec] = useState(120);
  const [bpm, setBpm] = useState<number | null>(null);
  const [musicalKey, setMusicalKey] = useState('');

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
  const [hydratingGeneration, setHydratingGeneration] = useState(false);

  // Polling refs must be declared at top-level before any early return (rules-of-hooks)
  const pollRef = useRef<number | null>(null);
  const activeGenerationIdRef = useRef<string | null>(null);
  const loadedGenerationIdRef = useRef<string | null>(null);

  // Auth-gate modal state. Anonymous users can fill out idea/style/lyrics —
  // the modal fires only when they try to spend a credit (generate music or
  // generate lyrics with AI).
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const pendingActionRef = useRef<PendingAction>(null);
  const draftRestoredRef = useRef(false);

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    activeGenerationIdRef.current = null;
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get('/ai/usage').then((r) => setUsage(r.data.usage)).catch(() => {});
    api.get('/agents/mine').then((r) => setAgents(r.data.agents || [])).catch(() => {});
    api.get('/genres').then((r) => setGenres(r.data.genres || [])).catch(() => {});
  }, [isAuthenticated]);

  // Pre-fill the idea field from `?prompt=`. Niche-page CTAs (and other deep
  // links from /n/[slug]) push /create?prompt=… to seed the form; without
  // this hook those links delivered users to a blank page.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const promptParam = new URLSearchParams(window.location.search).get('prompt');
      if (promptParam && !idea) {
        setIdea(promptParam);
      }
    } catch {
      /* ignore — best effort */
    }
    // Run once after mount; we deliberately don't track `idea` so a user
    // clearing the field doesn't get the prompt re-injected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const generationId = new URLSearchParams(window.location.search).get('generation');
    if (!generationId) {
      loadedGenerationIdRef.current = null;
      return;
    }
    if (loadedGenerationIdRef.current === generationId) return;

    let cancelled = false;
    loadedGenerationIdRef.current = generationId;
    setHydratingGeneration(true);
    setGenError('');

    if (pollRef.current) {
      window.clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    activeGenerationIdRef.current = null;

    (async () => {
      try {
        const res = await api.get(`/ai/generations/${generationId}`);
        if (cancelled) return;
        const g: Generation = res.data.generation;

        if (g.track?.slug) {
          router.replace(`/track/${g.track.slug}`);
          return;
        }

        setGeneration(g);
        setTitle(g.title || '');
        setLyrics(g.lyrics || '');
        setGenre(g.genre || '');
        setSubGenre(g.subGenre || '');
        setMood(g.mood || '');
        setEnergy(g.energy || '');
        setEra(g.era || '');
        setVocalStyle(g.vocalStyle || '');
        setVibeReference(g.vibeReference || '');
        setIsInstrumental(Boolean(g.isInstrumental));
        if (typeof g.durationSec === 'number') setDurationSec(g.durationSec);
        setPublishCover(g.coverArt || '');
        const existingAgentId = g.agent?.id || g.agentId;
        if (existingAgentId) setPublishAgentId(existingAgentId);

        if (g.status === 'COMPLETED' && g.audioUrl) {
          setStep('publish');
        } else {
          setStep('generate');
          if (g.status === 'FAILED') setGenError(g.errorMessage || 'Generation failed');
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          typeof err === 'object' && err !== null && 'response' in err
            ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
            : undefined;
        toast.error(message || 'Could not load this generation');
        router.replace('/studio/generations');
      } finally {
        if (!cancelled) setHydratingGeneration(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, router]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearTimeout(pollRef.current);
        pollRef.current = null;
      }
      activeGenerationIdRef.current = null;
    };
  }, []);

  // Restore once after auth hydration settles. We deliberately do NOT
  // overwrite anything the user already typed in this session — restore
  // only kicks in on the cold-load path back from /register or /login.
  // Must live above the early returns to keep hook order stable.
  useEffect(() => {
    if (draftRestoredRef.current) return;
    if (typeof window === 'undefined') return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(DRAFT_KEY);
    } catch {}
    if (!raw) {
      draftRestoredRef.current = true;
      return;
    }
    try {
      const d = JSON.parse(raw);
      if (typeof d.idea === 'string') setIdea(d.idea);
      if (typeof d.title === 'string') setTitle(d.title);
      if (typeof d.lyrics === 'string') setLyrics(d.lyrics);
      if (typeof d.genre === 'string') setGenre(d.genre);
      if (typeof d.subGenre === 'string') setSubGenre(d.subGenre);
      if (typeof d.mood === 'string') setMood(d.mood);
      if (typeof d.energy === 'string') setEnergy(d.energy);
      if (typeof d.era === 'string') setEra(d.era);
      if (typeof d.vocalStyle === 'string') setVocalStyle(d.vocalStyle);
      if (typeof d.vibeReference === 'string') setVibeReference(d.vibeReference);
      if (typeof d.style === 'string') setStyle(d.style);
      if (typeof d.language === 'string') setLanguage(d.language);
      if (typeof d.isInstrumental === 'boolean') setIsInstrumental(d.isInstrumental);
      if (typeof d.durationSec === 'number') setDurationSec(d.durationSec);
      if (typeof d.bpm === 'number' || d.bpm === null) setBpm(d.bpm);
      if (typeof d.musicalKey === 'string') setMusicalKey(d.musicalKey);
      if (typeof d.step === 'string' && ['idea', 'style', 'lyrics'].includes(d.step)) {
        setStep(d.step as Step);
      }
    } catch {
      // Corrupt draft — drop it.
    } finally {
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
      draftRestoredRef.current = true;
    }
  }, []);

  if (hydratingGeneration) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--accent))]" />
        <p className="mt-4 text-sm font-medium text-white">Loading generation</p>
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
    setStep('style');
  };

  // ─── Draft persistence (anonymous → authenticated bridge) ──
  // Snapshot the form to sessionStorage right before bouncing the user out
  // for sign-up so they don't lose work if they take the full-page register
  // path. The modal path keeps state in React already; this is cheap
  // insurance for the bounce-out case.
  const persistDraft = () => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          step, idea, title, lyrics, genre, subGenre, mood, energy, era,
          vocalStyle, vibeReference, style, language, isInstrumental,
          durationSec, bpm, musicalKey,
        }),
      );
    } catch {
      // Quota or disabled storage — no-op, the modal path still works.
    }
  };

  const requireAuth = (action: PendingAction): boolean => {
    if (useAuthStore.getState().isAuthenticated) return true;
    pendingActionRef.current = action;
    persistDraft();
    setAuthModalOpen(true);
    return false;
  };

  // ─── Step 3: Lyrics ────────────────────────────────────
  const runGenerateLyrics = async () => {
    setLyricsError('');
    setGeneratingLyrics(true);
    try {
      const res = await api.post('/ai/lyrics', {
        idea,
        title,
        genre,
        subGenre,
        mood,
        energy,
        era,
        vocalStyle,
        vibeReference,
        style,
        language,
        durationSec,
        bpm: bpm ?? undefined,
        key: musicalKey || undefined,
      });
      const generated = (res.data.lyrics || '').trim();
      if (!generated) {
        setLyricsError('The AI returned empty lyrics. Try a more specific idea.');
        return;
      }
      setLyrics(generated);
      toast.success('Lyrics generated — edit freely');
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setLyricsError(error.response?.data?.error || error.message || 'Failed to generate lyrics');
    } finally {
      setGeneratingLyrics(false);
    }
  };

  const handleGenerateLyrics = () => {
    if (!requireAuth('lyrics')) return;
    runGenerateLyrics();
  };

  // ─── Step 4: Generate music ────────────────────────────
  const pollGeneration = (id: string) => {
    activeGenerationIdRef.current = id;
    const tick = async () => {
      if (activeGenerationIdRef.current !== id) return;
      try {
        const res = await api.get(`/ai/generations/${id}`);
        const g: Generation = res.data.generation;
        if (activeGenerationIdRef.current !== id) return;
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
      if (activeGenerationIdRef.current !== id) return;
      pollRef.current = window.setTimeout(tick, 3000);
    };
    tick();
  };

  const runGenerateMusic = async () => {
    if (!isInstrumental && !lyrics.trim()) {
      toast.error('Write or generate lyrics first');
      setStep('lyrics');
      return;
    }
    setGenError('');
    stopPolling();
    setGeneration(null);
    setStep('generate');
    try {
      // The backend composes the rich prompt from these structured fields
      // (subgenre hints, era, vocal style, vibe-reference translation, etc.).
      // We still pass `idea` and `title` so the prompt builder can work them in.
      const res = await api.post('/ai/music', {
        title,
        idea,
        lyrics: isInstrumental ? undefined : lyrics,
        genre,
        subGenre,
        mood,
        energy,
        era,
        vocalStyle,
        vibeReference,
        style,
        durationSec,
        isInstrumental,
        bpm: bpm ?? undefined,
        key: musicalKey || undefined,
      });
      const g: Generation = res.data.generation;
      activeGenerationIdRef.current = g.id;
      setGeneration(g);
      if (res.data.usage) setUsage(res.data.usage);
      pollGeneration(g.id);
    } catch (err) {
      const error = err as { response?: { data?: { error?: string; usage?: Usage }; status?: number }; message?: string };
      const msg = error.response?.data?.error || error.message || 'Failed to start generation';
      setGenError(msg);
      if (error.response?.status === 429 && error.response?.data?.usage) {
        setUsage(error.response.data.usage);
      }
    }
  };

  const handleGenerate = () => {
    if (!requireAuth('generate')) return;
    runGenerateMusic();
  };

  // Resume the action the user was about to take when the auth wall fired.
  // Runs after sign-in/sign-up via the in-page modal — full-navigation
  // sign-up (via the "Create free account" link) intentionally does NOT
  // auto-fire on return, so the user can review their restored draft first.
  const handleAuthSuccess = () => {
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
    // Fetch usage now that we're authenticated, so the header shows credits
    // before kicking off the generation.
    api.get('/ai/usage').then((r) => setUsage(r.data.usage)).catch(() => {});
    if (pending === 'generate') runGenerateMusic();
    else if (pending === 'lyrics') runGenerateLyrics();
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
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to publish');
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
      <Header usage={usage} step={step} />
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

        {step === 'style' && (
          <StyleStep
            genre={genre}
            setGenre={setGenre}
            subGenre={subGenre}
            setSubGenre={setSubGenre}
            mood={mood}
            setMood={setMood}
            energy={energy}
            setEnergy={setEnergy}
            era={era}
            setEra={setEra}
            vocalStyle={vocalStyle}
            setVocalStyle={setVocalStyle}
            vibeReference={vibeReference}
            setVibeReference={setVibeReference}
            isInstrumental={isInstrumental}
            setIsInstrumental={setIsInstrumental}
            style={style}
            setStyle={setStyle}
            durationSec={durationSec}
            setDurationSec={setDurationSec}
            language={language}
            setLanguage={setLanguage}
            bpm={bpm}
            setBpm={setBpm}
            musicalKey={musicalKey}
            setMusicalKey={setMusicalKey}
            onBack={() => setStep('idea')}
            onNext={() => {
              if (isInstrumental) handleGenerate();
              else setStep('lyrics');
            }}
            usage={usage}
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
            onBack={() => setStep('style')}
            onNext={handleGenerate}
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
              setStep(isInstrumental ? 'style' : 'lyrics');
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
          />
        )}
      </div>

      <AuthGateModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
        title={
          pendingActionRef.current === 'lyrics'
            ? 'Sign in to generate lyrics'
            : 'Sign in to generate your track'
        }
        description={
          pendingActionRef.current === 'lyrics'
            ? 'Lyric generation uses your daily AI credits — quick sign-up unlocks them.'
            : 'Your idea, lyrics, and style choices are saved — finish creating an account to bring the track to life.'
        }
        signupNext="/create"
      />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────

function Header({ usage, step }: { usage: Usage | null; step: Step }) {
  const isPublishing = step === 'publish';
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
            AI Music Studio
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
          {isPublishing ? 'Publish track' : 'Create a track'}
        </h1>
        <p className="text-sm text-white/50 mt-1">
          {isPublishing
            ? 'Review details, choose visibility, and publish your finished generation'
            : 'Pick the sound, shape the lyrics, and let the AI compose your song'}
        </p>
      </div>
      {usage && (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:block sm:border-0 sm:bg-transparent sm:p-0 sm:text-right">
          <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            Today
          </p>
          <div className="text-right sm:text-right">
            <p className="text-lg font-bold text-white leading-none">
              {usage.used}<span className="text-white/40">/{usage.limit}</span>
            </p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
              {usage.tier === 'PREMIUM' ? 'Premium' : 'Free tier'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stepper ─────────────────────────────────────────────

const STEPS: { key: Step; label: string; icon: LucideIcon }[] = [
  { key: 'idea', label: 'Idea', icon: Zap },
  { key: 'style', label: 'Style', icon: Settings2 },
  { key: 'lyrics', label: 'Lyrics', icon: FileText },
  { key: 'generate', label: 'Generate', icon: Wand2 },
  { key: 'publish', label: 'Publish', icon: Headphones },
];

function Stepper({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  const currentStep = STEPS[currentIdx] ?? STEPS[0]!;
  const CurrentIcon = currentStep.icon;
  const progress = ((currentIdx + 1) / STEPS.length) * 100;

  return (
    <div className="rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3">
      <div className="flex items-center justify-between gap-3 md:hidden">
        <div className="min-w-0 flex items-center gap-2">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]">
            <CurrentIcon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Step {currentIdx + 1} of {STEPS.length}
            </p>
            <p className="text-sm font-semibold text-white truncate">{currentStep.label}</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10 md:hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 md:mt-0 md:pb-0">
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
          className="flex w-full items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors sm:w-auto"
        >
          Next: Style <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Lyrics ──────────────────────────────────────

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Write or generate lyrics</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            The lyric generator now uses the style choices you made first.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer self-start sm:shrink-0">
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
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <button
              onClick={onGenerate}
              disabled={generating}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-200 text-sm font-medium transition-colors disabled:opacity-50"
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

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 transition-colors sm:justify-start"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!isInstrumental && !lyrics.trim()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium hover:bg-[hsl(var(--primary))]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Wand2 className="w-4 h-4" /> Generate Music
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Style ───────────────────────────────────────

function StyleStep({
  genre, setGenre, subGenre, setSubGenre,
  mood, setMood, energy, setEnergy, era, setEra,
  vocalStyle, setVocalStyle, vibeReference, setVibeReference,
  isInstrumental, setIsInstrumental, style, setStyle,
  durationSec, setDurationSec, language, setLanguage,
  bpm, setBpm, musicalKey, setMusicalKey,
  onBack, onNext, usage,
}: {
  genre: string; setGenre: (v: string) => void;
  subGenre: string; setSubGenre: (v: string) => void;
  mood: string; setMood: (v: string) => void;
  energy: string; setEnergy: (v: string) => void;
  era: string; setEra: (v: string) => void;
  vocalStyle: string; setVocalStyle: (v: string) => void;
  vibeReference: string; setVibeReference: (v: string) => void;
  isInstrumental: boolean; setIsInstrumental: (v: boolean) => void;
  style: string; setStyle: (v: string) => void;
  durationSec: number; setDurationSec: (v: number) => void;
  language: string; setLanguage: (v: string) => void;
  bpm: number | null; setBpm: (v: number | null) => void;
  musicalKey: string; setMusicalKey: (v: string) => void;
  onBack: () => void; onNext: () => void;
  usage: Usage | null;
}) {
  const insufficientCredits = usage && usage.remaining <= 0;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const selectedGenre = GENRE_TREE.find((g) => g.name === genre);

  // Clear sub-genre when parent genre changes
  const handleGenreChange = (g: string) => {
    if (genre === g) {
      setGenre('');
      setSubGenre('');
    } else {
      setGenre(g);
      setSubGenre('');
    }
  };

  return (
    <div className="space-y-5 p-5 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
      <div>
        <h2 className="text-lg font-bold text-white mb-1">Pick the sound first</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          These hints shape the arrangement, vocal cadence, and lyrics generated next. Only genre is suggested — everything else is optional.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setIsInstrumental(!isInstrumental)}
        className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-colors ${
          isInstrumental
            ? 'border-[hsl(var(--accent))]/50 bg-[hsl(var(--accent))]/10'
            : 'border-[hsl(var(--border))] bg-[hsl(var(--secondary))]'
        }`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">
            {isInstrumental ? 'Instrumental track' : 'Vocal track'}
          </span>
          <span className="mt-0.5 block text-xs text-[hsl(var(--muted-foreground))]">
            {isInstrumental
              ? 'Skip lyrics and generate a vocal-free arrangement.'
              : 'Choose the sound first, then generate lyrics that fit it.'}
          </span>
        </span>
        <span className={`flex h-6 w-11 shrink-0 rounded-full p-0.5 ${isInstrumental ? 'bg-[hsl(var(--accent))]' : 'bg-white/15'}`}>
          <span className={`h-5 w-5 rounded-full bg-white transition-transform ${isInstrumental ? 'translate-x-5' : ''}`} />
        </span>
      </button>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Genre <span className="text-[hsl(var(--muted-foreground))] font-normal text-xs">(start here)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {GENRE_TREE.map((g) => (
            <button
              key={g.name}
              onClick={() => handleGenreChange(g.name)}
              title={g.blurb}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                genre === g.name
                  ? 'bg-[hsl(var(--accent))] text-white'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}
            >
              <span aria-hidden>{g.emoji}</span>
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {selectedGenre && (
        <div className="animate-fade-in">
          <label className="block text-sm font-medium text-white mb-2">
            Subgenre <span className="text-[hsl(var(--muted-foreground))] font-normal text-xs">(optional — narrows the sound)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {selectedGenre.subgenres.map((sg) => (
              <button
                key={sg.name}
                onClick={() => setSubGenre(subGenre === sg.name ? '' : sg.name)}
                title={sg.hint}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  subGenre === sg.name
                    ? 'bg-purple-500 text-white'
                    : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
                }`}
              >
                {sg.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-white mb-2">Mood</label>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((m) => (
            <button
              key={m.name}
              onClick={() => setMood(mood === m.name ? '' : m.name)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                mood === m.name
                  ? 'bg-[hsl(var(--accent))] text-white'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}
            >
              <span aria-hidden>{m.emoji}</span>
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Energy <span className="text-[hsl(var(--muted-foreground))] font-normal text-xs">(tempo + intensity)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {ENERGY_OPTIONS.map((e) => (
            <button
              key={e.name}
              onClick={() => setEnergy(energy === e.name ? '' : e.name)}
              title={e.hint}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                energy === e.name
                  ? 'bg-[hsl(var(--accent))] text-white'
                  : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
              }`}
            >
              <span aria-hidden>{e.emoji}</span>
              {e.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-1.5 flex items-center gap-1.5">
          <Music2 className="w-3.5 h-3.5" />
          Artists or bands you love <span className="text-[hsl(var(--muted-foreground))] font-normal text-xs">(optional)</span>
        </label>
        <input
          value={vibeReference}
          onChange={(e) => setVibeReference(e.target.value)}
          maxLength={300}
          placeholder='e.g. "Daft Punk, Tame Impala, early M83"'
          className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
        />
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
          We&apos;ll translate this into instruments + production cues so the AI gets the vibe without copying anyone.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-1"
      >
        {showAdvanced ? <ChevronLeft className="w-3 h-3 rotate-90" /> : <ChevronRight className="w-3 h-3 rotate-90" />}
        Advanced options {showAdvanced ? '(hide)' : '(era, vocals, language, tempo, key)'}
      </button>

      {showAdvanced && (
        <div className="space-y-5 pt-2 border-t border-white/5 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Era <span className="text-[hsl(var(--muted-foreground))] font-normal text-xs">(production style)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ERA_OPTIONS.map((e) => (
                <button
                  key={e.name}
                  onClick={() => setEra(era === e.name ? '' : e.name)}
                  title={e.hint}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    era === e.name
                      ? 'bg-[hsl(var(--accent))] text-white'
                      : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
                  }`}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>

          {!isInstrumental && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">Vocal style</label>
              <div className="flex flex-wrap gap-2">
                {VOCAL_STYLE_OPTIONS.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => setVocalStyle(vocalStyle === v.name ? '' : v.name)}
                    title={v.hint}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      vocalStyle === v.name
                        ? 'bg-[hsl(var(--accent))] text-white'
                        : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-white'
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                <option>Italian</option>
                <option>German</option>
                <option>Hindi</option>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">
                Tempo {bpm ? <span className="text-[hsl(var(--muted-foreground))]">({bpm} BPM)</span> : <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional)</span>}
              </label>
              <input
                type="range"
                min={60}
                max={200}
                step={1}
                value={bpm ?? 120}
                onChange={(e) => setBpm(parseInt(e.target.value))}
                className="w-full accent-[hsl(var(--accent))]"
              />
              <div className="flex justify-between text-xs text-[hsl(var(--muted-foreground))] mt-1">
                <span>60</span>
                <button
                  type="button"
                  onClick={() => setBpm(null)}
                  className="hover:text-white transition-colors"
                >
                  {bpm ? 'Clear' : 'Auto'}
                </button>
                <span>200</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1.5">
                Key <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional)</span>
              </label>
              <select
                value={musicalKey}
                onChange={(e) => setMusicalKey(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
              >
                <option value="">Auto</option>
                <optgroup label="Major">
                  {['C major', 'C# major', 'D major', 'D# major', 'E major', 'F major', 'F# major', 'G major', 'G# major', 'A major', 'A# major', 'B major'].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </optgroup>
                <optgroup label="Minor">
                  {['C minor', 'C# minor', 'D minor', 'D# minor', 'E minor', 'F minor', 'F# minor', 'G minor', 'G# minor', 'A minor', 'A# minor', 'B minor'].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </optgroup>
              </select>
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
              placeholder='e.g. "dreamy synth pads, trap drums, slow-burn outro"'
              className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
            />
          </div>
        </div>
      )}

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

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 transition-colors sm:justify-start"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!!insufficientCredits}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
        >
          <Wand2 className="w-4 h-4" /> {isInstrumental ? 'Generate Music' : 'Next: Lyrics'}
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
      <div className="text-center p-6 sm:p-10 rounded-xl bg-[hsl(var(--card))] border border-red-500/20">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Generation failed</h2>
        <p className="text-sm text-red-400 mb-6">{error}</p>
        <div className="flex flex-col gap-2 justify-center sm:flex-row sm:gap-3">
          <button onClick={onBack} className="px-4 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white">
            Edit inputs
          </button>
          <button onClick={onRetry} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[hsl(var(--primary))] text-white text-sm font-medium">
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
    <div className="text-center p-6 sm:p-10 rounded-xl bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-white/5">
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
  publishing, onPublish, onStartOver,
}: {
  generation: Generation; title: string; setTitle: (v: string) => void;
  agents: Agent[]; genres: Genre[];
  publishAgentId: string; setPublishAgentId: (v: string) => void;
  publishGenreId: string; setPublishGenreId: (v: string) => void;
  publishCover: string; setPublishCover: (v: string) => void;
  publishPublic: boolean; setPublishPublic: (v: boolean) => void;
  publishing: boolean; onPublish: () => void; onStartOver: () => void;
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
        <audio key={generation.id} controls src={generation.audioUrl!} className="w-full">
          Your browser does not support audio playback.
        </audio>
        {generation.durationSec && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {Math.floor(generation.durationSec / 60)}:
            {(generation.durationSec % 60).toString().padStart(2, '0')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr]">
        <div className="w-full max-w-[8rem]">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
        <button
          onClick={onStartOver}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 transition-colors sm:justify-start"
        >
          <RotateCcw className="w-4 h-4" /> Start over
        </button>
        <button
          onClick={onPublish}
          disabled={publishing || !hasAgents || !title.trim()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
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
