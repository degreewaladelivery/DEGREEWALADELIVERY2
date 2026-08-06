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
import { HomeIcon, TagIcon, CartIcon, UserIcon } from '../components/icons';
import { colors, fontWeights, shadows } from '../theme';
import type { HomeStackParamList, CartStackParamList } from './types';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const CartStack = createNativeStackNavigator<CartStackParamList>();

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
        />
        <Tab.Screen
          name="Account"
          component={LoginScreen}
          options={{ tabBarIcon: ({ color }) => <UserIcon size={22} color={color} /> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function EmptyScreen() {
  return null;
}
