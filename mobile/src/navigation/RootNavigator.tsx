import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { CategoryScreen } from '../screens/CategoryScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { CartScreen } from '../screens/CartScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { OrderSuccessScreen } from '../screens/OrderSuccessScreen';
import { TrackScreen } from '../screens/TrackScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { AgentGateScreen } from '../screens/AgentGateScreen';
import { HomeIcon, TagIcon, CartIcon, UserIcon } from '../components/icons';
import { OrderAlerts } from '../components/OrderAlerts';
import { TAB_BAR_HEIGHT, TAB_BAR_INSET } from '../lib/tabBarSpace';
import { colors, fontWeights, shadows } from '../theme';
import type { HomeStackParamList, CartStackParamList, AccountStackParamList } from './types';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const CartStack = createNativeStackNavigator<CartStackParamList>();
const AccountStack = createNativeStackNavigator<AccountStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Category" component={CategoryScreen} />
      <HomeStack.Screen name="Shop" component={ShopScreen} />
      <HomeStack.Screen name="Search" component={SearchScreen} />
    </HomeStack.Navigator>
  );
}

function CartStackNavigator() {
  return (
    <CartStack.Navigator screenOptions={{ headerShown: false }}>
      <CartStack.Screen name="CartMain" component={CartScreen} />
      <CartStack.Screen name="Login" component={LoginScreen} />
      <CartStack.Screen name="Checkout" component={CheckoutScreen} />
      <CartStack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
      <CartStack.Screen name="Track" component={TrackScreen} />
    </CartStack.Navigator>
  );
}

function AccountStackNavigator() {
  return (
    <AccountStack.Navigator screenOptions={{ headerShown: false }}>
      <AccountStack.Screen name="AccountMain" component={LoginScreen} />
      <AccountStack.Screen name="AgentArea" component={AgentGateScreen} />
    </AccountStack.Navigator>
  );
}

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
            bottom: TAB_BAR_INSET,
            height: TAB_BAR_HEIGHT,
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
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              // Switching into this tab from elsewhere preserves whatever screen
              // was last open here — a category or shop page — because React
              // Navigation only resets to the root when the tab is already
              // focused. The home icon has to mean home, every time.
              e.preventDefault();
              navigation.navigate('Home', { screen: 'HomeMain' });
            },
          })}
        />
        <Tab.Screen
          name="Offers"
          component={EmptyScreen}
          options={{ tabBarIcon: ({ color }) => <TagIcon size={22} color={color} /> }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('Home', { screen: 'HomeMain', params: { scrollTo: 'featured' } });
            },
          })}
        />
        <Tab.Screen
          name="Cart"
          component={CartStackNavigator}
          options={{ tabBarIcon: ({ color }) => <CartIcon size={22} color={color} /> }}
          listeners={({ navigation }) => ({
            tabPress: () => {
              // A finished order stays on the stack, so tapping Cart would
              // reopen the last order's success or tracking screen instead of
              // the cart the customer just filled. Checkout is deliberately
              // left alone — someone returning mid-order should resume it.
              const cart = navigation
                .getState()
                .routes.find((route: { name: string }) => route.name === 'Cart') as
                | { state?: { index?: number; routes?: { name: string }[] } }
                | undefined;
              const stack = cart?.state;
              const current = stack?.routes?.[stack.index ?? 0]?.name;
              if (current === 'OrderSuccess' || current === 'Track') {
                navigation.navigate('Cart', { screen: 'CartMain' });
              }
            },
          })}
        />
        <Tab.Screen
          name="Account"
          component={AccountStackNavigator}
          options={{ tabBarIcon: ({ color }) => <UserIcon size={22} color={color} /> }}
        />
      </Tab.Navigator>
      <OrderAlerts />
    </NavigationContainer>
  );
}

function EmptyScreen() {
  return null;
}
