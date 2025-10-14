// app/(tabs)/bookings.tsx
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { cancelBooking, listMyBookings } from '../../lib/api';
import { displayName } from '../../lib/display';
import { supabase } from '../../lib/supabase';
import { isProUser } from '../../lib/authz'; // ⛳️ nuevo: detectar rol

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

// Traducciones UI (no cambian la DB)
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

function line(b: Booking) {
  const when = new Date(b.start_at).toLocaleString();
  const sname = b.services?.name || 'Servicio';
  const proName = displayName(b.pro);
  const cliName = displayName(b.client);
  return `${when} • ${sname} • Pro: ${proName} • Cliente: ${cliName} • ${translateStatus(b.status)}`;
}

function canReschedule(b: Booking) {
  if (!(b.status === 'pending' || b.status === 'confirmed')) return false;
  const hours = Math.max(0, Number(b.services?.reschedule_window_hours ?? 24));
  const now = Date.now();
  const start = new Date(b.start_at).getTime();
  return start - now > hours * 3600_000;
}

function canCancel(b: Booking) {
  if (!(b.status === 'pending' || b.status === 'confirmed')) return false;
  const hours = Math.max(0, Number(b.services?.cancel_window_hours ?? 24));
  const now = Date.now();
  const start = new Date(b.start_at).getTime();
  return start - now > hours * 3600_000;
}

export default function MyBookings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Booking[]>([]);

  // 🔐 Rol actual
  const [amPro, setAmPro] = useState<boolean>(false);
  // 👁️ Permitir que un Pro vea “como cliente” (solo en esta pantalla, sin tocar DB)
  const [forceClientView, setForceClientView] = useState<boolean>(false);

  // Cargar rol
  useEffect(() => {
    (async () => {
      const pro = await isProUser();
      setAmPro(!!pro);
    })();
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
    try { await cancelBooking(id); load(); }
    catch (e: any) {
      const msg = String(e.message || '').toLowerCase();
      if (msg.includes('outside_cancel_window')) {
        Alert.alert('No disponible', 'Este turno ya no se puede cancelar por la ventana configurada.');
      } else {
        Alert.alert('No se pudo cancelar', e.message);
      }
    }
  };

  const goReschedule = (item: Booking) => {
    const serviceId = item.service_id ?? item.services?.id;
    const proId = item.pro?.id;
    if (!serviceId || !proId) {
      return Alert.alert('Falta información', 'No se pudo determinar el servicio o el profesional.');
    }
    if (!canReschedule(item)) {
      const hrs = item.services?.reschedule_window_hours ?? 24;
      return Alert.alert('No disponible', `Este turno ya no se puede reprogramar (ventana: ${hrs} h).`);
    }
    router.push({ pathname: '/slots', params: { serviceId, proId, bookingId: item.id } });
  };

  // 🔔 Realtime: actualizar estado en vivo
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid || !isMounted) return;

      const channel = supabase
        .channel('bookings-status')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'bookings' },
          (payload) => {
            const updated = payload.new as any;
            setItems((prev) =>
              prev.map((b) =>
                b.id === updated.id
                  ? { ...b, status: updated.status as Booking['status'] }
                  : b
              )
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => { isMounted = false; };
  }, []);

  // 🎨 Badge de estado
  const StatusBadge = ({ status }: { status: Booking['status'] }) => {
    const bg =
      status === 'paid' ? '#dcfce7' :
      status === 'failed' ? '#fee2e2' :
      status === 'processing_payment' ? '#fef9c3' :
      status === 'canceled' ? '#f3f4f6' :
      status === 'rejected' ? '#ffe4e6' :
      '#e5e7eb';
    const fg =
      status === 'paid' ? '#166534' :
      status === 'failed' ? '#991b1b' :
      status === 'processing_payment' ? '#92400e' :
      status === 'canceled' ? '#374151' :
      status === 'rejected' ? '#9f1239' :
      '#374151';

    return (
      <View style={{ alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: bg }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: fg }}>
          {translateStatus(status)}
        </Text>
      </View>
    );
  };

  // 🚧 Guard de ruta: si es Pro y NO forzó vista cliente, no mostramos lista de cliente
  if (amPro && !forceClientView) {
    return (
      <View style={{ flex: 1, padding: 16, gap: 12, justifyContent: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
          Esta sección es para clientes
        </Text>
        <Text style={{ color: '#555' }}>
          Estás logueado como <Text style={{ fontWeight: '700' }}>Profesional</Text>. 
          Usá el Panel Profesional para gestionar tus reservas (aceptar / rechazar).
        </Text>

        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/(pro)/pro')}
          style={{ marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: '#111' }}
        >
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
            Ir al Panel Profesional
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setForceClientView(true)}
          style={{ marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: '#10b981' }}
        >
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
            Ver mis reservas como cliente
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Mis reservas</Text>

      {loading && <ActivityIndicator />}

      {!loading && (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          ListEmptyComponent={<Text>No tenés reservas aún.</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
              <Text>{line(item)}</Text>

              <StatusBadge status={item.status} />

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {/* Acciones solo en modo cliente (o forzado) */}
                {(!amPro || forceClientView) && canCancel(item) && (
                  <View style={{ borderRadius: 8, overflow: 'hidden' }}>
                    <Button title="Cancelar" onPress={() => onCancel(item.id)} />
                  </View>
                )}
                {(!amPro || forceClientView) && canReschedule(item) && (
                  <View style={{ borderRadius: 8, overflow: 'hidden' }}>
                    <Button title="Reprogramar" onPress={() => goReschedule(item)} />
                  </View>
                )}
                {/* Botón Pagar: solo cliente (o forzado) y solo en estados que permitan pagar */}
                {(!amPro || forceClientView) && (item.status === 'pending' || item.status === 'confirmed') && (
                  <View style={{ borderRadius: 8, overflow: 'hidden' }}>
                    <Button
                      title="Pagar"
                      onPress={() => router.push(`/(tabs)/checkout/${item.id}`)}
                    />
                  </View>
                )}
              </View>

              {/* Mensajes aclaratorios (solo modo cliente o forzado) */}
              {(!amPro || forceClientView) && !(canCancel(item)) && (item.status === 'pending' || item.status === 'confirmed') && (
                <Text style={{ color: '#999', marginTop: 6 }}>
                  Cancelación no disponible por ventana.
                </Text>
              )}
              {(!amPro || forceClientView) && !(canReschedule(item)) && (item.status === 'pending' || item.status === 'confirmed') && (
                <Text style={{ color: '#999', marginTop: 2 }}>
                  Reprogramación no disponible por ventana.
                </Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}
