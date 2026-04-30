import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { useTokens, useIsVintage } from '../../lib/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const tokens = useTokens();
  const isVintage = useIsVintage();

  const padX = size === 'sm' ? 12 : size === 'lg' ? 24 : 20;
  const padY = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 15;
  const minHeight = size === 'sm' ? 36 : size === 'lg' ? 56 : 48;

  const bg =
    variant === 'primary'
      ? tokens.brand
      : variant === 'secondary'
        ? tokens.card
        : 'transparent';
  const borderWidth = variant === 'secondary' ? 1 : 0;
  const borderColor = tokens.border;
  const textColor =
    variant === 'primary' ? tokens.brandText : variant === 'secondary' ? tokens.text : tokens.accent;
  const spinnerColor = variant === 'primary' ? tokens.brandText : tokens.accent;
  const vintagePrimary = isVintage && variant === 'primary';
  const vintageSecondary = isVintage && variant === 'secondary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: tokens.radiusLg,
          paddingHorizontal: padX,
          paddingVertical: padY,
          minHeight,
          backgroundColor: bg,
          borderWidth: vintagePrimary || vintageSecondary ? 1 : borderWidth,
          borderColor: vintagePrimary ? tokens.brandStrong : borderColor,
          opacity: disabled || loading ? 0.5 : 1,
          shadowColor: vintagePrimary ? tokens.brand : '#000',
          shadowOpacity: vintagePrimary ? 0.35 : 0,
          shadowRadius: vintagePrimary ? 8 : 0,
          shadowOffset: { width: 0, height: vintagePrimary ? 3 : 0 },
          elevation: vintagePrimary ? 3 : 0,
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <Text
          style={[
            {
              color: textColor,
              fontSize,
              fontWeight: '600',
            },
            isVintage
              ? { fontFamily: tokens.fontLabel, letterSpacing: 0.5, textTransform: 'uppercase' }
              : null,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
