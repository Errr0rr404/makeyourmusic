import { TouchableOpacity, View, Text, type ViewStyle } from 'react-native';
import { useTokens } from '../../lib/theme';
import type { ReactNode } from 'react';

interface TransportButtonProps {
  variant?: 'metal' | 'red' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  label?: string;
  onPress?: () => void;
  children?: ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const sizes = { sm: 36, md: 48, lg: 64 };

/** Mechanical transport button — brushed-metal or lacquered-red face. */
export function TransportButton({
  variant = 'metal',
  size = 'md',
  active = false,
  label,
  onPress,
  children,
  style,
  accessibilityLabel,
}: TransportButtonProps) {
  const tokens = useTokens();
  const dim = sizes[size];
  const bg =
    variant === 'red'
      ? tokens.brand
      : variant === 'amber'
        ? tokens.ledAmber
        : tokens.metal;
  const isRed = variant === 'red';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        {
          width: dim,
          height: dim,
          borderRadius: isRed ? dim / 2 : 4,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: '#1a1009',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.6,
          shadowRadius: 4,
          elevation: 4,
        },
        active && { borderColor: tokens.brand, shadowColor: tokens.brand },
        style,
      ]}
    >
      {/* Highlight edge */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: dim / 2,
          borderTopLeftRadius: isRed ? dim / 2 : 4,
          borderTopRightRadius: isRed ? dim / 2 : 4,
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
        }}
      />
      {children}
      {label && (
        <Text
          style={{
            position: 'absolute',
            bottom: -14,
            color: tokens.textMute,
            fontFamily: tokens.fontDisplay,
            fontSize: 9,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
