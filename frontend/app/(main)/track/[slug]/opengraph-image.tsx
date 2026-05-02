// Auto-generated 1200x630 OG card for every track. Surfaced when the
// share URL is unfurled in iMessage / Slack / X / Discord etc.
//
// We deliberately keep the design "edge.js"-friendly: only stable HTML/CSS
// primitives that next/og's Satori renderer supports — no Tailwind classes,
// no custom fonts, no SVG `<use>`. The waveform is faked with positioned
// divs so it works without any image fetches in the failure case.

import { ImageResponse } from 'next/og';
import { serverFetch } from '@/lib/serverApi';

export const runtime = 'edge';
export const alt = 'AI-generated track on MakeYourMusic';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface TrackData {
  track?: {
    title?: string | null;
    coverArt?: string | null;
    duration?: number | null;
    genre?: { name?: string | null } | null;
    agent?: { name?: string | null } | null;
  };
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h || 290;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await serverFetch<TrackData>(`/tracks/${encodeURIComponent(slug)}`);
  const track = data?.track;
  const title = track?.title ?? 'AI-generated track';
  const agentName = track?.agent?.name ?? 'a MakeYourMusic agent';
  const genreName = track?.genre?.name ?? '';
  const cover = track?.coverArt || null;

  const hue = hashHue(title);
  const accent = `hsl(${hue}, 80%, 62%)`;
  const accent2 = `hsl(${(hue + 60) % 360}, 70%, 50%)`;

  // Pseudo-random but stable bar pattern derived from the title — same
  // string => same waveform.
  const bars = Array.from({ length: 64 }, (_, i) => {
    const seed = (title.charCodeAt(i % title.length) || 65) + i;
    return 22 + (seed * 7) % 78;
  });

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(135deg, hsl(${hue},45%,12%) 0%, #0a0a0d 60%, hsl(${(hue + 40) % 360},40%,8%) 100%)`,
          padding: 56,
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 22, opacity: 0.85 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: accent,
              boxShadow: `0 0 18px ${accent}`,
            }}
          />
          <div style={{ fontWeight: 800, letterSpacing: 6 }}>MAKEYOURMUSIC</div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 48, marginTop: 28 }}>
          <div
            style={{
              width: 360,
              height: 360,
              borderRadius: 28,
              flexShrink: 0,
              background: cover
                ? '#000'
                : `radial-gradient(120% 90% at 25% 20%, ${accent} 0%, ${accent2} 45%, #0a0a0d 100%)`,
              display: 'flex',
              alignItems: 'flex-end',
              padding: 16,
              boxShadow: '0 30px 60px -10px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {cover ? (
               
              <img
                src={cover}
                alt=""
                width={360}
                height={360}
                style={{ position: 'absolute', inset: 0, width: 360, height: 360, objectFit: 'cover' }}
              />
            ) : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 22,
                opacity: 0.7,
                letterSpacing: 4,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              {genreName || 'AI-generated'}
            </div>
            <div
              style={{
                fontSize: 76,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: -1.5,
                marginBottom: 20,
                maxWidth: 700,
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 3,
                overflow: 'hidden',
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: 28, opacity: 0.85 }}>by {agentName}</div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 90, marginTop: 28 }}>
              {bars.map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: `${h}%`,
                    borderRadius: 3,
                    background: i % 7 === 0 ? '#2dd4bf' : i % 3 === 0 ? accent : accent2,
                    opacity: 0.85,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
          <div style={{ fontSize: 22, opacity: 0.6 }}>Tap to listen — free to stream</div>
          <div
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              background: accent,
              fontWeight: 800,
              fontSize: 22,
              color: 'white',
            }}
          >
            ▶  Play
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
