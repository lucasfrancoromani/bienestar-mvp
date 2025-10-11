// app/(tabs)/auth-register.tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPro, setIsPro] = useState(false); // 👈 nuevo
  const [loading, setLoading] = useState(false);

  // crea/asegura la fila del profesional para el usuario logueado
  async function ensureProfessionalRow() {
    // Opción A: insert directo (requiere RLS correcta en professionals)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No hay sesión tras el registro');

    // Intenta insertar; si ya existe, ignora error de duplicado de PK/FK únicas
    const { error } = await supabase
      .from('professionals')
      .insert({
        user_id: user.id,
        bio: '',
        kyc_status: 'pending',
        service_radius_km: 5,
        base_zip: null,
        rating_avg: 0,
        rating_count: 0
      } as any);

    // Si ya existía, no lo tratamos como error crítico
    if (error && !/duplicate key|already exists/i.test(error.message)) {
      // Fallback: por si preferís RPC
      // await supabase.rpc('ensure_pro_profile');
      throw error;
    }
  }

  const onRegister = async () => {
    if (!email || !password) {
      Alert.alert('Completá los campos', 'Email y contraseña son obligatorios.');
      return;
    }
    setLoading(true);
    try {
      // 1) Crear cuenta
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpErr) throw signUpErr;

      // NOTA: si tu proyecto requiere verificación por email, puede que no haya sesión ahora mismo.
      // Para el MVP vamos a intentar iniciar sesión directo:
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        // Si no se puede iniciar sesión (e.g., requiere email confirm), avisamos y salimos.
        Alert.alert('Cuenta creada', 'Revisá tu email para confirmar la cuenta.');
        router.replace('/(tabs)'); // volver a inicio
        return;
      }

      // 2) Si marcó "Soy profesional", creamos su fila en professionals
      if (isPro) {
        try {
          await ensureProfessionalRow();
        } catch (e: any) {
          // No frenamos el flujo por esto; solo avisamos.
          console.warn('No se pudo crear fila en professionals:', e?.message);
        }
      }

      Alert.alert('¡Listo!', isPro ? 'Cuenta Pro creada.' : 'Cuenta creada.');
      router.replace('/(tabs)'); // irá al Home; el badge de rol ya debería decir "Profesional" si marcó la opción
    } catch (e: any) {
      Alert.alert('Error al registrar', e.message ?? 'Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 8 }}>Crear cuenta</Text>

        <Text>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="tu@email.com"
          style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee' }}
        />

        <Text>Contraseña</Text>
        <TextInput
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="mínimo 6 caracteres"
          style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee' }}
        />

        {/* 👇 Toggle simple para el MVP */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 8,
        }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>Soy profesional</Text>
            <Text style={{ color: '#666', marginTop: 2, fontSize: 12 }}>
              Si lo activás, crearemos tu perfil profesional.
            </Text>
          </View>
          <Switch value={isPro} onValueChange={setIsPro} />
        </View>

        <TouchableOpacity
          onPress={onRegister}
          disabled={loading}
          style={{ padding: 14, borderRadius: 12, backgroundColor: '#111', alignItems: 'center', marginTop: 8 }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>{loading ? 'Creando…' : 'Crear cuenta'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
