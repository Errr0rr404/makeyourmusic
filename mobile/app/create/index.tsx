import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, Image, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useAuthStore, getApi,
  GENRE_TREE, MOOD_OPTIONS, ENERGY_OPTIONS, ERA_OPTIONS, VOCAL_STYLE_OPTIONS,
} from '@makeyourmusic/shared';
import {
  Sparkles, Wand2, ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle, Zap, FileText, Settings2, Headphones, Loader2,
  BookOpen, RotateCcw, Globe, LockKeyhole, Bot, Flame, Play, Pause,
  Clock, Music2,
} from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { AuthGateModal } from '../../components/auth/AuthGateModal';
import { VoiceQuickCreate } from '../../components/create/VoiceQuickCreate';
import { pickAndUploadImage } from '../../lib/uploadImage';
import { track, trackGeneration } from '../../lib/analytics';
import { hapticSelection, hapticSuccess } from '../../services/hapticService';
import { Audio } from 'expo-av';
import TrackPlayer from 'react-native-track-player';
import { useTokens, useIsVintage } from '../../lib/theme';

const DRAFT_KEY = 'mym_create_draft_v1';

// Hand-picked seed prompts shown on the empty Idea step. Mirror of web.
const SEED_PROMPTS = [
  'rainy tokyo lo-fi for late-night coding',
  "warm jazz piano, softly mic'd, 3am",
  'dreampop on a beach in 1986',
  'instrumental synthwave for a long drive',
  'ambient folk with cassette tape hiss',
  'garage rock about losing your apartment keys',
];

type Step = 'idea' | 'style' | 'lyrics' | 'generate' | 'publish';

const TEMPO_OPTIONS = [80, 100, 120, 140, 160, 180];
const MUSICAL_KEY_OPTIONS = ['C major', 'G major', 'D major', 'A minor', 'E minor', 'F minor'];
const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French', 'Korean', 'Japanese', 'Mandarin', 'Portuguese', 'Italian', 'German', 'Hindi'];

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

