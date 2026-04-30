import { TextInput, View, Text, TextInputProps } from 'react-native';
import { useState } from 'react';
import { useTokens, useIsVintage } from '../../lib/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, accessibilityLabel, style, ...props }: InputProps) {
  const tokens = useTokens();
  const isVintage = useIsVintage();
  const [focused, setFocused] = useState(false);

  const borderColor = focused
    ? tokens.accent
    : error
      ? '#ef4444'
      : tokens.border;

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text
          style={{
            color: tokens.textMute,
            fontSize: 13,
            marginBottom: 8,
            fontWeight: '500',
            fontFamily: isVintage ? tokens.fontLabel : undefined,
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        style={[
          {
            backgroundColor: tokens.card,
            borderWidth: 1,
            borderRadius: tokens.radiusLg,
            paddingHorizontal: 16,
            paddingVertical: 12,
            color: tokens.text,
            fontSize: 15,
            minHeight: 48,
            borderColor,
          },
          style,
        ]}
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
      {error && (
        <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}
