// app/(tabs)/bookings.tsx
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { cancelBooking, listMyBookings } from '../../lib/api';
import { displayName } from '../../lib/display';
import { supabase } from '../../lib/supabase';
import { isProUser } from '../../lib/authz';

type Booking = {
  id: string;
  start_at: string;
  status:
    | 'pending'
    | 'confirmed'
    | 'canceled'
    | 'completed'
    | 'paid'
    | 'failed'
    | 'processing_payment'
    | 'rejected';
  services?: {
    id: string;
    name: string;
    duration_min: number;
    reschedule_window_hours?: number;
    cancel_window_hours?: number;
  };
  service_id?: string;
  pro?: { id: string; full_name?: string };
  client?: { id: string; full_name?: string };
};

function translateStatus(s: Booking['status']) {
  switch (s) {
    case 'pending': return 'Pendiente';
    case 'confirmed': return 'Confirmada';
    case 'canceled': return 'Cancelada';
    case 'completed': return 'Completada';
    case 'paid': return 'Pagada';
    case 'failed': return 'Fallida';
    case 'processing_payment': return 'Procesando pago';
    case 'rejected': return 'Rechazada';
    default: return s;
  }
}

function canReschedule(b: Booking) {
  if (!(b.status === 'pending' || b.status === 'confirmed')) return false;
  const hours = Math.max(0, Number(b.services?.reschedule_window_hours ?? 24));
  return new Date(b.start_at).getTime() - Date.now() > hours * 3600_000;
}

function canCancel(b: Booking) {
  if (!(b.status === 'pending' || b.status === 'confirmed')) return false;
  const hours = Math.max(0, Number(b.services?.cancel_window_hours ?? 24));
  return new Date(b.start_at).getTime() - Date.now() > hours * 3600_000;
}

function isPast(b: Booking) {
  return new Date(b.start_at).getTime() < Date.now();
}

function whenParts(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
  const hora = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return { fecha, hora };
}

function StatusBadge({ status }: { status: Booking['status'] }) {
  const styles: Record<Booking['status'], { bg: string; fg: string }> = {
    pending: { bg: '#FEF9C3', fg: '#92400E' },
    confirmed: { bg: '#E5E7EB', fg: '#374151' },
    canceled: { bg: '#F3F4F6', fg: '#374151' },
    completed: { bg: '#E5E7EB', fg: '#374151' },
    paid: { bg: '#DCFCE7', fg: '#166534' },
    failed: { bg: '#FEE2E2', fg: '#991B1B' },
    processing_payment: { bg: '#FEF9C3', fg: '#92400E' },
    rejected: { bg: '#FFE4E6', fg: '#9F1239' },
  } as const;
  const c = styles[status] ?? { bg: '#E5E7EB', fg: '#374151' };
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: c.fg }}>{translateStatus(status)}</Text>
    </View>
  );
}

type FilterKey = 'upcoming' | 'past' | 'all';

