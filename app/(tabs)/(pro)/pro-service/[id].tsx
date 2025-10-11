// app/(tabs)/(pro)/pro-service/[id].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform,
  ScrollView, Text, TextInput, TouchableOpacity
} from 'react-native';
import { supabase } from '../../../../lib/supabase';

type Service = {
  id: string;
  name: string;
  description?: string;
  price_cents: number;
  duration_min: number;
  category?: string;
  is_active: boolean;
  professional_id: string;
  reschedule_window_hours?: number;
};

export default function ProServiceEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');      // UI en moneda (ej: "12.50")
  const [duration, setDuration] = useState(''); // minutos
  const [category, setCategory] = useState('');
  const [reschedHours, setReschedHours] = useState('24');

  useEffect(() => {
    (async () => {
      const serviceId = id ? String(id) : '';
      if (!serviceId) {
        Alert.alert('Ruta inválida', 'Falta el parámetro id del servicio.');
        if (router.canGoBack()) router.back();
        else router.replace('/pro-services');
        return;
      }
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single<Service>();

      if (error || !data) {
        Alert.alert('No encontrado', 'No pudimos cargar el servicio.');
        if (router.canGoBack()) router.back();
        else router.replace('/pro-services');
        return;
      }

      setName(data.name || '');
      setDescription(data.description || '');
      setPrice(((data.price_cents || 0) / 100).toString());
      setDuration(String(data.duration_min || 60));
      setCategory(data.category || '');
      setReschedHours(String(data.reschedule_window_hours ?? 24));
      setLoading(false);
    })();
  }, [id]);

  const safeGoBack = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace('/pro-services');
  };

  const save = async () => {
    const serviceId = id ? String(id) : '';
    if (!serviceId) return;
    const price_cents = Math.max(1, Math.round((Number(price) || 0) * 100));
    const duration_min = Math.max(10, Number(duration) || 30);
    const reschedule_window_hours = Math.max(0, Number(reschedHours) || 24);

    setSaving(true);
    try {
      const { error } = await supabase
        .from('services')
        .update({
          name,
          description,
          price_cents,
          duration_min,
          category,
          reschedule_window_hours,
        } as any)
        .eq('id', serviceId);

      if (error) throw error;
      Alert.alert('Guardado', 'Cambios aplicados.');
      safeGoBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Text>Nombre</Text>
        <TextInput value={name} onChangeText={setName} style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }} />

        <Text>Descripción</Text>
        <TextInput value={description} onChangeText={setDescription} multiline style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12, minHeight: 80 }} />

        <Text>Precio (USD)</Text>
        <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }} />

        <Text>Duración (min)</Text>
        <TextInput value={duration} onChangeText={setDuration} keyboardType="number-pad" style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }} />

        <Text>Categoría</Text>
        <TextInput value={category} onChangeText={setCategory} style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }} />

        <Text>Anticipación para reprogramar (horas)</Text>
        <TextInput value={reschedHours} onChangeText={setReschedHours} keyboardType="number-pad" style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }} />

        <TouchableOpacity onPress={save} disabled={saving} style={{ padding: 14, borderRadius: 12, backgroundColor: '#111', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>{saving ? 'Guardando…' : 'Guardar'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
