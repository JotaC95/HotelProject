import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ClipboardCheck, Check, CheckCircle2, XCircle } from 'lucide-react-native';
import { theme } from '../../../../utils/theme';
import { StatusBadge } from '../../../../components/StatusBadge';
import { Room } from '../../../../contexts/HotelContext';

interface SupervisorPanelProps {
    room: Room;
    onAction: (action: string) => void;
}

export const SupervisorPanel = ({ room, onAction }: SupervisorPanelProps) => {
    return (
        <ScrollView style={styles.roleContainer}>
            <View style={styles.roleHeader}>
                <View>
                    <Text style={styles.roleTitle}>Audit Room {room.number}</Text>
                    <Text style={styles.roleSubtitle}>Supervisor Inspection</Text>
                </View>
                <StatusBadge status={room.status} />
            </View>

            <View style={styles.roleCard}>
                <View style={styles.cardHeader}>
                    <ClipboardCheck size={20} color={theme.colors.primary} />
                    <Text style={styles.cardTitle}>Inspection Checklist</Text>
                </View>
                <View style={{ gap: 10 }}>
                    {['Bed Made properly', 'Bathroom Cleaned', 'Amenities Restocked', 'Floor Vacuumed', 'No Dust'].map((item, i) => (
                        <View key={i} style={styles.checklistItem}>
                            <View style={styles.checkbox}><Check size={14} color="gray" /></View>
                            <Text style={styles.checklistText}>{item}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.actionBtnFull, { backgroundColor: theme.colors.success }]} onPress={() => onAction('APPROVE')}>
                    <CheckCircle2 size={20} color="white" />
                    <Text style={styles.btnTextWhite}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtnFull, { backgroundColor: theme.colors.error }]} onPress={() => onAction('REJECT')}>
                    <XCircle size={20} color="white" />
                    <Text style={styles.btnTextWhite}>Reject</Text>
                </TouchableOpacity>
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
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white'
    },
    checklistText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        fontWeight: '500'
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
        paddingHorizontal: 15
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
});
