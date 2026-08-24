/**
 * @format
 */
import { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { getCustomer } from './src/lib/auth';
import { registerCustomerForPush } from './src/lib/customerPush';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  // Sign-in registers the device, but someone already signed in when this
  // version arrives never signs in again — and FCM tokens rotate on reinstall
  // and on restore to a new phone. Re-registering each launch keeps them
  // reachable; the upsert makes it a no-op when nothing has changed.
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;

    getCustomer()
      .then((customer) => {
        if (!customer || cancelled) return;
        return registerCustomerForPush(customer.token).then((unsubscribe) => {
          if (cancelled) unsubscribe();
          else stop = unsubscribe;
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

export default App;
