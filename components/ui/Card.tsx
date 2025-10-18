// components/ui/Card.tsx
import React from 'react';
import { View, ViewProps } from 'react-native';
import { colors, radii, spacing, shadow } from '@/app/theme';

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.bgCard,
          borderRadius: radii.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
          ...(shadow?.card as object),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
