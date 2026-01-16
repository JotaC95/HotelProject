import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useHotel, Room } from '../contexts/HotelContext';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, Bell, CheckCircle, Clock, Users, BarChart2, ListChecks, Shield, XCircle, AlertTriangle } from 'lucide-react-native';
import { NotificationsModal } from '../components/NotificationsModal';

export default function SupervisorScreen() {
    const { rooms, staff, fetchStaff, updateRoomStatus, announcements, getStats, logs } = useHotel();
    const { logout, user } = useAuth();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INSPECTIONS' | 'TEAM'>('OVERVIEW');
    const [notificationsVisible, setNotificationsVisible] = useState(false);

    // Bulk Inspect State
    const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchStaff();
    }, []);

    const toggleSelection = (roomId: string) => {
        const newSet = new Set(selectedRooms);
        if (newSet.has(roomId)) {
            newSet.delete(roomId);
        } else {
            newSet.add(roomId);
        }
        setSelectedRooms(newSet);
    };

    const handleBulkApprove = async () => {
        if (selectedRooms.size === 0) return;

        Alert.alert(
            "Bulk Approve",
            `Mark ${selectedRooms.size} rooms as CLEAN?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        for (const roomId of selectedRooms) {
                            await updateRoomStatus(roomId, 'COMPLETED');
                        }
                        setSelectedRooms(new Set());
                        Alert.alert("Success", "Rooms approved.");
                    }
                }
            ]
        );
    };

    const handleReject = (roomId: string, roomNumber: string) => {
        Alert.alert(
            "Reject Room",
            `Return Room ${roomNumber} to cleaner?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Return to Dirty",
                    style: 'destructive',
                    onPress: () => updateRoomStatus(roomId, 'IN_PROGRESS') // Send back to In Progress so they see it
                }
            ]
        );
    };

    const renderOverview = () => {
        const stats = getStats();
        // Calculate "Cleaned Today" from logs if possible, otherwise fallback
        // Simplistic approach: Count rooms with status 'COMPLETED' as "Ready"

        return (
            <ScrollView style={styles.content}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Dashboard</Text>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <CheckCircle size={24} color={theme.colors.success} style={{ marginBottom: 8 }} />
                        <Text style={styles.statNumber}>{stats.completed}</Text>
                        <Text style={styles.statLabel}>Ready</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Clock size={24} color={theme.colors.warning} style={{ marginBottom: 8 }} />
                        <Text style={styles.statNumber}>{stats.inspection}</Text>
                        <Text style={styles.statLabel}>Inspect</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Users size={24} color={theme.colors.primary} style={{ marginBottom: 8 }} />
                        <Text style={styles.statNumber}>{staff.filter(s => s.role === 'CLEANER').length}</Text>
                        <Text style={styles.statLabel}>Cleaners</Text>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 20, marginBottom: 10 }]}>Today's Activity</Text>
                {/* Improve this with actual history if available in context, using logs for now if readable */}
                <View style={styles.activityCard}>
                    <Text style={styles.activityText}>
                        {rooms.filter(r => r.status === 'IN_PROGRESS').length} rooms currently being cleaned.
                    </Text>
                    <Text style={styles.activityText}>
                        {rooms.filter(r => r.status === 'PENDING').length} rooms waiting for cleaning.
                    </Text>
                </View>
            </ScrollView>
        );
    };

    const renderInspections = () => {
        const inspectionRooms = rooms.filter(r => r.status === 'INSPECTION');

        return (
            <View style={styles.content}>
                <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Pending Inspections</Text>
                    {selectedRooms.size > 0 && (
                        <TouchableOpacity style={styles.bulkBtn} onPress={handleBulkApprove}>
                            <CheckCircle size={16} color="white" />
                            <Text style={styles.bulkBtnText}>Approve ({selectedRooms.size})</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <FlatList
                    data={inspectionRooms}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    renderItem={({ item }) => {
                        const isSelected = selectedRooms.has(item.id);
                        return (
                            <TouchableOpacity
                                style={[styles.roomCard, isSelected && styles.roomCardSelected]}
                                onPress={() => toggleSelection(item.id)}
                            >
                                <View style={styles.roomHeader}>
                                    <Text style={styles.roomNumber}>Room {item.number}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: '#FEFCBF' }]}>
                                        <Text style={{ color: '#D69E2E', fontSize: 10, fontWeight: 'bold' }}>INSPECT</Text>
                                    </View>
                                </View>
                                <Text style={styles.roomInfo}>{item.type} • {item.cleaningType}</Text>
                                <Text style={styles.cleanerInfo}>Cleaned by: {item.guestDetails?.currentGuest || "Unknown"}</Text>

                                <View style={styles.actionRow}>
                                    <TouchableOpacity
                                        style={styles.rejectBtn}
                                        onPress={() => handleReject(item.id, item.number)}
                                    >
                                        <XCircle size={16} color={theme.colors.error} />
                                        <Text style={styles.rejectText}>Reject</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.approveBtn}
                                        onPress={() => updateRoomStatus(item.id, 'COMPLETED')}
                                    >
                                        <CheckCircle size={16} color="white" />
                                        <Text style={styles.approveText}>Approve</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No rooms pending inspection.</Text>}
                />
            </View>
        );
    };

    const renderTeam = () => (
        <View style={styles.content}>
            <Text style={styles.sectionTitle}>Live Team Tracker</Text>
            <FlatList
                data={staff.filter(s => s.role === 'CLEANER')}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => {
                    // Find active room for this cleaner
                    // Note: Ensure item.id (number) matches assigned_cleaner (number)
                    const activeRoom = rooms.find(r => r.assigned_cleaner === item.id && r.status === 'IN_PROGRESS');
                    const completedCount = rooms.filter(r => r.assigned_cleaner === item.id && r.status === 'COMPLETED').length;
                    const pendingCount = rooms.filter(r => r.assigned_cleaner === item.id && r.status === 'PENDING').length;

                    return (
                        <View style={styles.staffRow}>
                            <View style={[styles.avatar, activeRoom ? { backgroundColor: '#C6F6D5' } : {}]}>
                                <Text style={[styles.avatarText, activeRoom ? { color: '#22543D' } : {}]}>
                                    {item.username.charAt(0).toUpperCase()}
                                </Text>
                                {activeRoom && <View style={styles.onlineBadge} />}
                            </View>

                            <View style={{ flex: 1, marginLeft: 4 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.staffName}>{item.username}</Text>
                                    <View style={styles.miniStats}>
                                        <CheckCircle size={12} color={theme.colors.success} />
                                        <Text style={styles.miniStatsText}>{completedCount}</Text>
                                        <Text style={[styles.miniStatsText, { color: '#CBD5E0' }]}>|</Text>
                                        <Clock size={12} color={theme.colors.warning} />
                                        <Text style={styles.miniStatsText}>{pendingCount}</Text>
                                    </View>
                                </View>

                                {activeRoom ? (
                                    <View style={styles.activeStatusRow}>
                                        <Text style={styles.activeStatusText}>
                                            Now in <Text style={{ fontWeight: 'bold' }}>Room {activeRoom.number}</Text>
                                        </Text>
                                        {/* Mock Timer Warning if > 30 mins (In real app, compare timestamps) */}
                                        {Math.random() > 0.7 && (
                                            <View style={styles.slowBadge}>
                                                <AlertTriangle size={10} color="white" />
                                                <Text style={styles.slowText}>Slow</Text>
                                            </View>
                                        )}
                                    </View>
                                ) : (
                                    <Text style={styles.idleText}>Idle / Break</Text>
                                )}

                                <Text style={styles.staffGroup}>{item.groupId || 'Unassigned'}</Text>
                            </View>
                        </View>
                    );
                }}
            />
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View>
                    <Text style={styles.headerTitle}>Supervisor</Text>
                    <Text style={styles.headerSubtitle}>{user?.username}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 15 }}>
                    <TouchableOpacity onPress={() => setNotificationsVisible(true)}>
                        <View>
                            <Bell size={24} color={theme.colors.primary} />
                            {announcements.length > 0 && <View style={styles.badgeDot} />}
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                        <LogOut size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.navTabs}>
                <TouchableOpacity
                    style={[styles.navTab, activeTab === 'OVERVIEW' && styles.navTabActive]}
                    onPress={() => setActiveTab('OVERVIEW')}
                >
                    <BarChart2 size={18} color={activeTab === 'OVERVIEW' ? theme.colors.primary : '#A0AEC0'} />
                    <Text style={[styles.navTabText, activeTab === 'OVERVIEW' && styles.navTextActive]}>Overview</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.navTab, activeTab === 'INSPECTIONS' && styles.navTabActive]}
                    onPress={() => setActiveTab('INSPECTIONS')}
                >
                    <ListChecks size={18} color={activeTab === 'INSPECTIONS' ? theme.colors.primary : '#A0AEC0'} />
                    <Text style={[styles.navTabText, activeTab === 'INSPECTIONS' && styles.navTextActive]}>Inspect</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.navTab, activeTab === 'TEAM' && styles.navTabActive]}
                    onPress={() => setActiveTab('TEAM')}
                >
                    <Users size={18} color={activeTab === 'TEAM' ? theme.colors.primary : '#A0AEC0'} />
                    <Text style={[styles.navTabText, activeTab === 'TEAM' && styles.navTextActive]}>Team</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'OVERVIEW' && renderOverview()}
            {activeTab === 'INSPECTIONS' && renderInspections()}
            {activeTab === 'TEAM' && renderTeam()}

            <NotificationsModal
                visible={notificationsVisible}
                onClose={() => setNotificationsVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7FAFC' },
    header: { padding: 24, paddingTop: 60, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A202C' },
    headerSubtitle: { fontSize: 13, color: '#718096' },
    logoutButton: { padding: 10, backgroundColor: '#EDF2F7', borderRadius: 8 },

    navTabs: { flexDirection: 'row', backgroundColor: 'white', padding: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
    navTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 6 },
    navTabActive: { backgroundColor: '#EBF8FF' },
    navTabText: { fontWeight: '600', color: '#A0AEC0' },
    navTextActive: { color: theme.colors.primary },

    content: { flex: 1, padding: 16 },
    sectionHeader: { marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748' },

    statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    statNumber: { fontSize: 24, fontWeight: 'bold', color: '#2D3748' },
    statLabel: { fontSize: 12, color: '#718096', fontWeight: '500' },

    activityCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, gap: 8 },
    activityText: { fontSize: 14, color: '#4A5568' },

    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    bulkBtn: { flexDirection: 'row', backgroundColor: theme.colors.success, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 6 },
    bulkBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

    roomCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
    roomCardSelected: { borderColor: theme.colors.primary, backgroundColor: '#EBF8FF' },
    roomHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    roomNumber: { fontSize: 18, fontWeight: 'bold', color: '#2D3748' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    roomInfo: { fontSize: 13, color: '#718096' },
    cleanerInfo: { fontSize: 12, color: '#A0AEC0', marginTop: 4, fontStyle: 'italic' },
    emptyText: { color: '#A0AEC0', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },

    staffRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'white', borderRadius: 12, marginBottom: 8, gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: '#4A5568' },
    staffName: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
    staffGroup: { fontSize: 12, color: theme.colors.primary },

    badgeDot: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: 'red', borderWidth: 1, borderColor: 'white' },

    // Live Tracker Styles
    onlineBadge: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.success, borderWidth: 2, borderColor: 'white' },
    miniStats: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F7FAFC', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    miniStatsText: { fontSize: 10, fontWeight: 'bold', color: '#4A5568' },
    activeStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    activeStatusText: { color: theme.colors.primary, fontSize: 13 },
    idleText: { color: '#A0AEC0', fontSize: 13, fontStyle: 'italic', marginTop: 2 },
    slowBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 2 },
    slowText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

    // Actions
    actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 12 },
    rejectBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, borderWidth: 1, borderColor: theme.colors.error, borderRadius: 8, gap: 4 },
    rejectText: { color: theme.colors.error, fontWeight: 'bold', fontSize: 12 },
    approveBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.success, borderRadius: 8, gap: 4 },
    approveText: { color: 'white', fontWeight: 'bold', fontSize: 12 }
});
