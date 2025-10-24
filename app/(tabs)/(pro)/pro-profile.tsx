// app/(tabs)/(pro)/pro-profile.tsx
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../../lib/supabase';

/** ───────────────────────────────────────────────────────────────────
 *  Base64 → Uint8Array (sin atob / Buffer)
 *  ─────────────────────────────────────────────────────────────────── */
function base64ToBytes(b64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = b64.replace(/[\r\n\s]/g, '');
  let output: number[] = [];
  let i = 0;

  while (i < str.length) {
    const enc1 = chars.indexOf(str[i++]);
    const enc2 = chars.indexOf(str[i++]);
    const enc3 = chars.indexOf(str[i++]);
    const enc4 = chars.indexOf(str[i++]);

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    output.push(chr1);
    if (enc3 !== 64 && enc3 !== -1) output.push(chr2);
    if (enc4 !== 64 && enc4 !== -1) output.push(chr3);
  }
  return new Uint8Array(output);
}

export default function ProProfile() {
  const r = useRouter();
  const [bio, setBio] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [kbVisible, setKbVisible] = useState(false);

  // listeners de teclado
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKbVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbVisible(false));
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (kbVisible) {
        Keyboard.dismiss();
        return true;
      }
      return false;
    });
    return () => {
      show.remove();
      hide.remove();
      back.remove();
    };
  }, [kbVisible]);

  // cargar datos
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      try { await supabase.rpc('ensure_pro_profile'); } catch {}

      const { data: u } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      setDisplayName((u as any)?.full_name ?? '');

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

  /** Subir avatar:
   *  1) Elegimos imagen (puede ser HEIC),
   *  2) La convertimos a JPEG real con expo-image-manipulator (y obtenemos base64),
   *  3) Decodificamos base64 → bytes,
   *  4) Subimos bytes con contentType correcto (image/jpeg),
   *  5) Guardamos URL en DB.
   */
  const pickAvatar = async () => {
    try {
      await ImagePicker.requestMediaLibraryPermissionsAsync();

      const mediaType =
        (ImagePicker as any).MediaType?.Images ||
        ImagePicker.MediaTypeOptions.Images;

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (res.canceled) return;

      const asset = res.assets?.[0];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !asset?.uri) return;

      setLoading(true);

      // 🔄 Convertimos a JPEG (evita HEIC y garantiza vista en todos lados)
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [], // sin cambios de tamaño; solo re-encode
        { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (!manipulated.base64) throw new Error('No se pudo generar el JPEG');

      const bytes = base64ToBytes(manipulated.base64);
      const filePath = `${user.id}/avatar_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const url = `${data.publicUrl}?v=${Date.now()}`; // bust cache

      await supabase.from('professionals').update({ avatar_url: url }).eq('user_id', user.id);
      await supabase.from('users').update({ avatar_url: url }).eq('id', user.id);

      setAvatarUrl(url);
      Alert.alert('Listo', 'Foto actualizada correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo subir la foto');
    } finally {
      setLoading(false);
    }
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
      const file: any = {
        uri: doc.uri,
        name: doc.name ?? `cert.${Date.now()}.${ext}`,
        type: (doc as any).mimeType ?? 'application/pdf',
      };
      const { error } = await supabase.storage.from('certs').upload(path, file, {
        contentType: file.type,
      });
      if (error) throw error;
      Alert.alert('OK', 'Certificación subida correctamente.');
    } catch (e: any) {
      Alert.alert('Error subiendo certificación', e.message);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from('users').upsert({ id: user.id, full_name: displayName || null });
      await supabase.from('professionals').update({ bio }).eq('user_id', user.id);
      Alert.alert('Guardado', 'Perfil actualizado correctamente.');
      Keyboard.dismiss();
      if (r.canGoBack()) r.back();
      else r.replace('/(tabs)/(pro)/pro');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{ padding: 20, backgroundColor: '#fbf6ff', flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 16 }}>
            <TouchableOpacity onPress={pickAvatar} disabled={loading}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#d8b9ff' }}
                />
              ) : (
                <View
                  style={{
                    width: 120, height: 120, borderRadius: 60, backgroundColor: '#e5e7eb',
                    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#cbd5e1',
                  }}
                >
                  <Text style={{ color: '#64748B' }}>Subir foto</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={{ marginTop: 10, fontSize: 16, fontWeight: '600', color: '#0f172a' }}>
              {displayName || 'Tu nombre público'}
            </Text>
          </View>

          {/* Card formulario */}
          <View
            style={{
              backgroundColor: '#fff', borderRadius: 16, padding: 16,
              shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
            }}
          >
            <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 8 }}>Nombre público</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Ej. Laura Gómez"
              style={{ backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, marginBottom: 16 }}
            />

            <Text style={{ fontWeight: '700', fontSize: 18, marginBottom: 8 }}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Contá sobre tu experiencia profesional..."
              multiline
              style={{
                backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, minHeight: 90,
                textAlignVertical: 'top', marginBottom: 16,
              }}
            />

            <TouchableOpacity
              onPress={uploadCert}
              style={{ backgroundColor: '#f3e8ff', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 16 }}
            >
              <Text style={{ color: '#7e22ce', fontWeight: '600' }}>Subir certificación</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={save}
              disabled={loading}
              style={{ backgroundColor: '#d8b9ff', padding: 14, borderRadius: 10, alignItems: 'center' }}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Guardar cambios</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
