import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      {/* Tabs visibles */}
      <Tabs.Screen name="index"    options={{ title: 'Inicio' }} />
      <Tabs.Screen name="explore"  options={{ title: 'Explorar' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Mis reservas' }} />

      {/* Ocultos (no aparecen en la tab bar) */}
      <Tabs.Screen name="(pro)"           options={{ href: null }} />
      <Tabs.Screen name="auth-login"     options={{ title: 'Iniciar sesión', href: null }} />
      <Tabs.Screen name="auth-register"  options={{ title: 'Crear cuenta',   href: null }} />
    </Tabs>
  );
}
