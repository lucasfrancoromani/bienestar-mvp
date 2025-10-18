// app/(tabs)/select-pro.tsx
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { listProsForService } from '../../lib/api';

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

  const renderName = (p: Pro) => (p.full_name || p.name || p.id);

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Hereda header de Tabs (logo + degradado). Si igual querés title, dejamos este: */}
      <Stack.Screen options={{ title: 'Elegir profesional', headerShown: true }} />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : pros.length === 0 ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 16 }}>No hay profesionales para este servicio.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 12, backgroundColor: '#111', borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ color: '#fff' }}>Volver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16 }}
          data={pros}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Link
              href={{ pathname: '/slots', params: { serviceId: String(serviceId), proId: item.id } }}
              asChild
            >
              <TouchableOpacity style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Image
                  source={
                    item.avatar_url
                      ? { uri: item.avatar_url }
                      : require('../../assets/images/user-placeholder.png') // usa tu placeholder si lo tenés
                  }
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6' }}
                />
                <Text style={{ fontWeight: '600', color: '#0F172A' }}>{renderName(item)}</Text>
              </TouchableOpacity>
            </Link>
          )}
        />
      )}
    </View>
  );
}
