import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyRound, Lock, User } from 'lucide-react-native';

const LoginScreen = () => {
    const [username, setUsername] = useState('Ramiro');
    const [password, setPassword] = useState('password123');
    const { login, isLoading } = useAuth();

    const handleLogin = async () => {
        if (username.trim() && password.trim()) {
            await login(username, password);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                        <View style={styles.logoContainer}>
                            <View style={styles.iconCircle}>
                                <KeyRound color="white" size={32} />
                            </View>
                            <Text style={styles.title}>HotelFlow</Text>
                            <Text style={styles.subtitle}>Premium Housekeeping Management</Text>
                        </View>

                        <View style={styles.formContainer}>
                            <Text style={styles.label}>Sign in to your account</Text>

                            <View style={styles.inputWrapper}>
                                <User color={theme.colors.textSecondary} size={20} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Username"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>

                            <View style={styles.inputWrapper}>
                                <Lock color={theme.colors.textSecondary} size={20} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.button, (!username.trim() || isLoading) && styles.buttonDisabled]}
                                onPress={handleLogin}
                                disabled={!username.trim() || isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.buttonText}>Continue</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.hintContainer}>
                                <Text style={styles.hintText}>Enter credentials from Django Admin</Text>
                            </View>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: theme.spacing.l,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl * 2,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        ...theme.shadows.float,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    formContainer: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        ...theme.shadows.card,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: theme.spacing.m,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.l,
        backgroundColor: theme.colors.background,
    },
    inputIcon: {
        marginLeft: theme.spacing.m,
    },
    input: {
        flex: 1,
        padding: theme.spacing.m,
        fontSize: 16,
        color: theme.colors.text,
        height: 50, // Explicit height
    },
    button: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        ...theme.shadows.float,
    },
    buttonDisabled: {
        backgroundColor: theme.colors.textSecondary,
        opacity: 0.7,
        elevation: 0,
        shadowOpacity: 0,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    hintContainer: {
        marginTop: theme.spacing.m,
        alignItems: 'center',
    },
    hintText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
    }
});

export default LoginScreen;
