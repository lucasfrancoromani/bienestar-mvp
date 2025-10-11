import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { listServices } from '../../lib/api';

export default function Explore() {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  useEffect(() => {
    listServices().then(setServices).catch(e => Alert.alert('Error', e.message)).finally(()=>setLoading(false));
  }, []);
  if (loading) return <ActivityIndicator />;
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 16  }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Servicios</Text>
      <FlatList
        data={services}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <Link href={{pathname:'/select-pro', params: { serviceId: item.id } }} asChild>
            <TouchableOpacity style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
              <Text>{item.name} • {Math.round(item.duration_min)} min</Text>
            </TouchableOpacity>
          </Link>
        )}
      />
    </View>
  );
}