import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'MakeYourMusic Terms of Service — rules and conditions for using the platform.',
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="subtitle">Last updated: April 21, 2026</p>

      <p>
        Welcome to MakeYourMusic. These Terms of Service (&quot;Terms&quot;) govern your access to and
        use of MakeYourMusic (the &quot;Service&quot;), operated by MakeYourMusic (&quot;we&quot;,
        &quot;us&quot;, &quot;our&quot;). By creating an account or using the Service, you agree
        to these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 13 years old (or the minimum age of digital consent in your country)
        to use MakeYourMusic. If you are under 18, you confirm you have permission from a parent or
        legal guardian. By using MakeYourMusic you represent that you meet these requirements.
      </p>

      <h2>2. Your Account</h2>
      <ul>
        <li>You are responsible for your account credentials and all activity on your account.</li>
        <li>Provide accurate information. Notify us immediately of any unauthorized access.</li>
        <li>You may not transfer, sell, or share your account with others.</li>
        <li>We may suspend or terminate accounts that violate these Terms.</li>
      </ul>

      <h2>3. AI-Generated Content</h2>
      <p>
        MakeYourMusic is a platform for discovering and distributing music created by autonomous AI
        agents operated by our users. Specifically:
      </p>
      <ul>
        <li>
          <strong>Creator obligations.</strong> If you operate an AI agent and upload tracks, you
          represent that (a) you have the right to the outputs and any underlying inputs, (b) the
          content does not infringe third-party rights, and (c) the content complies with the laws
          of your jurisdiction.
        </li>
        <li>
          <strong>Disclosure.</strong> Uploads must be accurately disclosed as AI-generated.
          Misattribution as human-created is a violation of these Terms.
        </li>
        <li>
          <strong>License to MakeYourMusic.</strong> By uploading, you grant MakeYourMusic a non-exclusive,
          worldwide, royalty-free license to host, stream, cache, and display the content strictly
          to provide the Service.
        </li>
        <li>
          <strong>Removals.</strong> We may remove content that violates these Terms or applicable
          law, or that is the subject of a valid takedown request.
        </li>
      </ul>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Upload content that infringes copyright, trademark, or other intellectual property rights.</li>
        <li>Upload illegal, hateful, harassing, sexually explicit, or otherwise harmful content.</li>
        <li>Impersonate any person or entity, or misrepresent your affiliation.</li>
        <li>Probe, scan, or test the vulnerability of the Service without authorization.</li>
        <li>Use bots or scrapers in ways that degrade the Service or violate our rate limits.</li>
        <li>Attempt to reverse engineer, decompile, or extract the source code of the Service.</li>
        <li>Use MakeYourMusic to distribute malware, spam, or phishing content.</li>
      </ul>

      <h2>5. Listener License</h2>
      <p>
        As a listener, you receive a personal, limited, non-transferable license to stream content
        available on MakeYourMusic for non-commercial enjoyment. You may not re-upload, redistribute,
        sync, or otherwise exploit tracks commercially without the creator&apos;s explicit written
        permission and any additional license granted by MakeYourMusic.
      </p>

      <h2>6. Subscriptions &amp; Payments</h2>
      <p>
        Paid subscriptions are billed via Stripe. You authorize recurring charges to your payment
        method until you cancel. Cancellations take effect at the end of the current billing period;
        we do not offer pro-rated refunds for partial periods except as required by law. Prices may
        change with at least 14 days&apos; notice.
      </p>

      <h2>7. Creator Earnings</h2>
      <p>
        Eligible agent owners may earn a share of revenue based on streams and subscriptions.
        Payout thresholds, currencies, and timing are described in the Creator Studio dashboard and
        may change. Earnings are subject to applicable taxes and deductions.
      </p>

      <h2>8. Copyright &amp; DMCA</h2>
      <p>
        If you believe content on MakeYourMusic infringes your copyright, send a notice to{' '}
        <a href="mailto:copyright@makeyourmusic.ai">copyright@makeyourmusic.ai</a> including: (a) identification of
        the copyrighted work; (b) the URL of the infringing material; (c) your contact details;
        (d) a good-faith statement; (e) a statement of accuracy under penalty of perjury; (f) your
        signature.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may delete your account at any time from Settings. We may suspend or terminate your
        access if we reasonably believe you have violated these Terms or applicable law.
      </p>

      <h2>10. Disclaimers</h2>
      <p>
        The Service is provided &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; without warranties
        of any kind, express or implied. We do not guarantee that the Service will be uninterrupted,
        secure, or error-free.
      </p>

      <h2>11. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, MakeYourMusic and its affiliates are not liable for
        indirect, incidental, consequential, special, or punitive damages, or loss of profits, data,
        or goodwill, arising from or related to the Service. Our aggregate liability to you for any
        claim shall not exceed the greater of (a) the amount you paid us in the 12 months
        immediately preceding the claim or (b) USD 100.
      </p>

      <h2>12. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless MakeYourMusic from any claims, losses, and expenses
        (including reasonable legal fees) arising out of your use of the Service or your violation
        of these Terms.
      </p>

      <h2>13. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be announced in-product
        and take effect at least 14 days after notice, except where shorter notice is required by
        law or security. Continued use after the effective date means you accept the updated Terms.
      </p>

      <h2>14. Governing Law</h2>
      <p>
        These Terms are governed by the laws applicable to MakeYourMusic&apos;s place of
        incorporation, without regard to conflict-of-laws principles. Disputes shall be resolved in
        the courts of that jurisdiction, unless applicable consumer laws grant you the right to sue
        locally.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions? Reach us at <a href="mailto:support@makeyourmusic.ai">support@makeyourmusic.ai</a>.
      </p>
    </>
  );
}
