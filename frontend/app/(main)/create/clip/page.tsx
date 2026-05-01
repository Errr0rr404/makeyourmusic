'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { toast } from 'sonner';
import { SongPicker, type PickedTrack } from '@/components/clip/SongPicker';
import {
  Lock, Loader2, Upload, Film, Music2, X, Globe, LockKeyhole, Link as LinkIcon,
  Wand2, AlertCircle, ChevronRight, Play, Pause, Hash,
} from 'lucide-react';

const MAX_CLIP_MS = 60_000;
const MIN_CLIP_MS = 1_000;
const MAX_RAW_VIDEO_MB = 200;
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

type Visibility = 'PRIVATE' | 'PUBLIC' | 'UNLISTED';

interface UploadedVideo {
  url: string;
  publicId: string;
  durationMs: number; // server-reported
  width?: number;
  height?: number;
}

// useSearchParams() requires a Suspense boundary in Next 15+ for static
// rendering. Other auth pages already do this — wrap the inner content the
// same way to avoid the build-time bail-out.
export default function CreateClipPage() {
  return (
    <Suspense fallback={<CreateClipFallback />}>
      <CreateClipPageContent />
    </Suspense>
  );
}

function CreateClipFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--accent))]" />
    </div>
  );
}

function CreateClipPageContent() {
  const router = useRouter();
  const search = useSearchParams();
  const { isAuthenticated } = useAuthStore();

  // Stages: video → song → trim → details → publish
  const [video, setVideo] = useState<UploadedVideo | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const [track, setTrack] = useState<PickedTrack | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [trimStartMs, setTrimStartMs] = useState(0);
  const [trimEndMs, setTrimEndMs] = useState(0);
  const [audioStartMs, setAudioStartMs] = useState(0);

  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PRIVATE');

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  // Cleanup the local object URL when we replace/clear the video.
  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  // Prefill the picked track when arriving via "Use this sound" deep-links.
  useEffect(() => {
    if (!isAuthenticated) return;
    const trackId = search?.get('trackId');
    if (!trackId || track) return;
    api.get(`/tracks/${trackId}`)
      .then((res) => {
        const t = res.data?.track;
        if (!t) return;
        setTrack({
          id: t.id,
          title: t.title,
          slug: t.slug,
          audioUrl: t.audioUrl,
          coverArt: t.coverArt ?? null,
          duration: t.duration ?? 0,
          agent: {
            id: t.agent?.id ?? '',
            name: t.agent?.name ?? '',
            slug: t.agent?.slug ?? '',
            avatar: t.agent?.avatar ?? null,
          },
        });
      })
      .catch(() => {});
  }, [isAuthenticated, search, track]);

  // Reset trim window whenever a new video is loaded.
  useEffect(() => {
    if (!video) return;
    const cap = Math.min(video.durationMs, MAX_CLIP_MS);
    setTrimStartMs(0);
    setTrimEndMs(cap);
  }, [video]);

  // Whenever the trim duration changes, clamp audioStart so the window fits the song.
  useEffect(() => {
    if (!track) return;
    const trackMs = track.duration * 1000;
    const clipMs = Math.max(0, trimEndMs - trimStartMs);
    const maxOffset = Math.max(0, trackMs - clipMs);
    if (audioStartMs > maxOffset) setAudioStartMs(maxOffset);
  }, [track, trimStartMs, trimEndMs, audioStartMs]);

  if (!isAuthenticated) {
    return (
      <div className="text-center py-20">
        <Lock className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Make a clip</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-4">Log in to upload video and create clips</p>
        <Link href="/login" className="px-6 py-2.5 rounded-full bg-[hsl(var(--primary))] text-white font-medium">
          Log In
        </Link>
      </div>
    );
  }

  const onFilePicked = async (file: File) => {
    setUploadError('');
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setUploadError('Only MP4, WebM, OGG, or MOV videos are supported.');
      return;
    }
    if (file.size > MAX_RAW_VIDEO_MB * 1024 * 1024) {
      setUploadError(`Video must be under ${MAX_RAW_VIDEO_MB}MB.`);
      return;
    }

    // Local preview while we upload
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    const objUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objUrl);

    setUploading(true);
    setUploadProgress(0);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/upload/video', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt: { loaded: number; total?: number }) => {
          if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });
      const durationMs = Math.round((res.data.duration || 0) * 1000);
      setVideo({
        url: res.data.url,
        publicId: res.data.publicId,
        durationMs: durationMs > 0 ? durationMs : MAX_CLIP_MS,
        width: res.data.width,
        height: res.data.height,
      });
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setUploadError(e.response?.data?.error || e.message || 'Upload failed');
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const clearVideo = () => {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(null);
    setVideo(null);
    setTrimStartMs(0);
    setTrimEndMs(0);
  };

  const addHashtag = () => {
    const raw = hashtagInput.trim().replace(/^#/, '');
    if (!raw) return;
    if (hashtags.includes(raw)) {
      setHashtagInput('');
      return;
    }
    if (hashtags.length >= 10) {
      toast.error('Up to 10 hashtags');
      return;
    }
    setHashtags([...hashtags, raw.slice(0, 32)]);
    setHashtagInput('');
  };

  const handlePublish = async () => {
    if (!video) {
      toast.error('Upload a video first');
      return;
    }
    if (!track) {
      toast.error('Pick a song');
      return;
    }
    const clipMs = trimEndMs - trimStartMs;
    if (clipMs < MIN_CLIP_MS) {
      toast.error('Clip must be at least 1 second');
      return;
    }
    if (clipMs > MAX_CLIP_MS) {
      toast.error('Clip cannot exceed 60 seconds');
      return;
    }
    setPublishing(true);
    setPublishError('');
    try {
      const res = await api.post('/clips', {
        trackId: track.id,
        rawVideoUrl: video.url,
        rawPublicId: video.publicId,
        trimStartMs,
        trimEndMs,
        audioStartMs,
        visibility,
        caption: caption.trim() || undefined,
        hashtags,
      });
      toast.success('Clip published!');
      router.push(`/clips/${res.data.clip.id}`);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      const msg = e.response?.data?.error || e.message || 'Failed to publish';
      setPublishError(msg);
    } finally {
      setPublishing(false);
    }
  };

  const previewSrc = video?.url || localPreviewUrl;
  const trackMs = track ? track.duration * 1000 : 0;
  const clipMs = trimEndMs - trimStartMs;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Film className="w-5 h-5 text-pink-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-pink-300">
            Clip Studio
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
          Make a clip
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Upload a video, pair it with a song, and trim to 60 seconds or less.
        </p>
      </div>

      <div className="space-y-5">
        <Section title="1. Upload your video" icon={<Upload className="w-4 h-4" />}>
          {!video && !uploading && (
            <VideoDropzone onFile={onFilePicked} error={uploadError} />
          )}
          {uploading && (
            <div className="p-5 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))]">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-[hsl(var(--accent))] animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Uploading…</p>
                  <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-[hsl(var(--accent))] transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{uploadProgress}%</p>
                </div>
              </div>
            </div>
          )}
          {video && (
            <VideoPreview
              src={previewSrc!}
              durationMs={video.durationMs}
              trimStartMs={trimStartMs}
              trimEndMs={trimEndMs}
              audioPreviewUrl={track?.audioUrl}
              audioStartMs={audioStartMs}
              onClear={clearVideo}
            />
          )}
        </Section>

        {video && (
          <Section title="2. Pick the song" icon={<Music2 className="w-4 h-4" />}>
            {!track ? (
              <button
                onClick={() => setPickerOpen(true)}
                className="w-full p-5 rounded-xl border-2 border-dashed border-[hsl(var(--border))] hover:border-white/30 transition-colors text-left flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-[hsl(var(--accent))]/10 flex items-center justify-center flex-shrink-0">
                  <Music2 className="w-5 h-5 text-[hsl(var(--accent))]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Pick a song</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Use one of yours or search the catalog
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] flex items-center gap-3">
                <div className="w-12 h-12 rounded-md bg-[hsl(var(--card))] overflow-hidden flex-shrink-0">
                  {track.coverArt ? (
                    <img src={track.coverArt} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center">
                      <Music2 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{track.title}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                    {track.agent.name} · {Math.floor(track.duration / 60)}:
                    {(track.duration % 60).toString().padStart(2, '0')}
                  </p>
                </div>
                <button
                  onClick={() => setPickerOpen(true)}
                  className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white text-xs font-medium"
                >
                  Change
                </button>
              </div>
            )}
          </Section>
        )}

        {video && track && (
          <Section title="3. Trim & sync" icon={<Wand2 className="w-4 h-4" />}>
            <TrimSync
              videoDurationMs={video.durationMs}
              trackDurationMs={trackMs}
              trimStartMs={trimStartMs}
              trimEndMs={trimEndMs}
              audioStartMs={audioStartMs}
              setTrimStartMs={setTrimStartMs}
              setTrimEndMs={setTrimEndMs}
              setAudioStartMs={setAudioStartMs}
            />
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <Stat label="Clip length" value={fmtTime(clipMs)} />
              <Stat label="Video in" value={fmtTime(trimStartMs)} />
              <Stat label="Song in" value={fmtTime(audioStartMs)} />
            </div>
          </Section>
        )}

        {video && track && (
          <Section title="4. Details" icon={<Hash className="w-4 h-4" />}>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-white mb-1.5">
                  Caption <span className="text-[hsl(var(--muted-foreground))] font-normal">(optional)</span>
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Tell people what this is about"
                  className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none resize-none"
                />
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 text-right">
                  {caption.length}/500
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-1.5">
                  Hashtags <span className="text-[hsl(var(--muted-foreground))] font-normal">(up to 10)</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {hashtags.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHashtags(hashtags.filter((x) => x !== h))}
                      className="px-2 py-1 rounded-full bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))] text-xs flex items-center gap-1"
                    >
                      #{h}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
                <input
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value.replace(/\s+/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                      e.preventDefault();
                      addHashtag();
                    }
                  }}
                  onBlur={addHashtag}
                  placeholder="add a tag and press enter"
                  className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-[hsl(var(--accent))] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Visibility</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <VisibilityCard
                    icon={<LockKeyhole className="w-4 h-4" />}
                    title="Private"
                    desc="Only you can see it"
                    active={visibility === 'PRIVATE'}
                    onClick={() => setVisibility('PRIVATE')}
                  />
                  <VisibilityCard
                    icon={<LinkIcon className="w-4 h-4" />}
                    title="Unlisted"
                    desc="Anyone with the link"
                    active={visibility === 'UNLISTED'}
                    onClick={() => setVisibility('UNLISTED')}
                  />
                  <VisibilityCard
                    icon={<Globe className="w-4 h-4" />}
                    title="Public"
                    desc="On your profile + feed"
                    active={visibility === 'PUBLIC'}
                    onClick={() => setVisibility('PUBLIC')}
                  />
                </div>
              </div>
            </div>
          </Section>
        )}

        {video && track && (
          <div className="space-y-2">
            {publishError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{publishError}</span>
              </div>
            )}
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-bold hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
            >
              {publishing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
              ) : (
                <>Publish clip <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}
      </div>

      <SongPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(t) => {
          setTrack(t);
          setAudioStartMs(0);
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────

function fmtTime(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const tenths = Math.floor((Math.max(0, ms) % 1000) / 100);
  return `${m}:${s.toString().padStart(2, '0')}.${tenths}`;
}

function Section({
  title, icon, children,
}: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white">
        <span className="text-[hsl(var(--accent))]">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-[hsl(var(--secondary))] border border-[hsl(var(--border))]">
      <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="text-sm font-semibold text-white tabular-nums">{value}</p>
    </div>
  );
}

function VisibilityCard({
  icon, title, desc, active, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border text-left transition-colors ${
        active
          ? 'bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))]'
          : 'bg-[hsl(var(--secondary))] border-[hsl(var(--border))] hover:border-white/20'
      }`}
    >
      <div className={`mb-1.5 ${active ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))]'}`}>
        {icon}
      </div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{desc}</p>
    </button>
  );
}

