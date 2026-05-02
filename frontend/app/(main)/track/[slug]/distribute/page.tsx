import type { Metadata } from 'next';
import { DistributeWizard } from './DistributeWizard';

export const metadata: Metadata = {
  title: 'Distribute · MakeYourMusic',
  description: 'Submit your AI track to Spotify, Apple Music, and other streaming services.',
  robots: { index: false, follow: false },
};

export default async function DistributePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  return <DistributeWizard slug={slug} />;
}
