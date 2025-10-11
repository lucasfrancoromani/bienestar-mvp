import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Text, View } from 'react-native';
import { cancelBooking, listMyBookings } from '../../lib/api';
import { displayName } from '../../lib/display';

function line(b: any) {
  const when = new Date(b.start_at).toLocaleString();
  const sname = b.services?.name || 'Servicio';
  const proName = displayName(b.pro);      // 👈 ya no muestra id crudo
  const cliName = displayName(b.client);   // 👈 idem
  return `${when} • ${sname} • Pro: ${proName} • Cliente: ${cliName} • ${b.status}`;
}

export default function MyBookings() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  const load = () => {
    setLoading(true);
    listMyBookings().then(setItems).catch(e => Alert.alert('Error', e.message)).finally(()=>setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const onCancel = async (id: string) => {
    try { await cancelBooking(id); load(); }
    catch (e: any) { Alert.alert('No se pudo cancelar', e.message); }
  };

  if (loading) return <ActivityIndicator />;
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 16  }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Mis reservas</Text>
      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text>{line(item)}</Text>
            {item.status === 'confirmed' && <Button title="Cancelar" onPress={() => onCancel(item.id)} />}
          </View>
        )}
      />
    </View>
  );
}
