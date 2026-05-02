// Lightweight, dependency-free analytics shim.
//
// Usage:
//   track('landing_view');
//   track('first_generation_started', { tier: 'FREE' });
//
// Behavior:
//   - If a PostHog snippet is loaded on the page (window.posthog), forward the
//     event there. (Snippet can be added in app/layout.tsx when
//     NEXT_PUBLIC_POSTHOG_KEY is present — see analytics-provider.tsx.)
//   - Otherwise, log to console in dev. Production fallback: silent.
//   - Events are queued briefly so they survive an early call before posthog
//     finishes loading.
//
// Adding a real provider later is one call: replace `dispatch` here.

export type AnalyticsEvent =
  // landing & top-of-funnel
  | 'landing_view'
  | 'landing_cta_click'
  | 'prompt_typed'
  // create funnel
  | 'create_step_idea'
  | 'create_step_style'
  | 'create_step_lyrics'
  | 'create_step_generate'
  | 'create_step_publish'
  // auth gate
  | 'auth_gate_shown'
  | 'auth_gate_dismissed'
  | 'auth_gate_completed'
  // generation outcomes
  | 'first_generation_started'
  | 'first_generation_succeeded'
  | 'generation_started'
  | 'generation_succeeded'
  | 'generation_failed'
  // publishing
  | 'track_published'
  // referral / share
  | 'referral_nudge_shown'
  | 'referral_nudge_clicked';

export type EventProps = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, props?: EventProps) => void;
      identify?: (id: string, props?: EventProps) => void;
    };
    __mym_analytics_queue?: Array<{ event: string; props?: EventProps }>;
  }
}

const QUEUE_KEY = '__mym_analytics_queue';
const FIRST_GEN_KEY = 'mym_first_generation_done_v1';

function flushQueue() {
  if (typeof window === 'undefined' || !window.posthog?.capture) return;
  const q = window[QUEUE_KEY];
  if (!q || q.length === 0) return;
  for (const item of q) {
    try { window.posthog.capture(item.event, item.props); } catch { /* ignore */ }
  }
  window[QUEUE_KEY] = [];
}

function dispatch(event: string, props?: EventProps) {
  if (typeof window === 'undefined') return;
  if (window.posthog?.capture) {
    flushQueue();
    try { window.posthog.capture(event, props); } catch { /* ignore */ }
    return;
  }
  // Queue for posthog if it loads later this session.
  if (!window[QUEUE_KEY]) window[QUEUE_KEY] = [];
  window[QUEUE_KEY].push({ event, props });
  if (process.env.NODE_ENV !== 'production') {
     
    console.debug('[analytics]', event, props ?? {});
  }
}

export function track(event: AnalyticsEvent | (string & {}), props?: EventProps): void {
  dispatch(event, props);
}

/**
 * Fire `first_generation_*` exactly once per device (using localStorage as
 * the marker), and `generation_*` every time. Useful at the start/finish of
 * a generation: both events flow through, but `first_generation_*` is what
 * the activation funnel cares about.
 */
export function trackGeneration(stage: 'started' | 'succeeded' | 'failed', props?: EventProps): void {
  if (typeof window === 'undefined') return;
  if (stage === 'started') {
    track('generation_started', props);
    if (!localStorage.getItem(FIRST_GEN_KEY + ':started')) {
      localStorage.setItem(FIRST_GEN_KEY + ':started', '1');
      track('first_generation_started', props);
    }
    return;
  }
  if (stage === 'succeeded') {
    track('generation_succeeded', props);
    if (!localStorage.getItem(FIRST_GEN_KEY)) {
      localStorage.setItem(FIRST_GEN_KEY, '1');
      track('first_generation_succeeded', props);
    }
    return;
  }
  track('generation_failed', props);
}

export function identify(userId: string, props?: EventProps): void {
  if (typeof window === 'undefined') return;
  if (window.posthog?.identify) {
    try { window.posthog.identify(userId, props); } catch { /* ignore */ }
  }
}
