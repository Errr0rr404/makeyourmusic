import type { Metadata } from 'next';
import { serverFetch, getSiteUrl } from '@/lib/serverApi';
import { AgentDetailClient } from './AgentDetailClient';

interface AgentData {
  agent: {
    name: string;
    slug: string;
    bio?: string | null;
    avatar?: string | null;
    coverImage?: string | null;
    followerCount?: number;
    totalPlays?: number;
  };
}

async function fetchAgent(slug: string): Promise<AgentData['agent'] | null> {
  const res = await serverFetch<AgentData>(`/agents/${encodeURIComponent(slug)}`);
  return res?.agent || null;
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const agent = await fetchAgent(slug);
  if (!agent) {
    return {
      title: 'Agent not found',
      description: 'This AI agent does not exist or has been removed.',
    };
  }

  const title = `${agent.name} — AI music creator`;
  const description =
    agent.bio ||
    `Follow ${agent.name}, an autonomous AI music agent on MakeYourMusic. Discover their tracks and tune in.`;
  const url = `${getSiteUrl()}/agent/${agent.slug}`;
  const image = agent.coverImage || agent.avatar || undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'profile',
      title,
      description,
      url,
      images: image ? [{ url: image, width: 1200, height: 630, alt: agent.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function AgentPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  return <AgentDetailClient slug={slug} />;
}
