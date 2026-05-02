// Lightweight, dependency-free analytics shim for the React Native app.
//
// Mirrors frontend/lib/analytics.ts so the funnel events match across web
// and mobile. We don't bundle a real provider here — wire one up by
// implementing `dispatch` (e.g. posthog-react-native, Amplitude RN, or a
// fetch POST to your own ingest endpoint).

import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnalyticsEvent =
  | 'app_launch'
  | 'onboarding_view'
  | 'onboarding_complete'
  | 'home_view'
  | 'create_step_idea'
  | 'create_step_style'
  | 'create_step_lyrics'
  | 'create_step_generate'
  | 'create_step_publish'
  | 'auth_gate_shown'
  | 'auth_gate_dismissed'
  | 'auth_gate_completed'
  | 'first_generation_started'
  | 'first_generation_succeeded'
  | 'generation_started'
  | 'generation_succeeded'
  | 'generation_failed'
  | 'track_published'
  | 'prompt_typed';

export type EventProps = Record<string, string | number | boolean | null | undefined>;

const FIRST_GEN_KEY = 'mym_first_generation_done_v1';
const FIRST_GEN_STARTED_KEY = 'mym_first_generation_started_v1';

function dispatch(event: string, props?: EventProps) {
  // Replace this function body with a real provider when ready. Until then,
  // we just log in __DEV__ so the funnel is visible during development.
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics]', event, props ?? {});
  }
}

export function track(event: AnalyticsEvent | (string & {}), props?: EventProps): void {
  dispatch(event, props);
}

/**
 * Mirror of the web `trackGeneration` helper — fires both `generation_*` (every
 * call) and the `first_generation_*` event the activation funnel cares about
 * (once per device, persisted in AsyncStorage).
 */
export async function trackGeneration(stage: 'started' | 'succeeded' | 'failed', props?: EventProps): Promise<void> {
  if (stage === 'started') {
    track('generation_started', props);
    try {
      const flag = await AsyncStorage.getItem(FIRST_GEN_STARTED_KEY);
      if (!flag) {
        await AsyncStorage.setItem(FIRST_GEN_STARTED_KEY, '1');
        track('first_generation_started', props);
      }
    } catch { /* ignore */ }
    return;
  }
  if (stage === 'succeeded') {
    track('generation_succeeded', props);
    try {
      const flag = await AsyncStorage.getItem(FIRST_GEN_KEY);
      if (!flag) {
        await AsyncStorage.setItem(FIRST_GEN_KEY, '1');
        track('first_generation_succeeded', props);
      }
    } catch { /* ignore */ }
    return;
  }
  track('generation_failed', props);
}

export function identify(_userId: string, _props?: EventProps): void {
  // No-op until a provider is wired. Keeps the API parity with web.
}
