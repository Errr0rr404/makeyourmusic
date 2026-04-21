import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Morlo.ai collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="subtitle">Last updated: April 21, 2026</p>

      <p>
        Morlo.ai (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects your privacy. This
        Privacy Policy explains what personal information we collect, why we collect it, how we
        use it, and the choices you have.
      </p>

      <h2>1. Information We Collect</h2>

      <h3>You provide</h3>
      <ul>
        <li><strong>Account data:</strong> email, username, display name, password (hashed with Argon2id), optional bio and avatar.</li>
        <li><strong>Creator data:</strong> AI agent names, cover images, bios, generation configurations.</li>
        <li><strong>Content:</strong> uploaded audio, video, cover art, and metadata you submit.</li>
        <li><strong>Social activity:</strong> likes, follows, comments, playlists, shares.</li>
        <li><strong>Payments:</strong> processed by Stripe. We do not store full card details.</li>
        <li><strong>Support:</strong> messages you send us.</li>
      </ul>

      <h3>Collected automatically</h3>
      <ul>
        <li><strong>Usage:</strong> plays, listen duration, completions, device type, browser type.</li>
        <li><strong>Technical:</strong> IP address, user agent, approximate location from IP (country level).</li>
        <li><strong>Cookies &amp; local storage:</strong> session tokens, player preferences, onboarding state.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>Operate and secure the Service (authentication, rate limiting, abuse prevention).</li>
        <li>Personalize recommendations, play history, and the For You feed.</li>
        <li>Process payments and calculate creator earnings.</li>
        <li>Send transactional emails (verification, password reset, receipts).</li>
        <li>Respond to support requests.</li>
        <li>Comply with legal obligations and enforce our Terms.</li>
      </ul>

      <h2>3. Legal Bases (GDPR)</h2>
      <p>If you are in the EU/UK, our legal bases include:</p>
      <ul>
        <li><strong>Contract:</strong> to provide the Service you signed up for.</li>
        <li><strong>Legitimate interest:</strong> to secure, maintain, and improve the Service.</li>
        <li><strong>Consent:</strong> where required (e.g., optional analytics or marketing).</li>
        <li><strong>Legal obligation:</strong> to comply with applicable law.</li>
      </ul>

      <h2>4. Sharing</h2>
      <p>We do not sell your personal data. We share data only in these cases:</p>
      <ul>
        <li><strong>Service providers</strong> (Neon DB, Cloudinary, Stripe, Railway, email provider) acting under contract and subject to confidentiality.</li>
        <li><strong>Legal compliance</strong> when required by law or valid legal process.</li>
        <li><strong>Business transfers:</strong> in the event of a merger or acquisition, with notice to users.</li>
        <li><strong>Public profile:</strong> your username, display name, avatar, public playlists, likes, and comments are visible to others by design.</li>
      </ul>

      <h2>5. Data Retention</h2>
      <p>
        We keep account and content data for as long as your account is active. When you delete
        your account, we delete your profile, playlists, likes, follows, comments, and uploaded
        content. Backups are rotated within 30 days. Some records (payment receipts, tax records,
        abuse logs) may be retained longer as required by law.
      </p>

      <h2>6. Your Rights</h2>
      <p>Depending on your jurisdiction, you may have the right to:</p>
      <ul>
        <li>Access a copy of your personal data.</li>
        <li>Correct inaccurate data.</li>
        <li>Delete your data (via Settings → Delete Account, or by contacting us).</li>
        <li>Object to or restrict certain processing.</li>
        <li>Port your data to another service.</li>
        <li>Withdraw consent at any time.</li>
        <li>Lodge a complaint with your local data protection authority.</li>
      </ul>
      <p>
        To exercise these rights, email <a href="mailto:privacy@morlo.ai">privacy@morlo.ai</a> from
        the address linked to your account.
      </p>

      <h2>7. Security</h2>
      <p>
        We hash passwords with Argon2id, use HTTPS in production, rotate JWT access tokens every
        15 minutes, store refresh tokens in httpOnly cookies, enforce CORS and rate limits, and
        monitor for suspicious activity. No system is perfectly secure — please report
        vulnerabilities to <a href="mailto:security@morlo.ai">security@morlo.ai</a>.
      </p>

      <h2>8. Children</h2>
      <p>
        Morlo.ai is not directed at children under 13. If you believe a child has provided us
        personal data, contact us and we will delete it promptly.
      </p>

      <h2>9. International Transfers</h2>
      <p>
        Your data may be processed in countries outside your own. Where required, we use
        appropriate safeguards (e.g., standard contractual clauses).
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this Policy from time to time. Material changes are announced in-product and
        take effect at least 14 days after notice.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions, requests, or complaints? Email{' '}
        <a href="mailto:privacy@morlo.ai">privacy@morlo.ai</a>.
      </p>
    </>
  );
}
