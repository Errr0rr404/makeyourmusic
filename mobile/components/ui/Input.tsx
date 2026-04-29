import { TextInput, View, Text, TextInputProps } from 'react-native';
import { useState } from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="mb-4">
      {label && <Text className="text-mym-muted text-sm mb-2 font-medium">{label}</Text>}
      <TextInput
        className={`bg-mym-card border rounded-xl px-4 py-3 text-mym-text text-base ${
          focused ? 'border-mym-accent' : error ? 'border-red-500' : 'border-mym-border'
        }`}
        placeholderTextColor="#71717a"
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
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
}
