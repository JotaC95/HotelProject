import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useHotel, Room, Staff, CleaningType } from '../contexts/HotelContext';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { RoomCard } from '../components/RoomCard';
import { Star, LogOut, Download, CheckCircle, Clock, Users, Home, Plus, Wrench, Briefcase } from 'lucide-react-native';

export default function ReceptionScreen() {
    const { rooms, staff, setPriority, fetchStaff, updateStaffGroup, createRoom, startMaintenance, assignRoomToGroup } = useHotel();
    const { logout, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STAFF' | 'ROOMS'>('DASHBOARD');

    // UI State for Modals
    const [addRoomModalVisible, setAddRoomModalVisible] = useState(false);
    const [newRoomNumber, setNewRoomNumber] = useState('');
    const [newRoomType, setNewRoomType] = useState('Single');
    const [newCleaningType, setNewCleaningType] = useState<CleaningType>('DEPARTURE');

    // Maintenance Modal 
    const [maintModalVisible, setMaintModalVisible] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [maintReason, setMaintReason] = useState('');

    // --- Team Management Logic ---
    const [teamModalVisible, setTeamModalVisible] = useState(false);
    const [targetId, setTargetId] = useState<string | number | null>(null); // Room ID (string) or Staff ID (number)
    const [isAssigningStaff, setIsAssigningStaff] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');

    // Get unique existing groups
    const uniqueGroups = Array.from(new Set(staff.map(s => s.groupId).filter(Boolean))) as string[];

    const openTeamModal = (id: string | number, isStaff: boolean) => {
        setTargetId(id);
        setIsAssigningStaff(isStaff);
        setNewTeamName('');
        setTeamModalVisible(true);
    };

    const handleConfirmAssign = (groupName: string) => {
        if (!targetId) return;
        if (isAssigningStaff) {
            updateStaffGroup(targetId as number, groupName);
        } else {
            assignRoomToGroup(targetId as string, groupName);
        }
        setTeamModalVisible(false);
    };

    useEffect(() => {
        if (activeTab === 'STAFF') {
            fetchStaff();
        }
    }, [activeTab]);

    // --- Dashboard Logic ---
    const preArrivals = rooms.filter(r => r.cleaningType === 'PREARRIVAL').length;
    const departures = rooms.filter(r => r.cleaningType === 'DEPARTURE').length;
    const readyRooms = rooms.filter(r => r.status === 'COMPLETED').length;

    // --- Room Logic ---
    const handleAddRoom = () => {
        if (!newRoomNumber) return;
        createRoom({
            number: newRoomNumber,
            type: newRoomType as any,
            cleaningType: newCleaningType,
            configuration: { beds: '1 King', bedrooms: 1, extras: [] }
        });
        setAddRoomModalVisible(false);
        setNewRoomNumber('');
    };

    const openMaintenance = (roomId: string) => {
        setSelectedRoomId(roomId);
        setMaintModalVisible(true);
    };

    const submitMaintenance = () => {
        if (selectedRoomId && maintReason) {
            startMaintenance(selectedRoomId, maintReason);
            setMaintModalVisible(false);
            setMaintReason('');
            setSelectedRoomId(null);
        }
    };

    const handleAssignGroup = (roomId: string, currentGroup?: string) => {
        // Cycle: No Group -> Group 1 -> Group 2 -> Group 3 -> No Group
        let nextGroup = '';
        if (!currentGroup) nextGroup = 'Group 1';
        else if (currentGroup === 'Group 1') nextGroup = 'Group 2';
        else if (currentGroup === 'Group 2') nextGroup = 'Group 3';
        else nextGroup = '';

        assignRoomToGroup(roomId, nextGroup);
    };

    // --- Staff Logic ---
    const handleStaffGroupChange = (staffId: number, currentGroup?: string) => {
        // Simple cycle logic
        let nextGroup = '';
        if (!currentGroup) nextGroup = 'Group 1';
        else if (currentGroup === 'Group 1') nextGroup = 'Group 2';
        else if (currentGroup === 'Group 2') nextGroup = 'Group 3';
        else nextGroup = '';

        updateStaffGroup(staffId, nextGroup);
    };

    const renderDashboard = () => (
        <ScrollView style={styles.content}>
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <View style={[styles.iconBox, { backgroundColor: '#E6FFFA' }]}>
                        <Download size={20} color="#319795" />
                    </View>
                    <Text style={styles.statNumber}>{preArrivals}</Text>
                    <Text style={styles.statLabel}>Pre-Arrivals</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.iconBox, { backgroundColor: '#EBF8FF' }]}>
                        <Clock size={20} color="#3182CE" />
                    </View>
                    <Text style={styles.statNumber}>{departures}</Text>
                    <Text style={styles.statLabel}>Departures</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.iconBox, { backgroundColor: '#F0FFF4' }]}>
                        <CheckCircle size={20} color="#38A169" />
                    </View>
                    <Text style={styles.statNumber}>{readyRooms}</Text>
                    <Text style={styles.statLabel}>Ready Rooms</Text>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Priority Watchlist</Text>
            </View>
            {/* Only show Priority Rooms here */}
            {rooms.filter(r => r.receptionPriority).map(room => (
                <View key={room.id} style={styles.simpleRow}>
                    <Text style={styles.rowText}>Room {room.number}</Text>
                    <View style={styles.vipBadge}><Text style={styles.vipText}>VIP</Text></View>
                </View>
            ))}
            {rooms.filter(r => r.receptionPriority).length === 0 && (
                <Text style={styles.emptyText}>No VIP rooms set.</Text>
            )}
        </ScrollView>
    );

    const renderStaff = () => (
        <View style={styles.content}>
            <Text style={styles.sectionTitle}>Staff Management</Text>
            <Text style={styles.sectionSubtitle}>Tap to assign groups to cleaners.</Text>

            <FlatList
                data={staff.filter(s => s.role === 'CLEANER')}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.staffCard}
                        onPress={() => openTeamModal(item.id, true)}
                    >
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.staffName}>{item.username}</Text>
                            <Text style={styles.staffRole}>Cleaner</Text>
                        </View>
                        <View style={[styles.groupBadge, item.groupId ? styles.groupActive : styles.groupInactive]}>
                            <Text style={styles.groupText}>{item.groupId || "No Group"}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return '#48BB78'; // Green
            case 'INSPECTION': return '#ECC94B'; // Yellow
            case 'IN_PROGRESS': return '#4299E1'; // Blue
            case 'MAINTENANCE': return '#F56565'; // Red
            default: return '#A0AEC0'; // Gray
        }
    };

    const renderRooms = () => (
        <View style={styles.content}>
            <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Room Management</Text>
            </View>

            <FlatList
                data={rooms}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                    <View style={[styles.roomEditRow, { alignItems: 'flex-start' }]}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginRight: 8 }}>
                                    {item.number}
                                </Text>
                                <View style={{ backgroundColor: getStatusColor(item.status) + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: '700' }}>
                                        {item.status}
                                    </Text>
                                </View>
                            </View>

                            <Text style={{ fontSize: 13, color: '#718096', marginBottom: 8 }}>
                                {item.type} • {item.cleaningType.replace('_', ' ')}
                            </Text>

                            {/* Guest Details */}
                            {item.guestDetails?.currentGuest ? (
                                <View style={{ backgroundColor: '#F7FAFC', padding: 8, borderRadius: 8, marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                        <Users size={14} color="#4A5568" style={{ marginRight: 6 }} />
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#2D3748' }}>
                                            {item.guestDetails.currentGuest}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Clock size={14} color="#718096" style={{ marginRight: 6 }} />
                                        <Text style={{ fontSize: 12, color: '#718096' }}>
                                            {item.guestDetails.checkInDate} - {item.guestDetails.checkOutDate}
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <Text style={{ fontSize: 12, color: '#A0AEC0', marginBottom: 8, fontStyle: 'italic' }}>Vacant</Text>
                            )}

                            {/* Next Guest Info (if any) */}
                            {item.guestDetails?.nextGuest && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                    <Text style={{ fontSize: 12, color: '#718096' }}>🔜 </Text>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#4A5568' }}>
                                        {item.guestDetails.nextGuest}
                                    </Text>
                                    {item.guestDetails.nextArrival && (
                                        <Text style={{ fontSize: 12, color: '#718096' }}> @ {item.guestDetails.nextArrival}</Text>
                                    )}
                                </View>
                            )}
                        </View>

                        <View style={{ alignItems: 'flex-end', gap: 8 }}>
                            {/* Priority Button */}
                            <TouchableOpacity onPress={() => setPriority(item.id, !item.receptionPriority)}>
                                <Star
                                    size={22}
                                    color={item.receptionPriority ? "#D69E2E" : "#E2E8F0"}
                                    fill={item.receptionPriority ? "#D69E2E" : "transparent"}
                                />
                            </TouchableOpacity>

                            {/* Group Assignment Button */}
                            <TouchableOpacity
                                style={[
                                    styles.groupActionBadge,
                                    item.assignedGroup ? styles.groupActionActive : styles.groupActionInactive,
                                    { minWidth: 90, justifyContent: 'center', alignItems: 'center', paddingVertical: 6 }
                                ]}
                                onPress={() => openTeamModal(item.id, false)}
                            >
                                <Briefcase size={14} color={item.assignedGroup ? theme.colors.primary : '#A0AEC0'} style={{ marginBottom: 2 }} />
                                <Text style={[styles.groupActionText, item.assignedGroup && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                                    {item.assignedGroup ? item.assignedGroup : 'Assign'}
                                </Text>
                            </TouchableOpacity>

                            {/* Maintenance Button */}
                            <TouchableOpacity
                                onPress={() => openMaintenance(item.id)}
                                style={[styles.iconBtn, { backgroundColor: item.status === 'MAINTENANCE' ? '#FED7D7' : '#F7FAFC' }]}
                            >
                                <Wrench size={18} color={item.status === 'MAINTENANCE' ? theme.colors.error : '#A0AEC0'} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        </View>
    );

    const CLEANING_OPTIONS: CleaningType[] = ['DEPARTURE', 'STAYOVER', 'PREARRIVAL', 'HOLDOVER', 'WEEKLY', 'RUBBISH', 'DAYUSE'];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Reception Manager</Text>
                    <Text style={styles.headerSubtitle}>Logged in as {user?.username}</Text>
                </View>
                <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                    <LogOut size={20} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Navigation Tabs */}
            <View style={styles.navTabs}>
                <TouchableOpacity
                    style={[styles.navTab, activeTab === 'DASHBOARD' && styles.navTabActive]}
                    onPress={() => setActiveTab('DASHBOARD')}
                >
                    <Home size={18} color={activeTab === 'DASHBOARD' ? theme.colors.primary : '#A0AEC0'} />
                    <Text style={[styles.navTabText, activeTab === 'DASHBOARD' && styles.navTextActive]}>Overview</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.navTab, activeTab === 'STAFF' && styles.navTabActive]}
                    onPress={() => setActiveTab('STAFF')}
                >
                    <Users size={18} color={activeTab === 'STAFF' ? theme.colors.primary : '#A0AEC0'} />
                    <Text style={[styles.navTabText, activeTab === 'STAFF' && styles.navTextActive]}>Staff</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.navTab, activeTab === 'ROOMS' && styles.navTabActive]}
                    onPress={() => setActiveTab('ROOMS')}
                >
                    <Home size={18} color={activeTab === 'ROOMS' ? theme.colors.primary : '#A0AEC0'} />
                    <Text style={[styles.navTabText, activeTab === 'ROOMS' && styles.navTextActive]}>Rooms</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'DASHBOARD' && renderDashboard()}
            {activeTab === 'STAFF' && renderStaff()}
            {activeTab === 'ROOMS' && renderRooms()}

            {/* Add Room Modal */}
            <Modal
                transparent={true}
                visible={addRoomModalVisible}
                animationType="slide"
                onRequestClose={() => setAddRoomModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Room</Text>

                        <Text style={styles.label}>Room Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 105"
                            value={newRoomNumber}
                            onChangeText={setNewRoomNumber}
                            keyboardType="numeric"
                        />

                        <Text style={styles.label}>Room Type</Text>
                        <View style={styles.typeRow}>
                            {['Single', 'Double', 'Suite'].map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.typeOption, newRoomType === t && styles.typeActive]}
                                    onPress={() => setNewRoomType(t)}
                                >
                                    <Text style={[styles.typeText, newRoomType === t && { color: 'white' }]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Initial Cleaning Status</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                            {CLEANING_OPTIONS.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.typeOption, newCleaningType === t && styles.typeActive, { marginRight: 8 }]}
                                    onPress={() => setNewCleaningType(t)}
                                >
                                    <Text style={[styles.typeText, newCleaningType === t && { color: 'white' }]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setAddRoomModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSubmit} onPress={handleAddRoom}>
                                <Text style={styles.modalSubmitText}>Create Room</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Team Assignment Modal */}
            <Modal visible={teamModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Assign Team</Text>
                        <Text style={styles.sectionSubtitle}>Select existing or create new</Text>

                        <ScrollView style={{ maxHeight: 200, marginBottom: 15 }}>
                            <TouchableOpacity onPress={() => handleConfirmAssign('')} style={styles.optionRow}>
                                <Text style={styles.optionText}>Unassigned (No Group)</Text>
                            </TouchableOpacity>
                            {uniqueGroups.map(g => (
                                <TouchableOpacity key={g} onPress={() => handleConfirmAssign(g)} style={styles.optionRow}>
                                    <Text style={styles.optionText}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Or Create New:</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TextInput
                                placeholder="Team Name (e.g. Night Squad)"
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                value={newTeamName}
                                onChangeText={setNewTeamName}
                            />
                            <TouchableOpacity
                                onPress={() => handleConfirmAssign(newTeamName)}
                                style={[styles.modalSubmit, { width: 'auto', paddingHorizontal: 15 }]}
                                disabled={!newTeamName.trim()}
                            >
                                <Plus color="white" size={20} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => setTeamModalVisible(false)} style={[styles.modalCancel, { marginTop: 15, alignSelf: 'stretch' }]}>
                            <Text style={{ textAlign: 'center', color: '#718096', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Maintenance Modal */}
            <Modal
                transparent={true}
                visible={maintModalVisible}
                animationType="fade"
                onRequestClose={() => setMaintModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.modalTitle}>Report Maintenance</Text>
                            <Wrench size={24} color={theme.colors.error} />
                        </View>

                        <Text style={styles.label}>Reason for block:</Text>
                        <TextInput
                            style={[styles.input, { minHeight: 80 }]}
                            placeholder="e.g. Broken Lock, Painting..."
                            value={maintReason}
                            onChangeText={setMaintReason}
                            multiline
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setMaintModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalSubmit, { backgroundColor: theme.colors.error }]} onPress={submitMaintenance}>
                                <Text style={styles.modalSubmitText}>Block Room</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    statNumber: { fontSize: 24, fontWeight: 'bold', color: '#2D3748' },
    statLabel: { fontSize: 12, color: '#718096', fontWeight: '500' },

    sectionHeader: { marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748' },
    sectionSubtitle: { fontSize: 14, color: '#718096', marginBottom: 16 },
    emptyText: { color: '#A0AEC0', fontStyle: 'italic' },

    simpleRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderRadius: 8, marginBottom: 8, alignItems: 'center' },
    rowText: { fontSize: 16, fontWeight: '600', color: '#2D3748' },
    vipBadge: { backgroundColor: '#D69E2E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    vipText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

    // Staff Styles
    staffCard: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center', gap: 12, marginBottom: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: '#4A5568' },
    staffName: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
    staffRole: { fontSize: 12, color: '#718096' },
    groupBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    groupActive: { backgroundColor: theme.colors.primary + '20' },
    groupInactive: { backgroundColor: '#EDF2F7' },
    groupText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },

    // Room Edit Styles
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    addButton: { flexDirection: 'row', backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 6 },
    addButtonText: { color: 'white', fontWeight: 'bold' },
    roomEditRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: 16, borderRadius: 8, marginBottom: 8 },
    roomEditText: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
    roomEditType: { color: '#718096', fontSize: 12, marginTop: 2 },
    actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, // Added gap
    iconBtn: { padding: 4 },

    // Group Action
    groupActionBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, gap: 4, marginRight: 4 },
    groupActionActive: { backgroundColor: theme.colors.primary + '20' },
    groupActionInactive: { backgroundColor: '#EDF2F7' },
    groupActionText: { fontSize: 10, fontWeight: 'bold', color: '#A0AEC0' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#2D3748' },
    label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
    input: { backgroundColor: '#F7FAFC', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
    typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    typeOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#EDF2F7' },
    typeActive: { backgroundColor: theme.colors.primary },
    typeText: { color: '#4A5568', fontWeight: '600' },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalCancel: { padding: 12 },
    modalCancelText: { color: '#718096', fontWeight: '600' },
    modalSubmit: { backgroundColor: theme.colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
    modalSubmitText: { color: 'white', fontWeight: 'bold' },
    optionRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
    optionText: { fontSize: 16, color: '#4A5568' },
});
