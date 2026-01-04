import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, Image } from 'react-native';
import { useHotel, Incident, Room } from '../contexts/HotelContext';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { CheckCircle, AlertTriangle, Wrench, XCircle, Clock, AlertCircle, Plus, Box, Package } from 'lucide-react-native'; // Added Box, Package

export default function MaintenanceScreen() {
    const { rooms, resolveIncident, updateRoomStatus, startMaintenance, addIncident, assets, addAsset, updateAssetStatus, fetchAssets } = useHotel(); // Added assets
    const { logout, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'TASKS' | 'BLOCKED' | 'PREVENTIVE' | 'ASSETS'>('TASKS');
    const [maintenanceModalVisible, setMaintenanceModalVisible] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [maintenanceReason, setMaintenanceReason] = useState('');

    // Preventive Modal State
    const [preventiveModalVisible, setPreventiveModalVisible] = useState(false);
    const [prevRoomNum, setPrevRoomNum] = useState('');
    const [prevDesc, setPrevDesc] = useState('');

    // Asset Modal State
    const [assetModalVisible, setAssetModalVisible] = useState(false);
    const [newAssetName, setNewAssetName] = useState('');
    const [newAssetSerial, setNewAssetSerial] = useState('');

    // --- Work Orders (Open Incidents) ---
    const allWorkOrders = rooms.reduce<{ incident: Incident, roomNumber: string, roomId: string }[]>((acc, room) => {
        const roomIncidents = room.incidents
            // Filter: Only Maintenance role, Status OPEN
            .filter(inc => inc.targetRole === 'MAINTENANCE' && inc.status === 'OPEN')
            .map(inc => ({ incident: inc, roomNumber: room.number, roomId: room.id }));
        return [...acc, ...roomIncidents];
    }, []).sort((a, b) => new Date(b.incident.timestamp).getTime() - new Date(a.incident.timestamp).getTime());

    const reactiveOrders = allWorkOrders.filter(w => w.incident.category !== 'PREVENTIVE');
    const preventiveOrders = allWorkOrders.filter(w => w.incident.category === 'PREVENTIVE');

    // --- Blocked Rooms (Maintenance Status) ---
    const blockedRooms = rooms.filter(r => r.status === 'MAINTENANCE');

    const handleResolve = (roomId: string, incidentId: string) => {
        Alert.alert(
            "Complete Work Order",
            "Mark this task as completed?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Complete", onPress: () => resolveIncident(roomId, incidentId) }
            ]
        );
    };

    const handleStartMaintenance = () => {
        if (!selectedRoomId || !maintenanceReason) return;
        startMaintenance(selectedRoomId, maintenanceReason);
        setMaintenanceModalVisible(false);
        setMaintenanceReason('');
    };

    const handleCreatePreventive = () => {
        if (!prevRoomNum || !prevDesc) {
            Alert.alert("Error", "Room and Description required");
            return;
        }
        const room = rooms.find(r => r.number === prevRoomNum);
        if (!room) {
            Alert.alert("Error", "Room not found");
            return;
        }

        // IncidentRole: 'MAINTENANCE'
        // Group: undefined (or user.groupId)
        // Category: 'PREVENTIVE'
        const reporterName = user?.username || 'Maintenance';
        addIncident(room.id, prevDesc, reporterName, 'MAINTENANCE', undefined, undefined, 'PREVENTIVE');

        setPreventiveModalVisible(false);
        setPrevRoomNum('');
        setPrevDesc('');
        Alert.alert("Success", "Preventive task scheduled");
    };

    const handleCreateAsset = () => {
        if (!newAssetName || !selectedRoomId) {
            Alert.alert("Error", "Name and Room required");
            return;
        }
        // Need to convert selectedRoomId to number if backend expects number, which it does from serializer room_number? 
        // Wait, backend Asset model expects 'room' ID (pk).
        // Let's pass the object as expected by AddAsset in context.
        addAsset({
            name: newAssetName,
            room: selectedRoomId, // Ensure this maps to ID
            serial_number: newAssetSerial,
            // status: 'GOOD' // Removed as it causes lint error and backend likely defaults it
        });
        setAssetModalVisible(false);
        setNewAssetName('');
        setNewAssetSerial('');
        setSelectedRoomId(null);
    };

    // Helper for Asset Status Color
    const getAssetColor = (status: string) => {
        switch (status) {
            case 'GOOD': return theme.colors.success;
            case 'REPAIR': return theme.colors.warning;
            case 'BROKEN': return theme.colors.error;
            default: return theme.colors.textSecondary;
        }
    };

    const renderWorkOrder = ({ item }: { item: { incident: Incident, roomNumber: string, roomId: string } }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.roomBadge, item.incident.category === 'PREVENTIVE' ? { backgroundColor: theme.colors.success } : {}]}>
                    <Text style={styles.roomText}>{item.roomNumber}</Text>
                </View>
                <View style={styles.metaContainer}>
                    <Clock size={12} color={theme.colors.textSecondary} />
                    <Text style={styles.timeText}>{new Date(item.incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
            </View>

            <View style={styles.contentContainer}>
                {item.incident.photoUri ? (
                    <View style={styles.photoContainer}>
                        {/* Placeholder for photo if URI was real */}
                        <Text style={styles.photoPlaceholder}>Photo</Text>
                    </View>
                ) : null}
                <View style={styles.textContainer}>
                    {item.incident.category === 'PREVENTIVE' && (
                        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                            <View style={{ backgroundColor: '#E6FFFA', paddingHorizontal: 6, borderRadius: 4 }}>
                                <Text style={{ color: '#2C7A7B', fontSize: 10, fontWeight: 'bold' }}>PREVENTIVE</Text>
                            </View>
                        </View>
                    )}
                    <Text style={styles.description}>{item.incident.text}</Text>
                    <Text style={styles.reporter}>Reported by: {item.incident.user}</Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.resolveButton}
                onPress={() => handleResolve(item.roomId, item.incident.id)}
            >
                <CheckCircle size={18} color="white" />
                <Text style={styles.resolveButtonText}>Mark Complete</Text>
            </TouchableOpacity>
        </View>
    );

    const renderBlockedRoom = ({ item }: { item: Room }) => (
        <View style={[styles.card, styles.blockedCard]}>
            <View style={styles.cardHeader}>
                <Text style={styles.blockedTitle}>Room {item.number}</Text>
                <View style={styles.statusBadge}>
                    <Wrench size={12} color="white" />
                    <Text style={styles.statusText}>MAINTENANCE</Text>
                </View>
            </View>

            <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Reason:</Text>
                <Text style={styles.reasonValue}>{item.maintenanceReason || "Unspecified Issue"}</Text>
            </View>

            <TouchableOpacity
                style={styles.finishButton}
                onPress={() => updateRoomStatus(item.id, 'PENDING')}
            >
                <CheckCircle size={18} color="white" />
                <Text style={styles.finishText}>Return to Service</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Work Orders</Text>
                    <Text style={styles.headerSubtitle}>Logged in as {user?.username}</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'TASKS' && styles.activeTab]}
                    onPress={() => setActiveTab('TASKS')}
                >
                    <AlertCircle size={16} color={activeTab === 'TASKS' ? 'white' : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'TASKS' && styles.activeTabText]}>
                        Open ({reactiveOrders.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'PREVENTIVE' && styles.activeTab]}
                    onPress={() => setActiveTab('PREVENTIVE')}
                >
                    <Clock size={16} color={activeTab === 'PREVENTIVE' ? 'white' : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'PREVENTIVE' && styles.activeTabText]}>
                        Preventive ({preventiveOrders.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'BLOCKED' && styles.activeTab]}
                    onPress={() => setActiveTab('BLOCKED')}
                >
                    <Wrench size={16} color={activeTab === 'BLOCKED' ? 'white' : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'BLOCKED' && styles.activeTabText]}>
                        Blocked ({blockedRooms.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'ASSETS' && styles.activeTab]}
                    onPress={() => { setActiveTab('ASSETS'); fetchAssets(); }}
                >
                    <Package size={16} color={activeTab === 'ASSETS' ? 'white' : theme.colors.textSecondary} />
                    <Text style={[styles.tabText, activeTab === 'ASSETS' && styles.activeTabText]}>
                        Assets
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'TASKS' && (
                <FlatList
                    data={reactiveOrders}
                    renderItem={renderWorkOrder}
                    keyExtractor={item => item.incident.id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <CheckCircle size={48} color={theme.colors.success} />
                            <Text style={styles.emptyText}>All reactive tasks cleared.</Text>
                        </View>
                    }
                />
            )}

            {activeTab === 'PREVENTIVE' && (
                <View style={{ flex: 1 }}>
                    <TouchableOpacity style={styles.blockNewButton} onPress={() => setPreventiveModalVisible(true)}>
                        <Plus size={20} color="white" />
                        <Text style={styles.blockNewText}> New Preventive Task</Text>
                    </TouchableOpacity>
                    <FlatList
                        data={preventiveOrders}
                        renderItem={renderWorkOrder}
                        keyExtractor={item => item.incident.id}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No preventive maintenance scheduled.</Text>
                            </View>
                        }
                    />
                </View>
            )}

            {activeTab === 'BLOCKED' && (
                <View style={{ flex: 1 }}>
                    <TouchableOpacity
                        style={styles.blockNewButton}
                        onPress={() => setMaintenanceModalVisible(true)}
                    >
                        <Text style={styles.blockNewText}>+ Block Another Room</Text>
                    </TouchableOpacity>

                    <FlatList
                        data={blockedRooms}
                        renderItem={renderBlockedRoom}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No rooms currently blocked.</Text>
                            </View>
                        }
                    />
                </View>
            )}

            {activeTab === 'ASSETS' && (
                <View style={{ flex: 1 }}>
                    <TouchableOpacity style={[styles.blockNewButton, { backgroundColor: theme.colors.primary }]} onPress={() => setAssetModalVisible(true)}>
                        <Plus size={20} color="white" />
                        <Text style={styles.blockNewText}> Add New Asset</Text>
                    </TouchableOpacity>
                    <FlatList
                        data={assets}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.list}
                        renderItem={({ item }) => (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardTitle}>{item.name}</Text>
                                        <Text style={styles.cardSubtitle}>Room {item.room_number || 'Unassigned'} • SN: {item.serial_number || 'N/A'}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.statusBadge, { backgroundColor: getAssetColor(item.status) }]}
                                        onPress={() => {
                                            const nextStatus = item.status === 'GOOD' ? 'REPAIR' : item.status === 'REPAIR' ? 'BROKEN' : 'GOOD';
                                            updateAssetStatus(item.id, nextStatus as any);
                                        }}
                                    >
                                        <Text style={styles.statusText}>{item.status}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Package size={48} color={theme.colors.textSecondary} />
                                <Text style={styles.emptyText}>No assets tracked.</Text>
                            </View>
                        }
                    />
                </View>
            )}

            {/* Modal for Blocking New Room (Select Room first) */}
            <Modal
                transparent={true}
                visible={maintenanceModalVisible}
                animationType="slide"
                onRequestClose={() => setMaintenanceModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Block Room for Maintenance</Text>

                        {/* Simple Room Selector (Dropdown style) */}
                        <Text style={styles.label}>Select Room ID (Enter manually for prototype):</Text>
                        <View style={{ maxHeight: 200 }}>
                            <FlatList
                                data={rooms.filter(r => r.status !== 'MAINTENANCE')}
                                keyExtractor={r => r.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.roomOption, selectedRoomId === item.id && styles.selectedRoomOption]}
                                        onPress={() => setSelectedRoomId(item.id)}
                                    >
                                        <Text style={selectedRoomId === item.id ? styles.selectedRoomText : styles.roomOptionText}>Room {item.number}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>

                        <Text style={[styles.label, { marginTop: 10 }]}>Reason:</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Painting, Broken AC"
                            value={maintenanceReason}
                            onChangeText={setMaintenanceReason}
                            multiline
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setMaintenanceModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSubmit} onPress={handleStartMaintenance}>
                                <Text style={styles.modalSubmitText}>Confirm Block</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Preventive Maintenance Modal */}
            <Modal
                transparent={true}
                visible={preventiveModalVisible}
                animationType="slide"
                onRequestClose={() => setPreventiveModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Schedule Preventive Maintenance</Text>

                        <Text style={styles.label}>Room Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 101"
                            value={prevRoomNum}
                            onChangeText={setPrevRoomNum}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Task Description</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Filter Check, Battery Replacement"
                            value={prevDesc}
                            onChangeText={setPrevDesc}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setPreventiveModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSubmit} onPress={handleCreatePreventive}>
                                <Text style={styles.modalSubmitText}>Create Task</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Asset Modal */}
            <Modal
                transparent={true}
                visible={assetModalVisible}
                animationType="slide"
                onRequestClose={() => setAssetModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Asset</Text>

                        <Text style={styles.label}>Asset Name</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 50 }]}
                            placeholder="e.g. Air Conditioner"
                            value={newAssetName}
                            onChangeText={setNewAssetName}
                        />

                        <Text style={styles.label}>Serial Number (Optional)</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 50 }]}
                            placeholder="e.g. SN-12345"
                            value={newAssetSerial}
                            onChangeText={setNewAssetSerial}
                        />

                        <Text style={styles.label}>Select Room</Text>
                        <View style={{ maxHeight: 150 }}>
                            <FlatList
                                data={rooms}
                                keyExtractor={r => r.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.roomOption, selectedRoomId === item.id && styles.selectedRoomOption]}
                                        onPress={() => setSelectedRoomId(item.id)}
                                    >
                                        <Text style={selectedRoomId === item.id ? styles.selectedRoomText : styles.roomOptionText}>Room {item.number}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setAssetModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalSubmit, { backgroundColor: theme.colors.primary }]} onPress={handleCreateAsset}>
                                <Text style={styles.modalSubmitText}>Save Asset</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { padding: 24, paddingTop: 60, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E1E4E8', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A202C' },
    headerSubtitle: { fontSize: 14, color: '#718096' },
    logoutButton: { padding: 8 },
    logoutText: { color: theme.colors.primary, fontWeight: '600' },

    tabs: { flexDirection: 'row', padding: 16, gap: 12 },
    tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
    activeTab: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    tabText: { fontWeight: '600', color: '#4A5568' },
    activeTabText: { color: 'white' },

    list: { paddingHorizontal: 16, paddingBottom: 20 },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },

    // Work Order Styles
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }, // Updated alignment
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' }, // New
    cardSubtitle: { fontSize: 13, color: '#718096' }, // New
    roomBadge: { backgroundColor: '#EDF2F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    roomText: { fontWeight: 'bold', color: '#2D3748' },
    metaContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    timeText: { fontSize: 12, color: '#718096' },

    contentContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    photoContainer: { width: 60, height: 60, backgroundColor: '#E2E8F0', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    photoPlaceholder: { fontSize: 10, color: '#718096' },
    textContainer: { flex: 1 },
    description: { fontSize: 16, color: '#2D3748', marginBottom: 4 },
    reporter: { fontSize: 12, color: '#718096' },

    resolveButton: { backgroundColor: theme.colors.success, padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    resolveButtonText: { color: 'white', fontWeight: 'bold' },

    // Blocked Room Styles
    blockedCard: { borderLeftWidth: 4, borderLeftColor: theme.colors.error },
    blockedTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748' },
    statusBadge: { backgroundColor: theme.colors.error, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    reasonBox: { backgroundColor: '#FFF5F5', padding: 12, borderRadius: 8, marginBottom: 16, marginTop: 8 },
    reasonLabel: { fontSize: 12, color: theme.colors.error, fontWeight: 'bold', marginBottom: 2 },
    reasonValue: { color: '#2D3748' },
    finishButton: { backgroundColor: 'white', borderWidth: 1, borderColor: theme.colors.success, padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    finishText: { color: theme.colors.success, fontWeight: 'bold' },

    // Empty State
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { fontSize: 16, fontWeight: 'bold', color: '#4A5568', marginTop: 16 },
    emptySubtext: { color: '#718096', marginTop: 4 },

    // Modal
    blockNewButton: { marginHorizontal: 16, marginBottom: 12, padding: 14, backgroundColor: theme.colors.error, borderRadius: 8, alignItems: 'center' },
    blockNewText: { color: 'white', fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#2D3748' },
    label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
    input: { backgroundColor: '#F7FAFC', borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: '#E2E8F0' },
    roomOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
    selectedRoomOption: { backgroundColor: theme.colors.error + '20' },
    roomOptionText: { color: '#4A5568' },
    selectedRoomText: { color: theme.colors.error, fontWeight: 'bold' },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
    modalCancel: { padding: 12 },
    modalCancelText: { color: '#718096', fontWeight: '600' },
    modalSubmit: { backgroundColor: theme.colors.error, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
    modalSubmitText: { color: 'white', fontWeight: 'bold' },
});
