import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal, Switch } from 'react-native';
import { useHotel, HotelSettings, CleaningType } from '../contexts/HotelContext';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { Save, LogOut, Clock, User as UserIcon, Lock, Palette, ChevronRight, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import * as Haptics from 'expo-haptics';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';

// Schema
const profileSchema = z.object({
    firstName: z.string().min(2, "First name must be at least 2 chars"),
    lastName: z.string().min(2, "Last name must be at least 2 chars"),
    avatarUrl: z.string().url("Invalid URL").optional().or(z.literal(''))
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsScreen() {
    const { settings, updateSettings } = useHotel();
    const { user, logout, updateUser } = useAuth();
    const { showToast } = useToast();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    // -- State --
    // Password Modal
    const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const isSupervisor = user?.role === 'SUPERVISOR';

    // -- Forms --
    const { control, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: user?.name?.split(' ')[0] || '',
            lastName: user?.name?.split(' ')[1] || '',
            avatarUrl: ''
        }
    });

    // -- Handlers --

    const onSubmitProfile = async (data: ProfileFormData) => {
        try {
            if (user?.id) {
                await api.patch(`/users/${user.id}/`, {
                    first_name: data.firstName,
                    last_name: data.lastName,
                    avatar_url: data.avatarUrl
                });
                updateUser({ name: `${data.firstName} ${data.lastName}` });
                showToast('Profile updated!', 'SUCCESS');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Alert.alert("Error", "User ID missing. Try logging out and back in.");
            }
        } catch (error) {
            console.error(error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast("Failed to update profile", 'ERROR');
        }
    };

    const handleThemeChange = (color: 'BLUE' | 'ORANGE' | 'GREEN') => {
        updateSettings({ ...settings, themeColor: color });
        Haptics.selectionAsync();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Profile Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <UserIcon size={20} color={theme.colors.text} />
                        <Text style={styles.sectionTitle}>Profile</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>First Name</Text>
                        <Controller
                            control={control}
                            name="firstName"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    style={[styles.input, errors.firstName && { borderColor: theme.colors.error }]}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    placeholder="First Name"
                                />
                            )}
                        />
                        {errors.firstName && <Text style={{ color: theme.colors.error, fontSize: 12 }}>{errors.firstName.message}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Last Name</Text>
                        <Controller
                            control={control}
                            name="lastName"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    style={[styles.input, errors.lastName && { borderColor: theme.colors.error }]}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    placeholder="Last Name"
                                />
                            )}
                        />
                        {errors.lastName && <Text style={{ color: theme.colors.error, fontSize: 12 }}>{errors.lastName.message}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Avatar URL</Text>
                        <Controller
                            control={control}
                            name="avatarUrl"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    style={[styles.input, errors.avatarUrl && { borderColor: theme.colors.error }]}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    placeholder="https://example.com/avatar.png"
                                    autoCapitalize="none"
                                />
                            )}
                        />
                        {errors.avatarUrl && <Text style={{ color: theme.colors.error, fontSize: 12 }}>{errors.avatarUrl.message}</Text>}
                    </View>

                    <TouchableOpacity style={styles.saveButton} onPress={handleSubmit(onSubmitProfile)}>
                        <Save size={20} color="white" />
                        <Text style={styles.saveButtonText}>Save Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Cleaner Schedule */}
                {user?.role === 'CLEANER' && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Clock size={20} color={theme.colors.text} />
                            <Text style={styles.sectionTitle}>Work Schedule</Text>
                        </View>
                        <TouchableOpacity style={styles.rowButton} onPress={() => navigation.navigate('Availability')}>
                            <Text style={styles.rowButtonText}>My Weekly Availability</Text>
                            <ChevronRight size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.rowButton} onPress={() => navigation.navigate('Roster')}>
                            <Text style={styles.rowButtonText}>My Assigned Roster</Text>
                            <ChevronRight size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Preferences */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Palette size={20} color={theme.colors.text} />
                        <Text style={styles.sectionTitle}>Appearance</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.rowLabel}>Theme Color</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {['BLUE', 'ORANGE', 'GREEN'].map((c) => (
                                <TouchableOpacity
                                    key={c}
                                    style={[
                                        styles.colorCircle,
                                        { backgroundColor: c === 'BLUE' ? '#3182CE' : c === 'ORANGE' ? '#DD6B20' : '#38A169' },
                                        settings.themeColor === c && styles.colorCircleActive
                                    ]}
                                    onPress={() => handleThemeChange(c as any)}
                                />
                            ))}
                        </View>
                    </View>
                </View>

                {/* Security */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Lock size={20} color={theme.colors.text} />
                        <Text style={styles.sectionTitle}>Security</Text>
                    </View>
                    <TouchableOpacity style={styles.rowButton} onPress={() => setPasswordModalVisible(true)}>
                        <Text style={styles.rowButtonText}>Change Password</Text>
                        <ChevronRight size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Admin Configuration */}
                {isSupervisor && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Clock size={20} color={theme.colors.text} />
                            <Text style={styles.sectionTitle}>Time Estimates (Read Only)</Text>
                        </View>
                        <View style={styles.gridContainer}>
                            {Object.entries(settings.timeEstimates).map(([type, value]) => (
                                <View key={type} style={styles.gridItem}>
                                    <Text style={styles.label}>{type}</Text>
                                    <Text style={styles.readOnlyValue}>{value} mins</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}


                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <LogOut size={20} color={theme.colors.error} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Password Modal */}
            <Modal visible={isPasswordModalVisible} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                                <X size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="New Password"
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />

                        <TouchableOpacity style={[styles.saveButton, { marginTop: 20 }]} onPress={async () => {
                            if (newPassword !== confirmPassword) {
                                Alert.alert("Error", "Passwords do not match");
                                return;
                            }
                            if (newPassword.length < 6) {
                                Alert.alert("Error", "Password must be at least 6 characters");
                                return;
                            }

                            try {
                                if (user?.id) {
                                    await api.patch(`/users/${user.id}/`, { password: newPassword });
                                    setPasswordModalVisible(false);
                                    showToast("Password updated successfully", "SUCCESS");
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    setNewPassword('');
                                    setConfirmPassword('');
                                }
                            } catch (e) {
                                console.error(e);
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                                showToast("Failed to update password", "ERROR");
                            }
                        }}>
                            <Text style={styles.saveButtonText}>Update Password</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

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
        paddingBottom: 100
    },
    section: {
        backgroundColor: theme.colors.card,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.m,
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
    inputGroup: {
        marginBottom: 12
    },
    label: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 4,
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
        marginTop: 8
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
        marginTop: 20
    },
    logoutText: {
        color: theme.colors.error,
        fontWeight: '600',
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8
    },
    rowLabel: {
        fontSize: 16,
        color: theme.colors.text
    },
    colorCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent'
    },
    colorCircleActive: {
        borderColor: theme.colors.text,
        transform: [{ scale: 1.1 }]
    },
    rowButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    rowButtonText: {
        fontSize: 16,
        color: theme.colors.text
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        minHeight: 300
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    gridItem: {
        width: '47%',
    },
    readOnlyValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        paddingVertical: 8,
    }
});
