// app/review/[bookingId].tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';

function Star({ filled, onPress }: { filled: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ padding: 6 }}>
      <Text style={{ fontSize: 28 }}>{filled ? '★' : '☆'}</Text>
    </TouchableOpacity>
  );
}

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Traer booking + validar: dueña, estado correcto y sin review previa
  useEffect(() => {
    (async () => {
      try {
        if (!bookingId) return;
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert('Necesitás iniciar sesión');
          router.replace('/(tabs)/auth-login');
          return;
        }

        const { data: booking, error } = await supabase
          .from('bookings')
          .select('id, client_id, pro_id, status, start_at')
          .eq('id', String(bookingId))
          .maybeSingle();
        if (error || !booking) throw new Error('Reserva no encontrada');

        if (booking.client_id !== user.id) {
          throw new Error('No podés calificar esta reserva');
        }

        if (!['completed', 'paid'].includes(String(booking.status))) {
          throw new Error('Sólo podés calificar reservas completadas o pagadas');
        }

        const { data: existing } = await supabase
          .from('reviews')
          .select('id')
          .eq('booking_id', booking.id)
          .maybeSingle();
        if (existing) {
          Alert.alert('Ya calificado', 'Esta reserva ya tiene una reseña.');
          router.replace('/(tabs)/bookings');
          return;
        }
      } catch (e: any) {
        Alert.alert('No se puede calificar', e?.message ?? 'Verificá la reserva.');
        router.replace('/(tabs)/bookings');
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const onSend = async () => {
    if (!bookingId) return;
    if (rating < 1 || rating > 5) {
      return Alert.alert('Calificación inválida', 'Elige de 1 a 5 estrellas.');
    }

    try {
      setSending(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión no válida');

      const { data: booking } = await supabase
        .from('bookings')
        .select('id, client_id, pro_id, status')
        .eq('id', String(bookingId))
        .maybeSingle();
      if (!booking) throw new Error('Reserva no encontrada');

      // inserto review
      const { error: eInsert } = await supabase.from('reviews').insert({
        booking_id: booking.id,
        client_id: booking.client_id,
        professional_id: booking.pro_id,
        rating,
        comment: comment.trim(),
      });
      if (eInsert) throw eInsert;

      Alert.alert('¡Gracias!', 'Tu reseña fue enviada.');
      router.replace('/(tabs)/bookings');
    } catch (e: any) {
      Alert.alert('No se pudo enviar', e?.message ?? 'Intentá de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#fbf6ffff' }}>
      <Stack.Screen options={{ title: 'Calificar servicio' }} />
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Tu calificación</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            {[1,2,3,4,5].map((n) => (
              <Star key={n} filled={n <= rating} onPress={() => setRating(n)} />
            ))}
          </View>

          <Text style={{ fontWeight: '600', marginBottom: 6 }}>Comentario (opcional)</Text>
          <TextInput
            placeholder="Contanos tu experiencia…"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#e5e7eb',
              borderRadius: 12,
              padding: 12,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
          />

          <TouchableOpacity
            onPress={onSend}
            disabled={sending}
            style={{
              marginTop: 16,
              backgroundColor: '#d8b9ffff',
              padding: 14,
              borderRadius: 12,
              alignItems: 'center',
              opacity: sending ? 0.7 : 1,
            }}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '700' }}>Enviar reseña</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