export default function MyBookings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Booking[]>([]);
  const [amPro, setAmPro] = useState<boolean>(false);
  const [forceClientView, setForceClientView] = useState<boolean>(false);
  const [filter, setFilter] = useState<FilterKey>('upcoming');

  useEffect(() => {
    (async () => setAmPro(await isProUser()))();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listMyBookings();
      setItems(data as any);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useFocusEffect(useCallback(() => { load(); }, []));

  // Realtime: sólo actualizamos status
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid || !mounted) return;

      const ch = supabase
        .channel('bookings-status')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, (payload) => {
          const updated = payload.new as any;
          setItems((prev) => prev.map((b) => (b.id === updated.id ? { ...b, status: updated.status as Booking['status'] } : b)));
        })
        .subscribe();

      return () => supabase.removeChannel(ch);
    })();
    return () => { mounted = false; };
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      const data = await listMyBookings();
      setItems(data as any);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const onCancel = async (id: string) => {
    try {
      await cancelBooking(id);
      load();
    } catch (e: any) {
      const msg = String(e.message || '').toLowerCase();
      if (msg.includes('outside_cancel_window')) {
        Alert.alert('No disponible', 'Este turno ya no se puede cancelar por la ventana configurada.');
      } else {
        Alert.alert('No se pudo cancelar', e.message);
      }
    }
  };

  const goReschedule = (b: Booking) => {
    const serviceId = b.service_id ?? b.services?.id;
    const proId = b.pro?.id;
    if (!serviceId || !proId) return Alert.alert('Falta información', 'No se pudo determinar el servicio o el profesional.');
    if (!canReschedule(b)) {
      const hrs = b.services?.reschedule_window_hours ?? 24;
      return Alert.alert('No disponible', `Este turno ya no se puede reprogramar (ventana: ${hrs} h).`);
    }
    router.push({ pathname: '/slots', params: { serviceId, proId, bookingId: b.id } });
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return items.slice().sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
    if (filter === 'past') return items.filter(isPast).sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
    return items.filter((b) => !isPast(b)).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  }, [items, filter]);

  // Guard para Pro (igual que antes, pero con estilo más “limpio”)
  if (amPro && !forceClientView) {
    return (
      <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Esta sección es para clientes</Text>
        <Text style={{ color: '#555' }}>
          Estás logueado como <Text style={{ fontWeight: '700' }}>Profesional</Text>. Usá el Panel Profesional para gestionar tus reservas.
        </Text>

        <TouchableOpacity onPress={() => router.replace('/(tabs)/(pro)/pro')} style={{ marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: '#111' }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Ir al Panel Profesional</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setForceClientView(true)} style={{ marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: '#10b981' }}>
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Ver mis reservas como cliente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const Segmented = () => (
    <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, gap: 4 }}>
      {[
        { k: 'upcoming', t: 'Próximas' },
        { k: 'past', t: 'Pasadas' },
        { k: 'all', t: 'Todas' },
      ].map((opt) => {
        const active = filter === (opt.k as FilterKey);
        return (
          <TouchableOpacity
            key={opt.k}
            onPress={() => setFilter(opt.k as FilterKey)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: active ? '#0EA5E9' : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: active ? '#fff' : '#0F172A', fontWeight: '700' }}>{opt.t}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const Card = ({ b }: { b: Booking }) => {
    const { fecha, hora } = whenParts(b.start_at);
    const proName = displayName(b.pro);
    const title = b.services?.name || 'Servicio';
    const duration = b.services?.duration_min ?? 60;

    const showPay = (b.status === 'pending' || b.status === 'confirmed') && !isPast(b);
    const showReschedule = !isPast(b) && canReschedule(b);
    const showCancel = !isPast(b) && canCancel(b);

    return (
      <View style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 14,
        gap: 10
      }}>
        {/* Encabezado */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', flex: 1 }} numberOfLines={1}>
            {title}
          </Text>
          <StatusBadge status={b.status} />
        </View>

        {/* Detalles */}
        <View style={{ gap: 6 }}>
          <Text style={{ color: '#0F172A', fontWeight: '700' }}>{fecha} · {hora}</Text>
          <Text style={{ color: '#64748B' }}>
            {duration} min · Pro: {proName}
          </Text>
        </View>

        {/* Acciones */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {showPay && (
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/checkout/${b.id}`)}
              style={{ flex: 1, backgroundColor: '#111827', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Pagar</Text>
            </TouchableOpacity>
          )}
          {showReschedule && (
            <TouchableOpacity
              onPress={() => goReschedule(b)}
              style={{ flex: 1, backgroundColor: '#0EA5E9', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Reprogramar</Text>
            </TouchableOpacity>
          )}
          {showCancel && (
            <TouchableOpacity
              onPress={() => onCancel(b.id)}
              style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
            >
              <Text style={{ color: '#0F172A', fontWeight: '800' }}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mensajes aclaratorios */}
        {(!canCancel(b)) && (b.status === 'pending' || b.status === 'confirmed') && !isPast(b) && (
          <Text style={{ color: '#9CA3AF', marginTop: 4 }}>Cancelación no disponible por ventana.</Text>
        )}
        {(!canReschedule(b)) && (b.status === 'pending' || b.status === 'confirmed') && !isPast(b) && (
          <Text style={{ color: '#9CA3AF' }}>Reprogramación no disponible por ventana.</Text>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ padding: 16, paddingBottom: 10, gap: 10 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A' }}>Mis reservas</Text>
        <Segmented />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>No tenés reservas</Text>
              <Text style={{ color: '#64748B', marginTop: 6 }}>Cuando hagas una, va a aparecer acá.</Text>
            </View>
          }
          renderItem={({ item }) => <Card b={item} />}
        />
      )}
    </View>
  );
}
