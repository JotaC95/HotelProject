import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert, TextInput } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useHotel, Room, Incident } from '../contexts/HotelContext';
import { theme } from '../utils/theme';
import { sortRooms } from '../utils/roomUtils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardList, BedDouble, Package, LogOut, CheckCircle, AlertTriangle, Plus, Trash2, Filter, X } from 'lucide-react-native';
import api from '../services/api';

type Tab = 'REQUESTS' | 'ROOMS' | 'INVENTORY' | 'LINEN';
const CATEGORIES = ['ALL', 'LINEN', 'TOILETRIES', 'CLEANING', 'OTHER'];

export default function HousemanScreen() {
    const { logout, user } = useAuth();
    const { rooms, systemIncidents, fetchSystemIncidents, resolveIncident, inventory, fetchInventory, updateInventoryQuantity, updateGuestStatus, addInventoryItem, deleteInventoryItem } = useHotel();
    const [activeTab, setActiveTab] = useState<Tab>('REQUESTS');

    // Inventory State
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemCategory, setNewItemCategory] = useState<'LINEN' | 'TOILETRIES' | 'CLEANING' | 'OTHER'>('OTHER');
    const [newItemStock, setNewItemStock] = useState('10'); // Default min stock
    const [categoryFilter, setCategoryFilter] = useState('ALL');

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
        // Sort by Next Arrival Time
        return candidates.sort((a, b) => {
            const timeA = a.guestDetails?.nextArrival || '9999';
            const timeB = b.guestDetails?.nextArrival || '9999';
            return timeA.localeCompare(timeB);
        });
    }, [rooms]);

    // --- Actions ---
    const handleAddItem = async () => {
        if (!newItemName) return Alert.alert("Error", "Name is required");
        await addInventoryItem({
            name: newItemName,
            category: newItemCategory as 'LINEN' | 'TOILETRIES' | 'Cleaning_Supplies' | 'OTHER',
            quantity: 0,
            min_stock: parseInt(newItemStock) || 10
        });
        setIsAddModalVisible(false);
        setNewItemName('');
        setNewItemCategory('OTHER');
    };

    const handleDeleteItem = (item: any) => {
        Alert.alert(
            "Delete Item",
            `Are you sure you want to delete "${item.name}"?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: 'destructive', onPress: () => deleteInventoryItem(item.id) }
            ]
        );
    };

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

    const renderRequests = () => {
        const supplyRequests = requests.filter(r => r.category === 'SUPPLY');
        const generalRequests = requests.filter(r => r.category !== 'SUPPLY');

        return (
            <ScrollView style={styles.content}>

                {/* General Support Requests */}
                <View style={[styles.sectionHeader, { marginTop: 0 }]}>
                    <Text style={styles.sectionTitle}>General Requests</Text>
                    <View style={[styles.badge, { backgroundColor: 'orange' }]}>
                        <Text style={styles.badgeText}>{generalRequests.length}</Text>
                    </View>
                </View>

                {generalRequests.length === 0 ? (
                    <Text style={[styles.emptyText, { marginBottom: 20 }]}>No general requests.</Text>
                ) : (
                    generalRequests.map(item => (
                        <View key={item.id} style={styles.card}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{item.roomNumber === 'System' ? 'General' : `Room ${item.roomNumber}`}</Text>
                                <Text style={styles.cardBody}>{item.text}</Text>
                                <Text style={styles.cardSubtitle}>From: {item.user} • {new Date(item.timestamp).toLocaleTimeString()}</Text>
                            </View>
                            <TouchableOpacity style={styles.actionButton} onPress={() => resolveIncident(item.roomId || '', item.id)}>
                                <CheckCircle color="white" size={20} />
                                <Text style={styles.actionBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                {/* Supply Requests */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Supply Requests</Text>
                    <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.badgeText}>{supplyRequests.length}</Text>
                    </View>
                </View>

                {supplyRequests.length === 0 ? (
                    <Text style={styles.emptyText}>No supply requests.</Text>
                ) : (
                    supplyRequests.map(item => (
                        <View key={item.id} style={styles.card}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{item.roomNumber === 'System' ? 'General' : `Room ${item.roomNumber}`}</Text>
                                <Text style={styles.cardBody}>{item.text}</Text>
                                <Text style={styles.cardSubtitle}>From: {item.user} • {new Date(item.timestamp).toLocaleTimeString()}</Text>
                            </View>
                            <TouchableOpacity style={styles.actionButton} onPress={() => resolveIncident(item.roomId || '', item.id)}>
                                <CheckCircle color="white" size={20} />
                                <Text style={styles.actionBtnText}>Delivered</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>
        );
    };

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

    const renderInventory = () => {
        const filteredInventory = inventory.filter(i => categoryFilter === 'ALL' || i.category === categoryFilter);

        return (
            <View style={styles.content}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Inventory Control</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddModalVisible(true)}>
                        <Plus size={20} color="white" />
                        <Text style={styles.addBtnText}>New Item</Text>
                    </TouchableOpacity>
                </View>

                {/* Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]}
                            onPress={() => setCategoryFilter(cat)}
                        >
                            <Text style={[styles.filterText, categoryFilter === cat && styles.filterTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <FlatList
                    data={filteredInventory}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onLongPress={() => handleDeleteItem(item)}
                            delayLongPress={500}
                            activeOpacity={0.8}
                        >
                            <View style={styles.card}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardTitle}>{item.name}</Text>
                                    <Text style={styles.cardSubtitle}>{item.category} • Min: {item.min_stock}</Text>
                                </View>
                                <View style={styles.counter}>
                                    <TouchableOpacity onPress={() => updateInventoryQuantity(item.id, Math.max(0, item.quantity - 1))} style={styles.countBtn}><Text style={styles.countBtnText}>-</Text></TouchableOpacity>
                                    <Text style={[styles.countValue, item.quantity <= (item.min_stock || 0) && styles.lowStockText]}>{item.quantity}</Text>
                                    <TouchableOpacity onPress={() => updateInventoryQuantity(item.id, item.quantity + 1)} style={styles.countBtn}><Text style={styles.countBtnText}>+</Text></TouchableOpacity>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </View>
        );
    };

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

    const renderLinen = () => {
        // Calculator Logic
        let sheetSingle = 0;
        let sheetDouble = 0;
        let pillowCases = 0;
        let bathTowels = 0;
        let handTowels = 0;
        let bathMats = 0;

        const DEPARTURE = 'DEPARTURE';
        const STAYOVER = 'STAYOVER';

        rooms.forEach(room => {
            const isDeparture = room.cleaningType === DEPARTURE || room.status === 'COMPLETED'; // Assuming COMPLETED were departures
            const isStayover = room.cleaningType === STAYOVER || room.cleaningType === 'DAYUSE'; // 'Day Use' maps to light clean

            // Bed Configuration Logic (simplified)
            // Assuming "Single" = 1 Single Bed, "Double" = 1 King/Double, "Suite" = 2 Doubles
            let beds = { single: 0, double: 0 };
            if (room.type === 'Single') beds.single = 1;
            else if (room.type === 'Double') beds.double = 1;
            else if (room.type === 'Suite') beds.double = 2;

            // Override with actual config if available
            // "1 King", "2 Singles", etc. parsing could be done here but let's stick to Room Type proxy for now.

            // Logic:
            // Departure: Change ALL sheets + ALL towels
            // Stayover: Change towels ONLY (unless requested otherwise - ignored for MVP)

            if (isDeparture) {
                sheetSingle += beds.single * 2; // Top + Bottom
                sheetDouble += beds.double * 2;
                pillowCases += (beds.single * 1) + (beds.double * 2); // 1 per single, 2 per double
                bathMats += 1;
            }

            if (isDeparture || isStayover) {
                // Towels replaced for both (assuming used)
                bathTowels += (beds.single * 1) + (beds.double * 2);
                handTowels += (beds.single * 1) + (beds.double * 2);
            }
        });

        const items = [
            { label: 'King Sheets', count: sheetDouble, sub: 'Top + Bottom' },
            { label: 'Single Sheets', count: sheetSingle, sub: 'Top + Bottom' },
            { label: 'Pillow Cases', count: pillowCases, sub: 'Standard' },
            { label: 'Bath Towels', count: bathTowels, sub: '1 per Guest' },
            { label: 'Hand Towels', count: handTowels, sub: '1 per Guest' },
            { label: 'Bath Mats', count: bathMats, sub: '1 per Room' },
        ];

        return (
            <ScrollView style={styles.content}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Daily Linen Requirements</Text>
                    <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.badgeText}>{rooms.length} Rooms</Text>
                    </View>
                </View>

                <View style={styles.linenGrid}>
                    {items.map((item, index) => (
                        <View key={index} style={styles.linenCard}>
                            <Text style={styles.linenLabel}>{item.label}</Text>
                            <Text style={styles.linenCount}>{item.count}</Text>
                            <Text style={styles.linenSubtext}>{item.sub}</Text>
                        </View>
                    ))}
                </View>

                <View style={{ marginTop: 20 }}>
                    <Text style={{ fontStyle: 'italic', color: theme.colors.textSecondary, textAlign: 'center' }}>
                        *Calculated based on {rooms.filter(r => r.cleaningType === 'DEPARTURE').length} departures and {rooms.filter(r => r.cleaningType !== 'DEPARTURE').length} stayovers.
                    </Text>
                </View>
            </ScrollView>
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
                <TouchableOpacity onPress={() => setActiveTab('LINEN')} style={[styles.tab, activeTab === 'LINEN' && styles.activeTab]}>
                    <ClipboardList color={activeTab === 'LINEN' ? theme.colors.primary : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'LINEN' && styles.activeTabText]}>Linen Calc</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'REQUESTS' && renderRequests()}
            {activeTab === 'ROOMS' && renderRooms()}
            {activeTab === 'INVENTORY' && renderInventory()}
            {activeTab === 'LINEN' && renderLinen()}

            {/* Add Item Modal */}
            {isAddModalVisible && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Item</Text>

                        <Text style={styles.label}>Item Name</Text>
                        <TextInput style={styles.input} value={newItemName} onChangeText={setNewItemName} placeholder="e.g. Shampoo" />

                        <Text style={styles.label}>Category</Text>
                        <View style={styles.categoryRow}>
                            {CATEGORIES.filter(c => c !== 'ALL').map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.catOption, newItemCategory === cat && styles.catOptionActive]}
                                    onPress={() => setNewItemCategory(cat as 'LINEN' | 'TOILETRIES' | 'CLEANING' | 'OTHER')}
                                >
                                    <Text style={[styles.catText, newItemCategory === cat && styles.catTextActive]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Min Stock Level</Text>
                        <TextInput style={styles.input} value={newItemStock} onChangeText={setNewItemStock} keyboardType="numeric" />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setIsAddModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddItem} style={styles.saveBtn}>
                                <Text style={styles.saveText}>Save Item</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

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

    // New Styles
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    addBtn: { backgroundColor: theme.colors.primary, flexDirection: 'row', padding: 8, borderRadius: 6, gap: 4, alignItems: 'center' },
    addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

    filterContainer: { flexDirection: 'row', marginBottom: 12, height: 40 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#EDF2F7', marginRight: 8, height: 32 },
    filterChipActive: { backgroundColor: theme.colors.primary },
    filterText: { fontSize: 12, color: '#4A5568' },
    filterTextActive: { color: 'white', fontWeight: 'bold' },

    lowStockText: { color: theme.colors.error },

    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    label: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16 },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catOption: { padding: 8, borderWidth: 1, borderColor: '#eee', borderRadius: 8 },
    catOptionActive: { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
    catText: { fontSize: 12 },
    catTextActive: { color: theme.colors.primary, fontWeight: 'bold' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    cancelBtn: { flex: 1, padding: 12, alignItems: 'center' },
    cancelText: { color: '#666' },
    saveBtn: { flex: 1, backgroundColor: theme.colors.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
    saveText: { color: 'white', fontWeight: 'bold' },

    // Missing Styles
    // ... existing styles ...
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 12, fontWeight: 'bold', color: 'white' },

    // Linen Styles
    linenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    linenCard: { width: '48%', backgroundColor: 'white', padding: 16, borderRadius: 12, ...theme.shadows.card, alignItems: 'center', marginBottom: 12 },
    linenCount: { fontSize: 32, fontWeight: 'bold', color: theme.colors.primary, marginVertical: 8 },
    linenLabel: { fontSize: 14, color: theme.colors.textSecondary, fontWeight: '600' },
    linenSubtext: { fontSize: 11, color: '#A0AEC0', textAlign: 'center' }
});
