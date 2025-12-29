import React, { createContext, useState, useContext } from 'react';
import api, { setAuthToken } from '../services/api';
import { Alert } from 'react-native';

export type UserRole = 'SUPERVISOR' | 'CLEANER' | 'MAINTENANCE' | 'RECEPTION' | 'HOUSEMAN' | 'ADMIN' | null;

interface User {
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const login = async (username: string, password?: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            // Use provided password, or fallback to username (legacy/dev convenience, though we should really enforce it)
            // For now, if no password provided (legacy calls), we use username as password 
            // (assuming user like 'admin'/'admin' or 'cleaner'/'cleaner').
            const pass = password || username;

            const response = await api.post('/login/', { username, password: pass });
            const { token, role, groupId, name } = response.data;

            setAuthToken(token);

            const loggedInUser: User = {
                username,
                role: role as UserRole,
                name: name,
                groupId: groupId
            };

            setUser(loggedInUser);
            return true;
        } catch (error) {
            console.error(error);
            Alert.alert("Login Failed", "Invalid username or password.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setAuthToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
