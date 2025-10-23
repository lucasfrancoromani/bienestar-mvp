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
import { colors, radii, shadow } from '../../lib/theme';

// ---- Tipos (resumen, adaptados a lo que ya venías usando) ----
type Booking = {
  id: string;
  start_at: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'rejected'| 'refunded' | 'canceled';
  service_id?: string;
  services?: {
    id: string;
    name: string;
    reschedule_window_hours?: number | null;
    cancel_window_hours?: number | null;
    price_cents?: number | null;
  } | null;
  pro?: { id: string; name?: string | null } | null;
  client?: { id: string; name?: string | null } | null;
  paid_at?: string | null;
};

// ---- Helpers de UI ----
const COLORS = {
  bg: '#ffffff',
  card: '#ffffff',
  text: '#111827',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  primary: '#0ea5e9',
  success: '#16a34a',
  warn: '#f59e0b',
  danger: '#ef4444',
  badgeBg: '#f3f4f6',
};

function normalizeStatus(s: string) {
  const raw = (s || '').toLowerCase().trim();
  // Alias/sinónimos → canonical
  if (raw === 'canceled') return 'cancelled'; // unificamos en 'cancelled'
  return raw;
}

function translateStatus(s: string) {
  const st = normalizeStatus(s);
  const map: Record<string, string> = {
    pending: 'Pendiente de confirmar',
    confirmed: 'Confirmada',
    paid: 'Pagada',
    processing: 'Procesando pago',
    completed: 'Completada',
    cancelled: 'Cancelada',
    rejected: 'Rechazada',
    no_show: 'Ausente',
    refunded: 'Reembolsada',
    failed: 'Pago fallido',
  };
  return map[st] ?? s;
}

function moneyEUR(cents?: number | null) {
  const v = (cents ?? 0) / 100;
  return `€ ${v.toFixed(2)}`;
}

function whenStr(b: Booking) {
  const d = new Date(b.start_at);
  return d.toLocaleString();
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

function isUpcoming(b: Booking) {
  return new Date(b.start_at).getTime() >= Date.now();
}

// ---- Badge ----
function StatusBadge({ status }: { status: string }) {
  const st = normalizeStatus(status);
  const map: Record<string, { bg: string; fg: string }> = {
    pending:    { bg: '#fff7ed', fg: '#b45309' }, // naranja
    confirmed:  { bg: '#ecfeff', fg: '#0369a1' }, // celeste
    paid:       { bg: '#f0fdf4', fg: '#166534' }, // verde
    processing: { bg: '#f0fdf4', fg: '#166534' }, // verde (en curso)
    completed:  { bg: '#f0fdf4', fg: '#166534' }, // verde
    cancelled:  { bg: '#fef2f2', fg: '#991b1b' }, // rojo
    rejected:   { bg: '#fef2f2', fg: '#991b1b' }, // rojo
    failed:     { bg: '#fef2f2', fg: '#991b1b' }, // rojo
    no_show:    { bg: '#f5f3ff', fg: '#6d28d9' }, // violeta
    refunded:   { bg: '#f5f5f4', fg: '#44403c' }, // gris
  };
  const { bg, fg } = map[st] ?? { bg: '#f3f4f6', fg: '#6b7280' };

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>
        {translateStatus(status)}
      </Text>
    </View>
  );
}

// ---- Botón utilitario ----
function Btn({
  label,
  onPress,
  kind = 'primary',
  disabled,
}: {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'ghost' | 'danger' | 'outline';
  disabled?: boolean;
}) {
  const styles: Record<string, any> = {
    base: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
    },
    primary: { backgroundColor: COLORS.text, borderColor: COLORS.text },
    danger: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
    outline: { backgroundColor: 'transparent', borderColor: COLORS.border },
    text: { color: '#fff', fontWeight: '700' },
    textGhost: { color: COLORS.text, fontWeight: '700' },
    textOutline: { color: COLORS.text, fontWeight: '700' },
  };
  const bg =
    kind === 'primary'
      ? styles.primary
      : kind === 'danger'
      ? styles.danger
      : kind === 'outline'
      ? styles.outline
      : styles.ghost;

  const txtStyle =
    kind === 'primary' || kind === 'danger' ? styles.text : kind === 'outline' ? styles.textOutline : styles.textGhost;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, bg, disabled && { opacity: 0.6 }]}
      activeOpacity={0.8}
    >
      <Text style={txtStyle}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---- Card de reserva ----
