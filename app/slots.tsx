// app/slots.tsx
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBooking, listSlots, rescheduleBooking } from '../lib/api';
import { supabase } from '../lib/supabase';

type Slot = { slot_start: string; slot_end: string };

// --- Localización (español + 24h) ---
const LOCALE = 'es-ES';      // si preferís italiano: 'it-IT'
const TZ = 'Europe/Rome';

function fmtDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function humanDay(d: Date) {
  const s = new Intl.DateTimeFormat(LOCALE, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: TZ,
  }).format(d);
  const clean = s.replace(',', '').replace(/\./g, '');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function humanTime(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ,
  }).format(d);
}

export default function SlotsScreen() {
  const { serviceId, proId, bookingId } = useLocalSearchParams<{ serviceId: string; proId: string; bookingId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // === Reserva para NO pisar el TabBar flotante ===
  const BAR_HEIGHT = 10;           // alto del pill
  const BG_PADDING = 5;           // padding del fondo del dock
  const BG_HEIGHT = BAR_HEIGHT + BG_PADDING * 2; // ≈ 88
  const OUTER_MARGIN_BOTTOM = 16;  // separación del borde
  const INSETS_TWEAK = -6;         // ajuste que usás en el layout
  const DOCK_RESERVE = BG_HEIGHT + OUTER_MARGIN_BOTTOM + Math.max(insets.bottom + INSETS_TWEAK, 0);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Rango: hoy → +21 días
  const range = useMemo(() => {
    const from = new Date();
    from.setSeconds(0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 21);
    return { fromISO: from.toISOString(), toISO: to.toISOString() };
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setSelectedSlot(null);

      const data: Slot[] = await (listSlots as any)(
        String(proId),
        String(serviceId),
        range.fromISO,
        range.toISO
      );

      const now = Date.now();
      const fresh = (data || []).filter((s) => new Date(s.slot_start).getTime() > now);

      setAllSlots(fresh);

      const first = fresh[0];
      setSelectedDayKey(first ? fmtDayKey(new Date(first.slot_start)) : null);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudieron cargar los horarios.');
      setAllSlots([]);
      setSelectedDayKey(null);
    } finally {
      setLoading(false);
    }
  }, [proId, serviceId, range.fromISO, range.toISO]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Agrupar por día
  const slotsByDay = useMemo(() => {
    const map: Record<string, Slot[]> = {};
    for (const s of allSlots) {
      const k = fmtDayKey(new Date(s.slot_start));
      (map[k] ||= []).push(s);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime());
    }
    return map;
  }, [allSlots]);

  // Días con disponibilidad
  const daysList = useMemo(() => {
    const days: { key: string; date: Date; count: number }[] = [];
    if (!allSlots.length) return days;

    const start = new Date(range.fromISO);
    const end = new Date(range.toISO);

    for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
      const key = fmtDayKey(d);
      const count = slotsByDay[key]?.length ?? 0;
      if (count > 0) days.push({ key, date: new Date(d), count });
    }
    return days;
  }, [allSlots, range.fromISO, range.toISO, slotsByDay]);

  const timesForSelectedDay = useMemo(() => {
    if (!selectedDayKey) return [];
    return slotsByDay[selectedDayKey] ?? [];
  }, [selectedDayKey, slotsByDay]);

  // Agrupar por franja
  const groups = useMemo(() => {
    const g = { morning: [] as Slot[], afternoon: [] as Slot[], evening: [] as Slot[] };
    for (const s of timesForSelectedDay) {
      const h = new Date(s.slot_start).getHours();
      if (h < 12 && h >= 6) g.morning.push(s);
      else if (h < 18) g.afternoon.push(s);
      else g.evening.push(s);
    }
    return g;
  }, [timesForSelectedDay]);

  const confirm = async () => {
    try {
      if (!selectedSlot) return Alert.alert('Elegí un horario', 'Seleccioná una hora disponible.');
      const startISO = selectedSlot.slot_start;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return Alert.alert('Necesitás iniciar sesión', 'Iniciá sesión para continuar.');

      if (bookingId) {
        await rescheduleBooking(String(bookingId), startISO);
        Alert.alert('¡Listo!', 'Reserva reprogramada.');
        if (router.canGoBack()) router.back(); else router.replace('/(tabs)/bookings');
      } else {
        const id = await createBooking(String(proId), String(serviceId), startISO);
        Alert.alert('¡Reserva creada!', `ID: ${id}`);
        await load();
      }
    } catch (e: any) {
      Alert.alert('No se pudo confirmar', e?.message ?? 'Intentá nuevamente.');
    }
  };

  const DayChip = ({ d }: { d: { key: string; date: Date } }) => {
    const active = selectedDayKey === d.key;
    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedDayKey(d.key);
          setSelectedSlot(null);
        }}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 999,
          backgroundColor: active ? '#0EA5E9' : '#FFFFFF',
          borderWidth: 1,
          borderColor: active ? '#0EA5E9' : '#E5E7EB',
          marginRight: 8,
        }}
      >
        <Text style={{ color: active ? '#fff' : '#0F172A', fontWeight: '700' }}>
          {humanDay(d.date)}
        </Text>
      </TouchableOpacity>
    );
  };

  const TimeChip = ({ s }: { s: Slot }) => {
    const isSelected = selectedSlot?.slot_start === s.slot_start;
    return (
      <TouchableOpacity
        onPress={() => setSelectedSlot(isSelected ? null : s)}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: isSelected ? '#0284C7' : '#E5E7EB',
          backgroundColor: isSelected ? '#E0F2FE' : '#FFFFFF',
          marginRight: 8,
          marginBottom: 8,
        }}
      >
        <Text style={{ fontWeight: '700', color: isSelected ? '#075985' : '#0F172A' }}>
          {humanTime(s.slot_start)}
        </Text>
      </TouchableOpacity>
    );
  };

  const GroupBlock = ({ title, data }: { title: string; data: Slot[] }) => {
    if (!data.length) return null;
    return (
      <View style={{ marginBottom: 14 }}>
        <Text style={{ color: '#0F172A', fontWeight: '700', marginBottom: 8 }}>{title}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {data.map((s) => <TimeChip key={s.slot_start} s={s} />)}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Stack.Screen
        options={{
          title: bookingId ? 'Reprogramar' : 'Elegí un horario',
          headerShown: true,
        }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 + DOCK_RESERVE }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ padding: 16, paddingBottom: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A' }}>
            {bookingId ? 'Seleccioná un nuevo horario' : 'Seleccioná fecha y hora'}
          </Text>
          <Text style={{ color: '#64748B', marginTop: 4 }}>
            Mostrando próximos 21 días disponibles
          </Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : !allSlots.length ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
            <Text style={{ color: '#64748B' }}>
              No hay horarios disponibles en las próximas semanas.
            </Text>
          </View>
        ) : (
          <>
            {/* Días */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
              style={{ marginBottom: 8 }}
            >
              {daysList.map((d) => <DayChip key={d.key} d={d} />)}
            </ScrollView>

            {/* Horarios por franja */}
            <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
              {timesForSelectedDay.length === 0 ? (
                <Text style={{ color: '#64748B' }}>No hay horarios para este día.</Text>
              ) : (
                <>
                  <GroupBlock title="Mañana" data={groups.morning} />
                  <GroupBlock title="Tarde" data={groups.afternoon} />
                  <GroupBlock title="Noche" data={groups.evening} />
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* CTA por ENCIMA del TabBar */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: DOCK_RESERVE,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
          padding: 12,
          zIndex: 50,
          elevation: 8,
        }}
      >
        <TouchableOpacity
          disabled={!selectedSlot}
          onPress={confirm}
          style={{
            backgroundColor: selectedSlot ? '#0EA5E9' : '#93C5FD',
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>
            {bookingId ? 'Confirmar reprogramación' : 'Confirmar reserva'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={{ paddingVertical: 12, alignItems: 'center' }}
        >
          <Text style={{ color: '#64748B', fontWeight: '600' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
