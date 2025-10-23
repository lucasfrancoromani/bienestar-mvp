// app/(tabs)/checkout/[bookingId].tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';

type BookingRow = {
  id: string;
  start_at: string;
  total_cents: number;
  status:
    | 'pending' | 'confirmed' | 'canceled' | 'completed' | 'paid'
    | 'failed' | 'processing_payment' | 'rejected';
  services?: { id: string; name: string; duration_min: number };
  pro?: { id: string; full_name?: string | null };
};

async function fetchBooking(bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      start_at,
      total_cents,
      status,
      services:service_id ( id, name, duration_min ),
      pro:pro_id ( id, full_name )
    `)
    .eq('id', bookingId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Reserva no encontrada');
  return data as BookingRow;
}

async function createPaymentIntent(bookingId: string) {
  const { data, error } = await supabase.functions.invoke('payments-intent', {
    body: { booking_id: bookingId },
  });
  if (error) throw new Error(error.message);
  return data as { client_secret: string; amount: number; application_fee_cents: number };
}

function euros(cents: number) {
  return (cents / 100).toFixed(2);
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  const base = {
    height: 6, borderRadius: 999, backgroundColor: '#E5E7EB', overflow: 'hidden',
  } as const;
  const fillWidth = step === 1 ? '50%' : '100%';
  return (
    <View style={[base, { width: '100%' }]}>
      <View style={{ width: fillWidth, height: '100%', backgroundColor: '#0EA5E9' }} />
    </View>
  );
}

function SummaryCard({ b }: { b: BookingRow }) {
  const when = new Date(b.start_at);
  const fecha = when.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
  const hora = when.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return (
    <View
      style={{
        backgroundColor: '#FFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 16,
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
        {b.services?.name ?? 'Servicio'}
      </Text>
      <Text style={{ color: '#64748B' }}>
        {b.services?.duration_min ?? 60} min · {b.pro?.full_name ?? 'Profesional'}
      </Text>
      <Text style={{ color: '#334155' }}>
        {fecha}, {hora}
      </Text>

      <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#0F172A' }}>Subtotal</Text>
        <Text style={{ fontWeight: '700', color: '#0F172A' }}>€{euros(b.total_cents)}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontWeight: '700', color: '#0F172A' }}>Total</Text>
        <Text style={{ fontWeight: '800', color: '#0F172A' }}>€{euros(b.total_cents)}</Text>
      </View>
    </View>
  );
}

function CheckoutInner() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  // === Reserva para NO pisar el TabBar flotante ===
  const insets = useSafeAreaInsets();
  const BAR_HEIGHT = 64;           // alto del pill
  const BG_PADDING = 12;           // padding del fondo del dock
  const BG_HEIGHT = BAR_HEIGHT + BG_PADDING * 2; // ≈ 88
  const OUTER_MARGIN_BOTTOM = 16;  // separación del borde
  const INSETS_TWEAK = -6;         // ajuste que usás en el layout
  const DOCK_RESERVE = BG_HEIGHT + OUTER_MARGIN_BOTTOM + Math.max(insets.bottom + INSETS_TWEAK, 0);

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [initializingSheet, setInitializingSheet] = useState(false);

  const canPay = useMemo(() => {
    if (!booking) return false;
    return booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'processing_payment';
  }, [booking]);

  const load = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      const row = await fetchBooking(bookingId);
      setBooking(row);
    } catch (e: any) {
      Alert.alert('No se pudo cargar', e?.message ?? 'Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/bookings');
  };

  const initSheet = useCallback(async () => {
    if (!bookingId) return;
    try {
      setInitializingSheet(true);

      const { client_secret } = await createPaymentIntent(bookingId);

      const init = await initPaymentSheet({
        paymentIntentClientSecret: client_secret,
        merchantDisplayName: 'Bienestar',
        allowsDelayedPaymentMethods: false,
        returnURL: 'bienestar://payments/redirect',
      });

      if (init.error) {
        throw new Error(init.error.message ?? 'No se pudo iniciar el pago');
      }
      setStep(2);
    } catch (e: any) {
      Alert.alert('Pago', e?.message ?? 'No se pudo iniciar el pago');
    } finally {
      setInitializingSheet(false);
    }
  }, [bookingId, initPaymentSheet]);

  const pay = useCallback(async () => {
    try {
      const res = await presentPaymentSheet();
      if (res.error) {
        Alert.alert('Pago cancelado', res.error.message ?? 'Se canceló o falló el pago');
        return;
      }
      Alert.alert('Éxito', 'Pago realizado correctamente');
      router.replace('/(tabs)/bookings');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo procesar el pago');
    }
  }, [presentPaymentSheet, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A' }}>Checkout</Text>
        <StepIndicator step={step} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : !booking ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: '#64748B' }}>No encontramos la reserva.</Text>
          <TouchableOpacity onPress={goBack} style={{ backgroundColor: '#111', padding: 14, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* 👇 Reservo cola para que el contenido jamás quede detrás del TabBar */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 16 + DOCK_RESERVE }}>
            {step === 1 && (
              <>
                <SummaryCard b={booking} />
                <View
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#DBEAFE',
                  }}
                >
                  <Text style={{ color: '#1E3A8A', fontWeight: '600' }}>
                    Pagás ahora y asegurás tu horario. Si el profesional cancela, te devolvemos el 100%.
                  </Text>
                </View>
              </>
            )}

            {step === 2 && (
              <View
                style={{
                  backgroundColor: '#FFF',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  padding: 16,
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                  Método de pago
                </Text>
                <Text style={{ color: '#64748B' }}>
                  Abriremos la hoja de pago segura de Stripe para finalizar tu compra.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* CTA fijo por ENCIMA del TabBar */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: DOCK_RESERVE,
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              backgroundColor: '#FFFFFF',
              padding: 12,
              gap: 8,
              zIndex: 50,
              elevation: 8,
            }}
          >
            {step === 1 ? (
              <TouchableOpacity
                disabled={!canPay || initializingSheet}
                onPress={initSheet}
                style={{
                  backgroundColor: !canPay || initializingSheet ? '#93C5FD' : '#0EA5E9',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                {initializingSheet ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '800' }}>
                    Continuar al pago · €{euros(booking.total_cents)}
                  </Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={pay}
                style={{
                  backgroundColor: '#111827',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>Pagar ahora</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={goBack} style={{ paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: '#64748B', fontWeight: '600' }}>Volver</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

export default function CheckoutScreen() {
  return (
    <StripeProvider
      publishableKey="pk_test_51SHbDqLMHBIjOOWfWaKUderaEYiBhy3bYSxBwanuXMYBfRrWWw82rND8YSoTF3QWiViN4532fIF9mme55nKUMLch00C9vpTY0s"
      merchantIdentifier="com.bienestar.app"
      urlScheme="bienestar"
    >
      <CheckoutInner />
    </StripeProvider>
  );
}
