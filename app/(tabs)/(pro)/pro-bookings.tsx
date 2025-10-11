// app/(tabs)/(pro)/pro-bookings.tsx
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { acceptBooking, listPendingForPro, rejectBooking } from '../../../lib/api';
import { displayName } from '../../../lib/display';

function Line(b: any) {
  const when = new Date(b.start_at).toLocaleString();
  const sname = b.services?.name || 'Servicio';
  const cli = displayName(b.client);
  return `${when} • ${sname} • ${cli}`;
}

export default function ProBookings() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listPendingForPro();
      setItems(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  const onAccept = async (id: string) => {
    try { await acceptBooking(id); await load(); }
    catch (e: any) { Alert.alert('No se pudo aceptar', e.message); }
  };

  const onReject = async (id: string) => {
    try { await rejectBooking(id); await load(); }
    catch (e: any) { Alert.alert('No se pudo rechazar', e.message); }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Reservas pendientes</Text>

      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text>No hay reservas pendientes.</Text>}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text>{Line(item)}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => onAccept(item.id)}
                style={{ padding: 10, borderRadius: 10, backgroundColor: '#111' }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Aceptar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onReject(item.id)}
                style={{ padding: 10, borderRadius: 10, backgroundColor: '#fde8e8' }}
              >
                <Text style={{ color: '#b00020' }}>Rechazar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}
