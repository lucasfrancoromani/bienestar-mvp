import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' }, // 👈 fondo blanco para todas las rutas fuera de (tabs)
      }}
    />
  );
}
