// app/(tabs)/(pro)/pro-profile.tsx
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView, Platform, ScrollView,
  Text, TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function ProProfile() {
  const r = useRouter();
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');        // 👈 Nombre público (users.full_name)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [kbVisible, setKbVisible] = useState(false);

  // --- listeners de teclado (para manejar back en Android)
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (kbVisible) { Keyboard.dismiss(); return true; } // consumí el back para cerrar teclado
      return false; // que siga el back normal
    });
    return () => { show.remove(); hide.remove(); back.remove(); };
  }, [kbVisible]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Asegura perfil pro (si la tenés creada); si no existe, la fn hará insert.
      try { await supabase.rpc('ensure_pro_profile'); } catch {}

      // Leer nombre público (users.full_name) — si no existe fila aún, queda vacío
      try {
        const { data: u } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        setDisplayName((u as any)?.full_name ?? '');
      } catch {}

      // Leer datos del profesional
      const { data } = await supabase
        .from('professionals')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || null);
      }
    })();
  }, []);

  const pickAvatar = async () => {
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, quality: 0.8 });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !asset?.uri) return;
    setLoading(true);
    try {
      const ext = (asset.fileName?.split('.').pop() || 'jpg').toLowerCase();
      const path = `avatars/${user.id}.${ext}`;
      const file: any = { uri: asset.uri, name: asset.fileName ?? `avatar.${ext}`, type: (asset as any).mimeType ?? 'image/jpeg' };
      const { error } = await supabase.storage.from('public').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('public').getPublicUrl(path);
      const url = data.publicUrl;
      await supabase.from('professionals').update({ avatar_url: url }).eq('user_id', user.id);
      setAvatarUrl(url);
      Alert.alert('Listo', 'Avatar actualizado');
    } catch (e: any) {
      Alert.alert('Error subiendo avatar', e.message);
    } finally { setLoading(false); }
  };

  const uploadCert = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled) return;
    const doc = res.assets?.[0];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !doc?.uri) return;
    setLoading(true);
    try {
      const ext = (doc.name?.split('.').pop() || 'pdf').toLowerCase();
      const path = `certs/${user.id}/${Date.now()}.${ext}`;
      const file: any = { uri: doc.uri, name: doc.name ?? `cert.${Date.now()}.${ext}`, type: (doc as any).mimeType ?? 'application/pdf' };
      const { error } = await supabase.storage.from('certs').upload(path, file, { contentType: file.type });
      if (error) throw error;
      Alert.alert('OK', 'Certificación subida');
    } catch (e: any) {
      Alert.alert('Error subiendo certificación', e.message);
    } finally { setLoading(false); }
  };

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    try {
      // 1) Guardar nombre público en "users" (upsert: crea si no existe)
      const upsertUser = {
        id: user.id,
        full_name: displayName || null,
      } as any;
      const { error: eUser } = await supabase
        .from('users')
        .upsert(upsertUser, { onConflict: 'id' }); // PK id
      if (eUser) throw eUser;

      // 2) Guardar bio en professionals
      const { error: ePro } = await supabase
        .from('professionals')
        .update({ bio })
        .eq('user_id', user.id);
      if (ePro) throw ePro;

      Alert.alert('Guardado', 'Perfil actualizado');
      // ✨ cerrar teclado y volver de forma segura
      Keyboard.dismiss();
      if (r.canGoBack()) r.back(); else r.replace('/(tabs)/(pro)/pro');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 88, android: 0 })} // ajusta si tu header es más alto
    >
      {/* Tocar fuera cierra teclado */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12 }}
          keyboardShouldPersistTaps="handled"  // 👈 permite tocar botones con teclado abierto
        >
          <Text style={{ fontSize: 18, fontWeight: '600' }}>Foto de perfil</Text>
          <TouchableOpacity onPress={pickAvatar} style={{ alignSelf: 'flex-start' }}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} />
            ) : (
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
                <Text>Subir</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Nombre público */}
          <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 8 }}>Nombre público</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Ej. Laura Gómez"
            style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12 }}
          />

          {/* Bio */}
          <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 8 }}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Contá sobre tu experiencia"
            multiline
            style={{ backgroundColor: '#fff', padding: 12, borderRadius: 12, minHeight: 90, textAlignVertical: 'top' }}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            blurOnSubmit
          />

          <TouchableOpacity onPress={uploadCert} style={{ padding: 12, borderRadius: 12, backgroundColor: '#f5f5f5' }}>
            <Text>Subir certificación (PDF/imagen)</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={save} disabled={loading} style={{ padding: 14, borderRadius: 12, backgroundColor: '#111', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{loading ? 'Guardando…' : 'Guardar'}</Text>
          </TouchableOpacity>

          {/* Espaciador para que el botón no quede debajo del teclado */}
          <View style={{ height: 32 }} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
