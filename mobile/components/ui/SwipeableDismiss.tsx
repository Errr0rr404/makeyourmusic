import { ReactNode } from 'react';
import { Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.25;

interface SwipeableDismissProps {
  children: ReactNode;
  onDismiss: () => void;
}

/**
 * Wraps content in a gesture handler that allows swiping down to dismiss.
 * Used for the full-screen player modal.
 */
export function SwipeableDismiss({ children, onDismiss }: SwipeableDismissProps) {
  const translateY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow downward swipe
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD) {
        runOnJS(onDismiss)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}
