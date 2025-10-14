// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';

function AppTitle() {
  return (
    <Image
      source={require('../../assets/images/logo.png')}
      style={{ width: 170, height: 300, resizeMode: 'contain' }}
    />
  );
}

// 👉 Componente del fondo degradado del header
function HeaderGradient() {
  return (
    <LinearGradient
      colors={['#a38effff', '#f6f6f6ff']} // celeste claro → blanco
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerTitle: () => <AppTitle />,
        headerTitleAlign: 'center',
        // 👇 acá agregamos el degradado
        headerBackground: () => <HeaderGradient />,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: '#efdaffff',
          borderTopColor: '#afcafeff',
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarActiveTintColor: '#0EA5E9',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: { fontSize: 12 },
        headerRight: () => <View style={{ width: 24 }} />,
      }}
    >
      {/* TABS visibles */}
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explorar' }} />
      <Tabs.Screen name="bookings" options={{ title: 'Mis reservas' }} />

      {/* Rutas ocultas del TabBar */}
      <Tabs.Screen name="select-pro" options={{ href: null }} />
      <Tabs.Screen name="pago-test" options={{ href: null }} />
      <Tabs.Screen name="checkout/[bookingId]" options={{ href: null }} />
      <Tabs.Screen name="auth-login" options={{ href: null }} />
      <Tabs.Screen name="auth-register" options={{ href: null }} />
      <Tabs.Screen name="(pro)" options={{ href: null }} />
    </Tabs>
  );
}
