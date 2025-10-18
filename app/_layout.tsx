// app/_layout.tsx
import { Stack } from 'expo-router';
import { StripeProvider } from '@stripe/stripe-react-native';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <StripeProvider
      publishableKey="pk_test_51SHbDqLMHBIjOOWfWaKUderaEYiBhy3bYSxBwanuXMYBfRrWWw82rND8YSoTF3QWiViN4532fIF9mme55nKUMLch00C9vpTY0s"
      merchantIdentifier="com.bienestar.app"
      urlScheme="bienestar"
    >
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* El grupo (tabs) renderiza su propio header */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Si tenés pantallas sueltas fuera de (tabs), podrías darles header aquí con title: 'Bienestar' */}
      </Stack>
    </StripeProvider>
  );
}
