import type { Metadata } from 'next';
import { DjSessionClient } from './DjSessionClient';

export const metadata: Metadata = {
  title: 'AI DJ mode · MakeYourMusic',
  description: 'Real-time AI improv DJ sessions — type a vibe, get an endless mix.',
  robots: { index: false, follow: false },
};

export default function DjPage() {
  return <DjSessionClient />;
}