export default function CreateScreen() {
  const router = useRouter();
  const { generation: rawGenerationId, prompt: rawPrompt } = useLocalSearchParams<{ generation?: string | string[]; prompt?: string | string[] }>();
  const generationId = Array.isArray(rawGenerationId) ? rawGenerationId[0] : rawGenerationId;
  const seedPrompt = Array.isArray(rawPrompt) ? rawPrompt[0] : rawPrompt;
  const { isAuthenticated, user } = useAuthStore();
  const [step, setStep] = useState<Step>('idea');

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
  // Default first-time guests to instrumental: skips the lyrics step so the
  // first audio happens faster. Authenticated users keep vocal as default.
  const [isInstrumental, setIsInstrumental] = useState(!isAuthenticated);
  const [durationSec, setDurationSec] = useState(120);
  const [bpm, setBpm] = useState<number | null>(null);
  const [musicalKey, setMusicalKey] = useState('');

  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  const [lyricsError, setLyricsError] = useState('');
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [genError, setGenError] = useState('');
  const [usage, setUsage] = useState<Usage | null>(null);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const pendingActionRef = useRef<'lyrics' | 'generate' | null>(null);

  const [agents, setAgents] = useState<any[]>([]);
  const [genres, setGenres] = useState<any[]>([]);
  const [publishAgentId, setPublishAgentId] = useState('');
  const [publishGenreId, setPublishGenreId] = useState('');
  const [publishCover, setPublishCover] = useState('');
  const [publishPublic, setPublishPublic] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [loadingExistingGeneration, setLoadingExistingGeneration] = useState(false);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeGenerationIdRef = useRef<string | null>(null);
  const loadedGenerationIdRef = useRef<string | null>(null);
  const previewSound = useRef<any>(null);
  const previewAudioUrlRef = useRef<string | null>(null);
  const [playingPreview, setPlayingPreview] = useState(false);

  // Track unmount so a Sound.createAsync() that's still loading at unmount-
  // time gets unloaded once it resolves. Without this, a fast unmount race
  // assigned the new Sound to previewSound.current AFTER cleanup ran, so it
  // never got unloaded — which kept iOS audio session ducking other apps.
  const unmountedRef = useRef(false);
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
      activeGenerationIdRef.current = null;
      if (previewSound.current) {
        const handle = previewSound.current;
        previewSound.current = null;
        handle.unloadAsync?.().catch(() => undefined);
      }
    };
  }, []);

  // Pause audio + cancel polling when the screen loses focus (user swipes the
  // modal away). The full unmount cleanup also clears these, but blur fires
  // before unmount and stops generations from quietly polling in the background.
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (previewSound.current) {
          previewSound.current.pauseAsync?.().catch(() => {});
          setPlayingPreview(false);
        }
        if (pollTimer.current) {
          clearTimeout(pollTimer.current);
          pollTimer.current = null;
        }
        activeGenerationIdRef.current = null;
      };
    }, [])
  );

  // Restore any draft saved before a full-screen auth redirect
  useEffect(() => {
    if (seedPrompt) {
      setIdea(seedPrompt);
      return;
    }
    AsyncStorage.getItem(DRAFT_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const d = JSON.parse(raw);
          if (d.idea) setIdea(d.idea);
          if (d.title) setTitle(d.title);
          if (d.genre) setGenre(d.genre);
          if (d.subGenre) setSubGenre(d.subGenre);
          if (d.mood) setMood(d.mood);
          if (d.energy) setEnergy(d.energy);
          if (d.era) setEra(d.era);
          if (d.vocalStyle) setVocalStyle(d.vocalStyle);
          if (d.style) setStyle(d.style);
          if (d.lyrics) setLyrics(d.lyrics);
          if (typeof d.isInstrumental === 'boolean') setIsInstrumental(d.isInstrumental);
          if (typeof d.durationSec === 'number') setDurationSec(d.durationSec);
        } catch { /* ignore malformed draft */ }
        AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      })
      .catch(() => {});
  // Run once on mount only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    getApi().get('/ai/usage').then((r) => setUsage(r.data.usage)).catch(() => {});
    getApi().get('/agents/mine').then((r) => setAgents(r.data.agents || [])).catch(() => {});
    getApi().get('/genres').then((r) => setGenres(r.data.genres || [])).catch(() => {});
  }, [isAuthenticated]);

  // Funnel: mirror web's create_step_* events on every step change.
  useEffect(() => {
    track(`create_step_${step}` as const, { isAuthenticated: !!isAuthenticated });
  }, [step, isAuthenticated]);

  useEffect(() => {
    if (!generationId) {
      loadedGenerationIdRef.current = null;
      return;
    }
    if (!isAuthenticated || loadedGenerationIdRef.current === generationId) return;

    let cancelled = false;
    loadedGenerationIdRef.current = generationId;
    setLoadingExistingGeneration(true);
    setGenError('');

    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
    activeGenerationIdRef.current = null;
    if (previewSound.current) {
      previewSound.current.unloadAsync?.().catch(() => {});
      previewSound.current = null;
      previewAudioUrlRef.current = null;
      setPlayingPreview(false);
    }

    (async () => {
      try {
        const res = await getApi().get(`/ai/generations/${generationId}`);
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
        Alert.alert(
          'Generation unavailable',
          message || 'Could not load this generation.'
        );
        router.replace('/studio/generations');
      } finally {
        if (!cancelled) setLoadingExistingGeneration(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [generationId, isAuthenticated, router]);

  if (loadingExistingGeneration) {
    return (
      <ScreenContainer scrollable={false}>
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator color="#8b5cf6" size="large" />
          <Text className="text-mym-text text-base font-semibold mt-4">Loading generation</Text>
        </View>
      </ScreenContainer>
    );
  }

  // ─── Helpers ─────────────────────────────────────────────

  const generateLyrics = async () => {
    setLyricsError('');
    setGeneratingLyrics(true);
    try {
      const res = await getApi().post('/ai/lyrics', {
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
      const text = (res.data.lyrics || '').trim();
      if (!text) {
        setLyricsError('The AI returned empty lyrics. Try a more specific idea.');
        return;
      }
      setLyrics(text);
      hapticSuccess();
    } catch (err: any) {
      setLyricsError(err.response?.data?.error || err.message || 'Failed to generate lyrics');
    } finally {
      setGeneratingLyrics(false);
    }
  };

  const pollGeneration = (id: string) => {
    activeGenerationIdRef.current = id;
    const tick = async () => {
      if (activeGenerationIdRef.current !== id) return;
      try {
        const res = await getApi().get(`/ai/generations/${id}`);
        const g: Generation = res.data.generation;
        if (activeGenerationIdRef.current !== id) return;
        setGeneration(g);
        if (g.status === 'COMPLETED' || g.status === 'FAILED') {
          activeGenerationIdRef.current = null;
          if (pollTimer.current) {
            clearTimeout(pollTimer.current);
            pollTimer.current = null;
          }
          if (g.status === 'FAILED') {
            setGenError(g.errorMessage || 'Generation failed');
            trackGeneration('failed', { reason: g.errorMessage || 'unknown' });
          } else {
            setStep('publish');
            trackGeneration('succeeded', { durationSec: g.durationSec || undefined });
          }
          return;
        }
      } catch {
        /* transient */
      }
      if (activeGenerationIdRef.current !== id) return;
      pollTimer.current = setTimeout(tick, 3000);
    };
    tick();
  };

  const startGeneration = async () => {
    if (!isInstrumental && !lyrics.trim()) {
      Alert.alert('Lyrics needed', 'Write or generate lyrics first, or enable instrumental mode.');
      setStep('lyrics');
      return;
    }
    setGenError('');
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
    activeGenerationIdRef.current = null;
    if (previewSound.current) {
      await previewSound.current.unloadAsync?.().catch(() => {});
      previewSound.current = null;
      previewAudioUrlRef.current = null;
      setPlayingPreview(false);
    }
    setGeneration(null);
    setStep('generate');
    trackGeneration('started', { genre: genre || undefined, isInstrumental, durationSec });
    try {
      // Backend builds the rich prompt from the structured fields below.
      const res = await getApi().post('/ai/music', {
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
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to start generation';
      setGenError(msg);
      if (err.response?.status === 429 && err.response?.data?.usage) {
        setUsage(err.response.data.usage);
      }
    }
  };

  const persistDraft = () => {
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
      idea, title, genre, subGenre, mood, energy, era,
      vocalStyle, style, lyrics, isInstrumental, durationSec,
    })).catch(() => {});
  };

  const requireAuth = (action: 'lyrics' | 'generate'): boolean => {
    if (isAuthenticated) return true;
    pendingActionRef.current = action;
    persistDraft();
    setAuthGateOpen(true);
    track('auth_gate_shown', { action });
    return false;
  };

  const onAuthSuccess = () => {
    setAuthGateOpen(false);
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    track('auth_gate_completed', { action: pending || 'unknown' });
    if (pending === 'lyrics') generateLyrics();
    else if (pending === 'generate') startGeneration();
  };

  const onNavigateToRegister = () => {
    setAuthGateOpen(false);
  };

  const handlePublish = async () => {
    if (!generation?.audioUrl) return;
    if (!publishAgentId) {
      Alert.alert('Pick an agent', 'Choose which agent to publish this under.');
      return;
    }
    setPublishing(true);
    try {
      const res = await getApi().post(`/ai/generations/${generation.id}/publish`, {
        title: title || 'Untitled track',
        agentId: publishAgentId,
        genreId: publishGenreId || undefined,
        coverArt: publishCover || undefined,
        isPublic: publishPublic,
        mood,
      });
      hapticSuccess();
      router.replace(`/track/${res.data.track.slug}`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const startOver = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = null;
    activeGenerationIdRef.current = null;
    if (previewSound.current) {
      previewSound.current.unloadAsync?.().catch(() => {});
      previewSound.current = null;
      previewAudioUrlRef.current = null;
      setPlayingPreview(false);
    }
    setGeneration(null);
    setGenError('');
    setStep('idea');
  };

  // Reentrancy guard: rapid double-tap can otherwise spawn two
  // createAsync calls in flight; the second's `previewSound.current`
  // assignment overwrites the first, leaking the original sound with no
  // way to unload it.
  const previewBusyRef = useRef(false);

  const togglePreview = async () => {
    if (!generation?.audioUrl) return;
    if (previewBusyRef.current) return;
    previewBusyRef.current = true;
    try {
      if (playingPreview && previewSound.current) {
        // Always flip the UI even if pauseAsync rejects (e.g. sound got
        // unloaded between the play and pause taps). Otherwise the button
        // sticks in "playing" state.
        try {
          await previewSound.current.pauseAsync();
        } finally {
          setPlayingPreview(false);
        }
        return;
      }
      // Pause the main music player so the user doesn't hear two streams
      // simultaneously when previewing a generation while a track is
      // playing.
      try { await TrackPlayer.pause(); } catch { /* player not initialized */ }

      if (previewSound.current && previewAudioUrlRef.current !== generation.audioUrl) {
        await previewSound.current.unloadAsync?.().catch(() => {});
        previewSound.current = null;
        previewAudioUrlRef.current = null;
      }
      if (!previewSound.current) {
        const { sound } = await Audio.Sound.createAsync({ uri: generation.audioUrl });
        // If we unmounted OR a faster tap created another sound while we
        // were awaiting createAsync, throw this one away — otherwise the
        // post-unmount assignment leaks a never-unloaded Sound and keeps
        // the audio session ducking.
        if (unmountedRef.current || previewSound.current) {
          await sound.unloadAsync().catch(() => {});
          return;
        }
        previewSound.current = sound;
        previewAudioUrlRef.current = generation.audioUrl;
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) setPlayingPreview(false);
        });
      }
      await previewSound.current.playAsync();
      setPlayingPreview(true);
    } finally {
      previewBusyRef.current = false;
    }
  };

  const [uploadingCover, setUploadingCover] = useState(false);
  const uploadCover = async () => {
    if (uploadingCover) return;
    setUploadingCover(true);
    try {
      const asset = await pickAndUploadImage({ aspect: [1, 1], quality: 0.9 });
      if (asset?.url) {
        setPublishCover(asset.url);
        hapticSuccess();
      }
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not upload cover');
    } finally {
      setUploadingCover(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────

  return (
    <ScreenContainer scrollable={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Header usage={usage} step={step} />
        <Stepper current={step} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'idea' && (
            <IdeaStep
              idea={idea}
              setIdea={setIdea}
              title={title}
              setTitle={setTitle}
              onNext={() => {
                if (!title.trim()) setTitle(idea.slice(0, 60));
                setStep('style');
              }}
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
              usage={usage}
              onBack={() => setStep('idea')}
              onNext={() => {
                if (isInstrumental) { if (requireAuth('generate')) startGeneration(); }
                else setStep('lyrics');
              }}
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
              onGenerate={() => { if (requireAuth('lyrics')) generateLyrics(); }}
              onBack={() => setStep('style')}
              onNext={() => { if (requireAuth('generate')) startGeneration(); }}
            />
          )}

          {step === 'generate' && (
            <GenerateStep
              generation={generation}
              error={genError}
              onRetry={() => { if (requireAuth('generate')) startGeneration(); }}
              onStartOver={startOver}
              onBack={() => {
                if (pollTimer.current) clearTimeout(pollTimer.current);
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
              uploadCover={uploadCover}
              uploadingCover={uploadingCover}
              publishPublic={publishPublic}
              setPublishPublic={setPublishPublic}
              publishing={publishing}
              playingPreview={playingPreview}
              togglePreview={togglePreview}
              onPublish={handlePublish}
              onStartOver={startOver}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <AuthGateModal
        visible={authGateOpen}
        onClose={() => { setAuthGateOpen(false); pendingActionRef.current = null; }}
        onSuccess={onAuthSuccess}
        onNavigateToRegister={onNavigateToRegister}
      />
    </ScreenContainer>
  );
}

// ─── Header ──────────────────────────────────────────────

function Header({ usage, step }: { usage: Usage | null; step: Step }) {
  const isPublishing = step === 'publish';
  return (
    <View className="flex-row items-center justify-between px-4 pt-2 pb-1">
      <View className="flex-row items-center gap-2 flex-1">
        <View className="w-8 h-8 rounded-full bg-mym-accent/15 items-center justify-center">
          <Sparkles size={15} color="#a855f7" />
        </View>
        <View className="flex-1">
          <Text className="text-mym-text text-xl font-bold" numberOfLines={1}>
            {isPublishing ? 'Publish track' : 'Create a track'}
          </Text>
          <Text className="text-mym-muted text-[11px]">
            {isPublishing ? 'Review details and choose visibility' : 'AI music studio'}
          </Text>
        </View>
      </View>
      {usage && (
        <View className="rounded-full bg-mym-card border border-mym-border px-3 py-1.5 items-end">
          <Text className="text-mym-muted text-[9px] uppercase tracking-wider">{usage.tier === 'PREMIUM' ? 'Premium' : 'Free'}</Text>
          <Text className="text-mym-text text-sm font-bold">
            {usage.remaining}<Text className="text-mym-muted text-xs"> left</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Stepper ─────────────────────────────────────────────

const STEPS: { key: Step; label: string; icon: any }[] = [
  { key: 'idea', label: 'Idea', icon: Zap },
  { key: 'style', label: 'Style', icon: Settings2 },
  { key: 'lyrics', label: 'Lyrics', icon: FileText },
  { key: 'generate', label: 'Generate', icon: Wand2 },
  { key: 'publish', label: 'Publish', icon: Headphones },
];

function Stepper({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  const CurrentIcon = STEPS[currentIdx]?.icon || Zap;
  return (
    <View className="px-4 pt-1 pb-2">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-1.5">
          <CurrentIcon size={13} color="#a78bfa" />
          <Text className="text-mym-text text-xs font-bold">{STEPS[currentIdx]?.label || 'Create'}</Text>
        </View>
        <Text className="text-mym-muted text-[11px] font-semibold">{currentIdx + 1}/{STEPS.length}</Text>
      </View>
      <View className="flex-row gap-1">
        {STEPS.map((s, i) => (
          <View
            key={s.key}
            className={`h-1.5 flex-1 rounded-full ${
              i <= currentIdx ? 'bg-mym-accent' : 'bg-mym-card'
            }`}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Step 1: Idea ────────────────────────────────────────

function IdeaStep({ idea, setIdea, title, setTitle, onNext }: any) {
  const tokens = useTokens();
  const mutedHex = tokens.textMute;
  return (
    <View className="px-4 pt-1">
      <View className="bg-mym-card rounded-xl border border-mym-border p-4">
        <Text className="text-mym-text text-sm font-semibold mb-2">What's the song about?</Text>
        <TextInput
          value={idea}
          onChangeText={setIdea}
          multiline
          numberOfLines={5}
          maxLength={1000}
          placeholder="e.g. a nostalgic drive through the city at midnight, neon signs reflecting in the rain"
          placeholderTextColor={mutedHex}
          className="bg-mym-surface border border-mym-border rounded-xl px-3 py-2 text-mym-text text-sm"
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />
        <Text className="text-mym-muted text-xs mt-1">{idea.length}/1000 — more vivid = better</Text>

        {!idea && (
          <View className="flex-row flex-wrap gap-2 mt-3">
            {SEED_PROMPTS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => { setIdea(p); track('seed_prompt_picked', { prompt: p }); hapticSelection(); }}
                className="px-3 py-1.5 rounded-full bg-mym-surface border border-mym-border"
              >
                <Text className="text-mym-muted text-[11px] font-medium">{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View className="mt-4 pt-4 border-t border-mym-border">
          <VoiceQuickCreate />
        </View>


        <Text className="text-mym-text text-sm font-semibold mb-2 mt-4">
          Working title <Text className="text-mym-muted font-normal">(optional)</Text>
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          placeholder="You can change this later"
          placeholderTextColor={mutedHex}
          className="bg-mym-surface border border-mym-border rounded-xl px-3 py-2.5 text-mym-text text-sm"
        />
      </View>
      <View className="mt-4">
        <TouchableOpacity
          onPress={onNext}
          disabled={!idea.trim()}
          className={`h-14 flex-row items-center justify-center gap-1 rounded-xl ${idea.trim() ? 'bg-mym-accent' : 'bg-mym-card'}`}
        >
          <Text className={`text-sm font-semibold ${idea.trim() ? 'text-white' : 'text-mym-muted'}`}>Next: Style</Text>
          <ChevronRight size={14} color={idea.trim() ? '#fff' : '#71717a'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 3: Lyrics ──────────────────────────────────────

function LyricsStep({ lyrics, setLyrics, generating, error, isInstrumental, setIsInstrumental, onGenerate, onBack, onNext }: any) {
  const tokens = useTokens();
  const mutedHex = tokens.textMute;
  return (
    <View className="px-4 pt-1">
      <View className="bg-mym-card rounded-xl border border-mym-border p-4">
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-1 pr-2">
            <Text className="text-mym-text text-lg font-bold">Write or generate lyrics</Text>
            <Text className="text-mym-muted text-xs">
              The AI will use the style choices from the previous step.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsInstrumental(!isInstrumental)}
            className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${isInstrumental ? 'bg-mym-accent/20 border-mym-accent/40' : 'bg-mym-surface border-mym-border'}`}
          >
            <View className={`w-3 h-3 rounded ${isInstrumental ? 'bg-mym-accent' : 'bg-mym-muted'}`} />
            <Text className="text-mym-text text-xs font-semibold">Instrumental</Text>
          </TouchableOpacity>
        </View>

        {!isInstrumental && (
          <>
            <TouchableOpacity
              onPress={onGenerate}
              disabled={generating}
              className="flex-row items-center gap-2 self-start px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-500/30 mb-3"
            >
              {generating ? (
                <ActivityIndicator size="small" color="#a855f7" />
              ) : (
                <Wand2 size={14} color="#a855f7" />
              )}
              <Text className="text-purple-200 text-xs font-semibold">
                {generating ? 'Generating…' : lyrics ? 'Regenerate with AI' : 'Generate lyrics with AI'}
              </Text>
            </TouchableOpacity>

            {error && (
              <View className="flex-row items-start gap-2 bg-red-900/20 border border-red-500/30 rounded-lg p-2 mb-3">
                <AlertCircle size={14} color="#f87171" />
                <Text className="text-red-400 text-xs flex-1">{error}</Text>
              </View>
            )}

            <TextInput
              value={lyrics}
              onChangeText={setLyrics}
              multiline
              maxLength={3500}
              placeholder={'[Verse 1]\nNeon bleeds across the windshield glass\n...\n\n[Chorus]\n...'}
              placeholderTextColor={mutedHex}
              className="bg-mym-surface border border-mym-border rounded-xl px-3 py-2 text-mym-text text-sm"
              style={{ minHeight: 240, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
            />
            <Text className="text-mym-muted text-xs mt-1 text-right">{lyrics.length}/3500</Text>
          </>
        )}

        {isInstrumental && (
          <View className="flex-row items-start gap-2 bg-mym-surface border border-mym-border rounded-lg p-3">
            <BookOpen size={14} color="#8b5cf6" />
            <Text className="text-mym-muted text-xs flex-1">
              Instrumental mode — no lyrics. We'll generate a vocal-free track.
            </Text>
          </View>
        )}
      </View>

      <View className="flex-row gap-3 mt-4">
        <TouchableOpacity onPress={onBack} className="h-14 flex-row items-center justify-center gap-1 px-4 rounded-xl bg-mym-card border border-mym-border">
          <ChevronLeft size={14} color="#a1a1aa" />
          <Text className="text-mym-muted text-sm">Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNext}
          disabled={!isInstrumental && !lyrics.trim()}
          className={`h-14 flex-1 flex-row items-center justify-center gap-1 rounded-xl ${(isInstrumental || lyrics.trim()) ? 'bg-mym-accent' : 'bg-mym-card'}`}
        >
          <Wand2 size={14} color={(isInstrumental || lyrics.trim()) ? '#fff' : '#71717a'} />
          <Text className={`text-sm font-semibold ${(isInstrumental || lyrics.trim()) ? 'text-white' : 'text-mym-muted'}`}>Generate Music</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  usage, onBack, onNext,
}: any) {
  const tokens = useTokens();
  const mutedHex = tokens.textMute;
  const insufficient = usage && usage.remaining <= 0;
  const [showAdvanced, setShowAdvanced] = useState(false);
  const selectedGenre = GENRE_TREE.find((g: any) => g.name === genre);

  const handleGenreChange = (g: string) => {
    hapticSelection();
    if (genre === g) {
      setGenre('');
      setSubGenre('');
    } else {
      setGenre(g);
      setSubGenre('');
    }
  };

  const surpriseMe = () => {
    const g = GENRE_TREE[Math.floor(Math.random() * GENRE_TREE.length)];
    const m = MOOD_OPTIONS[Math.floor(Math.random() * MOOD_OPTIONS.length)];
    const e = ENERGY_OPTIONS[Math.floor(Math.random() * ENERGY_OPTIONS.length)];
    if (g) {
      setGenre((g as any).name);
      setSubGenre('');
    }
    if (m) setMood((m as any).name);
    if (e) setEnergy((e as any).name);
    hapticSelection();
    track('style_surprise_me', { genre: (g as any)?.name, mood: (m as any)?.name, energy: (e as any)?.name });
  };

  return (
    <View className="px-4 pt-1">
      <View className="bg-mym-card rounded-xl border border-mym-border p-4">
        <View className="flex-row items-start justify-between gap-2 mb-1">
          <View className="flex-1 pr-2">
            <Text className="text-mym-text text-lg font-bold">Pick the sound first</Text>
            <Text className="text-mym-muted text-xs mt-0.5">
              Lyrics generated next will follow this genre, vocal direction, and energy.
            </Text>
          </View>
          <TouchableOpacity
            onPress={surpriseMe}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: tokens.accentSoft, borderWidth: 1, borderColor: tokens.accent }}
            accessibilityLabel="Surprise me with random style"
          >
            <Sparkles size={12} color={tokens.accent} />
            <Text style={{ color: tokens.accent, fontWeight: '700', fontSize: 11 }}>Surprise me</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 12 }} />

        <TouchableOpacity
          onPress={() => setIsInstrumental(!isInstrumental)}
          className={`flex-row items-center justify-between rounded-xl border px-3 py-3 mb-4 ${isInstrumental ? 'bg-mym-accent/15 border-mym-accent/40' : 'bg-mym-surface border-mym-border'}`}
        >
          <View className="flex-1 pr-3">
            <Text className="text-mym-text text-sm font-semibold">
              {isInstrumental ? 'Instrumental track' : 'Vocal track'}
            </Text>
            <Text className="text-mym-muted text-xs mt-0.5">
              {isInstrumental ? 'Skip lyrics and generate a vocal-free arrangement.' : 'Write or generate lyrics after choosing the style.'}
            </Text>
          </View>
          <View className={`w-11 h-6 rounded-full p-0.5 ${isInstrumental ? 'bg-mym-accent' : 'bg-mym-border'}`}>
            <View className={`w-5 h-5 rounded-full bg-white ${isInstrumental ? 'self-end' : 'self-start'}`} />
          </View>
        </TouchableOpacity>

        <Text className="text-mym-text text-sm font-semibold mb-2">Genre</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {GENRE_TREE.map((g: any) => (
            <TouchableOpacity
              key={g.name}
              onPress={() => handleGenreChange(g.name)}
              className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${genre === g.name ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
            >
              <Text>{g.emoji}</Text>
              <Text className={`text-xs font-semibold ${genre === g.name ? 'text-white' : 'text-mym-muted'}`}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedGenre && (
          <>
            <Text className="text-mym-text text-sm font-semibold mb-2">
              Subgenre <Text className="text-mym-muted font-normal text-xs">(optional)</Text>
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {selectedGenre.subgenres.map((sg: any) => (
                <TouchableOpacity
                  key={sg.name}
                  onPress={() => {
                    setSubGenre(subGenre === sg.name ? '' : sg.name);
                    hapticSelection();
                  }}
                  className={`px-3 py-1.5 rounded-full ${subGenre === sg.name ? 'bg-purple-600' : 'bg-mym-surface border border-mym-border'}`}
                >
                  <Text className={`text-xs font-semibold ${subGenre === sg.name ? 'text-white' : 'text-mym-muted'}`}>{sg.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text className="text-mym-text text-sm font-semibold mb-2">Mood</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {MOOD_OPTIONS.map((m: any) => (
            <TouchableOpacity
              key={m.name}
              onPress={() => {
                setMood(mood === m.name ? '' : m.name);
                hapticSelection();
              }}
              className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${mood === m.name ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
            >
              <Text>{m.emoji}</Text>
              <Text className={`text-xs font-semibold ${mood === m.name ? 'text-white' : 'text-mym-muted'}`}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-mym-text text-sm font-semibold mb-2">
          Energy <Text className="text-mym-muted font-normal text-xs">(tempo + intensity)</Text>
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {ENERGY_OPTIONS.map((e: any) => (
            <TouchableOpacity
              key={e.name}
              onPress={() => {
                setEnergy(energy === e.name ? '' : e.name);
                hapticSelection();
              }}
              className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${energy === e.name ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
            >
              <Text>{e.emoji}</Text>
              <Text className={`text-xs font-semibold ${energy === e.name ? 'text-white' : 'text-mym-muted'}`}>{e.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="flex-row items-center gap-1.5 mb-2">
          <Music2 size={12} color="#a1a1aa" />
          <Text className="text-mym-text text-sm font-semibold">
            Artists you love <Text className="text-mym-muted font-normal text-xs">(optional)</Text>
          </Text>
        </View>
        <TextInput
          value={vibeReference}
          onChangeText={setVibeReference}
          maxLength={300}
          placeholder='e.g. "Daft Punk, Tame Impala, early M83"'
          placeholderTextColor={mutedHex}
          className="bg-mym-surface border border-mym-border rounded-xl px-3 py-2.5 text-mym-text text-sm"
        />
        <Text className="text-mym-muted text-xs mt-1 mb-4">
          We translate this into instruments + production cues for the AI — no copying.
        </Text>

        <TouchableOpacity
          onPress={() => setShowAdvanced(!showAdvanced)}
          className="flex-row items-center gap-1 self-start mb-2"
        >
          <ChevronRight
            size={12}
            color="#a78bfa"
            style={{ transform: [{ rotate: showAdvanced ? '90deg' : '0deg' }] }}
          />
          <Text className="text-purple-300 text-xs font-semibold">
            Advanced {showAdvanced ? '(hide)' : '(era, vocals, language, tempo, key)'}
          </Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View className="pt-2">
            <Text className="text-mym-text text-sm font-semibold mb-2">Era</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {ERA_OPTIONS.map((e: any) => (
                <TouchableOpacity
                  key={e.name}
                  onPress={() => {
                    setEra(era === e.name ? '' : e.name);
                    hapticSelection();
                  }}
                  className={`px-3 py-1.5 rounded-full ${era === e.name ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
                >
                  <Text className={`text-xs font-semibold ${era === e.name ? 'text-white' : 'text-mym-muted'}`}>{e.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {!isInstrumental && (
              <>
                <Text className="text-mym-text text-sm font-semibold mb-2">Vocal style</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {VOCAL_STYLE_OPTIONS.map((v: any) => (
                    <TouchableOpacity
                      key={v.name}
                      onPress={() => {
                        setVocalStyle(vocalStyle === v.name ? '' : v.name);
                        hapticSelection();
                      }}
                      className={`px-3 py-1.5 rounded-full ${vocalStyle === v.name ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
                    >
                      <Text className={`text-xs font-semibold ${vocalStyle === v.name ? 'text-white' : 'text-mym-muted'}`}>{v.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {!isInstrumental && (
              <>
                <Text className="text-mym-text text-sm font-semibold mb-2">Language</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      onPress={() => {
                        setLanguage(lang);
                        hapticSelection();
                      }}
                      className={`px-3 py-1.5 rounded-full ${language === lang ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
                    >
                      <Text className={`text-xs font-semibold ${language === lang ? 'text-white' : 'text-mym-muted'}`}>{lang}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text className="text-mym-text text-sm font-semibold mb-2">
              Duration ({Math.floor(durationSec / 60)}:{(durationSec % 60).toString().padStart(2, '0')})
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {[30, 60, 90, 120, 180, 240].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => {
                    setDurationSec(d);
                    hapticSelection();
                  }}
                  className={`px-3 py-1.5 rounded-full ${durationSec === d ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
                >
                  <Text className={`text-xs font-semibold ${durationSec === d ? 'text-white' : 'text-mym-muted'}`}>
                    {d < 60 ? `${d}s` : `${d / 60}:${(d % 60).toString().padStart(2, '0')}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-mym-text text-sm font-semibold mb-2">
              Tempo <Text className="text-mym-muted font-normal">{bpm ? `(${bpm} BPM)` : '(auto)'}</Text>
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              <TouchableOpacity
                onPress={() => {
                  setBpm(null);
                  hapticSelection();
                }}
                className={`px-3 py-1.5 rounded-full ${!bpm ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
              >
                <Text className={`text-xs font-semibold ${!bpm ? 'text-white' : 'text-mym-muted'}`}>Auto</Text>
              </TouchableOpacity>
              {TEMPO_OPTIONS.map((tempo) => (
                <TouchableOpacity
                  key={tempo}
                  onPress={() => {
                    setBpm(tempo);
                    hapticSelection();
                  }}
                  className={`px-3 py-1.5 rounded-full ${bpm === tempo ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
                >
                  <Text className={`text-xs font-semibold ${bpm === tempo ? 'text-white' : 'text-mym-muted'}`}>{tempo}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-mym-text text-sm font-semibold mb-2">
              Key <Text className="text-mym-muted font-normal">{musicalKey || '(auto)'}</Text>
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              <TouchableOpacity
                onPress={() => {
                  setMusicalKey('');
                  hapticSelection();
                }}
                className={`px-3 py-1.5 rounded-full ${!musicalKey ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
              >
                <Text className={`text-xs font-semibold ${!musicalKey ? 'text-white' : 'text-mym-muted'}`}>Auto</Text>
              </TouchableOpacity>
              {MUSICAL_KEY_OPTIONS.map((keyName) => (
                <TouchableOpacity
                  key={keyName}
                  onPress={() => {
                    setMusicalKey(keyName);
                    hapticSelection();
                  }}
                  className={`px-3 py-1.5 rounded-full ${musicalKey === keyName ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
                >
                  <Text className={`text-xs font-semibold ${musicalKey === keyName ? 'text-white' : 'text-mym-muted'}`}>{keyName}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-mym-text text-sm font-semibold mb-2">
              Extra style notes <Text className="text-mym-muted font-normal">(optional)</Text>
            </Text>
            <TextInput
              value={style}
              onChangeText={setStyle}
              maxLength={300}
              placeholder='e.g. "dreamy synth pads, trap drums, slow-burn outro"'
              placeholderTextColor={mutedHex}
              className="bg-mym-surface border border-mym-border rounded-xl px-3 py-2.5 text-mym-text text-sm"
            />
          </View>
        )}
      </View>

      {insufficient && (
        <View className="flex-row items-start gap-2 bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 mt-4">
          <AlertCircle size={14} color="#fbbf24" />
          <View className="flex-1">
            <Text className="text-amber-300 text-sm font-semibold">Daily limit reached</Text>
            <Text className="text-amber-200/80 text-xs">
              Used {usage.used}/{usage.limit} today. Resets {new Date(usage.resetsAt).toLocaleTimeString()}.
            </Text>
          </View>
        </View>
      )}

      <View className="flex-row gap-3 mt-5 mb-2">
        <TouchableOpacity onPress={onBack} className="h-14 flex-row items-center justify-center gap-1 px-4 rounded-xl bg-mym-card border border-mym-border">
          <ChevronLeft size={14} color="#a1a1aa" />
          <Text className="text-mym-muted text-sm">Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNext}
          disabled={!!insufficient}
          className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-purple-600"
          style={{ opacity: insufficient ? 0.5 : 1 }}
        >
          <Wand2 size={16} color="#fff" />
          <Text className="text-white text-base font-bold">{isInstrumental ? 'Generate Music' : 'Next: Lyrics'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Step 4: Generate ────────────────────────────────────

function GenerateStep({ generation, error, onRetry, onStartOver, onBack }: any) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const int = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(int);
  }, []);

  if (error) {
    return (
      <View className="px-4 pt-2">
        <View className="bg-mym-card border border-red-500/30 rounded-xl p-6 items-center">
          <AlertCircle size={40} color="#f87171" />
          <Text className="text-mym-text text-xl font-bold mt-3 mb-2">Generation failed</Text>
          <Text className="text-red-400 text-sm text-center mb-5">{error}</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity onPress={onBack} className="px-4 py-2.5 rounded-lg bg-mym-surface border border-mym-border">
              <Text className="text-mym-muted text-sm">Edit inputs</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onRetry} className="flex-row items-center gap-1 px-4 py-2.5 rounded-lg bg-mym-accent">
              <RotateCcw size={12} color="#fff" />
              <Text className="text-white text-sm font-semibold">Try again</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={onStartOver} className="mt-3">
            <Text className="text-mym-muted text-xs">Start over</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const label =
    generation?.status === 'PENDING' ? 'Queueing your track…'
    : generation?.status === 'PROCESSING' ? 'The AI is composing…'
    : generation?.status === 'COMPLETED' ? 'Ready!'
    : 'Working…';

  return (
    <View className="px-4 pt-2" style={{ flexGrow: 1, justifyContent: 'center' }}>
      <View className="bg-mym-card border border-mym-border rounded-xl p-6 items-center justify-center" style={{ minHeight: 340 }}>
        <View className="w-24 h-24 rounded-full bg-purple-600/20 border border-purple-500/30 items-center justify-center mb-5">
          {generation?.status === 'COMPLETED' ? (
            <CheckCircle2 size={38} color="#4ade80" />
          ) : (
            <Loader2 size={38} color="#a855f7" />
          )}
        </View>
        <Text className="text-mym-text text-xl font-bold mb-2">{label}</Text>
        <Text className="text-mym-muted text-sm text-center mb-4">
          This usually takes 30–90 seconds. Feel free to leave this screen — we'll save the result.
        </Text>
        <View className="rounded-full bg-mym-surface border border-mym-border px-4 py-2">
          <Text className="text-mym-muted text-xs font-semibold">
          Elapsed: {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Step 5: Publish ─────────────────────────────────────

function PublishStep({
  generation, title, setTitle, agents, genres,
  publishAgentId, setPublishAgentId, publishGenreId, setPublishGenreId,
  publishCover, uploadCover, uploadingCover, publishPublic, setPublishPublic,
  publishing, playingPreview, togglePreview, onPublish, onStartOver,
}: any) {
  const tokens = useTokens();
  const mutedHex = tokens.textMute;
  useEffect(() => {
    if (agents.length > 0 && !publishAgentId) {
      setPublishAgentId(agents[0].id);
    }
  }, [agents, publishAgentId, setPublishAgentId]);

  const hasAgents = agents.length > 0;

  return (
    <View className="px-4 pt-1">
      <View className="bg-mym-card border border-mym-border rounded-xl p-4">
        <View className="flex-row items-start gap-3 mb-4">
          <View className="w-10 h-10 rounded-full bg-green-900/40 items-center justify-center">
            <CheckCircle2 size={20} color="#4ade80" />
          </View>
          <View className="flex-1">
            <Text className="text-mym-text text-lg font-bold">Your track is ready</Text>
            <Text className="text-mym-muted text-sm">Preview it, tweak details, publish.</Text>
          </View>
        </View>

        {/* Preview */}
        <TouchableOpacity
          onPress={togglePreview}
          className="bg-mym-surface border border-mym-border rounded-xl p-4 flex-row items-center gap-3 mb-4"
        >
          <View className="w-10 h-10 rounded-full bg-mym-accent items-center justify-center">
            {playingPreview ? (
              <Pause size={16} color="#fff" fill="#fff" />
            ) : (
              <Play size={16} color="#fff" fill="#fff" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-mym-text text-sm font-semibold">Preview audio</Text>
            {generation.durationSec && (
              <View className="flex-row items-center gap-1 mt-0.5">
                <Clock size={10} color="#71717a" />
                <Text className="text-mym-muted text-xs">
                  {Math.floor(generation.durationSec / 60)}:{(generation.durationSec % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Cover */}
        <Text className="text-mym-text text-sm font-semibold mb-2">Cover art</Text>
        <TouchableOpacity
          onPress={uploadCover}
          disabled={uploadingCover}
          className="w-28 h-28 rounded-xl bg-mym-surface border-2 border-dashed border-mym-border items-center justify-center mb-4 overflow-hidden"
          style={uploadingCover ? { opacity: 0.6 } : undefined}
        >
          {uploadingCover ? (
            <View className="items-center">
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text className="text-mym-muted text-xs mt-2">Uploading…</Text>
            </View>
          ) : publishCover ? (
            <Image source={{ uri: publishCover }} className="w-full h-full" />
          ) : (
            <View className="items-center">
              <Wand2 size={18} color="#71717a" />
              <Text className="text-mym-muted text-xs mt-1">Tap to upload</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Title */}
        <Text className="text-mym-text text-sm font-semibold mb-2">Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          className="bg-mym-surface border border-mym-border rounded-xl px-3 py-2.5 text-mym-text text-sm mb-4"
        />

        {/* Genre */}
        <Text className="text-mym-text text-sm font-semibold mb-2">Genre</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} className="mb-4">
          <TouchableOpacity
            onPress={() => setPublishGenreId('')}
            className={`px-3 py-1.5 rounded-full ${!publishGenreId ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
          >
            <Text className={`text-xs font-semibold ${!publishGenreId ? 'text-white' : 'text-mym-muted'}`}>None</Text>
          </TouchableOpacity>
          {genres.map((g: any) => (
            <TouchableOpacity
              key={g.id}
              onPress={() => setPublishGenreId(g.id)}
              className={`px-3 py-1.5 rounded-full ${publishGenreId === g.id ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
            >
              <Text className={`text-xs font-semibold ${publishGenreId === g.id ? 'text-white' : 'text-mym-muted'}`}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Agent */}
        <View className="flex-row items-center gap-1.5 mb-2">
          <Bot size={14} color="#8b5cf6" />
          <Text className="text-mym-text text-sm font-semibold">Publish under agent</Text>
        </View>
        {hasAgents ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} className="mb-4">
            {agents.map((a: any) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setPublishAgentId(a.id)}
                className={`px-3 py-1.5 rounded-full ${publishAgentId === a.id ? 'bg-mym-accent' : 'bg-mym-surface border border-mym-border'}`}
              >
                <Text className={`text-xs font-semibold ${publishAgentId === a.id ? 'text-white' : 'text-mym-muted'}`}>{a.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 mb-4">
            <Text className="text-amber-300 text-sm font-semibold mb-1">You need an agent to publish</Text>
            <Text className="text-amber-200/80 text-xs">Create one in Creator Studio first.</Text>
          </View>
        )}

        {/* Visibility */}
        <Text className="text-mym-text text-sm font-semibold mb-2">Visibility</Text>
        <View className="flex-row gap-2 mb-2">
          <TouchableOpacity
            onPress={() => setPublishPublic(true)}
            className={`flex-1 p-3 rounded-xl border ${publishPublic ? 'bg-mym-accent/10 border-mym-accent' : 'bg-mym-surface border-mym-border'}`}
          >
            <Globe size={14} color={publishPublic ? '#8b5cf6' : '#71717a'} />
            <Text className="text-mym-text text-sm font-semibold mt-1">Public</Text>
            <Text className="text-mym-muted text-xs">Anyone can discover & play</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setPublishPublic(false)}
            className={`flex-1 p-3 rounded-xl border ${!publishPublic ? 'bg-mym-accent/10 border-mym-accent' : 'bg-mym-surface border-mym-border'}`}
          >
            <LockKeyhole size={14} color={!publishPublic ? '#8b5cf6' : '#71717a'} />
            <Text className="text-mym-text text-sm font-semibold mt-1">Private</Text>
            <Text className="text-mym-muted text-xs">Only you can play it</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row gap-3 mt-4 mb-2">
        <TouchableOpacity onPress={onStartOver} className="h-14 flex-row items-center justify-center gap-1 px-4 rounded-xl bg-mym-card border border-mym-border">
          <RotateCcw size={14} color="#a1a1aa" />
          <Text className="text-mym-muted text-sm">Start over</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onPublish}
          disabled={publishing || !hasAgents || !title.trim()}
          className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-purple-600"
          style={{ opacity: publishing || !hasAgents || !title.trim() ? 0.5 : 1 }}
        >
          {publishing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Flame size={14} color="#fff" />
          )}
          <Text className="text-white text-base font-bold">{publishing ? 'Publishing…' : 'Publish track'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
