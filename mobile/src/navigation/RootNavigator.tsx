import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { CategoryScreen } from '../screens/CategoryScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { CartScreen } from '../screens/CartScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { HomeIcon, TagIcon, CartIcon, UserIcon } from '../components/icons';
import { colors, fontWeights, shadows } from '../theme';
import type { HomeStackParamList } from './types';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

/** Home tab is itself a stack: Home feed → Category → Shop. */
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Category" component={CategoryScreen} />
      <HomeStack.Screen name="Shop" component={ShopScreen} />
    </HomeStack.Navigator>
  );
}

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
          component={HomeStackNavigator}
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
          component={CartScreen}
          options={{ tabBarIcon: ({ color }) => <CartIcon size={22} color={color} /> }}
        />
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
