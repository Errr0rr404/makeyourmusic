import type { Metadata } from 'next';
import { serverFetch, getSiteUrl } from '@/lib/serverApi';
import { MarketplaceListingClient } from './MarketplaceListingClient';

interface ListingMeta {
  listing: {
    title: string;
    description?: string | null;
    coverArt?: string | null;
    slug: string;
    type: 'SAMPLE_PACK' | 'PROMPT_PRESET';
  };
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const res = await serverFetch<ListingMeta>(`/marketplace/listings/${encodeURIComponent(slug)}`);
  const listing = res?.listing;
  if (!listing) {
    return { title: 'Listing not found · MakeYourMusic' };
  }
  const url = `${getSiteUrl()}/marketplace/${listing.slug}`;
  const title = `${listing.title} · ${listing.type === 'SAMPLE_PACK' ? 'Sample pack' : 'Prompt preset'}`;
  const description =
    listing.description?.slice(0, 200) ||
    `${listing.type === 'SAMPLE_PACK' ? 'Sample pack' : 'Prompt preset'} on the MakeYourMusic marketplace.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: listing.coverArt ? [{ url: listing.coverArt }] : undefined,
    },
  };
}

export default async function MarketplaceListingPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  return <MarketplaceListingClient slug={slug} />;
}