function VideoDropzone({ onFile, error }: { onFile: (f: File) => void; error: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        className={`p-8 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
          drag ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5' : 'border-[hsl(var(--border))] hover:border-white/30'
        }`}
      >
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-[hsl(var(--accent))]/10 grid place-items-center">
            <Upload className="w-5 h-5 text-[hsl(var(--accent))]" />
          </div>
          <p className="text-sm font-medium text-white">Drag a video or click to upload</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            MP4 / WebM / MOV · up to {MAX_RAW_VIDEO_MB}MB · we&apos;ll trim to 60s
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_VIDEO_TYPES.join(',')}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
          className="hidden"
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

function VideoPreview({
  src, durationMs, trimStartMs, trimEndMs,
  audioPreviewUrl, audioStartMs,
  onClear,
}: {
  src: string;
  durationMs: number;
  trimStartMs: number;
  trimEndMs: number;
  audioPreviewUrl?: string;
  audioStartMs: number;
  onClear: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // When trim window changes, snap the playhead to start so the user sees their selection.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime * 1000 < trimStartMs || v.currentTime * 1000 > trimEndMs) {
      v.currentTime = trimStartMs / 1000;
    }
  }, [trimStartMs, trimEndMs]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v) return;
    if (v.paused) {
      v.muted = true; // we play track audio instead
      v.currentTime = trimStartMs / 1000;
      void v.play();
      if (a) {
        a.currentTime = audioStartMs / 1000;
        void a.play();
      }
      setPlaying(true);
    } else {
      v.pause();
      if (a) a.pause();
      setPlaying(false);
    }
  }, [trimStartMs, audioStartMs]);

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const ms = v.currentTime * 1000;
    if (ms >= trimEndMs) {
      v.pause();
      v.currentTime = trimStartMs / 1000;
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.currentTime = audioStartMs / 1000;
      }
      setPlaying(false);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden bg-black border border-[hsl(var(--border))] relative aspect-[9/16] max-h-[60vh] mx-auto">
      <video
        ref={videoRef}
        src={src}
        playsInline
        muted
        onTimeUpdate={onTimeUpdate}
        onEnded={() => setPlaying(false)}
        className="w-full h-full object-contain bg-black"
      />
      {audioPreviewUrl && (
        <audio ref={audioRef} src={audioPreviewUrl} preload="metadata" className="hidden" />
      )}

      <button
        onClick={togglePlay}
        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group"
        aria-label={playing ? 'Pause' : 'Play preview'}
      >
        {!playing && (
          <span className="w-14 h-14 rounded-full bg-black/40 backdrop-blur grid place-items-center group-hover:scale-105 transition-transform">
            <Play className="w-6 h-6 text-white" />
          </span>
        )}
        {playing && (
          <span className="w-14 h-14 rounded-full bg-black/40 backdrop-blur opacity-0 group-hover:opacity-100 grid place-items-center transition-opacity">
            <Pause className="w-6 h-6 text-white" />
          </span>
        )}
      </button>

      <button
        onClick={onClear}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white"
        aria-label="Remove video"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-[10px] font-mono tabular-nums">
        {fmtTime(durationMs)}
      </div>
    </div>
  );
}

