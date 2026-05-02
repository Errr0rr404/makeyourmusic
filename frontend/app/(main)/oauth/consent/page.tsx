import type { Metadata } from 'next';
import { ConsentClient } from './ConsentClient';

export const metadata: Metadata = {
  title: 'Authorize · MakeYourMusic',
  robots: { index: false, follow: false },
};

export default function ConsentPage() {
  return <ConsentClient />;
}
