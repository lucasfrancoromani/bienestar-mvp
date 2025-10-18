// app/(tabs)/(pro)/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { isProUser } from '../../../lib/authz'; // ajustá la ruta si tu archivo está en otro lado

export default function ProStackLayout() {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ok = await isProUser();
        setAllowed(ok);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!allowed) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitle: 'Bienestar',     // MISMO título en todo (pro)
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="pro"                 />
      <Stack.Screen name="pro-profile"         />
      <Stack.Screen name="pro-coverage"        />
      <Stack.Screen name="pro-services"        />
      <Stack.Screen name="pro-service-new"     />
      <Stack.Screen name="pro-service/[id]"    />
      <Stack.Screen name="pro-availability"    />
      <Stack.Screen name="pro-bookings"        />
      <Stack.Screen name="pro-finanzas"        />
    </Stack>
  );
}
