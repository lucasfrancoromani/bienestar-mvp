// components/ui/Button.tsx
import React from 'react';
import { ActivityIndicator, GestureResponderEvent, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@/app/theme';

type Variant = 'primary' | 'outline' | 'ghost';
type Size = 'md' | 'lg';

export function Button({
  children,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'lg',
  style,
}: {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: Size;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;
  const base: ViewStyle = {
    paddingVertical: size === 'lg' ? spacing.lg : spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    alignItems: 'center',
    opacity: isDisabled ? 0.7 : 1,
  };

  let bg = colors.primary;
  let borderColor = colors.primary;
  let textColor = '#fff';

  if (variant === 'outline') {
    bg = '#fff';
    borderColor = colors.border;
    textColor = colors.text;
    Object.assign(base, { borderWidth: 1, borderColor });
  }

  if (variant === 'ghost') {
    bg = 'transparent';
    textColor = colors.text;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[base, { backgroundColor: bg }, style]}
      activeOpacity={0.8}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={{ color: textColor, fontWeight: '600' }}>{children}</Text>}
    </TouchableOpacity>
  );
}
