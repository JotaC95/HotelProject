import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from './contexts/AuthContext';
import { Activity, BedDouble, Settings, LogOut } from 'lucide-react-native';
import { theme } from './utils/theme';
import { TouchableOpacity, View } from 'react-native';

// Placeholder Screens (We will implement them properly later)
import LoginScreen from './screens/LoginScreen';
import RoomListScreen from './screens/RoomListScreen';
import RoomDetailScreen from './screens/RoomDetailScreen';
import TimelineScreen from './screens/TimelineScreen';
import MaintenanceScreen from './screens/MaintenanceScreen'; // Phase 19
import ReceptionScreen from './screens/ReceptionScreen'; // Phase 19
import HousemanScreen from './screens/HousemanScreen'; // Phase 27
import SupervisorScreen from './screens/SupervisorScreen'; // Phase 2
import AdminScreen from './screens/AdminScreen'; // Phase 27
import LostFoundScreen from './screens/LostFoundScreen'; // New Import
import { AnalyticsScreen } from './screens/AnalyticsScreen';

// Stack Types
export type RootStackParamList = {
    Login: undefined;
    Main: undefined;
    Maintenance: undefined;
    Reception: undefined;
    Houseman: undefined;
    Supervisor: undefined;
    Admin: undefined;
    RoomDetail: { roomId: string };
    LostFound: undefined;
    Analytics: undefined;
};

export type MainTabParamList = {
    RoomsTab: undefined;
    TimelineTab: undefined;
    SettingsTab: undefined;
};

export type RoomStackParamList = {
    RoomList: undefined;
    RoomDetail: { roomId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const RoomStack = createNativeStackNavigator<RoomStackParamList>();

// Room Stack (List -> Detail)
function RoomNavigator() {
    return (
        <RoomStack.Navigator screenOptions={{
            headerStyle: { backgroundColor: theme.colors.background },
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: 'bold', fontSize: 20 },
        }}>
            <RoomStack.Screen name="RoomList" component={RoomListScreen} options={{ title: 'Rooms' }} />
            <RoomStack.Screen name="RoomDetail" component={RoomDetailScreen} options={{ title: 'Room Details' }} />
        </RoomStack.Navigator>
    );
}

import SettingsScreen from './screens/SettingsScreen';

function MainNavigator() {
    const { user } = useAuth();
    // const isSupervisor = user?.role === 'SUPERVISOR'; // If needed for conditional tabs

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.card,
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    height: 85,
                    paddingTop: 10,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginBottom: 10,
                }
            }}
        >
            <Tab.Screen
                name="RoomsTab"
                component={RoomNavigator}
                options={{
                    tabBarLabel: 'Rooms',
                    tabBarIcon: ({ color, size }) => <BedDouble color={color} size={size} strokeWidth={2} />,
                }}
            />
            <Tab.Screen
                name="TimelineTab"
                component={TimelineScreen}
                options={{
                    tabBarLabel: 'Activity',
                    tabBarIcon: ({ color, size }) => <Activity color={color} size={size} strokeWidth={2} />,
                }}
            />
            <Tab.Screen
                name="SettingsTab"
                component={SettingsScreen}
                options={{
                    tabBarLabel: 'Settings',
                    tabBarIcon: ({ color, size }) => <Settings color={color} size={size} strokeWidth={2} />,
                }}
            />
        </Tab.Navigator>
    );
}



export const AppNavigator = () => {
    const { user, isLoading } = useAuth();

    useEffect(() => {
        const subscription = Notifications.addNotificationReceivedListener(notification => {
            console.log("Notification Received:", notification);
        });
        return () => subscription.remove();
    }, []);

    if (isLoading) {
        // Return Loading Splash ideally
        return null; // The User Experience plan includes replacing this later if needed, but for now skeleton is inside RoomList
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    // Role-Based Routing
                    <>
                        {user.role === 'MAINTENANCE' ? (
                            <Stack.Screen name="Maintenance" component={MaintenanceScreen} />
                        ) : user.role === 'RECEPTION' ? (
                            <Stack.Screen name="Reception" component={ReceptionScreen} />
                        ) : user.role === 'HOUSEMAN' ? (
                            <Stack.Screen name="Houseman" component={HousemanScreen} />
                        ) : user.role === 'SUPERVISOR' ? (
                            <Stack.Screen name="Supervisor" component={SupervisorScreen} />
                        ) : user.role === 'ADMIN' ? (
                            <Stack.Screen name="Admin" component={AdminScreen} />
                        ) : (
                            <Stack.Screen name="Main" component={MainNavigator} />
                        )}
                        <Stack.Screen name="RoomDetail" component={RoomDetailScreen} options={{ headerShown: true, title: 'Room Details' }} />
                        {/* Enhanced Features */}
                        <Stack.Screen name="LostFound" component={LostFoundScreen} options={{ presentation: 'modal' }} />
                        <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: true, title: 'Analytics Dashboard' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
