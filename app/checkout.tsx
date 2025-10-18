// app/(tabs)/(client)/checkout.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../lib/supabase'; // ajusta la ruta a tu lib real

async function createPaymentIntent(bookingId: string) {
  const { data, error } = await supabase.functions.invoke('payments-intent', {
    body: { booking_id: bookingId },
  });
  if (error) throw new Error(error.message);
  return data as { client_secret: string };
}

export default function CheckoutScreen() {
  const [loading, setLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  // ⚠️ reemplazá por el booking real en tu flujo
  const bookingId = '1fff294b-7020-4401-bac8-9a0ccce63f5f';

  const onPagar = useCallback(async () => {
    try {
      setLoading(true);

      const { client_secret } = await createPaymentIntent(bookingId);

      // 👇 Debug defensivo: podés ver en log lo que estamos pasando
      const options = {
        paymentIntentClientSecret: client_secret,
        merchantDisplayName: 'Bienestar',
        allowsDelayedPaymentMethods: false,
        returnURL: 'bienestar://payments/redirect', // ✅ explícito, sin Linking
      } as const;

      console.log('[initPaymentSheet] options:', options);

      const init = await initPaymentSheet(options);
      if (init.error) {
        Alert.alert('Pago', init.error.message ?? 'No se pudo iniciar el pago');
        setLoading(false);
        return;
      }

      const present = await presentPaymentSheet();
      if (present.error) {
        Alert.alert('Pago cancelado', present.error.message ?? 'El usuario canceló o falló el pago');
        setLoading(false);
        return;
      }

      Alert.alert('Éxito', 'Pago realizado correctamente');
      // TODO: refetch de reservas o navegación a "Mis reservas"
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message ?? 'No se pudo procesar el pago');
    } finally {
      setLoading(false);
    }
  }, [bookingId, initPaymentSheet, presentPaymentSheet]);

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Checkout</Text>

      <TouchableOpacity
        onPress={onPagar}
        disabled={loading}
        style={{
          backgroundColor: '#111827',
          padding: 16,
          borderRadius: 12,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
            Pagar
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
