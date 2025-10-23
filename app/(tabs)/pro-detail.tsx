// app/(tabs)/pro-detail.tsx
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  View,
  Animated,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useFadeIn, PressableScale } from '../../lib/anim';

type Pro = {
  user_id: string;
  bio?: string | null;
  avatar_url?: string | null;
  rating_avg?: number | null;
  rating_count?: number | null;
};

type Service = {
  id: string;
  professional_id: string;
  name: string;
  description?: string | null;
  price_cents: number;
  duration_min: number;
  category?: string | null;
  is_active: boolean;
};

type Review = {
  id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  client_id: string;
};

function euros(cents: number) {
  return (cents / 100).toFixed(2);
}

function StarsRow({ rating = 4.8 }: { rating?: number | null }) {
  const r = Math.max(0, Math.min(5, Number(rating ?? 4.8)));
  const full = Math.floor(r);
  const half = r - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {Array.from({ length: full }).map((_, i) => <Text key={`f-${i}`}>★</Text>)}
      {half && <Text>☆</Text>}
      {Array.from({ length: empty }).map((_, i) => <Text key={`e-${i}`}>✩</Text>)}
      <Text style={{ color: '#64748B', marginLeft: 6, fontSize: 12 }}>{r.toFixed(1)}</Text>
    </View>
  );
}

function initials(name: string) {
  const parts = String(name).trim().split(/\s+/);
  return (parts[0]?.[0] ?? 'U') + (parts[1]?.[0] ?? '');
}

