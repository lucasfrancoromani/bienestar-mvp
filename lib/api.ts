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

  return [
    {
      id: proId,
      full_name: friendly ?? 'Profesional',
      avatar_url: avatar,
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
    .eq('client_id', uid)                // 👈 clave: SOLO reservas del cliente actual
    .order('start_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
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

// === Stripe Connect (Pro) ===
export async function createProStripeAccount(proUserId: string, email?: string) {
  const { data, error } = await supabase.functions.invoke('pro-stripe-account', {
    body: { pro_user_id: proUserId, email },
  });
  if (error) throw error;
  return data as { account_id: string; already_exists: boolean };
}

export async function getProOnboardingLink(proUserId: string) {
  const { data, error } = await supabase.functions.invoke('pro-stripe-onboarding', {
    body: { pro_user_id: proUserId },
  });
  if (error) throw error;
  return data as { url: string };
}

export async function getProStripeStatus(proUserId: string) {
  const { data, error } = await supabase.functions.invoke('pro-stripe-status', {
    body: { pro_user_id: proUserId },
  });
  if (error) throw error;
  return data as {
    status: {
      account_id: string;
      charges_enabled: boolean;
      payouts_enabled: boolean;
      details_submitted: boolean;
      disabled_reason: string | null;
      outstanding_requirements: string[];
    };
  };
}

