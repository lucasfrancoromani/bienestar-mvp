// app/lib/anim.ts
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
  Pressable,
  PressableProps,
} from 'react-native';

// Habilitar animaciones de layout en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// === FadeIn básico ===
export function useFadeIn(duration = 250, delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const id = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, delay);
    return () => clearTimeout(id);
  }, [delay, duration, opacity]);
  return { opacity };
}

// === Aplica LayoutAnimation suave en el próximo cambio de layout ===
export function animateNextLayout(duration = 220) {
  LayoutAnimation.configureNext({
    duration,
    create: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: {
      type: LayoutAnimation.Types.easeInEaseOut,
      property: LayoutAnimation.Properties.opacity,
    },
  });
}

// === Pressable con escala (feedback sutil) ===
export function PressableScale({
  children,
  disabled,
  minScale = 0.97,
  style,
  ...props
}: Omit<PressableProps, 'style'> & {
  children: React.ReactNode;
  minScale?: number;
  style?: any;
}) {
  const [anim] = useState(() => new Animated.Value(0));
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, minScale] });

  return (
    <Pressable
      disabled={disabled}
      onPressIn={(e) => {
        Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        Animated.spring(anim, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
        props.onPressOut?.(e);
      }}
      {...props}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}
