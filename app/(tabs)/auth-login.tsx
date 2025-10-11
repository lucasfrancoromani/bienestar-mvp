import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AuthLogin() {
  const r = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    if (!email || !password) return Alert.alert('Faltan datos', 'Completá email y contraseña');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      Alert.alert('¡Listo!', 'Sesión iniciada');
      if (r.canGoBack()) r.back(); else r.replace('/(tabs)'); // volver a la pantalla anterior (Inicio)
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Iniciar sesión</Text>

      <Text>Email</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@email.com"
        style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }}
      />

      <Text>Contraseña</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }}
      />

      <TouchableOpacity onPress={signIn} disabled={loading} style={{ padding: 14, borderRadius: 12, backgroundColor: '#111', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '600' }}>{loading ? 'Ingresando…' : 'Ingresar'}</Text>
      </TouchableOpacity>

      <Link href="/(tabs)/auth-register" asChild>
        <TouchableOpacity style={{ padding: 12 }}>
          <Text style={{ textAlign: 'center', color: '#111' }}>¿No tenés cuenta? Crear cuenta</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
