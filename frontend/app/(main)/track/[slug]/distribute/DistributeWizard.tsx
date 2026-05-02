'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/authStore';
import { toast } from '@/lib/store/toastStore';
import { ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle2, Music } from 'lucide-react';

const PARTNERS = ['manual', 'distrokid', 'tunecore'] as const;
type Partner = typeof PARTNERS[number];
const PRIMARY_GENRES = [
  'Pop', 'Hip Hop / Rap', 'R&B / Soul', 'Electronic / Dance', 'Rock', 'Indie', 'Folk',
  'Country', 'Jazz', 'Classical', 'Latin', 'Reggae', 'Metal', 'World', 'Cinematic', 'Other',
];
const LANGUAGES = [
  'English', 'Spanish', 'Portuguese', 'French', 'German', 'Italian', 'Japanese', 'Korean',
  'Mandarin', 'Hindi', 'Arabic', 'Instrumental / No vocals',
];

type Track = {
  id: string;
  slug: string;
  title: string;
  coverArt?: string | null;
  agent?: { ownerId: string; name: string };
};

interface ExistingDistribution {
  id: string;
  status: 'PENDING' | 'SUBMITTED' | 'LIVE' | 'REJECTED' | 'TAKEDOWN';
  partner: string;
  releaseDate?: string | null;
  releaseTitle?: string | null;
  artistName?: string | null;
}

