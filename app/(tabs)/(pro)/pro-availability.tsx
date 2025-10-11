// app/(tabs)/(pro)/pro-availability.tsx
import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';

const DAYS = [
  { label: 'Domingo', value: 0 },
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 },
];

type Avail = {
  id: string;
  pro_id: string;
  weekday: number;      // 0-6
  start_time: string;   // "HH:MM" o TIME → lo mostramos como texto
  end_time: string;
};

type Exception = {
  id: string;
  pro_id: string;
  date: string;            // "YYYY-MM-DD"
  is_available_bool: boolean;
  notes?: string | null;
};

export default function ProAvailability() {
  const [loading, setLoading] = useState(true);
  const [proId, setProId] = useState<string | null>(null);

  const [weekday, setWeekday] = useState<number>(1);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('18:00');

  const [excDate, setExcDate] = useState('');
  const [excAvail, setExcAvail] = useState<'0' | '1'>('0');
  const [excNotes, setExcNotes] = useState('');

  const [rules, setRules] = useState<Avail[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.rpc('ensure_pro_profile');
      setProId(user.id);

      const { data: avail } = await supabase
        .from('availability_weekly')
        .select('*')
        .eq('pro_id', user.id)
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true });

      const { data: exc } = await supabase
        .from('exceptions')
        .select('*')
        .eq('pro_id', user.id)
        .order('date', { ascending: true });

      setRules((avail as Avail[]) || []);
      setExceptions((exc as Exception[]) || []);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addRule = async () => {
    try {
      if (!proId) return;
      if (!isValidHHmm(start) || !isValidHHmm(end)) return Alert.alert('Formato', 'Usá HH:MM (ej. 09:00).');
      if (!isEndAfterStart(start, end)) return Alert.alert('Atención', 'Fin debe ser mayor que inicio.');
      const { error } = await supabase.from('availability_weekly').insert({
        pro_id: proId, weekday, start_time: start, end_time: end,
      });
      if (error) throw error;
      setStart('09:00'); setEnd('18:00'); load();
    } catch (e: any) { Alert.alert('No se pudo guardar', e.message); }
  };

  const removeRule = async (id: string) => {
    try {
      const { error } = await supabase.from('availability_weekly').delete().eq('id', id);
      if (error) throw error; load();
    } catch (e: any) { Alert.alert('No se pudo eliminar', e.message); }
  };

  const addException = async () => {
    try {
      if (!proId) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(excDate)) return Alert.alert('Fecha', 'Usá YYYY-MM-DD.');
      const { error } = await supabase.from('exceptions').insert({
        pro_id: proId, date: excDate, is_available_bool: excAvail === '1', notes: excNotes || null,
      });
      if (error) throw error;
      setExcDate(''); setExcAvail('0'); setExcNotes(''); load();
    } catch (e: any) { Alert.alert('No se pudo guardar la excepción', e.message); }
  };

  const removeException = async (id: string) => {
    try {
      const { error } = await supabase.from('exceptions').delete().eq('id', id);
      if (error) throw error; load();
    } catch (e: any) { Alert.alert('No se pudo eliminar', e.message); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.select({ ios: 88, android: 0 })}>
      <FlatList
        contentContainerStyle={{ padding: 16, gap: 16 }}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '700' }}>Disponibilidad</Text>

            <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#f7f7f7', gap: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>Reglas semanales</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {DAYS.map(d => (
                  <Chip key={d.value} selected={weekday === d.value} onPress={() => setWeekday(d.value)} label={d.label} />
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Input label="Inicio (HH:MM)" value={start} onChangeText={setStart} placeholder="09:00" />
                <Input label="Fin (HH:MM)" value={end} onChangeText={setEnd} placeholder="18:00" />
              </View>

              <Primary onPress={addRule} title="Agregar franja" />
            </View>

            <Text style={{ fontSize: 16, fontWeight: '600' }}>Reglas vigentes</Text>
            {loading && <Text>Cargando…</Text>}
            {!loading && rules.length === 0 && <Text>No agregaste reglas todavía.</Text>}
          </View>
        }
        data={rules}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text style={{ fontWeight: '600' }}>{DAYS.find(d => d.value === item.weekday)?.label}</Text>
            <Text style={{ color: '#555' }}>{item.start_time} → {item.end_time}</Text>
            <Danger onPress={() => removeRule(item.id)} title="Eliminar" />
          </View>
        )}
        ListFooterComponent={
          <View style={{ gap: 16, marginTop: 20 }}>
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#f7f7f7', gap: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: '600' }}>Excepciones / Feriados</Text>
              <Input label="Fecha (YYYY-MM-DD)" value={excDate} onChangeText={setExcDate} placeholder="2025-10-11" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip selected={excAvail === '0'} onPress={() => setExcAvail('0')} label="No disponible" />
                <Chip selected={excAvail === '1'} onPress={() => setExcAvail('1')} label="Disponible" />
              </View>
              <Input label="Notas (opcional)" value={excNotes} onChangeText={setExcNotes} placeholder="feriado, viaje…" />
              <Primary onPress={addException} title="Agregar excepción" />
            </View>

            <Text style={{ fontSize: 16, fontWeight: '600' }}>Excepciones vigentes</Text>
            {loading && <Text>Cargando…</Text>}
            {!loading && exceptions.length === 0 && <Text>No agregaste excepciones todavía.</Text>}
            {exceptions.map(e => (
              <View key={e.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
                <Text style={{ fontWeight: '600' }}>{e.date}</Text>
                <Text style={{ color: '#555' }}>{e.is_available_bool ? 'Disponible' : 'No disponible'}</Text>
                {e.notes ? <Text style={{ color: '#777' }}>{e.notes}</Text> : null}
                <Danger onPress={() => removeException(e.id)} title="Eliminar" />
              </View>
            ))}
            <View style={{ height: 24 }} />
          </View>
        }
      />
    </KeyboardAvoidingView>
  );
}

function Chip({ selected, onPress, label }: { selected: boolean; onPress: () => void; label: string }) {
  return (
    <TouchableOpacity onPress={onPress}
      style={{ paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: selected ? '#111' : '#fff', borderWidth: 1, borderColor: '#ddd' }}>
      <Text style={{ color: selected ? '#fff' : '#111' }}>{label}</Text>
    </TouchableOpacity>
  );
}
function Input({ label, ...props }: any) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ marginBottom: 6 }}>{label}</Text>
      <TextInput {...props} style={{ backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eee' }} />
    </View>
  );
}
function Primary({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ padding: 12, borderRadius: 12, backgroundColor: '#111', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '600' }}>{title}</Text>
    </TouchableOpacity>
  );
}
function Danger({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ marginTop: 8, padding: 8, borderRadius: 10, backgroundColor: '#fde8e8' }}>
      <Text style={{ color: '#b00020' }}>{title}</Text>
    </TouchableOpacity>
  );
}
function isValidHHmm(s: string) {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [hh, mm] = s.split(':').map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}
function isEndAfterStart(a: string, b: string) {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  if (bh > ah) return true;
  if (bh < ah) return false;
  return bm > am;
}
