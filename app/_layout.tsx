// app/_layout.tsx (ejemplo)
import { Stack } from 'expo-router';
import { StripeProvider } from '@stripe/stripe-react-native';

export default function RootLayout() {
  return (
    <StripeProvider
      publishableKey="pk_test_51SHbDqLMHBIjOOWfWaKUderaEYiBhy3bYSxBwanuXMYBfRrWWw82rND8YSoTF3QWiViN4532fIF9mme55nKUMLch00C9vpTY0s" // ⚠️ tu PK de Stripe (modo test)
      merchantIdentifier="com.bienestar.app" // iOS Apple Pay (puede quedar así por ahora)
      urlScheme="bienestar" // para deep links futuros (puede quedar)
    >
      <Stack screenOptions={{ headerShown: false }} />
    </StripeProvider>
  );
}
