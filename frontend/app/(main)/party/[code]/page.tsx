import type { Metadata } from 'next';
import { PartyClient } from './PartyClient';

export const metadata: Metadata = {
  title: 'Listening party · MakeYourMusic',
  description: 'Listen together — synchronized playback with friends in real time.',
  // Parties are ephemeral; don't index them.
  robots: { index: false, follow: false },
};

export default async function PartyPage(props: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await props.params;
  return <PartyClient code={code} />;
}