function TrimSync({
  videoDurationMs, trackDurationMs,
  trimStartMs, trimEndMs, audioStartMs,
  setTrimStartMs, setTrimEndMs, setAudioStartMs,
}: {
  videoDurationMs: number;
  trackDurationMs: number;
  trimStartMs: number;
  trimEndMs: number;
  audioStartMs: number;
  setTrimStartMs: (v: number) => void;
  setTrimEndMs: (v: number) => void;
  setAudioStartMs: (v: number) => void;
}) {
  // Two single-thumb sliders enforced to maintain 1s..60s window.
  const onStart = (v: number) => {
    const next = Math.min(Math.max(0, v), trimEndMs - 1000);
    setTrimStartMs(next);
    if (trimEndMs - next > MAX_CLIP_MS) {
      setTrimEndMs(next + MAX_CLIP_MS);
    }
  };
  const onEnd = (v: number) => {
    const next = Math.max(Math.min(videoDurationMs, v), trimStartMs + 1000);
    setTrimEndMs(next);
    if (next - trimStartMs > MAX_CLIP_MS) {
      setTrimStartMs(next - MAX_CLIP_MS);
    }
  };

  const clipMs = trimEndMs - trimStartMs;
  const maxAudioStart = Math.max(0, trackDurationMs - clipMs);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-white">Video — start</label>
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">{fmtTime(trimStartMs)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, videoDurationMs - 1000)}
          step={100}
          value={trimStartMs}
          onChange={(e) => onStart(parseInt(e.target.value, 10))}
          className="w-full accent-[hsl(var(--accent))]"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-white">Video — end</label>
          <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">{fmtTime(trimEndMs)}</span>
        </div>
        <input
          type="range"
          min={1000}
          max={videoDurationMs}
          step={100}
          value={trimEndMs}
          onChange={(e) => onEnd(parseInt(e.target.value, 10))}
          className="w-full accent-[hsl(var(--accent))]"
        />
        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
          Cap is 60 seconds — the other handle slides to keep the window valid.
        </p>
      </div>

      {trackDurationMs > 0 && (
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-white">Song — start at</label>
            <span className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums">{fmtTime(audioStartMs)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={maxAudioStart}
            step={100}
            value={Math.min(audioStartMs, maxAudioStart)}
            onChange={(e) => setAudioStartMs(parseInt(e.target.value, 10))}
            className="w-full accent-[hsl(var(--accent))]"
          />
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
            Where in the song to begin — useful for jumping straight to the chorus.
          </p>
        </div>
      )}
    </div>
  );
}
