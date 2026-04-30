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
  const baseClass = 'items-center justify-center rounded-xl';
  const sizeClass = size === 'sm' ? 'px-3 py-2' : size === 'lg' ? 'px-6 py-4' : 'px-5 py-3';
  const minHeight = size === 'sm' ? 36 : size === 'lg' ? 56 : 48;
  const variantClass =
    variant === 'primary'
      ? 'bg-mym-accent'
      : variant === 'secondary'
        ? 'bg-mym-card border border-mym-border'
        : 'bg-transparent';
  const textColor =
    variant === 'primary' ? 'text-white' : variant === 'secondary' ? 'text-mym-text' : 'text-mym-accent';
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';
  const spinnerColor = variant === 'primary' ? tokens.brandText : tokens.accent;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
      style={[{ opacity: disabled || loading ? 0.5 : 1, minHeight }, style]}
      className={`${baseClass} ${sizeClass} ${variantClass}`}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <Text
          className={`${textColor} ${textSize} font-semibold`}
          style={[
            isVintage ? { fontFamily: tokens.fontLabel, letterSpacing: 0.5, textTransform: 'uppercase' } : null,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
