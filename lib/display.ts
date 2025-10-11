// app/lib/display.ts
export function maskEmail(e?: string | null) {
  if (!e) return null;
  const [u, d] = e.split('@');
  if (!u || !d) return e;
  return `${u.slice(0, 2)}***@${d}`;
}

export function displayName(u?: { full_name?: string | null; name?: string | null; email?: string | null; id?: string | null } | null) {
  if (!u) return 'Usuario';
  return u.full_name || u.name || maskEmail(u.email) || u.id || 'Usuario';
}
