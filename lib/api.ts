import { supabase } from './supabase';

export async function listServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data!;
}

export async function listProsForService(serviceId: string) {
  // 1) Dueño del servicio (pro)
  const { data: svc, error: e1 } = await supabase
    .from('services')
    .select('professional_id')
    .eq('id', serviceId)
    .single();
  if (e1) throw e1;

  const proId: string | undefined = svc?.professional_id;
  if (!proId) return [];

  // 2) Pedir nombre público vía RPC (bypassea RLS y solo expone id/full_name/avatar_url)
  const { data: pub, error: ePub } = await supabase.rpc('get_user_public', { _id: proId });
  if (ePub) {
    // Si algo falla, devolvemos un alias amigable
    return [{ id: proId, full_name: 'Profesional', avatar_url: null }];
  }

  const row = Array.isArray(pub) ? pub[0] : pub; // supabase RPC puede devolver array
  const friendly = row?.full_name || 'Profesional';

  return [
    {
      id: proId,
      full_name: friendly,
      avatar_url: row?.avatar_url ?? null,
    },
  ];
}


// --- Mis reservas (cliente o pro) con ventanas configurables ---
export async function listMyBookings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No session');

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, start_at, end_at, status, service_id,
      services:service_id (
        id, name, duration_min,
        reschedule_window_hours,
        cancel_window_hours
      ),
      pro:pro_id ( id, full_name, email, avatar_url ),
      client:client_id ( id, full_name, email, avatar_url )
    `)
    .or(`client_id.eq.${user.id},pro_id.eq.${user.id}`)
    .order('start_at', { ascending: false });

  if (error) throw error;
  return data!;
}

export async function cancelBooking(bookingId: string) {
  // usando RPC helper (recomendado)
  const { error } = await supabase.rpc('cancel_booking', { _booking_id: bookingId });
  if (error) throw error;
}

export async function listSlots(proId: string, serviceId: string, fromISO: string, toISO: string) {
  const { data, error } = await supabase.rpc('list_available_slots', {
    _pro_id: proId,
    _service_id: serviceId,
    _from_ts: new Date(fromISO).toISOString(),
    _to_ts: new Date(toISO).toISOString(),
    _buffer_min: 0, // ← importante
  });
  if (error) throw error;
  return data as { slot_start: string; slot_end: string }[];
}

export async function createBooking(proId: string, serviceId: string, startISO: string) {
  const { data, error } = await supabase.rpc('create_booking', {
    _pro_id: proId,
    _service_id: serviceId,
    _start_at: new Date(startISO).toISOString(),
  });
  if (error) throw error;
  return data as string; // booking id
}

// --- Reservas del Pro (pendientes) ---
export async function listPendingForPro() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No session');

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, start_at, end_at, status,
      services(name, duration_min),
      client:client_id (id, full_name, email, avatar_url)
    `) // 👉 sólo full_name
    .eq('pro_id', user.id)
    .eq('status', 'pending')
    .order('start_at', { ascending: true });

  if (error) throw error;
  return data!;
}

export async function acceptBooking(bookingId: string) {
  const { error } = await supabase.rpc('accept_booking', { _booking_id: bookingId });
  if (error) throw error;
}

export async function rejectBooking(bookingId: string) {
  const { error } = await supabase.rpc('reject_booking', { _booking_id: bookingId });
  if (error) throw error;
}

// === Reprogramar una reserva existente ===
export async function rescheduleBooking(bookingId: string, newStartISO: string) {
  // Normalizamos a ISO UTC (por las dudas)
  const iso = new Date(newStartISO).toISOString();
  const { error } = await supabase.rpc('reschedule_booking', {
    _booking_id: bookingId,
    _new_start_at: iso,
  });
  if (error) throw error;
}