export function DistributeWizard({ slug }: { slug: string }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [track, setTrack] = useState<Track | null>(null);
  const [existing, setExisting] = useState<ExistingDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [step, setStep] = useState(0);
  const [partner, setPartner] = useState<Partner>('manual');
  const [releaseTitle, setReleaseTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [primaryGenre, setPrimaryGenre] = useState('Pop');
  const [language, setLanguage] = useState('English');
  const [explicit, setExplicit] = useState(false);
  const [songwriters, setSongwriters] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const tr = await api.get(`/tracks/${encodeURIComponent(slug)}`);
        if (cancelled) return;
        const t: Track = tr.data?.track;
        setTrack(t);
        if (t) {
          setReleaseTitle(t.title);
          setArtistName(t.agent?.name || '');
          try {
            const dr = await api.get(`/tracks/${t.id}/distribution`);
            if (cancelled) return;
            const dists = (dr.data?.distributions || []) as ExistingDistribution[];
            const open = dists.find((d) => ['PENDING', 'SUBMITTED', 'LIVE'].includes(d.status));
            if (open) setExisting(open);
          } catch {
            // 401 / 404 are fine; new track or no record yet
          }
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            'Failed to load track'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const submit = async () => {
    if (!track) return;
    setSubmitting(true);
    try {
      const songwriterList = songwriters
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      const r = await api.post(`/tracks/${track.id}/distribution`, {
        partner,
        releaseTitle,
        artistName,
        releaseDate: releaseDate || undefined,
        metadata: {
          primaryGenre,
          language,
          explicit,
          songwriters: songwriterList,
        },
      });
      setExisting(r.data?.distribution);
      setSubmitted(true);
      toast.success('Distribution requested — we\'ll email you when it\'s live');
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to submit distribution'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-300 mx-auto mb-3" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading…</p>
      </div>
    );
  }
  if (error || !track) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-rose-300 mx-auto mb-4" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{error || 'Track not found'}</p>
        <Link href="/" className="text-purple-300 hover:underline">Back home</Link>
      </div>
    );
  }
  if (!isAuthenticated || !user || track.agent?.ownerId !== user.id) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-300 mx-auto mb-4" />
        <h1 className="text-lg font-semibold text-white mb-2">Owner only</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          Only the track owner can submit it for distribution.
        </p>
        <Link href={`/track/${track.slug}`} className="text-purple-300 hover:underline">Back to track</Link>
      </div>
    );
  }

  if (existing && (existing.status === 'PENDING' || existing.status === 'SUBMITTED' || existing.status === 'LIVE')) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <Link href={`/track/${track.slug}`} className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to track
        </Link>
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white mb-2">Already submitted</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2">
            Status: <span className="font-mono text-white">{existing.status}</span>
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Partner: <span className="text-white">{existing.partner}</span>
            {existing.releaseDate && ` · Release ${new Date(existing.releaseDate).toLocaleDateString()}`}
          </p>
          {existing.status !== 'LIVE' && (
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4">
              You&apos;ll get a notification when this track goes live on streaming services.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in py-12 text-center">
        <CheckCircle2 className="w-14 h-14 text-emerald-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Submitted!</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          We received your distribution request. We&apos;ll email you once your track is live on Spotify, Apple Music, and other services. This usually takes 1–2 weeks.
        </p>
        <Link href={`/track/${track.slug}`} className="text-purple-300 hover:underline">Back to track</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <Link href={`/track/${track.slug}`} className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to track
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Distribute to streaming services</h1>
      <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
        Submit &quot;{track.title}&quot; to Spotify, Apple Music, Tidal, Amazon, and Deezer via our partner.
      </p>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 mb-6">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[hsl(var(--border))]">
          <div className="w-12 h-12 rounded-lg bg-[hsl(var(--secondary))] overflow-hidden flex-shrink-0">
            {track.coverArt ? (
              <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{track.title}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{track.agent?.name}</p>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i <= step ? 'bg-purple-400' : 'bg-[hsl(var(--border))]'}`} />
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white">Release info</h2>

            <div>
              <label className="block text-xs font-medium text-white mb-1.5">Release title</label>
              <input
                value={releaseTitle}
                onChange={(e) => setReleaseTitle(e.target.value)}
                maxLength={200}
                className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white mb-1.5">Artist name (display on Spotify/Apple)</label>
              <input
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                maxLength={200}
                className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm focus:outline-none focus:border-purple-400"
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                You can use the AI agent name or a different stage name.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-white mb-1.5">Target release date</label>
              <input
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm focus:outline-none focus:border-purple-400"
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                Optional. Leave blank to release as soon as approved.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-white mb-1.5">Partner</label>
              <div className="grid grid-cols-3 gap-2">
                {PARTNERS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPartner(p)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      partner === p
                        ? 'bg-purple-500 border-purple-500 text-white'
                        : 'bg-[hsl(var(--background))] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]/20'
                    }`}
                  >
                    {p === 'manual' ? 'Manual (we handle it)' : p}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                &quot;Manual&quot; routes through our ops team — pick this if you don&apos;t have your own partner account.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white">Metadata</h2>

            <div>
              <label className="block text-xs font-medium text-white mb-1.5">Primary genre</label>
              <select
                value={primaryGenre}
                onChange={(e) => setPrimaryGenre(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
              >
                {PRIMARY_GENRES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-white mb-1.5">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm"
              >
                {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={explicit}
                onChange={(e) => setExplicit(e.target.checked)}
                className="rounded"
              />
              Mark as explicit (requires uncensored content flag)
            </label>

            <div>
              <label className="block text-xs font-medium text-white mb-1.5">Songwriter credits</label>
              <textarea
                value={songwriters}
                onChange={(e) => setSongwriters(e.target.value)}
                rows={3}
                placeholder="One songwriter per line. Use legal name."
                className="w-full px-3 py-2 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-white text-sm resize-none"
                maxLength={2000}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white">Review</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Release title" value={releaseTitle} />
              <Row label="Artist name" value={artistName} />
              <Row label="Partner" value={partner} />
              <Row label="Release date" value={releaseDate || 'As soon as approved'} />
              <Row label="Primary genre" value={primaryGenre} />
              <Row label="Language" value={language} />
              <Row label="Explicit" value={explicit ? 'Yes' : 'No'} />
              <Row label="Songwriters" value={songwriters || '—'} mono />
            </dl>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => (step === 0 ? router.push(`/track/${track.slug}`) : setStep((s) => s - 1))}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-[hsl(var(--border))] text-sm font-medium text-white hover:bg-[hsl(var(--accent))]/20"
          >
            <ArrowLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 2 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!releaseTitle.trim() || !artistName.trim()}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-purple-500 hover:bg-purple-400 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold disabled:opacity-50 hover:scale-[1.01] transition-transform"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Submit for distribution
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <dt className="text-[hsl(var(--muted-foreground))] flex-shrink-0">{label}</dt>
      <dd className={`text-white text-right break-words ${mono ? 'font-mono whitespace-pre-line' : ''}`}>{value}</dd>
    </div>
  );
}
