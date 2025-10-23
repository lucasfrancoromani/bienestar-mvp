// app/(tabs)/profile.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Image, ActivityIndicator, FlatList } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { isProUser } from '../../lib/authz';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [amPro, setAmPro] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string>('Usuario');
  const [avatar, setAvatar] = useState<string | null>(null);

  // métricas cliente
  const [upcoming, setUpcoming] = useState<number>(0);
  const [past, setPast] = useState<number>(0);

  // métricas pro
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const id = session?.user?.id ?? null;
        const em = session?.user?.email ?? null;
        setUid(id);
        setEmail(em);

        const pro = await isProUser();
        setAmPro(!!pro);

        if (id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, name')
            .eq('id', id)
            .maybeSingle();
          setName(profile?.full_name || profile?.name || em || 'Usuario');
          setAvatar(profile?.avatar_url ?? null);
        }

        if (!pro && id) {
          const now = new Date().toISOString();
          const { count: cUpcoming } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', id)
            .in('status', ['pending', 'confirmed', 'paid'])
            .gt('start_at', now);
          setUpcoming(cUpcoming ?? 0);

          const { count: cPast } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', id)
            .in('status', ['completed', 'paid'])
            .lt('start_at', now);
          setPast(cPast ?? 0);
        }

        if (pro && id) {
          // agregados por simple query
          const { data: agg } = await supabase.rpc('get_pro_rating', { _pro_id: id }).catch(() => ({ data: null } as any));
          setRatingAvg(agg?.rating_avg ?? null);
          setRatingCount(agg?.rating_count ?? null);

          const { data: rows } = await supabase
            .from('reviews')
            .select('rating, comment, created_at, client_id')
            .eq('professional_id', id)
            .order('created_at', { ascending: false })
            .limit(10);
          setReviews(rows ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const Header = () => (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
      <Image
        source={avatar ? { uri: avatar } : require('../../assets/images/user-placeholder.png')}
        style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#f3f4f6' }}
      />
      <Text style={{ fontSize: 20, fontWeight: '700' }}>{name}</Text>
      {!!email && <Text style={{ color: '#64748B' }}>{email}</Text>}
      <Text style={{ marginTop: 6, fontWeight: '700' }}>
        {amPro ? 'Perfil profesional' : 'Perfil cliente'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Stack.Screen options={{ title: 'Perfil' }} />
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ title: 'Perfil' }} />
      <Header />

      {!amPro ? (
        <>
          <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 8 }}>Mis métricas</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 }}>
              <Text style={{ color: '#64748B' }}>Próximas</Text>
              <Text style={{ fontSize: 22, fontWeight: '700' }}>{upcoming}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 }}>
              <Text style={{ color: '#64748B' }}>Pasadas</Text>
              <Text style={{ fontSize: 22, fontWeight: '700' }}>{past}</Text>
            </View>
          </View>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 8 }}>Métricas</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 }}>
              <Text style={{ color: '#64748B' }}>Rating</Text>
              <Text style={{ fontSize: 22, fontWeight: '700' }}>
                {ratingCount && ratingAvg ? `★ ${Number(ratingAvg).toFixed(1)}` : '-'}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 }}>
              <Text style={{ color: '#64748B' }}>Reviews</Text>
              <Text style={{ fontSize: 22, fontWeight: '700' }}>{ratingCount ?? 0}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 12, marginBottom: 8 }}>Últimas reseñas</Text>
          <FlatList
            data={reviews}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
                <Text style={{ fontWeight: '700' }}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
                {!!item.comment && <Text style={{ marginTop: 4 }}>{item.comment}</Text>}
                <Text style={{ color: '#64748B', marginTop: 4, fontSize: 12 }}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            )}
            ListEmptyComponent={<Text>Todavía no tenés reseñas.</Text>}
          />
        </>
      )}
    </View>
  );
}
