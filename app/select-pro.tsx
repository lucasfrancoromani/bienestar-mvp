import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { listProsForService } from '../lib/api';

type Pro = { id: string; full_name?: string | null; name?: string | null; avatar_url?: string | null };

export default function SelectPro() {
  const { serviceId } = useLocalSearchParams<{ serviceId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pros, setPros] = useState<Pro[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!serviceId) return;
      setLoading(true);
      try {
        const list = await listProsForService(String(serviceId));
        if (!cancelled) setPros(Array.isArray(list) ? list : []);
      } catch (e: any) {
        Alert.alert('Error', e.message ?? 'No se pudo cargar profesionales');
        if (!cancelled) setPros([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [serviceId]);

  const renderName = (p: Pro) => p.full_name || p.name || p.id;

  return (
    <View style={{flex: 1, backgroundColor: '#fff'}}>
      <Stack.Screen options={{ title: 'Elegir profesional', headerShown: true }} />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : pros.length === 0 ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 16 }}>No hay profesionales para este servicio.</Text>
          <Button title="Volver" onPress={() => router.back()} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16 }}
          data={pros}
          keyExtractor={(p, idx) => p?.id ?? `idx-${idx}`}
          renderItem={({ item }) =>
            !item ? null : (
              <Link
                href={{ pathname: '/slots', params: { serviceId: String(serviceId), proId: item.id } }}
                asChild
              >
                <TouchableOpacity style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
                  <Text>{renderName(item)}</Text>
                </TouchableOpacity>
              </Link>
            )
          }
        />
      )}
    </View>
  );
}
