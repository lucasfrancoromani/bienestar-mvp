import { useEffect, useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function ProCoverage() {
  const [radius, setRadius] = useState('5');
  const [zip, setZip] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.rpc('ensure_pro_profile');
      const { data } = await supabase.from('professionals').select('service_radius_km, base_zip').eq('user_id', user.id).single();
      if (data) {
        setRadius(String(data.service_radius_km ?? '5'));
        setZip(data.base_zip || '');
      }
    })();
  }, []);

  const save = async () => {
    const km = Math.max(1, Math.min(50, Number(radius) || 5));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('professionals').update({ service_radius_km: km, base_zip: zip }).eq('user_id', user.id);
      if (error) throw error;
      Alert.alert('Guardado', 'Zonas actualizadas');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Radio de servicio (km)</Text>
      <TextInput keyboardType="number-pad" value={radius} onChangeText={setRadius} style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }} />
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Código Postal base</Text>
      <TextInput value={zip} onChangeText={setZip} placeholder="ej. 20100" style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }} />
      <TouchableOpacity onPress={save} disabled={loading} style={{ padding: 14, borderRadius: 12, backgroundColor: '#111', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>{loading ? 'Guardando…' : 'Guardar'}</Text>
      </TouchableOpacity>
    </View>
  );
}
