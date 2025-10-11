import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Text, View } from 'react-native';
import { createBooking, listSlots } from '../lib/api';
import { supabase } from '../lib/supabase';
// ...
<Stack.Screen options={{ title: 'Elegir horario', headerShown: true }} />

function toHuman(dt: string) { return new Date(dt).toLocaleString(); }

export default function SlotsScreen() {
  const { serviceId, proId } = useLocalSearchParams<{ serviceId: string; proId: string }>();
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<{ slot_start: string; slot_end: string }[]>([]);

  const load = async () => {
    try {
      if (!serviceId || !proId) return;
      setLoading(true);
      const from = new Date();
      const to = new Date(); to.setDate(to.getDate() + 7);
      const data = await listSlots(String(proId), String(serviceId), from.toISOString(), to.toISOString());
      setSlots(data);
    } catch (e: any) { Alert.alert('Error cargando slots', e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [serviceId, proId]);

  const book = async (startISO: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return Alert.alert('Necesitás iniciar sesión');
      const id = await createBooking(String(proId), String(serviceId), startISO);
      Alert.alert('¡Reserva creada!', `ID: ${id}`);
      load();
    } catch (e: any) { Alert.alert('No se pudo reservar', e.message); }
  };

  if (loading) return <ActivityIndicator />;

  return (
    <View style={{flex: 1, backgroundColor: '#fff', padding: 16 }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Elegir horario',
        }}
      />
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#111', marginBottom: 12}}>Turnos disponibles</Text>
      <Button title="Recargar" onPress={load} />
      <FlatList
        data={slots}
        keyExtractor={(s) => s.slot_start}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text>{toHuman(item.slot_start)} → {toHuman(item.slot_end)}</Text>
            <Button title="Reservar" onPress={() => book(item.slot_start)} />
          </View>
        )}
      />
    </View>
  );
}
