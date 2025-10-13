// app/(tabs)/bookings.tsx
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, RefreshControl, Text, View } from 'react-native';
import { cancelBooking, listMyBookings } from '../../lib/api';
import { displayName } from '../../lib/display';

type Booking = {
  id: string;
  start_at: string;
  status: 'pending'|'confirmed'|'canceled'|'completed';
  services?: {
    id: string;
    name: string;
    duration_min: number;
    reschedule_window_hours?: number;
    cancel_window_hours?: number; // 👈 nuevo
  };
  service_id?: string;
  pro?: { id: string; full_name?: string };
  client?: { id: string; full_name?: string };
};

function line(b: Booking) {
  const when = new Date(b.start_at).toLocaleString();
  const sname = b.services?.name || 'Servicio';
  const proName = displayName(b.pro);
  const cliName = displayName(b.client);
  return `${when} • ${sname} • Pro: ${proName} • Cliente: ${cliName} • ${b.status}`;
}

// regla: ¿se puede reprogramar según la ventana del servicio?
function canReschedule(b: Booking) {
  if (!(b.status === 'pending' || b.status === 'confirmed')) return false;
  const hours = Math.max(0, Number(b.services?.reschedule_window_hours ?? 24));
  const now = Date.now();
  const start = new Date(b.start_at).getTime();
  return start - now > hours * 3600_000;
}

// regla: ¿se puede cancelar según la ventana del servicio?
function canCancel(b: Booking) {
  if (!(b.status === 'pending' || b.status === 'confirmed')) return false;
  const hours = Math.max(0, Number(b.services?.cancel_window_hours ?? 24));
  const now = Date.now();
  const start = new Date(b.start_at).getTime();
  return start - now > hours * 3600_000;
}

export default function MyBookings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Booking[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listMyBookings();
      setItems(data as any);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const data = await listMyBookings();
      setItems(data as any);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const onCancel = async (id: string) => {
    try { await cancelBooking(id); load(); }
    catch (e: any) { 
      // Mensajes más claros si vienen del RPC
      const msg = String(e.message || '').toLowerCase();
      if (msg.includes('outside_cancel_window')) {
        Alert.alert('No disponible', 'Este turno ya no se puede cancelar por la ventana configurada.');
      } else {
        Alert.alert('No se pudo cancelar', e.message);
      }
    }
  };

  const goReschedule = (item: Booking) => {
    const serviceId = item.service_id ?? item.services?.id;
    const proId = item.pro?.id;
    if (!serviceId || !proId) {
      return Alert.alert('Falta información', 'No se pudo determinar el servicio o el profesional.');
    }
    if (!canReschedule(item)) {
      const hrs = item.services?.reschedule_window_hours ?? 24;
      return Alert.alert('No disponible', `Este turno ya no se puede reprogramar (ventana: ${hrs} h).`);
    }
    router.push({ pathname: '/slots', params: { serviceId, proId, bookingId: item.id } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Mis reservas</Text>

      {loading && <ActivityIndicator />}

      {!loading && (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          ListEmptyComponent={<Text>No tenés reservas aún.</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
              <Text>{line(item)}</Text>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {canCancel(item) && (
                  <View style={{ borderRadius: 8, overflow: 'hidden' }}>
                    <Button title="Cancelar" onPress={() => onCancel(item.id)} />
                  </View>
                )}
                {canReschedule(item) && (
                  <View style={{ borderRadius: 8, overflow: 'hidden' }}>
                    <Button title="Reprogramar" onPress={() => goReschedule(item)} />
                  </View>
                )}
              </View>

              {/* Mensajes aclaratorios */}
              {!(canCancel(item)) && (item.status === 'pending' || item.status === 'confirmed') && (
                <Text style={{ color: '#999', marginTop: 6 }}>
                  Cancelación no disponible por ventana.
                </Text>
              )}
              {!(canReschedule(item)) && (item.status === 'pending' || item.status === 'confirmed') && (
                <Text style={{ color: '#999', marginTop: 2 }}>
                  Reprogramación no disponible por ventana.
                </Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}
