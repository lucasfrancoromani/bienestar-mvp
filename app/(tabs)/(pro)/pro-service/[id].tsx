// app/(tabs)/(pro)/pro-service/[id].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
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

  // Cargar service
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
        })
        .eq('id', serviceId);

      if (error) throw error;
      Alert.alert('Guardado', 'Cambios aplicados.');
      safeGoBack();
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Cargando…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 88, android: 0 })}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 18, fontWeight: '600' }}>Nombre</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej. Masaje Descontracturante"
          style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }}
        />

        <Text style={{ fontSize: 18, fontWeight: '600' }}>Descripción</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Detalles del servicio"
          multiline
          style={{
            backgroundColor: '#fff',
            padding: 12,
            borderRadius: 12,
            minHeight: 90,
            textAlignVertical: 'top',
          }}
        />

        <Text style={{ fontSize: 18, fontWeight: '600' }}>Precio (USD)</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="Ej. 25.00"
          style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }}
        />

        <Text style={{ fontSize: 18, fontWeight: '600' }}>Duración (min)</Text>
        <TextInput
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          placeholder="Ej. 60"
          style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }}
        />

        <Text style={{ fontSize: 18, fontWeight: '600' }}>Categoría</Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="Ej. Masajes / Facial / Uñas…"
          style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }}
        />

        <View style={{ height: 8 }} />

        <TouchableOpacity
          onPress={save}
          disabled={saving}
          style={{
            padding: 14,
            borderRadius: 12,
            backgroundColor: '#111',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={safeGoBack}
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: '#f5f5f5',
            alignItems: 'center',
          }}
        >
          <Text>Cancelar</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
