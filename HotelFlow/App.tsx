import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { HotelProvider } from './src/contexts/HotelContext';
import { AppNavigator } from './src/AppNavigator';

import { ToastProvider } from './src/contexts/ToastContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ToastProvider>
          <HotelProvider>
            <AppNavigator />
          </HotelProvider>
        </ToastProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
