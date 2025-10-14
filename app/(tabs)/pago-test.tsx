import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../../lib/supabase';

// ⚠️ CAMBIÁ ESTO POR UN BOOKING REAL DEL CLIENTE
const BOOKING_ID_DE_PRUEBA = '1fff294b-7020-4401-bac8-9a0ccce63f5f';

async function createPaymentIntent(bookingId: string) {
  const { data, error } = await supabase.functions.invoke('payments-intent', {
    body: { booking_id: bookingId },
  });
  if (error) throw new Error(error.message);
  return data as { client_secret: string; amount: number; application_fee_cents: number };
}

function PagoTestInner() {
  const [loading, setLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const onPagar = useCallback(async () => {
    try {
      setLoading(true);
      const { client_secret } = await createPaymentIntent(BOOKING_ID_DE_PRUEBA);

      const init = await initPaymentSheet({
        paymentIntentClientSecret: client_secret,
        merchantDisplayName: 'Bienestar',
        allowsDelayedPaymentMethods: false,
      });
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
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message ?? 'No se pudo procesar el pago');
    } finally {
      setLoading(false);
    }
  }, [initPaymentSheet, presentPaymentSheet]);

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 8 }}>Pago de prueba (Cliente)</Text>
      <Text style={{ color: '#555', marginBottom: 16 }}>Booking: {BOOKING_ID_DE_PRUEBA}</Text>
      <TouchableOpacity
        onPress={onPagar}
        disabled={loading}
        style={{ backgroundColor: '#111827', padding: 16, borderRadius: 12, opacity: loading ? 0.7 : 1 }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : (
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Pagar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function PagoTestScreen() {
  return (
    <StripeProvider
      publishableKey="pk_test_51SHbDqLMHBIjOOWfWaKUderaEYiBhy3bYSxBwanuXMYBfRrWWw82rND8YSoTF3QWiViN4532fIF9mme55nKUMLch00C9vpTY0s"   // ← tu PK de Stripe (TEST)
      merchantIdentifier="com.bienestar.app"
      urlScheme="bienestar"
    >
      <PagoTestInner />
    </StripeProvider>
  );
}
