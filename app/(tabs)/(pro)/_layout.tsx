// app/(tabs)/(pro)/_layout.tsx
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { isProUser } from '../../../lib/authz';

export default function ProStackLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ok = await isProUser();
        setAllowed(ok);
        if (!ok) router.replace('/(tabs)'); // 👈 redirige al home tabs
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!allowed) return null;

  return (
    <Stack screenOptions={{ headerShadowVisible: false, gestureEnabled: true, fullScreenGestureEnabled: true }}>
      <Stack.Screen name="pro"                  options={{ title: 'Panel Profesional' }} />
      <Stack.Screen name="pro-profile"          options={{ title: 'Mi Perfil' }} />
      <Stack.Screen name="pro-coverage"         options={{ title: 'Zonas' }} />
      <Stack.Screen name="pro-services"         options={{ title: 'Mis servicios' }} />
      <Stack.Screen name="pro-service-new"      options={{ title: 'Nuevo servicio' }} />
      <Stack.Screen name="pro-service/[id]"     options={{ title: 'Editar servicio' }} />
      <Stack.Screen name="pro-availability"     options={{ title: 'Disponibilidad' }} />
      <Stack.Screen name="pro-bookings"         options={{ title: 'Reservas' }} />
    </Stack>
  );
}