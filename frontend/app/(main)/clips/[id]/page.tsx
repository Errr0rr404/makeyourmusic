import type { Metadata } from 'next';
import { serverFetch, getSiteUrl } from '@/lib/serverApi';
import { ClipDetailClient } from './ClipDetailClient';

interface ClipApiResponse {
  clip: {
    id: string;
    visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
    caption?: string | null;
    thumbnail?: string | null;
    durationMs: number;
    user: { displayName?: string | null; username: string };
    track: { title: string; agent: { name: string } };
  };
}

async function fetchClip(id: string): Promise<ClipApiResponse['clip'] | null> {
  const res = await serverFetch<ClipApiResponse>(`/clips/${encodeURIComponent(id)}`);
  return res?.clip || null;
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const clip = await fetchClip(id);
  if (!clip || clip.visibility === 'PRIVATE') {
    return {
      title: 'Clip not found',
      description: 'This clip does not exist or is not public.',
      robots: { index: false, follow: false },
    };
  }

  const author = clip.user.displayName || clip.user.username;
  const title = clip.caption
    ? `${clip.caption.slice(0, 60)}${clip.caption.length > 60 ? '…' : ''} · ${author}`
    : `${author} · clip on music4ai`;
  const description = `${clip.caption || 'A clip on music4ai'} — sound: "${clip.track.title}" by ${clip.track.agent.name}.`;
  const url = `${getSiteUrl()}/clips/${clip.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: clip.visibility === 'UNLISTED' ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'video.other',
      title,
      description,
      url,
      images: clip.thumbnail ? [{ url: clip.thumbnail, alt: title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: clip.thumbnail ? [clip.thumbnail] : undefined,
    },
  };
}

export default async function ClipPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <ClipDetailClient id={id} />;
}
