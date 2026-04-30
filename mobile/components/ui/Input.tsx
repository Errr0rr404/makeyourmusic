import { TextInput, View, Text, TextInputProps } from 'react-native';
import { useState } from 'react';
import { useTokens } from '../../lib/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, accessibilityLabel, ...props }: InputProps) {
  const tokens = useTokens();
  const [focused, setFocused] = useState(false);

  return (
    <View className="mb-4">
      {label && <Text className="text-mym-muted text-sm mb-2 font-medium">{label}</Text>}
      <TextInput
        className={`bg-mym-card border rounded-xl px-4 py-3 text-mym-text text-base ${
          focused ? 'border-mym-accent' : error ? 'border-red-500' : 'border-mym-border'
        }`}
        style={{ minHeight: 48 }}
        placeholderTextColor={tokens.textMute}
        accessibilityLabel={accessibilityLabel ?? label}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && <Text className="text-red-500 text-xs mt-1" accessibilityRole="alert">{error}</Text>}
    </View>
  );
}
