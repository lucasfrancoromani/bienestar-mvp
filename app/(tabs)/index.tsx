import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { isProUser } from '../../lib/authz';
import { supabase } from '../../lib/supabase';

function RoleBadge({ isPro }: { isPro: boolean }) {
  return (
    <View style={{
      alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999,
      backgroundColor: isPro ? '#16a34a20' : '#64748b20',
      borderWidth: 1, borderColor: isPro ? '#16a34a55' : '#64748b55',
    }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: isPro ? '#166534' : '#334155' }}>
        {isPro ? 'Rol: Profesional' : 'Rol: Cliente'}
      </Text>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [amPro, setAmPro] = useState<boolean>(false);

  async function refreshSessionAndRole(session = undefined as any) {
    const userEmail = session?.user?.email ?? (await supabase.auth.getSession()).data.session?.user?.email ?? null;
    setEmail(userEmail ?? null);
    setAmPro(userEmail ? await isProUser() : false);
  }

  useEffect(() => {
    // sesión inicial + rol
    refreshSessionAndRole();

    // escuchar cambios de auth
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      refreshSessionAndRole(session);
    });
    return () => { sub.subscription?.unsubscribe(); };
  }, []);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // limpiar UI local y llevar a Home
      setEmail(null);
      setAmPro(false);
      router.replace('/(tabs)');
      Alert.alert('Sesión cerrada');
    } catch (e: any) {
      Alert.alert('Error al cerrar sesión', e.message ?? 'Intenta de nuevo.');
    }
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 4 }}>Inicio</Text>

      {email ? (
        <>
          <RoleBadge isPro={amPro} />
          <Text style={{ color: '#666' }}>Sesión iniciada como: {email}</Text>

          {amPro && (
            <Link href="/(tabs)/(pro)/pro" asChild>
              <TouchableOpacity style={{ padding: 16, borderRadius: 12, backgroundColor: '#111', marginTop: 8 }}>
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
                  Ir al Panel Profesional
                </Text>
              </TouchableOpacity>
            </Link>
          )}

          <TouchableOpacity onPress={signOut}
            style={{ padding: 14, borderRadius: 12, backgroundColor: '#f5f5f5' }}>
            <Text style={{ textAlign: 'center', fontWeight: '600' }}>Cerrar sesión</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Link href="/(tabs)/auth-register" asChild>
            <TouchableOpacity style={{ padding: 16, borderRadius: 12, backgroundColor: '#111' }}>
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
                Crear cuenta
              </Text>
            </TouchableOpacity>
          </Link>

          <Link href="/(tabs)/auth-login" asChild>
            <TouchableOpacity style={{ padding: 16, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' }}>
              <Text style={{ textAlign: 'center', fontWeight: '600' }}>
                Iniciar sesión
              </Text>
            </TouchableOpacity>
          </Link>
        </>
      )}
    </View>
  );
}
