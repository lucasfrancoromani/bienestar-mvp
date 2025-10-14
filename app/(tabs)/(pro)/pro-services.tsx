// app/(tabs)/(pro)/pro-services.tsx
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Alert, FlatList, RefreshControl, Text, View, TouchableOpacity } from 'react-native';
import { supabase } from '../../../lib/supabase';

type Service = {
  id: string;
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

  function Row({ item }: { item: Service }) {
    return (
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
          {item.name} · €{(item.price_cents / 100).toFixed(2)}
        </Text>
        <Text style={{ color: '#64748B', marginTop: 2 }}>
          {item.duration_min} min · {item.category || '—'}
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(tabs)/(pro)/pro-service/[id]',
                params: { id: String(item.id) },
              })
            }
            style={{
              backgroundColor: '#F3F4F6',
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#111827', fontWeight: '600' }}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => toggleActive(item.id, item.is_active)}
            style={{
              backgroundColor: '#F3F4F6',
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#111827', fontWeight: '600' }}>
              {item.is_active ? 'Desactivar' : 'Activar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => remove(item.id)}
            style={{
              backgroundColor: '#FDE8E8',
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
            }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#B00020', fontWeight: '600' }}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F6F7F9', padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#0F172A' }}>
        Mis servicios
      </Text>

      <TouchableOpacity
        onPress={() => router.push('/(tabs)/(pro)/pro-service-new')}
        style={{
          backgroundColor: '#111827',
          paddingVertical: 14,
          borderRadius: 12,
          alignItems: 'center',
          marginBottom: 12,
        }}
        activeOpacity={0.85}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Nuevo servicio</Text>
      </TouchableOpacity>

      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => <Row item={item} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? <Text style={{ color: '#64748B', marginTop: 8 }}>No hay servicios aún.</Text> : null
        }
      />
    </View>
  );
}
