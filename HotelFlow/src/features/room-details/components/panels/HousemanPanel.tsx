import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Package, CheckCircle } from 'lucide-react-native';
import { theme } from '../../../../utils/theme';
import { Room } from '../../../../contexts/HotelContext';

interface HousemanPanelProps {
    room: Room;
}

export const HousemanPanel = ({ room }: HousemanPanelProps) => {
    return (
        <ScrollView style={styles.roleContainer}>
            <View style={styles.roleHeader}>
                <View>
                    <Text style={styles.roleTitle}>Restock Room {room.number}</Text>
                    <Text style={styles.roleSubtitle}>{room.type} • {room.configuration?.bedrooms || 1} Bed</Text>
                </View>
            </View>

            <View style={styles.roleCard}>
                <View style={styles.cardHeader}>
                    <Package size={20} color={theme.colors.primary} />
                    <Text style={styles.cardTitle}>Required Items</Text>
                </View>
                <View style={styles.suppliesGrid}>
                    <View style={styles.supplyItem}><Text style={styles.supplyLabel}>Towels</Text><Text style={styles.supplyValue}>4</Text></View>
                    <View style={styles.supplyItem}><Text style={styles.supplyLabel}>Soap</Text><Text style={styles.supplyValue}>2</Text></View>
                    <View style={styles.supplyItem}><Text style={styles.supplyLabel}>Gels</Text><Text style={styles.supplyValue}>2</Text></View>
                    <View style={styles.supplyItem}><Text style={styles.supplyLabel}>Water</Text><Text style={styles.supplyValue}>2</Text></View>
                </View>
            </View>
            <TouchableOpacity style={styles.actionBtnFull}>
                <CheckCircle size={20} color="white" />
                <Text style={styles.btnTextWhite}>Mark Restocked</Text>
            </TouchableOpacity>
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
    suppliesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    supplyItem: {
        width: '48%',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    supplyLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 8,
        fontWeight: '600'
    },
    supplyValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    actionBtnFull: {
        margin: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.primary,
        gap: 6
    },
    btnTextWhite: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16
    },
});
