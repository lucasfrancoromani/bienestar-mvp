import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';

// ⛳️ AJUSTAR ESTAS DOS RUTAS SEGÚN TU PROYECTO
import { supabase } from '../../../lib/supabase';
import { createProStripeAccount, getProOnboardingLink, getProStripeStatus } from '../../../lib/api';

export default function ProFinanzasScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('No conectado a Stripe');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setEmail(data.user?.email ?? undefined);

      if (uid) {
        const { data: pro } = await supabase
          .from('professionals')
          .select('stripe_account_id')
          .eq('user_id', uid)
          .single();

        if (pro?.stripe_account_id) {
          setAccountId(pro.stripe_account_id);
          try {
            const st = await getProStripeStatus(uid);
            const s = st.status;
            setStatusText(
              `Cuenta: ${s.account_id}\n` +
              `Cobros habilitados: ${s.charges_enabled ? 'Sí' : 'No'}\n` +
              `Retiros habilitados: ${s.payouts_enabled ? 'Sí' : 'No'}\n` +
              (s.disabled_reason ? `Motivo: ${s.disabled_reason}\n` : '') +
              (s.outstanding_requirements?.length
                ? `Faltantes: ${s.outstanding_requirements.join(', ')}`
                : '')
            );
          } catch {
            setStatusText(`Conectado: ${pro.stripe_account_id}`);
          }
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onConectarStripe = useCallback(async () => {
    if (!userId) {
      Alert.alert('Sesión', 'No se encontró sesión de usuario.');
      return;
    }
    setLoading(true);
    try {
      const res = await createProStripeAccount(userId, email);
      setAccountId(res.account_id);
      setStatusText(`Conectado: ${res.account_id}${res.already_exists ? ' (ya existía)' : ''}`);
      Alert.alert('Stripe', res.already_exists ? 'La cuenta ya existía' : 'Cuenta creada');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message ?? 'No se pudo conectar con Stripe');
    } finally {
      setLoading(false);
    }
  }, [userId, email]);

  const onOnboarding = useCallback(async () => {
    if (!userId) {
      Alert.alert('Sesión', 'No se encontró sesión de usuario.');
      return;
    }
    setLoading(true);
    try {
      const { url } = await getProOnboardingLink(userId);
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert('Onboarding', 'No se pudo abrir el enlace de onboarding.');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message ?? 'No se pudo obtener el enlace de onboarding');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const onVolver = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/(pro)/pro');
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 16, paddingTop: 48, gap: 16 }}>
        <TouchableOpacity onPress={onVolver} style={{ paddingVertical: 8 }}>
          <Text style={{ color: '#007aff' }}>‹ Volver</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 24, fontWeight: '700' }}>Finanzas</Text>
        <Text style={{ color: '#555' }}>
          Conectá tu cuenta de Stripe para recibir pagos por tus servicios.
        </Text>

        <View
          style={{
            borderWidth: 1,
            borderColor: '#eee',
            borderRadius: 12,
            padding: 16,
            gap: 8,
            backgroundColor: '#fafafa',
          }}
        >
          <Text style={{ fontWeight: '600' }}>Estado</Text>
          <Text selectable>{statusText}</Text>
          {!!accountId && (
            <Text style={{ fontSize: 12, color: '#666' }}>
              Guardado en professionals.stripe_account_id
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={onConectarStripe}
          disabled={loading}
          style={{
            backgroundColor: '#111827',
            padding: 14,
            borderRadius: 12,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
              Conectar con Stripe
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onOnboarding}
          disabled={loading}
          style={{
            backgroundColor: '#0ea5e9',
            padding: 14,
            borderRadius: 12,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
              Completar / Continuar Onboarding
            </Text>
          )}
        </TouchableOpacity>

        {/* 👉 Botón para ir a la pantalla de pago de prueba */}
        <Link href="/pago-test" asChild>
          <TouchableOpacity
            style={{ padding: 12, backgroundColor: '#10b981', borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
              Ir a Pago Test
            </Text>
          </TouchableOpacity>
        </Link>

        <Text style={{ fontSize: 12, color: '#777' }}>
          Tip: cambiá las URLs de retorno en ONBOARDING_RETURN_URL / ONBOARDING_REFRESH_URL (Secrets de Supabase).
        </Text>
      </View>
    </ScrollView>
  );
}
