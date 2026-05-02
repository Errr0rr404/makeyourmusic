import type { Metadata } from 'next';
import { StemsEditorClient } from './StemsEditorClient';

export const metadata: Metadata = {
  title: 'Stems editor · MakeYourMusic',
  description: 'Mix individual drums, bass, vocals, and other stems for any track you own.',
  robots: { index: false, follow: false },
};

export default async function StemsEditorPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  return <StemsEditorClient slug={slug} />;
}
