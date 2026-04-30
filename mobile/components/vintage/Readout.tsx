import { Text, View } from 'react-native';
import { useTokens } from '../../lib/theme';

interface ReadoutProps {
  value: string;
  size?: 'sm' | 'md' | 'lg';
  glow?: 'red' | 'amber' | 'green';
}

const sizes = { sm: 14, md: 18, lg: 26 };

/** LED-style digital readout. Red glow by default. */
export function Readout({ value, size = 'md', glow = 'red' }: ReadoutProps) {
  const tokens = useTokens();
  const color =
    glow === 'amber' ? tokens.ledAmber : glow === 'green' ? tokens.ledGreen : tokens.ledOn;
  return (
    <View
      style={{
        backgroundColor: '#0a0805',
        borderRadius: 2,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color,
          fontSize: sizes[size],
          fontFamily: tokens.fontMono,
          letterSpacing: 1.2,
          textShadowColor: color,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 4,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
