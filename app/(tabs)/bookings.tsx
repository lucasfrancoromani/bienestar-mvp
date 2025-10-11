// app/(tabs)/bookings.tsx
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Text, View } from 'react-native';
import { cancelBooking, listMyBookings } from '../../lib/api';
import { displayName } from '../../lib/display';

function line(b: any) {
  const when = new Date(b.start_at).toLocaleString();
  const sname = b.services?.name || 'Servicio';
  const proName = displayName(b.pro);
  const cliName = displayName(b.client);
  return `${when} • ${sname} • Pro: ${proName} • Cliente: ${cliName} • ${b.status}`;
}

export default function MyBookings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  const load = () => {
    setLoading(true);
    listMyBookings()
      .then(setItems)
      .catch(e => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const onCancel = async (id: string) => {
    try { await cancelBooking(id); load(); }
    catch (e: any) { Alert.alert('No se pudo cancelar', e.message); }
  };

  const goReschedule = (item: any) => {
    const serviceId = item.service_id ?? item.services?.id;
    const proId = item.pro?.id;
    if (!serviceId || !proId) {
      return Alert.alert('Falta información', 'No se pudo determinar el servicio o el profesional.');
    }
    router.push({
      pathname: '/slots',
      params: { serviceId, proId, bookingId: item.id },
    });
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
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
              <Text>{line(item)}</Text>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {item.status === 'confirmed' && (
                  <View style={{ borderRadius: 8, overflow: 'hidden' }}>
                    <Button title="Cancelar" onPress={() => onCancel(item.id)} />
                  </View>
                )}

                {(item.status === 'confirmed' || item.status === 'pending') && (
                  <View style={{ borderRadius: 8, overflow: 'hidden' }}>
                    <Button title="Reprogramar" onPress={() => goReschedule(item)} />
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
