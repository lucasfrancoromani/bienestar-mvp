# Marketplace de Bienestar — MVP

App móvil (Expo + React Native) con backend Supabase para un marketplace de servicios a domicilio (wellness/estética). Incluye modo Cliente/Profesional, disponibilidad por franjas, reservas y panel Pro básico.

## Stack
- **Mobile:** Expo + React Native + expo-router
- **Backend:** Supabase (Auth + Postgres + RLS)
- **Pagos (roadmap):** Stripe Connect
- **Otros:** TypeScript

## Estructura (actual)
```
apps/mobile/              # (si luego migrás a monorepo)
app/                      # rutas expo-router
  (tabs)/
    index.tsx             # Inicio + role badge
    explore.tsx           # Explorar servicios
    bookings.tsx          # Mis reservas
    (pro)/                # Panel Profesional (stack protegido)
      pro.tsx
      pro-profile.tsx
      pro-services.tsx
      pro-service-new.tsx
      pro-availability.tsx
      pro-bookings.tsx
  select-pro.tsx
  slots.tsx
lib/
  supabase.ts
  api.ts
  authz.ts
  display.ts
```
> Nota: los nombres reales pueden variar según tu carpeta actual; esta guía apunta a la estructura funcional.

## Puesta en marcha (local)
1. **Instalar deps**
   ```bash
   pnpm i # o npm/yarn
   ```
2. **Variables de entorno**
   - Copiá `.env.example` a `.env` y completá claves.
3. **Supabase**
   - Si usás Supabase en la nube: configurá `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
   - (Opcional local) `supabase db push && supabase db seed`
4. **Ejecutar app**
   ```bash
   npx expo start
   ```

## Scripts sugeridos (package.json)
```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "lint": "eslint . --ext .ts,.tsx",
    "db:push": "supabase db push",
    "db:seed": "supabase db reset && supabase db seed"
  }
}
```

## Seguridad
- **Nunca** commitees `.env` ni la **Service Role Key** de Supabase. La **Anon key** sí puede ir en el cliente.
- Revisa RLS antes de publicar.

## Roadmap breve
- [ ] Endpoint de slots + bloqueo en pago
- [ ] Stripe Connect (test)
- [ ] Webhook pago → marcar booking como `paid`
- [ ] Reseñas post-servicio
- [ ] Admin web mínimo (Next.js)

- [x] Autenticación con Supabase implementada ✅
- [x] Panel Profesional completado ✅