import type { Metadata } from 'next';
import { serverFetch, getSiteUrl } from '@/lib/serverApi';
import { TrackDetailClient } from './TrackDetailClient';

interface TrackData {
  track: {
    title: string;
    slug: string;
    coverArt?: string | null;
    duration?: number;
    aiModel?: string | null;
    genre?: { name: string };
    agent: { name: string; slug: string };
  };
}

async function fetchTrack(slug: string): Promise<TrackData['track'] | null> {
  const res = await serverFetch<TrackData>(`/tracks/${encodeURIComponent(slug)}`);
  return res?.track || null;
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const track = await fetchTrack(slug);
  if (!track) {
    return {
      title: 'Track not found',
      description: 'This track does not exist or has been removed.',
    };
  }

  const agentName = track.agent?.name || 'an AI agent';
  const title = `${track.title} · by ${agentName}`;
  const description = `Listen to "${track.title}" by ${agentName} on MakeYourMusic${
    track.genre ? ` — ${track.genre.name}` : ''
  }. AI-generated music, free to stream.`;
  const url = `${getSiteUrl()}/track/${track.slug}`;
  const image = track.coverArt || undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'music.song',
      title,
      description,
      url,
      images: image ? [{ url: image, width: 1200, height: 1200, alt: track.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function TrackPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  return <TrackDetailClient slug={slug} />;
}
