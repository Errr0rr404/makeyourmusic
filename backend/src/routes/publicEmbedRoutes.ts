import { Router } from 'express';
import { prisma } from '../utils/db';
import logger from '../utils/logger';
import { frontendUrl } from '../utils/stripeClient';

const router = Router();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Embeddable iframe player. Designed to be served at
//   https://api.music4ai.com/embed/track/<slug>
// and dropped into a third-party site:
//   <iframe src="..." width="320" height="120" frameborder="0"></iframe>
// Renders a minimal HTML page with a single <audio> element, the cover
// art, the track title, and a link back to the canonical page.
//
// Kept deliberately light: no JS dependencies, framework-agnostic, safe
// to embed under restrictive CSPs (only inline style + audio).
router.get('/track/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '');
    const track = await prisma.track.findUnique({
      where: { slug },
      select: {
        title: true,
        audioUrl: true,
        coverArt: true,
        slug: true,
        isPublic: true,
        status: true,
        takedownStatus: true,
        agent: { select: { name: true, slug: true } },
      },
    });
    if (!track || !track.isPublic || track.status !== 'ACTIVE' || track.takedownStatus) {
      res.status(404).type('text/html').send('<!doctype html><meta charset=utf-8><title>Not found</title><p>Track unavailable.</p>');
      return;
    }
    const site = frontendUrl().replace(/\/$/, '');
    const trackUrl = `${site}/track/${track.slug}`;
    const cover = track.coverArt || '';
    const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(track.title)} — ${escapeHtml(track.agent.name)}</title>
<style>
  body{margin:0;background:#0b0b10;color:#fff;font-family:system-ui,sans-serif;}
  .wrap{display:flex;align-items:center;gap:12px;padding:10px;}
  img{width:80px;height:80px;border-radius:6px;object-fit:cover;flex:0 0 auto;background:#222;}
  .meta{flex:1;min-width:0;}
  .title{font-size:14px;font-weight:600;margin:0 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .by{font-size:12px;opacity:.7;margin:0;}
  audio{width:100%;margin-top:6px;}
  a{color:#9b8cff;text-decoration:none;font-size:11px;}
</style></head>
<body>
  <div class="wrap">
    ${cover ? `<img src="${escapeHtml(cover)}" alt=""/>` : '<div style="width:80px;height:80px;background:#222;border-radius:6px"></div>'}
    <div class="meta">
      <p class="title"><a href="${escapeHtml(trackUrl)}" target="_blank" rel="noopener">${escapeHtml(track.title)}</a></p>
      <p class="by">by <a href="${escapeHtml(site)}/agent/${escapeHtml(track.agent.slug)}" target="_blank" rel="noopener">${escapeHtml(track.agent.name)}</a></p>
      <audio controls preload="metadata" src="${escapeHtml(track.audioUrl)}"></audio>
    </div>
  </div>
</body></html>`;
    // Helmet earlier set X-Frame-Options: DENY and frame-ancestors 'none' in
    // CSP. Both block embedding. To make the iframe player actually load on
    // third-party sites we have to:
    //   1. Remove X-Frame-Options entirely (no value means "no restriction"
    //      — `ALLOWALL` is a non-standard token modern browsers ignore).
    //   2. Replace the CSP, not append — appending would just add another
    //      header that browsers AND together (more restrictive wins).
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.type('text/html').send(html);
  } catch (error) {
    logger.error('embed track error', { error: (error as Error).message });
    res.status(500).type('text/plain').send('Embed unavailable');
  }
});

export default router;
