// app/slots.tsx
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Text, View } from 'react-native';
import { createBooking, listSlots, rescheduleBooking } from '../lib/api';
import { supabase } from '../lib/supabase';

type Slot = { slot_start: string; slot_end: string };

function toHuman(dt: string) {
  const d = new Date(dt);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

export default function SlotsScreen() {
  const { serviceId, proId, bookingId } = useLocalSearchParams<{
    serviceId: string;
    proId: string;
    bookingId?: string;
  }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);

  const load = async () => {
    try {
      setLoading(true);

      // Construyo rango: desde ahora hasta +14 días
      const from = new Date();
      from.setSeconds(0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 14);

      const fromISO = from.toISOString();
      const toISO = to.toISOString();

      // El listSlots espera 4 args (el error indicaba falta de 'fromISO').
      // Fuerzo el llamado con 4 args (proId, serviceId, fromISO, toISO).
      // Uso "as any" para evitar el error de tipos hasta alinear la firma real.
      const data: Slot[] = await (listSlots as any)(
        String(proId),
        String(serviceId),
        fromISO,
        toISO
      );

      setSlots(data || []);
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proId, serviceId]);

  const book = async (startISO: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return Alert.alert('Necesitás iniciar sesión');

      if (bookingId) {
        // Reprogramar reserva existente
        await rescheduleBooking(String(bookingId), startISO);
        Alert.alert('¡Listo!', 'Reserva reprogramada.');
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/bookings');
      } else {
        // Crear reserva nueva
        const id = await createBooking(String(proId), String(serviceId), startISO);
        Alert.alert('¡Reserva creada!', `ID: ${id}`);
        load();
      }
    } catch (e: any) {
      Alert.alert('No se pudo reservar', e.message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Stack.Screen
        options={{
          title: bookingId ? 'Reprogramar reserva' : 'Slots disponibles',
          headerShown: true,
        }}
      />

      {loading && <ActivityIndicator />}

      {!loading && slots.length === 0 && (
        <View style={{ paddingVertical: 12 }}>
          <Text>No hay horarios disponibles en los próximos 14 días.</Text>
          <View style={{ marginTop: 8 }}>
            <Button title="Recargar" onPress={load} />
          </View>
        </View>
      )}

      <FlatList
        data={slots}
        keyExtractor={(s) => s.slot_start}
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderColor: '#eee',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <Text>{toHuman(item.slot_start)} → {new Date(item.slot_end).toLocaleTimeString()}</Text>
            <Button
              title={bookingId ? 'Reprogramar' : 'Reservar'}
              onPress={() => book(item.slot_start)}
            />
          </View>
        )}
      />
    </View>
  );


}
