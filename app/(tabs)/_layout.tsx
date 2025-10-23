// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ajustá la ruta si tu theme está en otro lado
import { colors, radii, shadow } from '../../lib/theme';

function AppTitle() {
  return (
    <Image
      source={require('../../assets/images/logo.png')}
      style={{ width: 200, height: 150, resizeMode: 'contain' }}
    />
  );
}

function HeaderGradient() {
  return (
    <LinearGradient
      colors={['#c194ffff', '#fbf6ffff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    />
  );
}

function ActivePill() {
  return <View style={styles.activePill} />;
}

function TabIcon({
  name,
  focused,
  label,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
  label: string;
}) {
  const tint = focused ? colors.primary : colors.textMuted;
  return (
    <View style={styles.tabIconWrap}>
      <Ionicons name={name} size={24} color={tint} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused, { color: tint }]}>
        {label}
      </Text>
    </View>
  );
}

/** === Constantes centralizadas para TabBar flotante === */
const BAR_HEIGHT = 64;              // alto del “pill” donde están los íconos
const BG_PADDING = 12;              // padding alrededor del pill dentro del fondo redondeado
const BG_HEIGHT = BAR_HEIGHT + BG_PADDING * 2; // alto real del bloque de TabBar (≈88)
const OUTER_MARGIN_BOTTOM = 5;     // separación desde el borde inferior de la pantalla
const INSETS_TWEAK = -6;            // el offset que ya usabas: Math.max(insets.bottom - 6, 0)
// ↑ Si tu dock es más alto en algunos dispositivos, sólo subí BAR_HEIGHT o BG_PADDING.

/** TabBar personalizada: SOLO muestra index, explore, bookings */
function MyTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  const VISIBLE = ['index', 'explore', 'bookings']; // ← únicos tabs visibles
  const routes = state.routes.filter((r: any) => VISIBLE.includes(r.name));

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.tabAbsoluteWrap,
        {
          bottom: OUTER_MARGIN_BOTTOM + Math.max(insets.bottom + INSETS_TWEAK, 0),
          left: 16,
          right: 16,
          height: BG_HEIGHT,
        },
      ]}
    >
      <View style={[styles.tabBackground, shadow.card]} />
      <View style={[styles.tabRow, { height: BAR_HEIGHT }]}>
        {routes.map((route: any) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === state.routes.indexOf(route);
          const label = options.tabBarLabel ?? options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          const icon =
            options.tabBarIcon &&
            options.tabBarIcon({ focused: isFocused, color: '', size: 24 });

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
              activeOpacity={0.8}
            >
              {isFocused && <ActivePill />}
              <View style={styles.tabContentCenter}>
                {icon || (
                  <TabIcon
                    name={
                      route.name === 'bookings'
                        ? 'calendar-outline'
                        : route.name === 'explore'
                        ? 'search-outline'
                        : 'home-outline'
                    }
                    focused={isFocused}
                    label={String(label)}
                  />
                )}
                {icon && (
                  <View style={styles.tabIconWrap}>
                    <Text
                      style={[
                        styles.tabLabel,
                        isFocused && styles.tabLabelFocused,
                        { color: isFocused ? colors.primary : colors.textMuted },
                      ]}
                    >
                      {String(label)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  /** 
   * Reserva real de espacio para que NINGUNA pantalla quede por detrás del TabBar.
   * Calculamos la misma altura visible que ocupa el dock (BG_HEIGHT) + su separación inferior.
   */
  const RESERVE =
    BG_HEIGHT + OUTER_MARGIN_BOTTOM + Math.max(insets.bottom + INSETS_TWEAK, 0);

  const RESERVE_EXTRA = 8; // ← si aún tapa algo, subí este valor (p. ej. 16)

  return (
    <Tabs
      tabBar={(props) => <MyTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerTitle: () => <AppTitle />,
        headerTitleAlign: 'center',
        headerBackground: () => <HeaderGradient />,
        headerShadowVisible: false,
        tabBarShowLabel: false, // manejamos el label nosotros
        tabBarHideOnKeyboard: true,
        // 👇 Esta línea evita que el contenido de *todas* las pantallas se meta debajo del dock
        sceneContainerStyle: { paddingBottom: RESERVE + RESERVE_EXTRA },
      }}
    >
      {/* === TABS visibles === */}
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home-outline" focused={focused} label="Inicio" />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="search-outline" focused={focused} label="Explorar" />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="calendar-outline" focused={focused} label="Mis reservas" />
          ),
        }}
      />

      {/* === Rutas que NO deben aparecer en la barra (ocultas) === */}
      <Tabs.Screen name="select-pro" options={{ href: null }} />
      <Tabs.Screen name="pago-test" options={{ href: null }} />
      <Tabs.Screen name="checkout/[bookingId]" options={{ href: null }} />
      <Tabs.Screen name="auth-login" options={{ href: null }} />
      <Tabs.Screen name="auth-register" options={{ href: null }} />
      <Tabs.Screen name="(pro)" options={{ href: null }} />
      <Tabs.Screen name="pro-detail" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabAbsoluteWrap: { position: 'absolute' },
  tabBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    backgroundColor: colors.tabBar,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabRow: {
    flex: 1,
    marginHorizontal: 6,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  tabContentCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 6,
    right: 6,
    borderRadius: 999,
    backgroundColor: '#6d0ee917',
  },
  tabIconWrap: { alignItems: 'center', justifyContent: 'center' },
  tabLabel: { marginTop: 2, fontSize: 11, fontWeight: '900' },
  tabLabelFocused: { fontWeight: '700' },
});
