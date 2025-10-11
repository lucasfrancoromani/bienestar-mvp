import { supabase } from '../lib/supabase';

export async function becomePro() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert('Primero iniciá sesión');

  const { error } = await supabase
    .from('users')
    .update({ role: 'pro' })
    .eq('id', user.id);

  if (error) alert(error.message);
  else alert('¡Listo! Tu rol ahora es Profesional.');
}
