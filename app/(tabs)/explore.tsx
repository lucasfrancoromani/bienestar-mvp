// app/(tabs)/explore.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useFadeIn, PressableScale, animateNextLayout } from '../../lib/anim';

type Service = {
  id: string;
  name: string;
  description?: string | null;
  price_cents: number;
  duration_min: number;
  category?: string | null;
  is_active: boolean;
  cover_url?: string | null;
  rating_avg?: number | null;
};

const CATEGORIES = [
  'Masajes',
  'Facial',
  'Uñas',
  'Pelo',
  'Depilación',
  'Makeup',
  'Barbería',
] as const;

const categoryCovers: Record<string, string> = {
  Masajes:
    'https://images.unsplash.com/photo-1587019158091-a264f4780b9b?q=80&w=1400&auto=format&fit=crop',
  Facial:
    'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=1400&auto=format&fit=crop',
  Uñas:
    'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?q=80&w=1400&auto=format&fit=crop',
  Pelo:
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1400&auto=format&fit=crop',
  Depilación:
    'https://images.unsplash.com/photo-1622286342621-4bd786c2447a?q=80&w=1400&auto=format&fit=crop',
  Makeup:
    'https://images.unsplash.com/photo-1556228578-ff3045f1a1a4?q=80&w=1400&auto=format&fit=crop',
  Barbería:
    'https://images.unsplash.com/photo-1517832207067-4db24a2ae47c?q=80&w=1400&auto=format&fit=crop',
};

function euros(cents: number) {
  return (cents / 100).toFixed(2);
}

function Stars({ rating = 4.8 }: { rating?: number | null }) {
  const r = Math.max(0, Math.min(5, Number(rating ?? 4.8)));
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {Array.from({ length: full }).map((_, i) => (
        <Text key={`f-${i}`}>★</Text>
      ))}
      {half && <Text>☆</Text>}
      {Array.from({ length: empty }).map((_, i) => (
        <Text key={`e-${i}`}>✩</Text>
      ))}
      <Text style={{ color: '#64748B', marginLeft: 6, fontSize: 12 }}>{r.toFixed(1)}</Text>
    </View>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [q, setQ] = useState('');
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const promos = useMemo(
    () => [
      {
        id: 'promo-1',
        title: '-20% esta semana',
        subtitle: 'Masajes y faciales',
        image:
          'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1600&auto=format&fit=crop',
      },
      {
        id: 'promo-2',
        title: 'Beauty Friday',
        subtitle: 'Uñas y pelo',
        image:
          'https://images.unsplash.com/photo-1619983081563-430f63602796?q=80&w=1600&auto=format&fit=crop',
      },
      {
        id: 'promo-3',
        title: 'Destacados cerca tuyo',
        subtitle: 'Top profesionales',
        image:
          'https://images.unsplash.com/photo-1605614191429-1ce0c16d2afe?q=80&w=1600&auto=format&fit=crop',
      },
    ],
    []
  );

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(50);
      if (error) throw error;
      setServices((data ?? []) as Service[]);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let list = services;
    if (activeCat) {
      list = list.filter(
        (s) => (s.category || '').toLowerCase() === activeCat.toLowerCase()
      );
    }
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(needle) ||
          (s.description || '').toLowerCase().includes(needle)
      );
    }
    return list;
  }, [services, activeCat, q]);

  const ServiceCard = ({ item, index = 0 }: { item: Service; index?: number }) => {
    const { opacity } = useFadeIn(240, Math.min(index * 40, 240));
    const cover =
      item.cover_url ||
      categoryCovers[item.category || ''] ||
      'https://images.unsplash.com/photo-1519822471928-687fd3f7d6df?q=80&w=1400&auto=format&fit=crop';

    return (
      <PressableScale
        activeOpacity={0.9}
        onPress={() =>
          router.push({
            pathname: '/select-pro',
            params: { serviceId: String(item.id) },
          })
        }
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <Animated.Image source={{ uri: cover }} style={{ width: '100%', height: 160, opacity }} />
        <Animated.View style={{ padding: 12, gap: 6, opacity }}>
          <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 16 }} numberOfLines={1}>
            {item.name}
          </Text>
          <Stars rating={item.rating_avg ?? 4.8} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: '#0F172A', fontWeight: '700' }}>€{euros(item.price_cents)}</Text>
            <Text style={{ color: '#64748B' }}>{item.duration_min} min</Text>
          </View>

          <View style={{ marginTop: 8 }}>
            <View
              style={{
                backgroundColor: '#0EA5E9',
                paddingVertical: 10,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Ver profesionales</Text>
            </View>
          </View>
        </Animated.View>
      </PressableScale>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F8FAFC' }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Encabezado / búsqueda */}
      <View style={{ padding: 16, paddingTop: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A' }}>
          Encontrá tu próximo turno
        </Text>
        <Text style={{ color: '#64748B', marginTop: 4, marginBottom: 12 }}>
          Belleza, masajes, estética — a domicilio o en salón
        </Text>

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text style={{ color: '#64748B' }}>🔎</Text>
          <TextInput
            placeholder="Buscar servicio o tratamiento…"
            placeholderTextColor="#94A3B8"
            value={q}
            onChangeText={(txt) => {
              animateNextLayout();
              setQ(txt);
            }}
            style={{ flex: 1, color: '#0F172A' }}
            returnKeyType="search"
          />
          {!!q && (
            <PressableScale onPress={() => { animateNextLayout(); setQ(''); }}>
              <Text style={{ color: '#64748B' }}>✕</Text>
            </PressableScale>
          )}
        </View>
      </View>

      {/* Carrusel promos */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        style={{ marginBottom: 12 }}
      >
        {promos.map((p) => (
          <View
            key={p.id}
            style={{
              width: 320,
              height: 150,
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <Image source={{ uri: p.image }} style={{ width: '100%', height: '100%' }} />
            <View
              style={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                backgroundColor: '#00000070',
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>{p.title}</Text>
              <Text style={{ color: '#fff' }}>{p.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Chips de categorías */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        style={{ marginBottom: 6 }}
      >
        <PressableScale
          onPress={() => { animateNextLayout(); setActiveCat(null); }}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 999,
            backgroundColor: activeCat === null ? '#0EA5E9' : '#FFFFFF',
            borderWidth: 1,
            borderColor: activeCat === null ? '#0EA5E9' : '#E5E7EB',
          }}
        >
          <Text style={{ color: activeCat === null ? '#fff' : '#0F172A', fontWeight: '700' }}>
            Todo
          </Text>
        </PressableScale>

        {CATEGORIES.map((c) => {
          const active = activeCat === c;
          return (
            <PressableScale
              key={c}
              onPress={() => { animateNextLayout(); setActiveCat(active ? null : c); }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: active ? '#0EA5E9' : '#FFFFFF',
                borderWidth: 1,
                borderColor: active ? '#0EA5E9' : '#E5E7EB',
              }}
            >
              <Text style={{ color: active ? '#fff' : '#0F172A', fontWeight: '700' }}>{c}</Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      {/* Listado de servicios */}
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 10 }}>
          {activeCat ? activeCat : 'Servicios destacados'}
        </Text>

        {loading ? (
          <View style={{ paddingVertical: 24 }}>
            <ActivityIndicator />
          </View>
        ) : filtered.length === 0 ? (
          <Text style={{ color: '#64748B', marginVertical: 12 }}>
            No encontramos servicios para tu búsqueda.
          </Text>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 12 }}
            renderItem={({ item, index }) => <ServiceCard item={item} index={index} />}
          />
        )}
      </View>
    </ScrollView>
  );
}
