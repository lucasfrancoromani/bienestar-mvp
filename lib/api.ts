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
  // 1) Dueño del servicio
  const { data: svc, error: e1 } = await supabase
    .from('services')
    .select('professional_id')
    .eq('id', serviceId)
    .single();
  if (e1) throw e1;

  const proId: string | undefined = (svc as any)?.professional_id;
  if (!proId) return [];

  // 2) Nombre/Avatar público vía RPC (puede venir vacío en algunos entornos)
  const { data: pub, error: ePub } = await supabase.rpc('get_user_public', { _id: proId });

  // pub a veces viene como array
  const row = Array.isArray(pub) ? pub?.[0] : pub;
  let friendly: string | null = row?.full_name ?? null;
  let avatar: string | null = row?.avatar_url ?? null;

  // 3) Fallback de nombre: profiles
  if (!friendly || friendly.trim() === '') {
    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name,name')
      .eq('id', proId)
      .maybeSingle();
    friendly = (prof?.full_name || prof?.name || '').trim() || null;
  }

  // 4) Fallback de avatar: professionals
  if (!avatar) {
    const { data: proRow } = await supabase
      .from('professionals')
      .select('avatar_url')
      .eq('user_id', proId)
      .maybeSingle();
    avatar = proRow?.avatar_url ?? null;
  }

  // 5) (Opcional) rating agregada
  let rating_avg: number | null = null;
  let rating_count: number | null = null;
  try {
    const { data: r } = await supabase.rpc('get_pro_rating', { _pro_id: proId });
    rating_avg = r?.rating_avg ?? null;
    rating_count = r?.rating_count ?? null;
  } catch {}

  return [
    {
      id: proId,
      full_name: friendly ?? 'Profesional',
      avatar_url: avatar,
      rating_avg,
      rating_count,
    },
  ];
}

// --- Mis reservas (cliente o pro) con ventanas configurables ---
export async function listMyBookings() {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('No hay sesión');

  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      start_at,
      status,
      total_cents,
      service_id,
      services:service_id (
        id, name, duration_min, reschedule_window_hours, cancel_window_hours
      ),
      pro:pro_id ( id, full_name ),
      client:client_id ( id, full_name )
    `)
    .eq('client_id', uid)
    .order('start_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function cancelBooking(bookingId: string) {
  const { error } = await supabase.rpc('cancel_booking', { _booking_id: bookingId });
  if (error) throw error;
}

export async function listSlots(proId: string, serviceId: string, fromISO: string, toISO: string) {
  const { data, error } = await supabase.rpc('list_available_slots', {
    _pro_id: proId,
    _service_id: serviceId,
    _from_ts: new Date(fromISO).toISOString(),
    _to_ts: new Date(toISO).toISOString(),
    _buffer_min: 0,
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
    `)
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

export async function rescheduleBooking(bookingId: string, newStartISO: string) {
  const iso = new Date(newStartISO).toISOString();
  const { error } = await supabase.rpc('reschedule_booking', {
    _booking_id: bookingId,
    _new_start_at: iso,
  });
  if (error) throw error;
}

// === Stripe (helpers de edge functions omitidos por brevedad) ===

// =======================
// === Reviews (NEW)  ====
// =======================

// Ver si una booking ya tiene review
export async function getBookingReview(bookingId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at')
    .eq('booking_id', bookingId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// Enviar review (vía RPC para validar reglas negocio)
export async function submitReview(bookingId: string, rating: number, comment: string) {
  if (rating < 1 || rating > 5) throw new Error('La calificación debe ser de 1 a 5 estrellas');
  const { data, error } = await supabase.rpc('create_review', {
    _booking_id: bookingId,
    _rating: rating,
    _comment: comment ?? '',
  });
  if (error) throw error;
  return data as { id: string };
}

// Obtener rating agregado de un pro
export async function getProRating(proId: string) {
  const { data, error } = await supabase.rpc('get_pro_rating', { _pro_id: proId });
  if (error) throw error;
  return data as { rating_avg: number; rating_count: number };
}

// Listar reviews recientes de un pro
export async function listProReviews(proId: string, limit = 10) {
  const { data, error } = await supabase.rpc('list_reviews_for_pro', {
    _pro_id: proId,
    _limit: limit,
  });
  if (error) throw error;
  // Esperamos: [{ rating, comment, created_at, client: { full_name, avatar_url }}]
  return (data ?? []) as any[];
}
