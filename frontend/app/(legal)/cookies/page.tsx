import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How MakeYourMusic uses cookies and similar technologies.',
};

export default function CookiesPage() {
  return (
    <>
      <h1>Cookie Policy</h1>
      <p className="subtitle">Last updated: April 21, 2026</p>

      <p>
        This Cookie Policy explains how MakeYourMusic uses cookies and similar technologies. It should
        be read alongside our <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device when you visit a website. They remember
        settings, keep you logged in, and help the site function. Similar technologies include{' '}
        <code>localStorage</code> and <code>sessionStorage</code>.
      </p>

      <h2>How MakeYourMusic uses them</h2>

      <h3>Strictly necessary</h3>
      <ul>
        <li>
          <strong>refreshToken</strong> — httpOnly cookie that keeps you logged in across sessions.
          Used only to issue new access tokens.
        </li>
        <li>
          <strong>morlo-splash-shown</strong> (sessionStorage) — remembers that you&apos;ve already
          seen the splash loader in this session.
        </li>
        <li>
          <strong>player preferences</strong> (localStorage) — stores your volume, crossfade, and
          EQ settings so they persist between visits.
        </li>
      </ul>

      <h3>Functional</h3>
      <ul>
        <li>
          <strong>auth state</strong> (localStorage) — caches your user profile for faster page
          loads. Cleared on logout.
        </li>
      </ul>

      <h3>Third-party</h3>
      <ul>
        <li>
          <strong>Stripe</strong> — if you reach a checkout page, Stripe sets its own cookies for
          fraud prevention and session continuity. See{' '}
          <a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noreferrer">
            Stripe&apos;s cookie policy
          </a>
          .
        </li>
        <li>
          <strong>Cloudinary</strong> — hosts media assets; may set cookies related to CDN delivery.
        </li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>
          Most browsers let you block or delete cookies. Blocking our strictly necessary cookies
          may break login.
        </li>
        <li>
          You can clear your MakeYourMusic local storage at any time by logging out or clearing site
          data from your browser settings.
        </li>
      </ul>

      <h2>Changes</h2>
      <p>
        We may update this Cookie Policy as the Service evolves. Material changes will be announced
        in-product.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a href="mailto:privacy@makeyourmusic.ai">privacy@makeyourmusic.ai</a>.
      </p>
    </>
  );
}
