import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { UserCheck, Package, Clock, AlertTriangle, Moon, Bed, DoorOpen, CheckCircle, Camera, Wrench, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../../../../utils/theme';
import { Room, INCIDENT_PRESETS, IncidentRole } from '../../../../contexts/HotelContext';
import { Stopwatch } from '../shared/Stopwatch';
import { FastAlertModal } from '../modules/FastAlertModal';

interface ZenModePanelProps {
    room: Room;
    user: any;
    notes: string;
    setNotes: (text: string) => void;
    onSaveNotes: () => void;
    onGuestAction: (type: 'LEFT' | 'IN') => void;
    onAddIncident: (text: string, role?: IncidentRole, category?: string) => void;
    onAction: () => void; // Finish Room
    onStartScan: () => void; // NFC
    isNfcSupported: boolean;
    // Fast Alert Props
    alertConfig: { visible: boolean, type: 'BROKEN' | 'MISSING' | 'GENERAL', targetRole?: IncidentRole };
    setAlertConfig: (config: any) => void;
    alertText: string;
    setAlertText: (text: string) => void;
    alertPhoto: string | null;
    setAlertPhoto: (uri: string | null) => void;
    submitFastAlert: () => void;
    pickImage: () => void;
}

export const ZenModePanel = ({
    room, user, notes, setNotes, onSaveNotes, onGuestAction, onAddIncident, onAction,
    onStartScan, isNfcSupported,
    alertConfig, setAlertConfig, alertText, setAlertText, alertPhoto, setAlertPhoto, submitFastAlert, pickImage
}: ZenModePanelProps) => {

    const [localSupplies, setLocalSupplies] = useState(room.supplies_used || {});

    // Note: Supply syncing logic is kept in the parent hook or useEffect for now, but UI state is here.
    // Ideally parent handles the sync trigger.

    return (
        <View style={styles.zenContainer}>
            {/* Guest & Supply Actions */}
            <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, flexDirection: 'row', gap: 10 }}>
                {room.guestStatus === 'GUEST_IN_ROOM' ? (
                    <TouchableOpacity style={[styles.zenFastBtn, { backgroundColor: '#E0F2FE', flex: 1, borderColor: '#7DD3FC' }]} onPress={() => onGuestAction('LEFT')}>
                        <UserCheck size={20} color="#0284C7" />
                        <Text style={[styles.zenFastBtnText, { color: '#0284C7' }]}>Guest Left?</Text>
                    </TouchableOpacity>
                ) : room.guestStatus !== 'DND' && (
                    <TouchableOpacity style={[styles.zenFastBtn, { backgroundColor: '#FEF9C3', flex: 1, borderColor: '#FDE047' }]} onPress={() => onGuestAction('IN')}>
                        <UserCheck size={20} color="#CA8A04" />
                        <Text style={[styles.zenFastBtnText, { color: '#CA8A04' }]}>Guest Is In</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.zenFastBtn, { backgroundColor: '#F3E8FF', flex: 1, borderColor: '#D8B4FE' }]}
                    onPress={() => {
                        Alert.alert("Request Linen", "Notify Houseman?", [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Request", onPress: () => {
                                    onAddIncident('Linen Kits Missing', 'HOUSEMAN', 'SUPPLY');
                                }
                            }
                        ]);
                    }}
                >
                    <Package size={20} color="#9333EA" />
                    <Text style={[styles.zenFastBtnText, { color: '#9333EA' }]}>Need Linen</Text>
                </TouchableOpacity>
            </View>

            {/* Live Timer Header */}
            <View style={styles.zenHeader}>
                <View>
                    <Text style={styles.zenTitle}>Room {room.number}</Text>
                    <Text style={styles.zenSubtitle}>{room.cleaningType} Cleaning</Text>
                </View>
                <View style={styles.zenTimerContainer}>
                    {isNfcSupported && (
                        <TouchableOpacity onPress={onStartScan} style={{ marginRight: 10 }}>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 4, borderRadius: 20 }}>
                                <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>NFC READY</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    <Clock size={20} color="white" style={{ marginRight: 6 }} />
                    <Stopwatch startTime={room.cleaningStartedAt} />
                </View>
            </View>

            <ScrollView style={styles.zenContent} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Alerts & Conditions */}
                {(room.isGuestWaiting || room.isDND || room.extraTime) && (
                    <View style={styles.zenSection}>
                        <Text style={styles.zenSectionTitle}>Important Alerts</Text>
                        <View style={{ gap: 10 }}>
                            {room.isGuestWaiting && (
                                <View style={[styles.zenAlertItem, { backgroundColor: theme.colors.error + '20' }]}>
                                    <AlertTriangle size={24} color={theme.colors.error} />
                                    <Text style={[styles.zenAlertText, { color: theme.colors.error }]}>GUEST WAITING (RUSH)</Text>
                                </View>
                            )}
                            {room.isDND && (
                                <View style={[styles.zenAlertItem, { backgroundColor: theme.colors.secondary + '20' }]}>
                                    <Moon size={24} color={theme.colors.secondary} />
                                    <Text style={[styles.zenAlertText, { color: theme.colors.secondary }]}>DO NOT DISTURB</Text>
                                </View>
                            )}
                            {room.extraTime && (
                                <View style={[styles.zenAlertItem, { backgroundColor: theme.colors.info + '20' }]}>
                                    <Clock size={24} color={theme.colors.info} />
                                    <Text style={[styles.zenAlertText, { color: theme.colors.info }]}>EXTRA TIME REQUESTED</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Room Setup Info */}
                <View style={styles.zenSection}>
                    <Text style={styles.zenSectionTitle}>Room Setup</Text>
                    <View style={styles.zenGrid}>
                        <View style={styles.zenInfoCard}>
                            <Bed size={20} color={theme.colors.primary} />
                            <Text style={styles.zenInfoLabel}>Beds</Text>
                            <Text style={styles.zenInfoValue}>{room.configuration?.beds || 'Standard'}</Text>
                        </View>
                        <View style={styles.zenInfoCard}>
                            <DoorOpen size={20} color={theme.colors.primary} />
                            <Text style={styles.zenInfoLabel}>Bedrooms</Text>
                            <Text style={styles.zenInfoValue}>{room.configuration?.bedrooms || 1}</Text>
                        </View>
                        {room.configuration?.extras && room.configuration.extras.length > 0 && (
                            <View style={[styles.zenInfoCard, { width: '100%' }]}>
                                <Package size={20} color={theme.colors.warning} />
                                <Text style={styles.zenInfoLabel}>Extras Required</Text>
                                <Text style={styles.zenInfoValue}>{room.configuration.extras.join(', ')}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Cleaner Notes */}
                <View style={styles.zenSection}>
                    <Text style={styles.zenSectionTitle}>My Notes</Text>
                    <TextInput
                        style={styles.zenNotesInput}
                        placeholder="Add notes about this room..."
                        placeholderTextColor="#9CA3AF"
                        multiline
                        value={notes}
                        onChangeText={setNotes}
                        onBlur={onSaveNotes}
                    />
                </View>

                {/* Fast Alert Toolbar */}
                <View style={styles.zenSection}>
                    <Text style={styles.zenSectionTitle}>Fast Alert</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            style={[styles.zenFastBtn, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}
                            onPress={() => pickImage()}
                        >
                            <Camera size={24} color="#4F46E5" />
                            <Text style={[styles.zenFastBtnText, { color: '#4F46E5' }]}>Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.zenFastBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                            onPress={() => setAlertConfig({ visible: true, type: 'BROKEN' })}
                        >
                            <Wrench size={24} color="#DC2626" />
                            <Text style={[styles.zenFastBtnText, { color: '#DC2626' }]}>Broken</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.zenFastBtn, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}
                            onPress={() => setAlertConfig({ visible: true, type: 'MISSING' })}
                        >
                            <Package size={24} color="#EA580C" />
                            <Text style={[styles.zenFastBtnText, { color: '#EA580C' }]}>Missing</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Incidents */}
                <View style={styles.zenSection}>
                    <Text style={styles.zenSectionTitle}>Quick Report</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {INCIDENT_PRESETS.map((preset) => (
                            <TouchableOpacity
                                key={preset}
                                style={styles.zenChip}
                                onPress={() => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    onAddIncident(preset, 'MAINTENANCE', undefined);
                                }}
                            >
                                <AlertTriangle size={14} color={theme.colors.error} />
                                <Text style={styles.zenChipText}>{preset}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

            </ScrollView>

            <FastAlertModal
                visible={alertConfig.visible}
                type={alertConfig.type}
                targetRole={alertConfig.targetRole}
                text={alertText}
                photoUri={alertPhoto}
                onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
                onChangeText={setAlertText}
                onSetPhoto={setAlertPhoto}
                onSetTargetRole={(role) => setAlertConfig({ ...alertConfig, targetRole: role })}
                onSubmit={submitFastAlert}
                onPickImage={pickImage}
            />

            {/* Fixed Bottom Action Bar */}
            <View style={styles.zenFooter}>
                <TouchableOpacity style={styles.zenFinishButton} onPress={onAction}>
                    <CheckCircle size={24} color="white" fill={theme.colors.primary} />
                    <Text style={styles.zenFinishText}>Complete Room</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    zenContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    zenFastBtn: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8
    },
    zenFastBtnText: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    zenHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: theme.colors.primary,
    },
    zenTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    zenSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    zenTimerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    zenContent: {
        flex: 1,
        padding: 20,
    },
    zenSection: {
        marginBottom: 25,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        ...theme.shadows.card,
    },
    zenSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 15,
    },
    zenAlertItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        gap: 12
    },
    zenAlertText: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    zenGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12
    },
    zenInfoCard: {
        width: '48%',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'flex-start'
    },
    zenInfoLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 8,
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    zenInfoValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    zenNotesInput: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 22,
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 12,
        minHeight: 80,
        textAlignVertical: 'top'
    },
    zenChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: theme.colors.error + '40',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 6
    },
    zenChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.error
    },
    zenFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        ...theme.shadows.card
    },
    zenFinishButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    zenFinishText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
});
