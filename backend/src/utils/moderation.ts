// Pre-publish content moderation. Goal: keep clearly-out-of-policy material
// off the homepage. We are not trying to be a comprehensive filter — that's
// what the takedown flow + admin review is for. We only block content that
// would obviously embarrass the platform if it landed in the trending list.
//
// Two checks:
//   1. Lyrics are run through a small slur/violence regex blocklist.
//      Matches return {allowed:false, reasons:[...]}.
//   2. Cover-art URLs can be passed to the optional NSFW classifier — best
//      effort; if no provider is configured we skip with allowed:true.
//
// The regex list is intentionally narrow — false positives push creators away
// fast. Add to it cautiously and prefer human review for borderline cases.

const SLUR_PATTERNS: RegExp[] = [
  // Racial slurs
  /\bn[i!1]gg(?:er|a|ah|az)\b/i,
  /\bch[i!1]nk\b/i,
  /\bk[i!1]ke\b/i,
  /\bsp[i!1]c\b/i,
  /\bg[o0]{2}k\b/i,
  /\bw[e3]tback\b/i,
  /\btowelhead\b/i,
  /\bsandn[i!1]gger\b/i,
  // Homophobic / transphobic
  /\bf[a@]gg[o0]t\b/i,
  /\btr[a@]nn[i!y]e?\b/i,
  // Misogynistic slurs (selective — "bitch" is too common in music)
  /\bcunt(?:y|s|ish)?\b/i,
];

const VIOLENT_INTENT_PATTERNS: RegExp[] = [
  // Explicit threats with named or implied targets
  /\b(?:i\s+(?:will|wanna|gonna)|ima)\s+(?:kill|murder|shoot|bomb|stab)\s+(?:you|him|her|them|the|all)\b/i,
  // Mass-casualty ideation
  /\b(?:school|club|church|mosque|synagogue)\s+shooting\b/i,
  // Self-harm encouragement (not first-person ideation, which is allowed
  // because it appears constantly in genuine art — only direct exhortation)
  /\byou\s+should\s+(?:kill|hurt)\s+yourself\b/i,
  /\bgo\s+(?:kill|hang)\s+yourself\b/i,
];

const CSAM_PATTERNS: RegExp[] = [
  /\b(?:child|kid|minor|underage|preteen|teen)\s+(?:porn|nud[ei]|sex|erotic)/i,
  /\bcp\s+(?:vid|video|pic|image)/i,
  /\blol(?:i|icon)\s+(?:porn|hentai|sex)/i,
];

export interface ModerationResult {
  allowed: boolean;
  reasons: string[];
  // Severity: BLOCK = never let through, REVIEW = admin must approve.
  severity: 'OK' | 'REVIEW' | 'BLOCK';
}

export function moderateLyrics(text: string | null | undefined): ModerationResult {
  if (!text || typeof text !== 'string') {
    return { allowed: true, reasons: [], severity: 'OK' };
  }
  const reasons: string[] = [];
  let severity: ModerationResult['severity'] = 'OK';

  for (const re of CSAM_PATTERNS) {
    if (re.test(text)) {
      reasons.push('Possible CSAM-related content');
      severity = 'BLOCK';
    }
  }
  for (const re of SLUR_PATTERNS) {
    if (re.test(text)) {
      reasons.push('Slur detected');
      if (severity !== 'BLOCK') severity = 'REVIEW';
    }
  }
  for (const re of VIOLENT_INTENT_PATTERNS) {
    if (re.test(text)) {
      reasons.push('Threats / violent intent');
      if (severity !== 'BLOCK') severity = 'REVIEW';
    }
  }

  return {
    allowed: severity !== 'BLOCK',
    reasons,
    severity,
  };
}

// Cover-art moderation. Optional provider; falls back to allowed when no
// classifier is configured. The contract returns the same shape as
// moderateLyrics so callers can treat them uniformly.
export async function moderateCoverArt(_imageUrlOrBase64: string): Promise<ModerationResult> {
  // No NSFW classifier wired yet. Returning OK here is intentional — we'd
  // rather false-negative and rely on the takedown / report flow than block
  // every generation while the integration is in progress.
  // TODO: integrate Cloudflare Workers AI image-classification or a hosted
  // CLIP-based NSFW model when an API key is available.
  return { allowed: true, reasons: [], severity: 'OK' };
}

export function moderationToError(result: ModerationResult): string | null {
  if (result.allowed && result.severity === 'OK') return null;
  if (result.severity === 'BLOCK') {
    return `Content blocked: ${result.reasons.join(', ') || 'policy violation'}`;
  }
  // REVIEW severity is also blocked at publish time but with a softer message.
  return `Content flagged for review: ${result.reasons.join(', ') || 'policy concern'}`;
}
