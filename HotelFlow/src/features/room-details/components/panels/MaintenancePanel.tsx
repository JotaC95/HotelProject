import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Wrench, Plus, AlertTriangle } from 'lucide-react-native';
import { theme } from '../../../../utils/theme';
import { Room } from '../../../../contexts/HotelContext';

interface MaintenancePanelProps {
    room: Room;
    onAddIncident: () => void;
    onViewPhoto: (uri: string) => void;
}

export const MaintenancePanel = ({ room, onAddIncident, onViewPhoto }: MaintenancePanelProps) => {
    return (
        <ScrollView style={styles.roleContainer}>
            <View style={styles.roleHeader}>
                <View>
                    <Text style={styles.roleTitle}>Maintenance Log</Text>
                    <Text style={styles.roleSubtitle}>Room {room.number}</Text>
                </View>
                <TouchableOpacity onPress={onAddIncident} style={styles.iconBtn}>
                    <Plus size={24} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Asset List */}
            <View style={styles.roleCard}>
                <View style={styles.cardHeader}>
                    <Wrench size={20} color={theme.colors.text} />
                    <Text style={styles.cardTitle}>Assets in Room</Text>
                </View>
                <View style={{ gap: 8 }}>
                    <View style={styles.assetItem}>
                        <View><Text style={styles.assetName}>AC Unit</Text><Text style={styles.assetSerial}>SN: 12345678</Text></View>
                        <View style={[styles.assetBadge, { backgroundColor: theme.colors.success }]}><Text style={styles.assetStatusText}>Good</Text></View>
                    </View>
                    <View style={styles.assetItem}>
                        <View><Text style={styles.assetName}>TV</Text><Text style={styles.assetSerial}>SN: LG-999</Text></View>
                        <View style={[styles.assetBadge, { backgroundColor: theme.colors.success }]}><Text style={styles.assetStatusText}>Good</Text></View>
                    </View>
                </View>
            </View>

            {/* Open Tickets */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Open Tickets</Text>
                {room.incidents.filter(i => i.status === 'OPEN').length === 0 ? (
                    <Text style={styles.emptyText}>No open tickets.</Text>
                ) : (
                    room.incidents.filter(i => i.status === 'OPEN').map((inc, i) => (
                        <View key={i} style={styles.incidentItem}>
                            <AlertTriangle size={16} color={theme.colors.error} />
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.incidentText}>{inc.text}</Text>
                                {inc.photoUri && (
                                    <TouchableOpacity onPress={() => onViewPhoto(inc.photoUri!)}>
                                        <Image source={{ uri: inc.photoUri }} style={{ width: 100, height: 100, borderRadius: 8, marginTop: 4 }} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))
                )}
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
    iconBtn: {
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 8
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
    section: {
        padding: 15
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 10
    },
    assetItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#F9FAFB',
        borderRadius: 8
    },
    assetName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    assetSerial: {
        fontSize: 12,
        color: theme.colors.textSecondary
    },
    assetBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    assetStatusText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold'
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic'
    },
    incidentItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        backgroundColor: 'white',
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#FCA5A5'
    },
    incidentText: {
        fontSize: 14,
        color: theme.colors.text
    }
});
