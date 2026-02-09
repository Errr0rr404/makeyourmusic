import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

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
  const baseClass = 'items-center justify-center rounded-xl';
  const sizeClass = size === 'sm' ? 'px-3 py-2' : size === 'lg' ? 'px-6 py-4' : 'px-5 py-3';
  const variantClass =
    variant === 'primary'
      ? 'bg-morlo-accent'
      : variant === 'secondary'
        ? 'bg-morlo-card border border-morlo-border'
        : 'bg-transparent';
  const textColor =
    variant === 'primary' ? 'text-white' : variant === 'secondary' ? 'text-morlo-text' : 'text-morlo-accent';
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[{ opacity: disabled || loading ? 0.5 : 1 }, style]}
      className={`${baseClass} ${sizeClass} ${variantClass}`}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : '#8b5cf6'} />
      ) : (
        <Text className={`${textColor} ${textSize} font-semibold`} style={textStyle}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
