// app/(tabs)/pago-test.tsx
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function PagoTest() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB', padding: 16 }}>
      <Stack.Screen options={{ title: 'Pago de prueba' }} />
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
        Pago de prueba
      </Text>
      <Text style={{ color: '#64748B', marginBottom: 16 }}>
        Usá esta pantalla sólo durante testing.
      </Text>

      <TouchableOpacity
        onPress={() => router.push({ pathname: '/checkout/[bookingId]', params: { bookingId: 'test-booking' } })}
        style={{ backgroundColor: '#111827', borderRadius: 12, padding: 14, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Ir a checkout (booking de prueba)</Text>
      </TouchableOpacity>
    </View>
  );
}
