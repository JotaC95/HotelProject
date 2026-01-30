import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { User, LogOut, Phone, Briefcase, History, LogIn } from 'lucide-react-native';
import { theme } from '../../../../utils/theme';
import { StatusBadge } from '../../../../components/StatusBadge';
import { Room } from '../../../../contexts/HotelContext';

interface ReceptionPanelProps {
    room: Room;
    onAction: (type: string) => void;
    onUpdateGuest: (status: string) => void;
}

export const ReceptionPanel = ({ room, onAction, onUpdateGuest }: ReceptionPanelProps) => {
    // Mock Payment Data
    const balance = Math.floor(Math.random() * 200);

    return (
        <ScrollView style={styles.roleContainer}>
            <View style={styles.roleHeader}>
                <View>
                    <Text style={styles.roleTitle}>Room {room.number}</Text>
                    <Text style={styles.roleSubtitle}>{room.type} • {room.floor}th Floor</Text>
                </View>
                <StatusBadge status={room.status} />
            </View>

            {/* Guest Card */}
            <View style={styles.roleCard}>
                <View style={styles.cardHeader}>
                    <User size={20} color={theme.colors.primary} />
                    <Text style={styles.cardTitle}>Guest Information</Text>
                </View>
                {room.guestDetails?.currentGuest ? (
                    <View>
                        <Text style={styles.guestName}>{room.guestDetails.currentGuest}</Text>
                        <Text style={styles.guestDates}>Departs: {new Date(room.guestDetails.nextArrival || Date.now()).toLocaleDateString()}</Text>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => onUpdateGuest('OUT')}>
                                <LogOut size={16} color={theme.colors.primary} />
                                <Text style={styles.btnTextPrimary}>Check Out</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtnOutline}>
                                <Phone size={16} color={theme.colors.primary} />
                                <Text style={styles.btnTextPrimary}>Call Room</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Room is Vacant</Text>
                        <TouchableOpacity style={styles.actionBtnFull} onPress={() => onUpdateGuest('IN')}>
                            <LogIn size={16} color="white" />
                            <Text style={styles.btnTextWhite}>Check In Guest</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Payment & Billing */}
            <View style={styles.roleCard}>
                <View style={styles.cardHeader}>
                    <Briefcase size={20} color={theme.colors.secondary} />
                    <Text style={styles.cardTitle}>Billing</Text>
                </View>
                <View style={styles.billingRow}>
                    <Text style={styles.billingLabel}>Pending Balance</Text>
                    <Text style={[styles.billingValue, { color: balance > 0 ? theme.colors.error : theme.colors.success }]}>
                        ${balance}.00
                    </Text>
                </View>
                {balance > 0 && (
                    <TouchableOpacity style={styles.payBtn}>
                        <Text style={styles.payBtnText}>Process Payment</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Room Status Actions */}
            <View style={styles.roleCard}>
                <View style={styles.cardHeader}>
                    <History size={20} color={theme.colors.text} />
                    <Text style={styles.cardTitle}>Housekeeping Status</Text>
                </View>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Current: {room.status}</Text>
                    <TouchableOpacity onPress={() => onAction('PRIORITY')} style={styles.priorityBtn}>
                        <Text style={styles.priorityText}>Mark High Priority</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    roleContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    roleHeader: {
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    roleTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    roleSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary
    },
    roleCard: {
        backgroundColor: 'white',
        margin: 15,
        borderRadius: 12,
        padding: 15,
        ...theme.shadows.card
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingBottom: 10
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text
    },
    guestName: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4
    },
    guestDates: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 15
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10
    },
    actionBtnOutline: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        gap: 6
    },
    btnTextPrimary: {
        color: theme.colors.primary,
        fontWeight: '600'
    },
    emptyState: {
        alignItems: 'center',
        padding: 20,
        gap: 15
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic'
    },
    actionBtnFull: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: theme.colors.primary,
        gap: 6
    },
    btnTextWhite: {
        color: 'white',
        fontWeight: '600'
    },
    billingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15
    },
    billingLabel: {
        fontSize: 16,
        color: theme.colors.textSecondary
    },
    billingValue: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    payBtn: {
        backgroundColor: theme.colors.secondary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    payBtnText: {
        color: 'white',
        fontWeight: 'bold'
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text
    },
    priorityBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: theme.colors.warning + '20',
        borderRadius: 20
    },
    priorityText: {
        color: theme.colors.warning,
        fontWeight: 'bold',
        fontSize: 12
    },
});
