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

  // Sign-in is where permission is asked. This only refreshes the token, and
  // never prompts: someone already signed in when this version arrives would
  // otherwise never register, and FCM tokens rotate on reinstall and on restore
  // to a new phone, failing silently when stale. If notifications were refused,
  // this does nothing rather than asking again tomorrow.
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
