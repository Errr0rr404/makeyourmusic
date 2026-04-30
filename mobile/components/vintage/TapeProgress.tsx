import { View } from 'react-native';
import { useTokens } from '../../lib/theme';

interface TapeProgressProps {
  progress: number; // 0..1
  height?: number;
}

/** Thin LED-style progress bar tinted with the active palette's brand color. */
export function TapeProgress({ progress, height = 3 }: TapeProgressProps) {
  const tokens = useTokens();
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View
      style={{
        height,
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${p * 100}%`,
          backgroundColor: tokens.ledOn,
          shadowColor: tokens.ledOn,
          shadowOpacity: 0.6,
          shadowRadius: 4,
        }}
      />
    </View>
  );
}
