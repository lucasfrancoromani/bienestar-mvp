// lib/profile.ts
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

type ProRow = { user_id: string; bio?: string | null; avatar_url?: string | null };

async function getSessionUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) throw new Error('No hay sesión');
  return uid;
}

export async function getMyProProfile(): Promise<ProRow | null> {
  const uid = await getSessionUserId();
  const { data, error } = await supabase
    .from('professionals')
    .select('user_id, bio, avatar_url')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProRow) ?? null;
}

/** Sube un archivo local de Expo al bucket y retorna la URL pública */
async function uploadToAvatarsBucket(localUri: string, pathKey: string): Promise<string> {
  // Leer binario del archivo
  const file = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = Uint8Array.from(atob(file), c => c.charCodeAt(0));

  const { error: upErr } = await supabase
    .storage
    .from('avatars')
    .upload(pathKey, bytes, {
      contentType: guessContentType(localUri),
      upsert: true, // si ya existe, lo pisa
    });
  if (upErr) throw new Error(upErr.message);

  // URL pública
  const { data } = supabase.storage.from('avatars').getPublicUrl(pathKey);
  return data.publicUrl;
}

function guessContentType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

/** Sube la foto y la guarda en professionals.avatar_url (y también en users.avatar_url) */
export async function saveProAvatar(localUri: string): Promise<string> {
  const uid = await getSessionUserId();
  const fileName = `pro_${uid}_${Date.now()}.jpg`; // simple
  const pathKey = `${uid}/${fileName}`; // avatars/<uid>/pro_<uid>_timestamp.jpg

  const publicUrl = await uploadToAvatarsBucket(localUri, pathKey);

  // Actualizar tabla professionals (lo que usa la UI como fallback)
  const { error: e1 } = await supabase
    .from('professionals')
    .update({ avatar_url: publicUrl })
    .eq('user_id', uid);
  if (e1) throw new Error(e1.message);

  // (Opcional) Actualizar también users.avatar_url
  await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', uid);

  return publicUrl;
}
