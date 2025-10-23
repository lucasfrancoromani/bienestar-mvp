// app/slots.tsx
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Text,
  View,
  RefreshControl,
  Animated,
} from 'react-native';
import { createBooking, listSlots, rescheduleBooking } from '../lib/api';
import { supabase } from '../lib/supabase';
import { PressableScale, animateNextLayout, useFadeIn } from '../lib/anim';

type Slot = { slot_start: string; slot_end: string };

function fmtDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function humanDay(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function humanTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function SlotsScreen() {
  const { serviceId, proId, bookingId } = useLocalSearchParams<{
    serviceId: string;
    proId: string;
    bookingId?: string;
  }>();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

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
      if (first) {
        const dk = fmtDayKey(new Date(first.slot_start));
        setSelectedDayKey(dk);
      } else {
        setSelectedDayKey(null);
      }
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

  const slotsByDay = useMemo(() => {
    const map: Record<string, Slot[]> = {};
    for (const s of allSlots) {
      const k = fmtDayKey(new Date(s.slot_start));
      if (!map[k]) map[k] = [];
      map[k].push(s);
    }
    for (const k of Object.keys(map)) {
      map[k].sort(
        (a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime()
      );
    }
    return map;
  }, [allSlots]);

  const daysList = useMemo(() => {
    const days: { key: string; date: Date; count: number }[] = [];
    if (!allSlots.length) return days;

    const start = new Date(range.fromISO);
    const end = new Date(range.toISO);

    for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
      const key = fmtDayKey(d);
      const count = slotsByDay[key]?.length ?? 0;
      days.push({ key, date: new Date(d), count });
    }
    return days.filter((d) => d.count > 0);
  }, [allSlots, range.fromISO, range.toISO, slotsByDay]);

  const timesForSelectedDay = useMemo(() => {
    if (!selectedDayKey) return [];
    return slotsByDay[selectedDayKey] ?? [];
  }, [selectedDayKey, slotsByDay]);

  const confirm = async () => {
    try {
      if (!selectedSlot) {
        return Alert.alert('Elegí un horario', 'Seleccioná una hora disponible.');
      }
      const startISO = selectedSlot.slot_start;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Necesitás iniciar sesión', 'Iniciá sesión para continuar.');
        return;
      }

      if (bookingId) {
        await rescheduleBooking(String(bookingId), startISO);
        Alert.alert('¡Listo!', 'Reserva reprogramada.');
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/bookings');
      } else {
        const id = await createBooking(String(proId), String(serviceId), startISO);
        Alert.alert('¡Reserva creada!', `ID: ${id}`);
        await load();
      }
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      Alert.alert('No se pudo confirmar', msg || 'Intentá nuevamente.');
    }
  };

  const fade = useFadeIn(220, 40);

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
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Encabezado */}
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
            {/* Chips de días */}
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
              style={{ marginBottom: 8, opacity: fade.opacity }}
            >
              {daysList.map((d) => {
                const active = selectedDayKey === d.key;
                return (
                  <PressableScale
                    key={d.key}
                    onPress={() => {
                      animateNextLayout();
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
                    }}
                  >
                    <Text
                      style={{
                        color: active ? '#fff' : '#0F172A',
                        fontWeight: '700',
                        textTransform: 'capitalize',
                      }}
                    >
                      {humanDay(d.date)}
                    </Text>
                  </PressableScale>
                );
              })}
            </Animated.ScrollView>

            {/* Grid de horas */}
            <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
              {timesForSelectedDay.length === 0 ? (
                <Text style={{ color: '#64748B' }}>No hay horarios para este día.</Text>
              ) : (
                <FlatList
                  data={timesForSelectedDay}
                  keyExtractor={(s) => s.slot_start}
                  numColumns={2}
                  scrollEnabled={false}
                  columnWrapperStyle={{ gap: 10 }}
                  contentContainerStyle={{ gap: 10 }}
                  renderItem={({ item }) => {
                    const isSelected = selectedSlot?.slot_start === item.slot_start;
                    return (
                      <PressableScale
                        onPress={() =>
                          setSelectedSlot(
                            isSelected ? null : { slot_start: item.slot_start, slot_end: item.slot_end }
                          )
                        }
                        style={{
                          flex: 1,
                          paddingVertical: 14,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isSelected ? '#0284C7' : '#E5E7EB',
                          backgroundColor: isSelected ? '#E0F2FE' : '#FFFFFF',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            fontWeight: '700',
                            color: isSelected ? '#075985' : '#0F172A',
                          }}
                        >
                          {humanTime(item.slot_start)}
                        </Text>
                      </PressableScale>
                    );
                  }}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* CTA fijo */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
          padding: 12,
        }}
      >
        <PressableScale
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
        </PressableScale>
        <PressableScale
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={{ paddingVertical: 12, alignItems: 'center' }}
        >
          <Text style={{ color: '#64748B', fontWeight: '600' }}>Volver</Text>
        </PressableScale>
      </View>
    </View>
  );
}
