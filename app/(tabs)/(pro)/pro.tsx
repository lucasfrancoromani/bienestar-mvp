// app/(tabs)/(pro)/pro.tsx
import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

function Card({ href, title, subtitle }: { href: Href; title: string; subtitle: string }) {
  return (
    <Link href={href} asChild>
      <TouchableOpacity style={{ padding: 16, borderRadius: 16, backgroundColor: '#fff', marginBottom: 12, shadowOpacity: 0.1 }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: '#666', marginTop: 4 }}>{subtitle}</Text>
      </TouchableOpacity>
    </Link>
  );
}

export default function ProHome() {
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 16 }}>Panel Profesional</Text>
      <Card href="/(tabs)/(pro)/pro-profile"      title="Mi Perfil"        subtitle="Bio, foto y certificaciones" />
      <Card href="/(tabs)/(pro)/pro-coverage"     title="Zonas"            subtitle="Radio y código postal base" />
      <Card href="/(tabs)/(pro)/pro-services"     title="Servicios"        subtitle="Crear/editar precios y duración" />
      {/* 👇 NUEVA */}
      <Card href="/(tabs)/(pro)/pro-availability" title="Disponibilidad"   subtitle="Reglas semanales y excepciones" />
      <Card href="/(tabs)/(pro)/pro-bookings" title="Reservas" subtitle="Pendientes para aceptar/rechazar" />
    </View>
  );
}
