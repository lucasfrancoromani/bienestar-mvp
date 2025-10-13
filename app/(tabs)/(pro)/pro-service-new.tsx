import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function ProServiceNew() {
  const r = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [category, setCategory] = useState('Masajes');
  const [reschedHours, setReschedHours] = useState('24');
  const [cancelHours, setCancelHours] = useState('24'); // 👈 nuevo
  const [loading, setLoading] = useState(false);

  const save = async () => {
    const price_cents = Math.max(1, Math.round((Number(price) || 0) * 100));
    const duration_min = Math.max(10, Number(duration) || 30);
    const reschedule_window_hours = Math.max(0, Number(reschedHours) || 24);
    const cancel_window_hours = Math.max(0, Number(cancelHours) || 24); // 👈 nuevo
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sin sesión');
      const { error } = await supabase.from('services').insert({
        professional_id: user.id,
        name, description,
        price_cents, duration_min,
        category, is_active: true,
        reschedule_window_hours,
        cancel_window_hours, // 👈 nuevo
      } as any);
      if (error) throw error;
      r.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text>Nombre</Text>
      <TextInput value={name} onChangeText={setName} style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }} />

      <Text>Descripción</Text>
      <TextInput value={description} onChangeText={setDescription} multiline style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12, minHeight: 80 }} />

      <Text>Precio (USD)</Text>
      <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }} />

      <Text>Duración (min)</Text>
      <TextInput value={duration} onChangeText={setDuration} keyboardType="number-pad" style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }} />

      <Text>Categoría</Text>
      <TextInput value={category} onChangeText={setCategory} placeholder="Masajes / Facial / Uñas." style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }} />

      <Text>Anticipación para reprogramar (horas)</Text>
      <TextInput value={reschedHours} onChangeText={setReschedHours} keyboardType="number-pad" style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }} />

      {/* 👇 Nuevo campo */}
      <Text>Anticipación para cancelar (horas)</Text>
      <TextInput value={cancelHours} onChangeText={setCancelHours} keyboardType="number-pad" style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }} />

      <TouchableOpacity onPress={save} disabled={loading} style={{ padding: 14, borderRadius: 12, backgroundColor: '#111', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>{loading ? 'Creando…' : 'Crear'}</Text>
      </TouchableOpacity>
    </View>
  );
}
