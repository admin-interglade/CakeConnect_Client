import 'react-native-gesture-handler';
import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import RootNavigator from './src/navigation/RootNavigator';
import { ToastProvider } from './src/components';
import { paperTheme } from './src/theme';
import { persistor, store } from './src/store/store';
import { connectHttpClientToStore } from './src/store/authBridge';

// The axios instance reads the JWT from the store and drops the session on a
// 401; wiring it here keeps `services/` free of store imports.
connectHttpClientToStore();

/**
 * Server state lives in TanStack Query (context.md §5); Redux keeps auth, the
 * cart and persisted UI state. `refetchOnReconnect` is what makes a dropped
 * connection self-heal once the device is back online.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <PaperProvider theme={paperTheme}>
              <ToastProvider>
                <RootNavigator />
              </ToastProvider>
            </PaperProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  );
}