function BookingCard({
  item,
  amPro,
  forceClientView,
  onCancel,
  onReschedule,
  onPay,
}: {
  item: Booking;
  amPro: boolean;
  forceClientView: boolean;
  onCancel: (id: string) => void;
  onReschedule: (b: Booking) => void;
  onPay: (b: Booking) => void;
}) {
  const serviceName = item.services?.name ?? 'Servicio';
  const proName = displayName(item.pro);
  const cliName = displayName(item.client);
  const priceStr = moneyEUR(item.services?.price_cents);

  const showClientActions = (!amPro || forceClientView) && (item.status === 'pending' || item.status === 'confirmed');

  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700' }}>{serviceName}</Text>
          <Text style={{ color: COLORS.textMuted, marginTop: 2 }}>{whenStr(item)}</Text>
          <Text style={{ color: COLORS.textMuted, marginTop: 2 }}>
            Pro: {proName} {amPro && !forceClientView ? '' : `• Cliente: ${cliName}`}
          </Text>
          <Text style={{ color: COLORS.text, marginTop: 6, fontWeight: '700' }}>{priceStr}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      {/* Mensajes de ventana */}
      {showClientActions && !canReschedule(item) && (
        <Text style={{ color: COLORS.textMuted, marginTop: 8, fontSize: 12 }}>
          Reprogramación no disponible (ventana vencida).
        </Text>
      )}
      {showClientActions && !canCancel(item) && (
        <Text style={{ color: COLORS.textMuted, marginTop: 4, fontSize: 12 }}>
          Cancelación no disponible (ventana vencida).
        </Text>
      )}

      {/* Acciones */}
      {showClientActions && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {canCancel(item) && <Btn label="Cancelar" onPress={() => onCancel(item.id)} kind="outline" />}
          {canReschedule(item) && <Btn label="Reprogramar" onPress={() => onReschedule(item)} kind="ghost" />}
          {/* Pagar solo si está pendiente/confirmada y aún no tiene paid_at */}
          {!item.paid_at && <Btn label="Pagar" onPress={() => onPay(item)} kind="primary" />}
        </View>
      )}
    </View>
  );
}

// =======================================================
//                COMPONENTE PRINCIPAL
// =======================================================
export default function MyBookings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Booking[]>([]);
  const [amPro, setAmPro] = useState(false);
  const [forceClientView, setForceClientView] = useState(false);

  // Filtro UI: Próximas / Pasadas
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listMyBookings();
      setItems(list ?? []);
      setAmPro(await isProUser());
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudieron cargar las reservas');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await listMyBookings();
      setItems(list ?? []);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // 🔔 Realtime: actualizar estado en vivo (insert/update/delete)
  useEffect(() => {
    const ch = supabase
      .channel('bookings-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        // refetch liviano
        listMyBookings().then((list) => setItems(list ?? []));
      })
      .subscribe();

    return () => {
      ch.unsubscribe();
    };
  }, []);

  // Cambio rápido de vista pro -> cliente
  useEffect(() => {
    (async () => setAmPro(await isProUser()))();
  }, []);

  const onCancel = async (id: string) => {
    try {
      await cancelBooking(id);
      onRefresh();
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
    // slots con bookingId para reprogramación
    router.push({ pathname: '/slots', params: { serviceId, proId, bookingId: item.id } });
  };

  const goPay = (item: Booking) => {
    router.push(`/(tabs)/checkout/${item.id}`);
  };

  // Derivados por tab
  const upcoming = useMemo(() => items.filter(isUpcoming), [items]);
  const past = useMemo(() => items.filter((b) => !isUpcoming(b)), [items]);

  const data = tab === 'upcoming' ? upcoming : past;

  return (
    <View style={{ flex: 1, backgroundColor: '#fbf6ffff', padding: 16 }}>
      {/* Header local + Toggle rol (solo pro) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text }}>Mis reservas</Text>
        {amPro && (
          <TouchableOpacity
            onPress={() => setForceClientView((v) => !v)}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: forceClientView ? '#ecfeff' : '#f3f4f6',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
              Ver como {forceClientView ? 'Cliente' : 'Profesional'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Segmented control */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#f3f4f6',
          borderRadius: 12,
          padding: 4,
          borderWidth: 1,
          borderColor: COLORS.border,
          marginBottom: 12,
        }}
      >
        {([
          { key: 'upcoming', label: `Próximas (${upcoming.length})` },
          { key: 'past', label: `Pasadas (${past.length})` },
        ] as const).map((seg) => {
          const active = tab === seg.key;
          return (
            <TouchableOpacity
              key={seg.key}
              onPress={() => setTab(seg.key)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: active ? '#ffffff' : 'transparent',
                borderWidth: active ? 1 : 0,
                borderColor: active ? COLORS.border : 'transparent',
              }}
            >
              <Text style={{ fontWeight: active ? '700' : '500', color: active ? COLORS.text : COLORS.textMuted }}>
                {seg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: COLORS.textMuted }}>
                {tab === 'upcoming' ? 'No tenés reservas próximas.' : 'No tenés reservas pasadas.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <BookingCard
              item={item}
              amPro={amPro}
              forceClientView={forceClientView}
              onCancel={onCancel}
              onReschedule={goReschedule}
              onPay={goPay}
            />
          )}
          {showReschedule && (
            <TouchableOpacity
              onPress={() => goReschedule(b)}
              style={{ flexGrow: 1, backgroundColor: '#0EA5E9', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Reprogramar</Text>
            </TouchableOpacity>
          )}
          {showCancel && (
            <TouchableOpacity
              onPress={() => onCancel(b.id)}
              style={{ flexGrow: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
            >
              <Text style={{ color: '#0F172A', fontWeight: '800' }}>Cancelar</Text>
            </TouchableOpacity>
          )}
          {showReview && (
            <TouchableOpacity
              onPress={() => goReview(b)}
              style={{ flexGrow: 1, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Calificar</Text>
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
        {b._has_review && (b.status === 'completed' || b.status === 'paid') && (
          <Text style={{ color: '#16a34a', marginTop: 4 }}>¡Gracias! Ya calificaste este servicio.</Text>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fbf6ffff' }}>
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
