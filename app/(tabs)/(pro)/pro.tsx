// app/(tabs)/(pro)/pro.tsx
import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

function Card({ href, title, subtitle }: { href: Href; title: string; subtitle: string }) {
  return (
    <Link href={href} asChild>
      <TouchableOpacity
        style={{
          padding: 16,
          borderRadius: 16,
          backgroundColor: '#fff', // <-- corregido (antes tenía "...ackgroundColor")
          marginBottom: 12,
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: '#666', marginTop: 4 }}>{subtitle}</Text>
      </TouchableOpacity>
    </Link>
  );
}

export default function ProHome() {
  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 16 }}>Panel Profesional</Text>

      {/* Perfil / zonas / disponibilidad / servicios */}
      <Card
        href="/(tabs)/(pro)/pro-profile"
        title="Mi Perfil"
        subtitle="Bio, foto y certificaciones"
      />
      <Card
        href="/(tabs)/(pro)/pro-availability"
        title="Disponibilidad"
        subtitle="Horarios y agenda"
      />
      <Card
        href="/(tabs)/(pro)/pro-services"
        title="Mis Servicios"
        subtitle="Gestioná tus servicios"
      />
      <Card
        href="/(tabs)/(pro)/pro-service-new"
        title="Nuevo Servicio"
        subtitle="Crear servicio"
      />
      <Card
        href="/(tabs)/(pro)/pro-bookings"
        title="Reservas"
        subtitle="Turnos y estado"
      />

      {/* NUEVO: Finanzas (Stripe Connect) */}
      <Card
        href="/(tabs)/(pro)/pro-finanzas"
        title="Finanzas"
        subtitle="Conectá Stripe y cobrá tus servicios"
      />
    </View>
  );
}
