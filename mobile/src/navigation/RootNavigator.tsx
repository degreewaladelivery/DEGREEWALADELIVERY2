import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { HomeIcon, TagIcon, CartIcon, UserIcon } from '../components/icons';
import { colors, fontWeights, shadows } from '../theme';

const Tab = createBottomTabNavigator();

/** Home / Offers / Cart / Account — mirrors the web app's floating bottom nav. */
export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 10, fontWeight: fontWeights.semibold },
          tabBarStyle: {
            position: 'absolute',
            left: 14,
            right: 14,
            bottom: 14,
            height: 64,
            borderRadius: 999,
            borderTopWidth: 0,
            backgroundColor: '#fff',
            ...shadows.lg,
          },
          tabBarItemStyle: { paddingTop: 8 },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarIcon: ({ color }) => <HomeIcon size={22} color={color} /> }}
        />
        <Tab.Screen
          name="Offers"
          options={{ tabBarIcon: ({ color }) => <TagIcon size={22} color={color} /> }}
        >
          {() => <PlaceholderScreen title="Offers" emoji="🏷️" />}
        </Tab.Screen>
        <Tab.Screen
          name="Cart"
          options={{ tabBarIcon: ({ color }) => <CartIcon size={22} color={color} /> }}
        >
          {() => <PlaceholderScreen title="Your Cart" emoji="🛒" />}
        </Tab.Screen>
        <Tab.Screen
          name="Account"
          options={{ tabBarIcon: ({ color }) => <UserIcon size={22} color={color} /> }}
        >
          {() => <PlaceholderScreen title="Account" emoji="👤" />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
