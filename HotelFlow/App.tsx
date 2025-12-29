import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { HotelProvider } from './src/contexts/HotelContext';
import { AppNavigator } from './src/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <HotelProvider>
          <AppNavigator />
        </HotelProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
