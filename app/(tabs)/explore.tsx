// app/(tabs)/explore.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase'; // 🔧 ajustá si tu ruta real es distinta


export default function ExploreScreen() {
  const router = useRouter();
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .limit(10);
    if (!error) setServices(data || []);
  }

  const categories = [
    { name: 'Masajes', icon: require('../../assets/images/massage.png') },
    { name: 'Facial',  icon: require('../../assets/images/facial.png') },
    { name: 'Uñas',    icon: require('../../assets/images/nails.png') },
    { name: 'Pelo',    icon: require('../../assets/images/hair.png') },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#f8f6faff' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
    >
      {/* 👋 Bienvenida */}
      <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A' }}>
        Descubrí servicios para sentirte mejor
      </Text>
      <Text style={{ color: '#64748B', marginTop: 4, marginBottom: 20 }}>
        Elegí una categoría y encontrá profesionales cerca tuyo
      </Text>

      {/* 🏷️ Categorías */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.name}
            onPress={() => router.push({ pathname: '/select-pro', params: { category: cat.name } })}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 20,
              alignItems: 'center',
              justifyContent: 'center',
              width: '48%',
              borderWidth: 1,
              borderColor: '#f0dcffff',
            }}
            activeOpacity={0.85}
          >
            <Image source={cat.icon} style={{ width: 40, height: 40, marginBottom: 8 }} />
            <Text style={{ fontWeight: '600', color: '#0F172A' }}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 💅 Servicios destacados */}
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 }}>
        Servicios destacados
      </Text>

      <FlatList
        data={services}
        keyExtractor={(item) => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/select-pro',
                params: { serviceId: String(item.id) },
              })
            }
            activeOpacity={0.9}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              marginRight: 12,
              width: 220,
              borderWidth: 1,
              borderColor: '#f0dcffff',
              overflow: 'hidden',
            }}
          >
            <Image
              source={{ uri: 'https://image.tuasaude.com/media/article/yi/yk/masajes-relajantes-con-aceites-esenciales_68365.jpg?width=686&height=487' }}
              style={{ width: '100%', height: 150 }}
            />
            <View style={{ padding: 12 }}>
              <Text style={{ fontWeight: '700', color: '#0F172A' }}>{item.name}</Text>
              <Text style={{ color: '#64748B', marginTop: 2 }}>
                €{(item.price_cents / 100).toFixed(2)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </ScrollView>
  );
}
