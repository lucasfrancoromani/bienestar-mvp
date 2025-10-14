// components/ui/Screen.tsx
import React from 'react';
import { View, Text, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/app/theme';

export function Screen({
  title,
  children,
  footer,
  style,
  ...rest
}: ViewProps & { title?: string; footer?: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[{ flex: 1, padding: spacing.lg }, style]} {...rest}>
        {title ? <Text style={[typography.title, { marginBottom: spacing.md }]}>{title}</Text> : null}
        {children}
        {footer ? <View style={{ marginTop: spacing.lg }}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}
