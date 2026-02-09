import * as Haptics from 'expo-haptics';

/**
 * Centralized haptic feedback service.
 * Wraps expo-haptics with semantic feedback types for consistent UX.
 */

/** Light tap for micro-interactions (play, like, tap) */
export function hapticLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Medium tap for important actions (follow, share, add to queue) */
export function hapticMedium() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Heavy tap for significant moments (download complete, error) */
export function hapticHeavy() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/** Success notification pattern */
export function hapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Warning notification pattern */
export function hapticWarning() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** Error notification pattern */
export function hapticError() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/** Selection change (scrolling through options) */
export function hapticSelection() {
  Haptics.selectionAsync();
}
