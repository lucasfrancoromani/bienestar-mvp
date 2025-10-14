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
          backgroundColor: '#fff',
          marginBottom: 12,
          shadowOpacity: 0.1,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }}
        activeOpacity={0.85}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A' }}>{title}</Text>
        <Text style={{ marginTop: 4, color: '#64748B' }}>{subtitle}</Text>
      </TouchableOpacity>
    </Link>
  );
}

export default function ProHome() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F6F7F9', padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#0F172A' }}>
        Panel Profesional
      </Text>

      <Card href="/(tabs)/(pro)/pro-profile"       title="Mi Perfil"       subtitle="Bio, foto y certificaciones" />
      <Card href="/(tabs)/(pro)/pro-availability"  title="Disponibilidad"  subtitle="Horarios y agenda" />
      <Card href="/(tabs)/(pro)/pro-services"      title="Mis Servicios"   subtitle="Gestioná tus servicios" />
      <Card href="/(tabs)/(pro)/pro-service-new"   title="Nuevo Servicio"  subtitle="Crear servicio" />
      <Card href="/(tabs)/(pro)/pro-bookings"      title="Reservas"        subtitle="Turnos y estado" />
      <Card href="/(tabs)/(pro)/pro-finanzas"      title="Finanzas"        subtitle="Conectá Stripe y cobrá" />
    </View>
  );
}
