import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { X, CheckCircle, Camera, XCircle } from 'lucide-react-native';
import { theme } from '../../../../utils/theme';
import { IncidentRole } from '../../../../contexts/HotelContext';

interface FastAlertModalProps {
    visible: boolean;
    type: 'BROKEN' | 'MISSING' | 'GENERAL';
    targetRole?: IncidentRole;
    text: string;
    photoUri: string | null;
    onClose: () => void;
    onChangeText: (text: string) => void;
    onSetPhoto: (uri: string | null) => void;
    onSetTargetRole: (role: IncidentRole) => void;
    onSubmit: () => void;
    onPickImage: () => void;
}

export const FastAlertModal = ({
    visible, type, targetRole, text, photoUri,
    onClose, onChangeText, onSetPhoto, onSetTargetRole, onSubmit, onPickImage
}: FastAlertModalProps) => {

    const BROKEN_PRESETS = ['Lamp', 'TV', 'AC', 'Toilet', 'Tap', 'Window'];
    const MISSING_PRESETS = ['Towels', 'Soap', 'Water', 'Remote', 'Pillows'];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <View style={styles.overlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.header}>
                            <Text style={styles.title}>
                                {type === 'BROKEN' ? 'Report Broken Item' :
                                    type === 'MISSING' ? 'Report Missing Item' : 'New Report'}
                            </Text>
                            <TouchableOpacity onPress={onClose}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Presets Grid */}
                        <View style={styles.presetsGrid}>
                            {(type === 'BROKEN' ? BROKEN_PRESETS : type === 'MISSING' ? MISSING_PRESETS : []).map(preset => (
                                <TouchableOpacity
                                    key={preset}
                                    style={styles.presetChip}
                                    onPress={() => onChangeText(preset)}
                                >
                                    <Text style={styles.presetText}>{preset}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Role Selector */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={styles.label}>Assign To:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {(['MAINTENANCE', 'HOUSEMAN', 'RECEPTION', 'SUPERVISOR'] as const).map(role => {
                                    const roleLabel = role === 'HOUSEMAN' ? 'HOUSEKEEPING' : role;

                                    // Complex active logic simulated from original
                                    const isActive = targetRole === role || (!targetRole && (
                                        (type === 'BROKEN' && role === 'MAINTENANCE') ||
                                        (type === 'MISSING' && role === 'HOUSEMAN') ||
                                        (type === 'GENERAL' && role === 'MAINTENANCE')
                                    ));

                                    return (
                                        <TouchableOpacity
                                            key={role}
                                            style={[styles.roleChip, isActive && styles.roleChipActive]}
                                            onPress={() => onSetTargetRole(role)}
                                        >
                                            <Text style={[styles.roleChipText, isActive && styles.roleChipTextActive]}>
                                                {roleLabel}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Input Area */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                placeholder={type === 'BROKEN' ? "Describe damage..." : "What's missing?"}
                                value={text}
                                onChangeText={onChangeText}
                                multiline
                                style={styles.input}
                            />
                            {/* Smart Translation Badge */}
                            {text.length > 3 && (
                                <View style={styles.translationBadge}>
                                    <CheckCircle size={14} color={theme.colors.success} style={{ marginRight: 4 }} />
                                    <Text style={styles.translationText}>Auto-Translate Active</Text>
                                </View>
                            )}
                        </View>

                        {/* Photo Preview / Add Button */}
                        <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                            {photoUri ? (
                                <View style={{ position: 'relative' }}>
                                    <Image source={{ uri: photoUri }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                                    <TouchableOpacity
                                        style={styles.removePhotoBtn}
                                        onPress={() => onSetPhoto(null)}
                                    >
                                        <XCircle size={20} color="red" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.addPhotoBtn}
                                    onPress={onPickImage}
                                >
                                    <Camera size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#6B7280' }}>Add Photo Evidence</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={styles.submitBtn}
                            onPress={onSubmit}
                        >
                            <Text style={styles.submitBtnText}>Send Report</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 400
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    presetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20
    },
    presetChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    presetText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151'
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 8,
        textTransform: 'uppercase'
    },
    roleChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    roleChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary
    },
    roleChipText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#374151'
    },
    roleChipTextActive: {
        color: 'white'
    },
    inputContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    input: {
        minHeight: 60,
        fontSize: 16,
        textAlignVertical: 'top'
    },
    translationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-end',
        marginTop: 8
    },
    translationText: {
        fontSize: 12,
        color: theme.colors.success,
        fontStyle: 'italic'
    },
    removePhotoBtn: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: 'white',
        borderRadius: 12
    },
    addPhotoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#9CA3AF',
        borderRadius: 8,
        flex: 1,
        justifyContent: 'center'
    },
    submitBtn: {
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center'
    },
    submitBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold'
    }
});
