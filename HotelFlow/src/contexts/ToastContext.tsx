import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../utils/theme';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react-native';

type ToastType = 'SUCCESS' | 'ERROR' | 'INFO';

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const showToast = (message: string, type: ToastType = 'INFO') => {
        setToast({ message, type });

        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.delay(3000),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => setToast(null));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <View style={styles.container} pointerEvents="none">
                    <Animated.View style={[styles.toast, { opacity: fadeAnim, backgroundColor: getBackgroundColor(toast.type) }]}>
                        {getIcon(toast.type)}
                        <Text style={styles.text}>{toast.message}</Text>
                    </Animated.View>
                </View>
            )}
        </ToastContext.Provider>
    );
};

const getBackgroundColor = (type: ToastType) => {
    switch (type) {
        case 'SUCCESS': return theme.colors.success;
        case 'ERROR': return theme.colors.error;
        case 'INFO': return '#3182CE';
        default: return '#333';
    }
};

const getIcon = (type: ToastType) => {
    switch (type) {
        case 'SUCCESS': return <CheckCircle color="white" size={20} />;
        case 'ERROR': return <AlertTriangle color="white" size={20} />;
        case 'INFO': return <Info color="white" size={20} />;
    }
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        maxWidth: '90%',
    },
    text: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
