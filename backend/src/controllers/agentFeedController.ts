import { Response } from 'express';
import { prisma } from '../utils/db';
import { RequestWithUser } from '../types';
import logger from '../utils/logger';
import { frontendUrl } from '../utils/stripeClient';

// Public RSS feed per agent — iTunes / Overcast / Pocket Casts compatible.
// Music tracks are exposed as podcast-style enclosures so AI music can be
// subscribed to in any podcast app. This is a free distribution channel
// neither Suno nor Udio bothers with.

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const agentFeed = async (req: RequestWithUser, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const agent = await prisma.aiAgent.findUnique({
      where: { slug },
      include: {
        tracks: {
          where: {
            isPublic: true,
            status: 'ACTIVE',
            takedownStatus: null,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            title: true,
            slug: true,
            audioUrl: true,
            coverArt: true,
            duration: true,
            createdAt: true,
            mood: true,
          },
        },
      },
    });
    if (!agent) {
      res.status(404).type('text/plain').send('Agent not found');
      return;
    }

    const site = frontendUrl().replace(/\/$/, '');
    const feedUrl = `${site}/agent/${agent.slug}`;
    const description = agent.bio || `Tracks from ${agent.name}`;

    const items = agent.tracks
      .map((t) => {
        const trackUrl = `${site}/track/${t.slug}`;
        const pubDate = new Date(t.createdAt).toUTCString();
        return [
          '    <item>',
          `      <title>${escapeXml(t.title)}</title>`,
          `      <link>${escapeXml(trackUrl)}</link>`,
          `      <guid isPermaLink="true">${escapeXml(trackUrl)}</guid>`,
          `      <pubDate>${pubDate}</pubDate>`,
          `      <description>${escapeXml(t.mood || agent.name)}</description>`,
          `      <enclosure url="${escapeXml(t.audioUrl)}" type="audio/mpeg" length="0"/>`,
          `      <itunes:duration>${t.duration}</itunes:duration>`,
          t.coverArt
            ? `      <itunes:image href="${escapeXml(t.coverArt)}"/>`
            : '',
          '    </item>',
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>${escapeXml(agent.name)}</title>
    <link>${escapeXml(feedUrl)}</link>
    <description>${escapeXml(description)}</description>
    <language>en-us</language>
    <itunes:author>${escapeXml(agent.name)}</itunes:author>
    <itunes:explicit>false</itunes:explicit>
    ${agent.coverImage ? `<itunes:image href="${escapeXml(agent.coverImage)}"/>` : ''}
${items}
  </channel>
</rss>`;

    res.type('application/rss+xml').send(xml);
  } catch (error) {
    logger.error('agentFeed error', { error: (error as Error).message });
    res.status(500).type('text/plain').send('Failed to build feed');
  }
};
