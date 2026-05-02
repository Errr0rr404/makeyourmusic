import logger from './logger';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const EMAIL_PROVIDER_TIMEOUT_MS = 15_000;

// Minimal HTML attribute / text escape for values interpolated into our
// templates. Used for tokens and link URLs so a future
// FRONTEND_URL=https://example.com"><script>... can't break out of an
// `<a href="...">` attribute.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type EmailProvider = 'resend' | 'sendgrid' | 'smtp' | 'console';

function getProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SENDGRID_API_KEY) return 'sendgrid';
  if (process.env.SMTP_HOST && process.env.SMTP_USER) return 'smtp';
  return 'console';
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || 'MakeYourMusic <no-reply@makeyourmusic.ai>';
}

async function sendViaResend(msg: EmailMessage): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
    signal: AbortSignal.timeout(EMAIL_PROVIDER_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend send failed: ${res.status} ${body}`);
  }
}

async function sendViaSendgrid(msg: EmailMessage): Promise<void> {
  // SendGrid v3 expects `from` as `{ email, name? }`. Build a structured value
  // so a bare EMAIL_FROM like 'no-reply@example.com' (no angle-bracket name)
  // doesn't get rejected as a malformed object.
  const fromRaw = getFromAddress();
  const m = fromRaw.match(/^\s*(.*?)\s*<\s*(.+?)\s*>\s*$/);
  const fromObj = m
    ? { email: m[2]!, name: m[1] || undefined }
    : { email: fromRaw };

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: msg.to }] }],
      from: fromObj,
      subject: msg.subject,
      content: [
        { type: 'text/plain', value: msg.text },
        { type: 'text/html', value: msg.html },
      ],
    }),
    signal: AbortSignal.timeout(EMAIL_PROVIDER_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SendGrid send failed: ${res.status} ${body}`);
  }
}

async function sendViaSmtp(msg: EmailMessage): Promise<void> {
  // nodemailer is an optional peer dep — only required if SMTP_* is configured
  let nodemailerLib: any;
  try {
    nodemailerLib = await import('nodemailer' as any);
  } catch {
    throw new Error('SMTP configured but nodemailer not installed. Run: npm i nodemailer');
  }
  const createTransport = nodemailerLib.default?.createTransport || nodemailerLib.createTransport;
  const transport = createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
  await transport.sendMail({
    from: getFromAddress(),
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
}

// Crude scrubber: replace the token portion of verification/reset links so
// console output / structured logs don't echo a working secret if log
// shipping is misconfigured. We deliberately keep the path so devs can tell
// which email fired.
function scrubTokens(text: string): string {
  return text.replace(/(token=)([A-Za-z0-9_-]{16,})/g, '$1[REDACTED]');
}

function logEmailToConsole(msg: EmailMessage): void {
  logger.info('📧 Email (console fallback — no provider configured)', {
    to: msg.to,
    subject: msg.subject,
    preview: scrubTokens(msg.text).slice(0, 200),
  });
  // Refuse to print full email text in any non-`development` environment.
  // Previously we'd print plaintext reset/verify URLs to stdout in
  // staging/preview, where logs are typically aggregated and readable by
  // every engineer.
  if (process.env.NODE_ENV === 'development') {
    console.log('\n──── EMAIL ────');
    console.log(`To:      ${msg.to}`);
    console.log(`Subject: ${msg.subject}`);
    console.log('');
    console.log(scrubTokens(msg.text));
    console.log('───────────────\n');
  }
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  const provider = getProvider();
  try {
    switch (provider) {
      case 'resend':
        await sendViaResend(msg);
        break;
      case 'sendgrid':
        await sendViaSendgrid(msg);
        break;
      case 'smtp':
        await sendViaSmtp(msg);
        break;
      default:
        logEmailToConsole(msg);
    }
    if (provider !== 'console') {
      logger.info('Email sent', { to: msg.to, subject: msg.subject, provider });
    }
  } catch (err) {
    logger.error('Email send failed', {
      provider,
      to: msg.to,
      subject: msg.subject,
      error: (err as Error).message,
    });
    throw err;
  }
}

function getFrontendUrl(): string {
  const url = process.env.FRONTEND_URL?.split(',')[0]?.trim();
  return url || 'http://localhost:3000';
}

export function buildVerificationEmail(email: string, token: string): EmailMessage {
  const link = `${getFrontendUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const safeLink = escapeHtml(link);
  return {
    to: email,
    subject: 'Verify your MakeYourMusic email',
    text: `Welcome to MakeYourMusic!\n\nVerify your email by visiting:\n${link}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, you can ignore this email.`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
        <h1 style="font-size:24px;margin:0 0 16px">Welcome to MakeYourMusic</h1>
        <p style="font-size:16px;line-height:1.5;color:#333">Confirm your email to unlock your account.</p>
        <p style="margin:24px 0"><a href="${safeLink}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Verify Email</a></p>
        <p style="font-size:13px;color:#666">Or paste this link: <br/><code style="word-break:break-all">${safeLink}</code></p>
        <p style="font-size:13px;color:#666;margin-top:24px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `.trim(),
  };
}

export function buildMagicLinkEmail(email: string, token: string): EmailMessage {
  // Path matches the Next.js route at frontend/app/(auth)/magic/page.tsx
  // (the (auth) group is stripped from the URL).
  const link = `${getFrontendUrl()}/magic?token=${encodeURIComponent(token)}`;
  const safeLink = escapeHtml(link);
  return {
    to: email,
    subject: 'Your MakeYourMusic sign-in link',
    text: `Sign in to MakeYourMusic by visiting:\n${link}\n\nThis link expires in 15 minutes and can be used once.\n\nIf you didn't request this, ignore this email.`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
        <h1 style="font-size:24px;margin:0 0 16px">Sign in to MakeYourMusic</h1>
        <p style="font-size:16px;line-height:1.5;color:#333">Tap the button below to sign in. The link is good for 15 minutes and works once.</p>
        <p style="margin:24px 0"><a href="${safeLink}" style="display:inline-block;padding:12px 24px;background:#8b5cf6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Sign in</a></p>
        <p style="font-size:13px;color:#666">Or paste this link: <br/><code style="word-break:break-all">${safeLink}</code></p>
        <p style="font-size:13px;color:#666;margin-top:24px">If you didn't request this, ignore this email — your account is unchanged.</p>
      </div>
    `.trim(),
  };
}

export function buildPasswordResetEmail(email: string, token: string): EmailMessage {
  const link = `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const safeLink = escapeHtml(link);
  return {
    to: email,
    subject: 'Reset your MakeYourMusic password',
    text: `We received a request to reset your password.\n\nReset it by visiting:\n${link}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email — your password won't change.`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
        <h1 style="font-size:24px;margin:0 0 16px">Reset your password</h1>
        <p style="font-size:16px;line-height:1.5;color:#333">We received a request to reset your MakeYourMusic password.</p>
        <p style="margin:24px 0"><a href="${safeLink}" style="display:inline-block;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset Password</a></p>
        <p style="font-size:13px;color:#666">Or paste this link: <br/><code style="word-break:break-all">${safeLink}</code></p>
        <p style="font-size:13px;color:#666;margin-top:24px">This link expires in 1 hour. If you didn't request this, ignore this email — your password won't change.</p>
      </div>
    `.trim(),
  };
}
