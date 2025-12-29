import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useHotel, HotelSettings, CleaningType } from '../contexts/HotelContext';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { Save, LogOut, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const { settings, updateSettings } = useHotel();
    const { user, logout } = useAuth();

    // Local state for inputs
    const [localEstimates, setLocalEstimates] = useState<Record<CleaningType, string>>(() => {
        const initial: any = {};
        Object.entries(settings.timeEstimates).forEach(([key, value]) => {
            initial[key] = value.toString();
        });
        return initial;
    });

    const isSupervisor = user?.role === 'SUPERVISOR';

    const handleSave = () => {
        const newEstimates: any = {};
        let hasError = false;

        Object.entries(localEstimates).forEach(([key, value]) => {
            const num = parseInt(value);
            if (isNaN(num)) hasError = true;
            newEstimates[key] = num;
        });

        if (hasError) {
            Alert.alert('Error', 'Please enter valid numbers for all fields');
            return;
        }

        updateSettings({
            ...settings,
            timeEstimates: newEstimates
        });
        Alert.alert('Success', 'Settings saved');
    };

    const handleInputChange = (type: string, text: string) => {
        setLocalEstimates(prev => ({ ...prev, [type]: text }));
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* User Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user?.username.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                        <Text style={styles.userName}>{user?.name}</Text>
                        <Text style={styles.userRole}>{user?.role}</Text>
                    </View>
                </View>

                {/* Configuration Section (Admin Managed) */}
                {isSupervisor && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Clock size={20} color={theme.colors.text} />
                            <Text style={styles.sectionTitle}>Time Estimates (Admin Managed)</Text>
                        </View>

                        <View style={styles.gridContainer}>
                            {Object.entries(settings.timeEstimates).map(([type, value]) => (
                                <View key={type} style={styles.gridItem}>
                                    <Text style={styles.label}>{type}</Text>
                                    <Text style={styles.readOnlyValue}>{value} mins</Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>Contact Administrator to update cleaning times.</Text>
                        </View>
                    </View>
                )}

                {!isSupervisor && (
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>Only Supervisors can view configuration settings.</Text>
                    </View>
                )}

                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <LogOut size={20} color={theme.colors.error} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: theme.spacing.m,
        backgroundColor: theme.colors.card,
        ...theme.shadows.card,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
    },
    content: {
        padding: theme.spacing.m,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.l,
        ...theme.shadows.card,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
    },
    avatarText: {
        color: 'white',
        fontSize: 20,
        fontWeight: '700',
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    userRole: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    section: {
        backgroundColor: theme.colors.card,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.l,
        ...theme.shadows.card,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    gridItem: {
        width: '47%', // roughly 2 columns
    },
    label: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.s,
        padding: 12,
        fontSize: 16,
        color: theme.colors.text,
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 14,
        borderRadius: theme.borderRadius.s,
        gap: 8,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.error,
        gap: 8,
    },
    logoutText: {
        color: theme.colors.error,
        fontWeight: '600',
        fontSize: 16,
    },
    infoBox: {
        padding: theme.spacing.m,
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.l,
        alignItems: 'center',
    },
    infoText: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    readOnlyValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        paddingVertical: 8,
    }
});