export default function ProDetailScreen() {
  const router = useRouter();
  const { proId, serviceId } = useLocalSearchParams<{ proId: string; serviceId?: string }>();

  const [loading, setLoading] = useState(true);
  const [pro, setPro] = useState<Pro | null>(null);
  const [proName, setProName] = useState<string>('Profesional');
  const [services, setServices] = useState<Service[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsCount, setReviewsCount] = useState<number>(0);

  const cover = useMemo(
    () =>
      'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=1600&auto=format&fit=crop',
    []
  );

  // Animaciones de secciones
  const fadeHeader = useFadeIn(260, 60);
  const fadeServices = useFadeIn(260, 120);
  const fadeReviews = useFadeIn(260, 180);

  useEffect(() => {
    if (!proId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        const { data: p, error: e1 } = await supabase
          .from('professionals')
          .select('user_id, bio, avatar_url, rating_avg, rating_count')
          .eq('user_id', String(proId))
          .single();
        if (e1) throw e1;

        let friendly = 'Profesional';
        let avatarFromRpc: string | null = null;
        const { data: pub } = await supabase.rpc('get_user_public', { _id: proId });
        const row = Array.isArray(pub) ? pub?.[0] : pub;
        if (row?.full_name && String(row.full_name).trim() !== '') friendly = row.full_name;
        avatarFromRpc = row?.avatar_url ?? null;

        if (!row?.full_name) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name,name')
            .eq('id', proId)
            .maybeSingle();
          friendly = (prof?.full_name || prof?.name || friendly).trim();
        }

        const { data: svcs, error: e2 } = await supabase
          .from('services')
          .select('*')
          .eq('professional_id', String(proId))
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (e2) throw e2;

        const { data: certs } = await supabase
          .from('certifications')
          .select('file_url, verified_bool')
          .eq('professional_id', String(proId))
          .order('created_at', { ascending: true });
        const gallery = (certs || [])
          .map((c: any) => c.file_url)
          .filter((u: any) => !!u);

        const { data: rws } = await supabase
          .from('reviews')
          .select('id, rating, comment, created_at, client_id')
          .eq('professional_id', String(proId))
          .order('created_at', { descending: true })
          .limit(10);

        const { count } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('professional_id', String(proId));

        if (!cancelled) {
          setPro({
            ...(p as Pro),
            avatar_url: p?.avatar_url ?? avatarFromRpc ?? null,
          });
          setProName(friendly || 'Profesional');
          setServices((svcs ?? []) as Service[]);

          const ph = [cover, p?.avatar_url ?? avatarFromRpc ?? '', ...gallery].filter(Boolean);
          setPhotos(ph);

          setReviews((rws ?? []) as Review[]);
          setReviewsCount(count ?? (p?.rating_count ?? 0));
        }
      } catch (e: any) {
        if (!cancelled) Alert.alert('Error', e.message ?? 'No se pudo cargar el profesional');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proId, cover]);

  const onReserve = (svc: Service) => {
    router.push({
      pathname: '/slots',
      params: { proId: String(proId), serviceId: String(svc.id) },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fbf6ffff' }}>
      <Stack.Screen options={{ title: 'Profesional', headerShown: true }} />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : !pro ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 16 }}>No encontramos este profesional.</Text>
          <PressableScale
            onPress={() => router.back()}
            style={{ padding: 12, backgroundColor: '#111', borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff' }}>Volver</Text>
          </PressableScale>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Galería */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingTop: 12 }}
          >
            {photos.map((uri, i) => (
              <Image
                key={`${uri}-${i}`}
                source={{ uri }}
                style={{
                  width: 280,
                  height: 170,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  backgroundColor: '#E5E7EB',
                }}
              />
            ))}
          </ScrollView>

          {/* Header pro */}
          <Animated.View style={{ paddingHorizontal: 16, paddingTop: 12, opacity: fadeHeader.opacity }}>
            <View
              style={{
                backgroundColor: '#FFF',
                borderRadius: 16,
                padding: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Image
                source={
                  pro.avatar_url
                    ? { uri: pro.avatar_url }
                    : { uri: 'https://ui-avatars.com/api/?size=128&name=' + encodeURIComponent(proName) }
                }
                style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3F4F6' }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>
                  {proName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <StarsRow rating={pro.rating_avg ?? 4.8} />
                  <Text style={{ color: '#64748B' }}>· {reviewsCount} reseñas</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Bio */}
          {pro.bio ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 6 }}>
                Sobre mí
              </Text>
              <Text style={{ color: '#334155' }}>{pro.bio}</Text>
            </View>
          ) : null}

          {/* Servicios */}
          <Animated.View style={{ paddingHorizontal: 16, paddingTop: 16, opacity: fadeServices.opacity }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
              Servicios
            </Text>

            {services.length === 0 ? (
              <Text style={{ color: '#64748B' }}>Este profesional todavía no tiene servicios activos.</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {services.map((s) => (
                  <View
                    key={s.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: '700', color: '#0F172A', flex: 1 }} numberOfLines={1}>
                        {s.name}
                      </Text>
                      <Text style={{ color: '#0F172A', fontWeight: '700' }}>€{euros(s.price_cents)}</Text>
                    </View>
                    {!!s.description && (
                      <Text style={{ color: '#64748B' }} numberOfLines={2}>
                        {s.description}
                      </Text>
                    )}
                    <Text style={{ color: '#64748B' }}>
                      {s.duration_min} min · {s.category || 'Servicio'}
                    </Text>

                    <PressableScale
                      onPress={() => onReserve(s)}
                      style={{
                        backgroundColor: '#d8b9ffff',
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: 'center',
                        marginTop: 4,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700' }}>Reservar</Text>
                    </PressableScale>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Reseñas */}
          <Animated.View style={{ paddingHorizontal: 16, paddingTop: 16, opacity: fadeReviews.opacity }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>
              Reseñas ({reviewsCount})
            </Text>

            {reviews.length === 0 ? (
              <Text style={{ color: '#64748B' }}>
                Aún no hay reseñas publicadas para este profesional.
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {reviews.map((r) => {
                  const when = new Date(r.created_at);
                  const fecha = when.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
                  return (
                    <View
                      key={r.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        padding: 12,
                        gap: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: '#E5E7EB',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontWeight: '700', color: '#334155' }}>
                            {initials('Cliente')}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '700', color: '#0F172A' }}>Cliente</Text>
                          <Text style={{ color: '#64748B', fontSize: 12 }}>{fecha}</Text>
                        </View>
                        <Text style={{ fontWeight: '800' }}>{'★'.repeat(Math.round(r.rating))}</Text>
                      </View>

                      {!!r.comment && <Text style={{ color: '#334155' }}>{r.comment}</Text>}
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>

          {/* CTA global si venís con serviceId precargado */}
          {serviceId && services.some((x) => String(x.id) === String(serviceId)) && (
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <PressableScale
                onPress={() =>
                  router.push({
                    pathname: '/slots',
                    params: { proId: String(proId), serviceId: String(serviceId) },
                  })
                }
                style={{
                  backgroundColor: '#111827',
                  padding: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Elegir horario</Text>
              </PressableScale>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
