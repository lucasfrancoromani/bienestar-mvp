import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { supabase } from '../../../lib/supabase';

async function createPaymentIntent(bookingId: string) {
  const { data, error } = await supabase.functions.invoke('payments-intent', {
    body: { booking_id: bookingId },
  });
  if (error) throw new Error(error.message);
  return data as { client_secret: string; amount: number; application_fee_cents: number };
}

function CheckoutInner() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [loading, setLoading] = useState(false);
  const [amountEur, setAmountEur] = useState<number | null>(null);

  const onPay = useCallback(async () => {
    try {
      if (!bookingId) throw new Error('Reserva no encontrada');
      setLoading(true);
      const { client_secret, amount } = await createPaymentIntent(bookingId);
      setAmountEur(amount / 100);

      const init = await initPaymentSheet({
        paymentIntentClientSecret: client_secret,
        merchantDisplayName: 'Bienestar',
        allowsDelayedPaymentMethods: false,
      });
      if (init.error) throw new Error(init.error.message ?? 'No se pudo iniciar el pago');

      const res = await presentPaymentSheet();
      if (res.error) {
        Alert.alert('Pago cancelado', res.error.message ?? 'Se canceló o falló el pago');
        return;
      }

      Alert.alert('Éxito', 'Pago realizado correctamente');
      router.replace('/(tabs)/bookings'); // el webhook actualizará a "Pagada"
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo procesar el pago');
    } finally {
      setLoading(false);
    }
  }, [bookingId, initPaymentSheet, presentPaymentSheet, router]);

  useEffect(() => {
    // opcional: podrías precargar datos de la reserva acá si querés mostrar detalles
  }, []);

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Pagar reserva</Text>
      {amountEur !== null && (
        <Text style={{ color: '#555' }}>Importe: € {amountEur.toFixed(2)}</Text>
      )}
      <TouchableOpacity
        onPress={onPay}
        disabled={loading}
        style={{ backgroundColor: '#111827', padding: 16, borderRadius: 12, opacity: loading ? 0.7 : 1 }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : (
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Pagar ahora</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function CheckoutScreen() {
  return (
    <StripeProvider
      publishableKey="pk_test_51SHbDqLMHBIjOOWfWaKUderaEYiBhy3bYSxBwanuXMYBfRrWWw82rND8YSoTF3QWiViN4532fIF9mme55nKUMLch00C9vpTY0s"  // ← tu Publishable Key (TEST)
      merchantIdentifier="com.bienestar.app"
      urlScheme="bienestar"
    >
      <CheckoutInner />
    </StripeProvider>
  );
}
