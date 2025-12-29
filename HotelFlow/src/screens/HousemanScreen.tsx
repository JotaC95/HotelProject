import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useHotel, Room, Incident } from '../contexts/HotelContext';
import { theme } from '../utils/theme';
import { sortRooms } from '../utils/roomUtils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardList, BedDouble, Package, LogOut, CheckCircle, AlertTriangle } from 'lucide-react-native';
import api from '../services/api';

type Tab = 'REQUESTS' | 'ROOMS' | 'INVENTORY';

export default function HousemanScreen() {
    const { logout, user } = useAuth();
    const { rooms, systemIncidents, fetchSystemIncidents, resolveIncident, inventory, fetchInventory, updateInventoryQuantity, updateGuestStatus } = useHotel();
    const [activeTab, setActiveTab] = useState<Tab>('REQUESTS');

    useEffect(() => {
        fetchSystemIncidents();
        fetchInventory();
    }, []);



    // --- Derived Data ---
    const requests = useMemo(() => {
        // Collect all open incidents targeting HOUSEMAN
        const roomIncidents = rooms.flatMap(r => r.incidents.map(i => ({ ...i, roomNumber: r.number, roomId: r.id })));
        const all = [...roomIncidents, ...systemIncidents.map(i => ({ ...i, roomNumber: 'System', roomId: null }))];

        return all.filter(i => i.targetRole === 'HOUSEMAN' && i.status === 'OPEN');
    }, [rooms, systemIncidents]);

    const prepRooms = useMemo(() => {
        // Filter: Prearrival/Departure, Pending only (Houseman goes first)
        const candidates = rooms.filter(r =>
            (r.cleaningType === 'PREARRIVAL' || r.cleaningType === 'DEPARTURE')
            && r.status === 'PENDING'
        );
        return sortRooms(candidates);
    }, [rooms]);

    const handleMarkGuestOut = (room: Room) => {
        Alert.alert(
            "Guest Departure",
            "Has the guest left the room?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes, Keys Found",
                    onPress: () => updateGuestStatus(room.id, 'OUT', true)
                },
                {
                    text: "Yes, No Keys",
                    onPress: () => updateGuestStatus(room.id, 'OUT', false)
                }
            ]
        );
    };

    const renderRequests = () => (
        <View style={styles.content}>
            <Text style={styles.sectionTitle}>Supply Requests</Text>
            {requests.length === 0 ? (
                <View style={styles.emptyState}>
                    <CheckCircle size={48} color={theme.colors.success} />
                    <Text style={styles.emptyText}>All requests handled!</Text>
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{item.roomNumber === 'System' ? 'General Request' : `Room ${item.roomNumber}`}</Text>
                                <Text style={styles.cardBody}>{item.text}</Text>
                                <Text style={styles.cardSubtitle}>From: {item.user} • {new Date(item.timestamp).toLocaleTimeString()}</Text>
                            </View>
                            <TouchableOpacity style={styles.actionButton} onPress={() => resolveIncident(item.roomId || '', item.id)}>
                                <CheckCircle color="white" size={20} />
                                <Text style={styles.actionBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </View>
    );

    const renderRooms = () => (
        <View style={styles.content}>
            <Text style={styles.sectionTitle}>Rooms to Prep</Text>
            <FlatList
                data={prepRooms}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={styles.cardTitle}>Room {item.number}</Text>
                                {item.receptionPriority === 1 && <AlertTriangle size={16} color={theme.colors.error} />}
                            </View>
                            <Text style={styles.cardSubtitle}>{item.cleaningType}</Text>

                            {/* Prep Info: Beds & Extras */}
                            <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                <View style={{ backgroundColor: '#EDF2F7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 11, color: '#4A5568' }}>🛏️ {item.configuration.beds}</Text>
                                </View>
                                {item.configuration.extras.map((ex, idx) => (
                                    <View key={idx} style={{ backgroundColor: '#FEFCBF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                        <Text style={{ fontSize: 11, color: '#744210' }}>📦 {ex}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 8 }}>
                            <View style={[styles.statusBadge, item.status === 'PENDING' && { backgroundColor: '#FEEBC8' }]}>
                                <Text style={[styles.statusText, item.status === 'PENDING' && { color: '#C05621' }]}>{item.status}</Text>
                            </View>
                            {item.guestStatus === 'IN_ROOM' && (
                                <TouchableOpacity onPress={() => handleMarkGuestOut(item)} style={{ backgroundColor: theme.colors.warning, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: 'white' }}>Guest Just Left?</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            />
        </View>
    );

    const renderInventory = () => (
        <View style={styles.content}>
            <Text style={styles.sectionTitle}>Inventory Control</Text>
            <FlatList
                data={inventory}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{item.name}</Text>
                            <Text style={styles.cardSubtitle}>{item.category}</Text>
                        </View>
                        <View style={styles.counter}>
                            <TouchableOpacity onPress={() => updateInventoryQuantity(item.id, Math.max(0, item.quantity - 1))} style={styles.countBtn}><Text style={styles.countBtnText}>-</Text></TouchableOpacity>
                            <Text style={styles.countValue}>{item.quantity}</Text>
                            <TouchableOpacity onPress={() => updateInventoryQuantity(item.id, item.quantity + 1)} style={styles.countBtn}><Text style={styles.countBtnText}>+</Text></TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        </View>
    );

    const lowStockItems = inventory.filter(i => i.quantity <= (i.min_stock || 10));

    const renderLowStockBanner = () => {
        if (lowStockItems.length === 0) return null;
        return (
            <View style={styles.alertBanner}>
                <AlertTriangle color="white" size={24} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>Low Stock Alert!</Text>
                    <Text style={styles.alertText}>{lowStockItems.length} items are running low.</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Houseman Dashboard</Text>
                    <Text style={styles.headerSubtitle}>Logged in as {user?.username}</Text>
                </View>
                <TouchableOpacity onPress={logout}>
                    <LogOut color={theme.colors.error} />
                </TouchableOpacity>
            </View>

            {renderLowStockBanner()}

            <View style={styles.tabContainer}>
                <TouchableOpacity onPress={() => setActiveTab('REQUESTS')} style={[styles.tab, activeTab === 'REQUESTS' && styles.activeTab]}>
                    <AlertTriangle color={activeTab === 'REQUESTS' ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'REQUESTS' && styles.activeTabText]}>Requests ({requests.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('ROOMS')} style={[styles.tab, activeTab === 'ROOMS' && styles.activeTab]}>
                    <BedDouble color={activeTab === 'ROOMS' ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'ROOMS' && styles.activeTabText]}>Prep List</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('INVENTORY')} style={[styles.tab, activeTab === 'INVENTORY' && styles.activeTab]}>
                    <Package color={activeTab === 'INVENTORY' ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'INVENTORY' && styles.activeTabText]}>Inventory</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'REQUESTS' && renderRequests()}
            {activeTab === 'ROOMS' && renderRooms()}
            {activeTab === 'INVENTORY' && renderInventory()}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    headerSubtitle: { color: theme.colors.textSecondary },

    alertBanner: { backgroundColor: theme.colors.error, padding: 12, margin: 16, marginBottom: 0, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
    alertTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    alertText: { color: 'white', fontSize: 14 },

    tabContainer: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
    tab: { flex: 1, alignItems: 'center', gap: 4 },
    activeTab: { borderBottomWidth: 2, borderColor: theme.colors.primary },
    tabText: { fontSize: 12, color: theme.colors.textSecondary },
    activeTabText: { color: theme.colors.primary, fontWeight: 'bold' },
    content: { flex: 1, padding: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: theme.colors.text },
    card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...theme.shadows.card },
    cardTitle: { fontWeight: 'bold', fontSize: 16 },
    cardBody: { fontSize: 14, marginVertical: 4 },
    cardSubtitle: { color: theme.colors.textSecondary, fontSize: 12 },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40, opacity: 0.5 },
    emptyText: { marginTop: 10, fontSize: 16, color: theme.colors.textSecondary },
    actionButton: { backgroundColor: theme.colors.success, flexDirection: 'row', padding: 10, borderRadius: 8, gap: 6, alignItems: 'center' },
    actionBtnText: { color: 'white', fontWeight: 'bold' },
    statusBadge: { backgroundColor: '#EBF8FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { color: '#3182CE', fontWeight: 'bold', fontSize: 12 },
    counter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    countBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center' },
    countBtnText: { fontSize: 20, fontWeight: 'bold' },
    countValue: { fontSize: 18, fontWeight: 'bold', minWidth: 24, textAlign: 'center' },
});
