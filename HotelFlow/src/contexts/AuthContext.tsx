import React, { createContext, useState, useContext, useEffect } from 'react';
import api, { setAuthToken } from '../services/api';
import { Alert } from 'react-native';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'SUPERVISOR' | 'CLEANER' | 'MAINTENANCE' | 'RECEPTION' | 'HOUSEMAN' | 'ADMIN' | null;

interface User {
    id: number;
    username: string;
    role: UserRole;
    name: string;
    groupId?: string; // Team Group (e.g., "Group 1", "Group 2")
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password?: string) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
    updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Start loading

    useEffect(() => {
        loadStorageData();
    }, []);

    const loadStorageData = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const userData = await AsyncStorage.getItem('auth_user');

            if (token && userData) {
                setAuthToken(token);
                setUser(JSON.parse(userData));
            }
        } catch (e) {
            console.error("Failed to load auth data", e);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (username: string, password?: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const pass = password || username;
            const response = await api.post('/login/', { username, password: pass });
            const { token, role, groupId, name } = response.data;

            setAuthToken(token);

            const loggedInUser: User = {
                id: response.data.user_id, // Mapped from backend 'user_id'
                username,
                role: role as UserRole,
                name: name,
                groupId: groupId
            };

            // Register for Push Notifications
            registerForPushNotificationsAsync().then(token => {
                if (token) {
                    api.patch(`/users/${response.data.user_id}/`, { expo_push_token: token }).catch(console.error);
                }
            });

            setUser(loggedInUser);
            await AsyncStorage.setItem('auth_token', token);
            await AsyncStorage.setItem('auth_user', JSON.stringify(loggedInUser));

            return true;
        } catch (error) {
            console.error(error);
            Alert.alert("Login Failed", "Invalid username or password.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setAuthToken(null);
        setUser(null);
        try {
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('auth_user');
        } catch (e) {
            console.error(e);
        }
    };

    const updateUser = async (data: Partial<User>) => {
        setUser(prev => {
            const newUser = prev ? { ...prev, ...data } : null;
            if (newUser) {
                AsyncStorage.setItem('auth_user', JSON.stringify(newUser)).catch(console.error);
            }
            return newUser;
        });
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
