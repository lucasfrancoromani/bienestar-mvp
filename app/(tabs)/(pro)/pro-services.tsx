// app/(tabs)/(pro)/pro-services.tsx
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../../lib/supabase';
const router = useRouter();

type Service = {
  id: string; // si fuese number, hacemos String(id) al navegar
  name: string;
  description?: string;
  price_cents: number;
  duration_min: number;
  category?: string;
  is_active: boolean;
  created_at?: string;
  professional_id: string;
};

export default function ProServices() {
  const router = useRouter();
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    await supabase.rpc('ensure_pro_profile');
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('professional_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setItems((data as Service[]) || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('services').update({ is_active: !current }).eq('id', id);
    if (!error) fetchData();
  };

  const remove = (id: string) => {
    Alert.alert('Eliminar', '¿Eliminar este servicio?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('services').delete().eq('id', id);
          if (!error) fetchData();
        },
      },
    ]);
  };

  const Row = ({ item }: { item: Service }) => (
    <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
      <Text style={{ fontSize: 16, fontWeight: '600' }}>
        {item.name} · ${(item.price_cents / 100).toFixed(2)}
      </Text>
      <Text style={{ color: '#666' }}>
        {item.duration_min} min · {item.category || '—'}
      </Text>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        {/* ✅ Navegación correcta a ruta dinámica usando pathname + params */}
        <TouchableOpacity
  onPress={() =>
    router.push({
      pathname: '/pro-service/[id]',   // 👈 carpeta dinámica
      params: { id: String(item.id) },
    })
  }
  style={{ padding: 8, backgroundColor: '#f5f5f5', borderRadius: 10 }}
>
  <Text>Editar</Text>
</TouchableOpacity>

        <TouchableOpacity
          onPress={() => toggleActive(item.id, item.is_active)}
          style={{ padding: 8, backgroundColor: '#f5f5f5', borderRadius: 10 }}
        >
          <Text>{item.is_active ? 'Desactivar' : 'Activar'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => remove(item.id)}
          style={{ padding: 8, backgroundColor: '#fde8e8', borderRadius: 10 }}
        >
          <Text style={{ color: '#b00020' }}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ padding: 16, flex: 1 }}>
      {/* ➕ Nuevo servicio: path plano (sin /(tabs)) */}
      <Link href="/pro-service-new" asChild>
        <TouchableOpacity
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: '#111',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Nuevo servicio</Text>
        </TouchableOpacity>
      </Link>

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        renderItem={Row}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={!loading ? <Text>No hay servicios aún.</Text> : null}
      />
    </View>
  );
}
