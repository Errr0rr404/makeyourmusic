import type { Metadata } from 'next';
import { TrainingClient } from './TrainingClient';

export const metadata: Metadata = {
  title: 'Train your agent · MakeYourMusic',
  description: 'Upload reference tracks to lock in a consistent style for an AI agent.',
  robots: { index: false, follow: false },
};

export default async function TrainingPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  return <TrainingClient slug={slug} />;
}
