import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ScrollView } from 'react-native';
import { useHotel, Room, Staff, CleaningType } from '../contexts/HotelContext';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { RoomCard } from '../components/RoomCard';
import { Star, LogOut, Download, CheckCircle, Clock, Users, Home, Plus, Wrench, Briefcase, Bell, Calendar, AlertTriangle, Search, Filter, X, Sparkles } from 'lucide-react-native';
import { NotificationsModal } from '../components/NotificationsModal';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReceptionScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { rooms, staff, setPriority, fetchStaff, updateStaffGroup, createRoom, startMaintenance, assignRoomToGroup, announcements, addIncident, resolveIncident, moveGuest } = useHotel(); // Added moveGuest
    const { logout, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STAFF' | 'ROOMS' | 'REQUESTS' | 'TEAMS'>('DASHBOARD'); // Added TEAMS
    const [notificationsVisible, setNotificationsVisible] = useState(false);
    const insets = useSafeAreaInsets();

    // UI State for Modals
    const [addRoomModalVisible, setAddRoomModalVisible] = useState(false);
    const [newRoomNumber, setNewRoomNumber] = useState('');
    const [newRoomType, setNewRoomType] = useState('Single');
    const [newCleaningType, setNewCleaningType] = useState<CleaningType>('DEPARTURE');

    // Guest Request Modal
    const [requestModalVisible, setRequestModalVisible] = useState(false);
    const [requestRoomNumber, setRequestRoomNumber] = useState('');
    const [requestDesc, setRequestDesc] = useState('');

    // Maintenance Modal 
    const [maintModalVisible, setMaintModalVisible] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [maintReason, setMaintReason] = useState('');

    // --- Team Management Logic ---
    const [teamModalVisible, setTeamModalVisible] = useState(false);
    const [targetId, setTargetId] = useState<string | number | null>(null); // Room ID (string) or Staff ID (number) or 'BULK'
    const [isAssigningStaff, setIsAssigningStaff] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');

    // Room Move Logic
    const [moveModalVisible, setMoveModalVisible] = useState(false);
    const [moveFromId, setMoveFromId] = useState<string | null>(null);
    const [moveToId, setMoveToId] = useState<string | null>(null);

    // --- Search & Filter State (Reception 2.0) ---
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'DIRTY' | 'INSPECTION' | 'CLEAN' | 'VIP' | 'VACANT'>('ALL');

    // --- Phase 2: Bulk Actions ---
    const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const toggleSelection = (roomId: string) => {
        if (selectedRooms.includes(roomId)) {
            const newSelection = selectedRooms.filter(id => id !== roomId);
            setSelectedRooms(newSelection);
            if (newSelection.length === 0) setIsSelectionMode(false);
        } else {
            setSelectedRooms([...selectedRooms, roomId]);
            setIsSelectionMode(true);
        }
    };

    const handleBulkAssign = (groupName: string) => {
        selectedRooms.forEach(roomId => {
            assignRoomToGroup(roomId, groupName);
        });
        setIsSelectionMode(false);
        setSelectedRooms([]);
        Alert.alert("Success", `Assigned ${selectedRooms.length} rooms to ${groupName}`);
    };

    const handleBulkPriority = () => {
        selectedRooms.forEach(roomId => {
            setPriority(roomId, true);
        });
        setIsSelectionMode(false);
        setSelectedRooms([]);
        Alert.alert("Success", `Marked ${selectedRooms.length} rooms as Priority`);
    };

    const handleAutoAssign = () => {
        // Phase 4: Auto-Assignment Algorithm
        const unassignedRooms = rooms.filter(r => !r.assignedGroup && (r.status === 'PENDING' || r.status === 'IN_PROGRESS' || r.status === 'INSPECTION'));

        // Extract unique groups from staff
        const activeGroups = Array.from(new Set(staff.map(s => s.groupId || s.group_id).filter(Boolean))) as string[];

        if (activeGroups.length === 0) {
            Alert.alert("No Teams", "Please create teams and assign staff before auto-assigning.");
            return;
        }

        if (unassignedRooms.length === 0) {
            Alert.alert("All Clear", "No unassigned rooms to distribute.");
            return;
        }

        Alert.alert(
            "Auto-Assign Rooms",
            `Distribute ${unassignedRooms.length} rooms across ${activeGroups.length} teams (${activeGroups.join(', ')})?`,
            [
                { text: "Cancel", style: 'cancel' },
                {
                    text: "Distribute",
                    onPress: () => {
                        let assignedCount = 0;
                        unassignedRooms.forEach((room, index) => {
                            const team = activeGroups[index % activeGroups.length];
                            assignRoomToGroup(room.id, team);
                            assignedCount++;
                        });
                        Alert.alert("Success", `Distributed ${assignedCount} rooms.`);
                    }
                }
            ]
        );
    };

    const handleClearSelection = () => {
        setSelectedRooms([]);
        setIsSelectionMode(false);
    };

    const handleMoveGuest = async () => {
        if (moveFromId && moveToId) {
            const sourceRoom = rooms.find(r => r.id === moveFromId);
            const targetRoom = rooms.find(r => r.id === moveToId);

            if (!sourceRoom || !targetRoom) return;

            // Check Configuration Mismatch
            const sourceConfig = JSON.stringify(sourceRoom.configuration);
            const targetConfig = JSON.stringify(targetRoom.configuration);
            // Note: simple stringify comparison, ideally check specific fields like 'beds'

            // Better config check:
            const bedsDiffer = sourceRoom.configuration?.beds !== targetRoom.configuration?.beds;
            const roomsDiffer = sourceRoom.configuration?.bedrooms !== targetRoom.configuration?.bedrooms;

            if (bedsDiffer || roomsDiffer) {
                Alert.alert(
                    "Configuration Mismatch",
                    `Target room has different setup.\nSource: ${sourceRoom.configuration?.beds || 'N/A'}\nTarget: ${targetRoom.configuration?.beds || 'N/A'}\n\nUpdate target to match source?`,
                    [
                        {
                            text: "No, Keep Target Config",
                            onPress: async () => {
                                await moveGuest(moveFromId, moveToId, false);
                                closeMoveModal();
                            }
                        },
                        {
                            text: "Yes, Update Config",
                            onPress: async () => {
                                await moveGuest(moveFromId, moveToId, true);
                                closeMoveModal();
                            }
                        }
                    ]
                );
            } else {
                // Same config, just move
                await moveGuest(moveFromId, moveToId, false);
                closeMoveModal();
            }
        }
    };

    const closeMoveModal = () => {
        setMoveModalVisible(false);
        setMoveFromId(null);
        setMoveToId(null);
    }

    // Filter compatible rooms logic
    const getSourceType = () => {
        if (!moveFromId) return null;
        return rooms.find(r => r.id === moveFromId)?.type;
    };

    const compatibleRooms = rooms.filter(r =>
        !r.guestDetails?.currentGuest &&
        (r.status === 'COMPLETED' || r.status === 'INSPECTION') &&
        (!getSourceType() || r.type === getSourceType()) // Strict Type Match as per plan
    );


    // Get unique existing groups
    const uniqueGroups = Array.from(new Set(staff.map(s => s.groupId).filter(Boolean))) as string[];

    const openTeamModal = (id: string | number, isStaff: boolean) => {
        setTargetId(id);
        setIsAssigningStaff(isStaff);
        setNewTeamName('');
        setTeamModalVisible(true);
    };

    const handleConfirmAssign = (groupName: string) => {
        if (targetId === 'BULK') {
            handleBulkAssign(groupName);
            setTeamModalVisible(false);
            return;
        }

        if (!targetId) return;
        if (isAssigningStaff) {
            updateStaffGroup(targetId as number, groupName);
        } else {
            assignRoomToGroup(targetId as string, groupName);
        }
        setTeamModalVisible(false);
    };

    const handleCreateRequest = () => {
        if (!requestRoomNumber || !requestDesc) {
            Alert.alert("Error", "Please enter room number and description");
            return;
        }

        const room = rooms.find(r => r.number === requestRoomNumber);
        if (!room) {
            Alert.alert("Error", "Room not found");
            return;
        }

        addIncident(room.id, requestDesc, user?.username || 'Reception', 'RECEPTION', undefined, undefined, 'GUEST_REQ');
        setRequestModalVisible(false);
        setRequestRoomNumber('');
        setRequestDesc('');
        Alert.alert("Success", "Guest request logged.");
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
                    <View style={[styles.iconBox, { backgroundColor: '#FFF5F5' }]}>
                        <Users size={20} color="#E53E3E" />
                    </View>
                    <Text style={styles.statNumber}>{rooms.filter(r => r.guestStatus === 'GUEST_IN_ROOM').length}</Text>
                    <Text style={styles.statLabel}>In Room</Text>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Priority Watchlist</Text>
            </View>
            {/* Show Priority Rooms: Manually Starred OR Next Arrival Set */}
            {rooms.filter(r => r.receptionPriority || r.guestDetails?.nextArrival).sort((a, b) => {
                // Sort by: Manual Priority > Next Arrival Time
                if (a.receptionPriority && !b.receptionPriority) return -1;
                if (!a.receptionPriority && b.receptionPriority) return 1;
                return (a.guestDetails?.nextArrival || '').localeCompare(b.guestDetails?.nextArrival || '');
            }).map(room => (
                <TouchableOpacity key={room.id} style={styles.simpleRow} onPress={() => navigation.navigate('RoomDetail', { roomId: room.id })}>
                    <Text style={styles.rowText}>Room {room.number}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        {room.guestDetails?.nextArrival && (
                            <View style={[styles.vipBadge, { backgroundColor: theme.colors.primary }]}>
                                <Text style={styles.vipText}>@{new Date(room.guestDetails.nextArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                            </View>
                        )}
                        {room.receptionPriority === 1 && (
                            <View style={styles.vipBadge}><Text style={styles.vipText}>VIP</Text></View>
                        )}
                    </View>
                </TouchableOpacity>
            ))}
            {rooms.filter(r => r.receptionPriority || r.guestDetails?.nextArrival).length === 0 && (
                <Text style={styles.emptyText}>No priority watch items.</Text>
            )}
        </ScrollView>
    );

    const renderRoomsByGroup = (groupName: string, groupRooms: Room[]) => {
        const completed = groupRooms.filter(r => r.status === 'COMPLETED').length;
        const inspection = groupRooms.filter(r => r.status === 'INSPECTION').length;
        const total = groupRooms.length;
        const progress = total > 0 ? (completed / total) : 0;

        // Find staff in this group
        const groupStaff = staff.filter(s => s.groupId === groupName && s.role === 'CLEANER');

        return (
            <View style={styles.teamCard}>
                <View style={styles.teamHeader}>
                    <View>
                        <Text style={styles.teamTitle}>{groupName || "Unassigned Rooms"}</Text>
                        <Text style={styles.teamSubtitle}>
                            {groupStaff.length > 0
                                ? `${groupStaff.map(s => s.username).join(', ')}`
                                : "No cleaners assigned"}
                        </Text>
                    </View>
                    <View style={styles.teamStats}>
                        <Text style={styles.teamProgressText}>{completed}/{total} Cleaned</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                    </View>
                </View>

                {/* Inspection Alert */}
                {inspection > 0 && (
                    <TouchableOpacity style={styles.inspectionAlert} onPress={() => setActiveTab('ROOMS')}>
                        <AlertTriangle size={16} color="#B7791F" />
                        <Text style={styles.inspectionText}>{inspection} Rooms waiting for Inspection!</Text>
                    </TouchableOpacity>
                )}

                {/* Mini Room List */}
                <View style={styles.miniGrid}>
                    {groupRooms.map(r => (
                        <TouchableOpacity
                            key={r.id}
                            style={[
                                styles.miniRoomBadge,
                                { backgroundColor: getStatusColor(r.status) + '20', borderColor: getStatusColor(r.status) }
                            ]}
                            onPress={() => navigation.navigate('RoomDetail', { roomId: r.id })}
                        >
                            <Text style={[styles.miniRoomText, { color: getStatusColor(r.status) }]}>{r.number}</Text>
                            {r.status === 'INSPECTION' && <View style={styles.dot} />}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    const renderTeams = () => {
        // defined groups
        const groups = ['Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5']; // Or dynamic
        const assignedRooms = rooms.filter(r => r.assignedGroup);
        const unassignedRooms = rooms.filter(r => !r.assignedGroup);

        // Dynamic groups from actual assignments + staff assignments
        const activeGroups = Array.from(new Set([
            ...rooms.map(r => r.assignedGroup).filter(Boolean),
            ...staff.map(s => s.groupId).filter(Boolean)
        ])).sort();

        return (
            <ScrollView style={styles.content}>
                <Text style={styles.sectionTitle}>Team Progress</Text>
                <Text style={styles.sectionSubtitle}>Monitor cleaning progress by team.</Text>

                {activeGroups.map(group => {
                    const groupRooms = rooms.filter(r => r.assignedGroup === group);
                    return <View key={group}>{renderRoomsByGroup(group as string, groupRooms)}</View>;
                })}

                {unassignedRooms.length > 0 && renderRoomsByGroup("", unassignedRooms)}

                <View style={{ height: 40 }} />
            </ScrollView>
        );
    };

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

    const renderMaintenance = () => {
        // Collect all incidents from rooms
        const allIncidents = rooms.flatMap(r =>
            (r.incidents || []).map(inc => ({ ...inc, roomId: r.id, roomNumber: r.number }))
        ).filter(inc => inc.status === 'OPEN');

        return (
            <View style={styles.content}>
                <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Maintenance Hub ({allIncidents.length})</Text>
                </View>

                {allIncidents.length === 0 ? (
                    <View style={styles.emptyState}>
                        <CheckCircle size={48} color="#C6F6D5" />
                        <Text style={styles.emptyStateText}>All systems operational!</Text>
                        <Text style={styles.emptyStateSubtext}>No open maintenance incidents.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={allIncidents}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => (
                            <View style={styles.incidentCard}>
                                <View style={styles.incidentRow}>
                                    <View style={styles.incidentInfo}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                            <Text style={styles.incidentRoom}>Room {item.roomNumber}</Text>
                                            {item.priority && (
                                                <View style={styles.priorityBadge}>
                                                    <AlertTriangle size={10} color="white" />
                                                    <Text style={styles.priorityText}>HIGH</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.incidentDesc}>{item.description}</Text>
                                        <Text style={styles.incidentTime}>{new Date(item.timestamp).toLocaleString()}</Text>
                                    </View>

                                    <View style={styles.incidentActions}>
                                        <TouchableOpacity
                                            style={styles.resolveBtn}
                                            onPress={() => resolveIncident(item.roomId, item.id, "Resolved by Reception")}
                                        >
                                            <CheckCircle size={16} color="white" />
                                            <Text style={styles.resolveBtnText}>Resolve</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                {item.photos && item.photos.length > 0 && (
                                    <View style={styles.photoContainer}>
                                        <Text style={styles.photoLabel}>{item.photos.length} Photo(s) Attached</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    />
                )}
            </View>
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return '#48BB78'; // Green
            case 'INSPECTION': return '#ECC94B'; // Yellow
            case 'IN_PROGRESS': return '#4299E1'; // Blue
            case 'MAINTENANCE': return '#F56565'; // Red
            default: return '#A0AEC0'; // Gray
        }
    };

    const renderRooms = () => {
        // --- Filter Logic ---
        const filteredRooms = rooms.filter(r => {
            const matchesSearch = r.number.includes(searchQuery);
            let matchesStatus = true;

            if (filterStatus === 'INSPECTION') matchesStatus = r.status === 'INSPECTION';
            if (filterStatus === 'CLEAN') matchesStatus = r.status === 'COMPLETED';
            if (filterStatus === 'DIRTY') matchesStatus = r.status === 'PENDING' || r.status === 'IN_PROGRESS';
            if (filterStatus === 'VIP') matchesStatus = !!r.receptionPriority;
            if (filterStatus === 'VACANT') matchesStatus = !r.guestDetails?.currentGuest;

            return matchesSearch && matchesStatus;
        });

        // Sort: Inspection Top, then Priority, then Number
        const sortedRooms = filteredRooms.sort((a, b) => {
            if (a.status === 'INSPECTION' && b.status !== 'INSPECTION') return -1;
            if (a.status !== 'INSPECTION' && b.status === 'INSPECTION') return 1;
            if (a.receptionPriority && !b.receptionPriority) return -1;
            if (!a.receptionPriority && b.receptionPriority) return 1;
            return a.number.localeCompare(b.number);
        });

        return (
            <View style={styles.content}>
                <View style={styles.rowBetween}>
                    <Text style={styles.sectionTitle}>Room Management ({sortedRooms.length})</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: theme.colors.secondary }]}
                            onPress={handleAutoAssign}
                        >
                            <Sparkles size={16} color="white" />
                            <Text style={styles.addButtonText}>Auto Assign</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: theme.colors.warning }]}
                            onPress={() => setMoveModalVisible(true)}
                        >
                            <Briefcase size={16} color="white" />
                            <Text style={styles.addButtonText}>Move Guest</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- Bulk Action Header --- */}
                {isSelectionMode && (
                    <View style={styles.bulkHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity onPress={handleClearSelection}><X size={20} color="white" /></TouchableOpacity>
                            <Text style={styles.bulkTitle}>{selectedRooms.length} Selected</Text>
                        </View>
                        <View style={styles.bulkActions}>
                            <TouchableOpacity style={styles.bulkBtn} onPress={() => openTeamModal('BULK', false)}>
                                <Text style={styles.bulkBtnText}>Assign Group</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.bulkBtn} onPress={handleBulkPriority}>
                                <Text style={styles.bulkBtnText}>Set VIP</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* --- Search & Filters (Hide if Selecting) --- */}
                {!isSelectionMode && (
                    <View style={{ marginBottom: 16 }}>
                        {/* Search Bar */}
                        <View style={styles.searchBar}>
                            <Search size={20} color="#A0AEC0" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search Room #"
                                placeholderTextColor="#A0AEC0"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <X size={18} color="#A0AEC0" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Filter Chips */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                            {(['ALL', 'DIRTY', 'INSPECTION', 'CLEAN', 'VIP', 'VACANT'] as const).map(filter => (
                                <TouchableOpacity
                                    key={filter}
                                    style={[
                                        styles.filterChip,
                                        filterStatus === filter && styles.filterChipActive,
                                        filter === 'INSPECTION' && filterStatus === filter && { backgroundColor: '#F6E05E', borderColor: '#F6E05E' },
                                        filter === 'DIRTY' && filterStatus === filter && { backgroundColor: '#FC8181', borderColor: '#FC8181' },
                                        filter === 'CLEAN' && filterStatus === filter && { backgroundColor: '#68D391', borderColor: '#68D391' }
                                    ]}
                                    onPress={() => setFilterStatus(filter)}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        filterStatus === filter && styles.filterChipTextActive,
                                        (filter === 'INSPECTION' || filter === 'DIRTY' || filter === 'CLEAN') && filterStatus === filter && { color: 'white' }
                                    ]}>
                                        {filter}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <FlatList
                    data={sortedRooms}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 60 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onLongPress={() => toggleSelection(item.id)}
                            onPress={() => {
                                if (isSelectionMode) toggleSelection(item.id);
                                else navigation.navigate('RoomDetail', { roomId: item.id });
                            }}
                            activeOpacity={0.9}
                        >
                            <View style={[styles.roomEditRow, { alignItems: 'flex-start' }, selectedRooms.includes(item.id) && styles.roomRowSelected]}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        {isSelectionMode && (
                                            <View style={{ width: 30, justifyContent: 'center' }}>
                                                {selectedRooms.includes(item.id) ? (
                                                    <CheckCircle size={20} color={theme.colors.primary} fill={theme.colors.primary} />
                                                ) : (
                                                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E0' }} />
                                                )}
                                            </View>
                                        )}
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
                        </TouchableOpacity>
                    )}
                />
            </View>
        );
    };

    const CLEANING_OPTIONS: CleaningType[] = ['DEPARTURE', 'STAYOVER', 'PREARRIVAL', 'HOLDOVER', 'WEEKLY', 'RUBBISH', 'DAYUSE'];

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View>
                    <Text style={styles.headerTitle}>Reception Manager</Text>
                    <Text style={styles.headerSubtitle}>Logged in as {user?.username}</Text>
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
                <TouchableOpacity
                    style={styles.navTab}
                    onPress={() => navigation.navigate('Roster')}
                >
                    <Calendar size={18} color={'#A0AEC0'} />
                    <Text style={styles.navTabText}>Roster</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.navTab, activeTab === 'REQUESTS' && styles.navTabActive]}
                    onPress={() => setActiveTab('REQUESTS')}
                >
                    <Briefcase size={18} color={activeTab === 'REQUESTS' ? theme.colors.primary : '#A0AEC0'} />
                    <Text style={[styles.navTabText, activeTab === 'REQUESTS' && styles.navTextActive]}>Requests</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.navTab, activeTab === 'TEAMS' && styles.navTabActive]}
                    onPress={() => setActiveTab('TEAMS')}
                >
                    <Users size={18} color={activeTab === 'TEAMS' ? theme.colors.primary : '#A0AEC0'} />
                    <Text style={[styles.navTabText, activeTab === 'TEAMS' && styles.navTextActive]}>Teams</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'DASHBOARD' && renderDashboard()}
            {activeTab === 'TEAMS' && renderTeams()}
            {activeTab === 'STAFF' && renderStaff()}
            {activeTab === 'ROOMS' && renderRooms()}
            {activeTab === 'REQUESTS' && (
                <View style={styles.content}>
                    <TouchableOpacity style={styles.addItemButton} onPress={() => setRequestModalVisible(true)}>
                        <Plus size={20} color="white" />
                        <Text style={styles.addItemText}>New Guest Request</Text>
                    </TouchableOpacity>
                    <FlatList
                        data={rooms.flatMap(r => r.incidents.map(i => ({ ...i, roomNumber: r.number, roomId: r.id }))).filter(i => i.category === 'GUEST_REQ')}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.listCard}>
                                <View style={styles.listHeader}>
                                    <Text style={styles.listTitle}>Room {item.roomNumber}</Text>
                                    <Text style={[styles.statusBadge, { color: item.status === 'OPEN' ? 'orange' : 'green' }]}>{item.status}</Text>
                                </View>
                                <Text style={styles.listSubtitle}>{item.text}</Text>
                                <Text style={styles.listMeta}>Requested by {item.user} • {new Date(item.timestamp).toLocaleTimeString()}</Text>
                                {item.status === 'OPEN' && (
                                    <TouchableOpacity style={styles.resolveButton} onPress={() => resolveIncident(item.roomId!, item.id)}>
                                        <CheckCircle size={16} color="white" />
                                        <Text style={styles.resolveButtonText}>Complete</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                        ListEmptyComponent={<Text style={styles.emptyText}>No active guest requests.</Text>}
                    />
                </View>
            )}

            {/* Guest Request Modal */}
            <Modal
                transparent={true}
                visible={requestModalVisible}
                animationType="slide"
                onRequestClose={() => setRequestModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Guest Request</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Room Number (e.g. 101)"
                            value={requestRoomNumber}
                            onChangeText={setRequestRoomNumber}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Request (e.g. Extra Pillow)"
                            value={requestDesc}
                            onChangeText={setRequestDesc}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setRequestModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSubmit} onPress={handleCreateRequest}>
                                <Text style={styles.modalSubmitText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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

            <Modal
                transparent={true}
                visible={moveModalVisible}
                animationType="slide"
                onRequestClose={() => setMoveModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Move Guest</Text>

                        <Text style={styles.label}>Move From (Occupied)</Text>
                        <ScrollView style={{ maxHeight: 150, marginBottom: 15 }}>
                            {rooms.filter(r => r.guestDetails?.currentGuest).map(r => (
                                <TouchableOpacity
                                    key={r.id}
                                    style={[styles.typeOption, moveFromId === r.id && styles.typeActive, { marginBottom: 6 }]}
                                    onPress={() => setMoveFromId(r.id)}
                                >
                                    <Text style={[styles.typeText, moveFromId === r.id && { color: 'white' }]}>
                                        {r.number} - {r.guestDetails?.currentGuest}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Move To (Vacant/Clean)</Text>
                        <ScrollView style={{ maxHeight: 150, marginBottom: 15 }}>
                            {compatibleRooms.map(r => (
                                <TouchableOpacity
                                    key={r.id}
                                    style={[styles.typeOption, moveToId === r.id && styles.typeActive, { marginBottom: 6 }]}
                                    onPress={() => setMoveToId(r.id)}
                                >
                                    <Text style={[styles.typeText, moveToId === r.id && { color: 'white' }]}>
                                        {r.number} ({r.type}) - {r.configuration?.beds || 'Std'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setMoveModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSubmit, (!moveFromId || !moveToId) && { opacity: 0.5 }]}
                                onPress={handleMoveGuest}
                                disabled={!moveFromId || !moveToId}
                            >
                                <Text style={styles.modalSubmitText}>Confirm Move</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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
    statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }, // Added wrap
    statCard: {
        minWidth: '30%',
        flex: 1,
        backgroundColor: theme.colors.card, // Use theme
        padding: 16,
        borderRadius: 16, // More premium radius
        alignItems: 'center',
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4
    },
    iconBox: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, // Larger icon box
    statNumber: { fontSize: 24, fontWeight: '800', color: theme.colors.text },
    statLabel: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600', marginTop: 4 },

    sectionHeader: { marginBottom: 12 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text }, // Larger title
    sectionSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 16 },
    emptyText: { color: theme.colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 20 },

    simpleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        marginBottom: 8,
        alignItems: 'center',
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2
    },
    rowText: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
    vipBadge: { backgroundColor: '#D69E2E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    vipText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

    // Team Card Styles
    teamCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    teamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    teamTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748' },
    teamSubtitle: { fontSize: 13, color: '#718096', marginTop: 2, maxWidth: 200 },
    teamStats: { alignItems: 'flex-end' },
    teamProgressText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary, marginBottom: 4 },
    progressBar: { width: 80, height: 6, backgroundColor: '#EDF2F7', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: theme.colors.primary },

    inspectionAlert: {
        backgroundColor: '#FFFFF0',
        borderColor: '#FBD38D',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16
    },
    inspectionText: { color: '#B7791F', fontWeight: '600', fontSize: 13 },

    miniGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    miniRoomBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        minWidth: 40,
        alignItems: 'center',
        justifyContent: 'center'
    },
    miniRoomText: { fontSize: 12, fontWeight: 'bold' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ECC94B', position: 'absolute', top: 4, right: 4 },

    // Staff Styles
    staffCard: {
        flexDirection: 'row',
        backgroundColor: theme.colors.card,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: theme.colors.textSecondary },
    staffName: { fontSize: 16, fontWeight: 'bold', color: theme.colors.text },
    staffRole: { fontSize: 12, color: theme.colors.textSecondary },
    groupBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    groupActive: { backgroundColor: theme.colors.primary + '15' }, // Soft primary
    groupInactive: { backgroundColor: theme.colors.background },
    groupText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },

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
    badgeDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'red',
        borderWidth: 1,
        borderColor: 'white'
    },
    // Guest Request Styles
    addItemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        backgroundColor: theme.colors.primary + '10',
        borderRadius: 8,
        gap: 6
    },
    addItemText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary
    },
    listCard: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    listTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3748'
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#EDF2F7'
    },
    listSubtitle: {
        fontSize: 14,
        color: '#4A5568',
        marginBottom: 4
    },
    listMeta: {
        fontSize: 12,
        color: '#A0AEC0'
    },
    resolveButton: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.success + '10',
        padding: 10,
        borderRadius: 8,
        gap: 8
    },
    resolveButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.success
    },

    // Search & Filter Styles (Fixed)
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 8
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#2D3748' },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginRight: 8,
        marginBottom: 4
    },
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterChipText: { fontSize: 14, color: '#718096', fontWeight: '600' },
    filterChipTextActive: { color: 'white' },

    // Bulk Action Styles
    bulkHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16
    },
    bulkTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    bulkActions: { flexDirection: 'row', gap: 12 },
    bulkBtn: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    bulkBtnText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 },

    // Selection Styles
    roomRowSelected: {
        backgroundColor: '#EBF8FF',
        borderColor: theme.colors.primary,
        borderWidth: 1
    },

    // Maintenance Styles (Phase 3)
    incidentCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.error,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    incidentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    incidentInfo: { flex: 1, marginRight: 12 },
    incidentRoom: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginRight: 8 },
    incidentDesc: { fontSize: 14, color: '#4A5568', marginBottom: 4, lineHeight: 20 },
    incidentTime: { fontSize: 12, color: '#A0AEC0' },
    incidentActions: { alignItems: 'flex-end' },
    resolveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.success,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6
    },
    resolveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    priorityBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 2 },
    priorityText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    photoContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EDF2F7' },
    photoLabel: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },

    // Empty State (Added)
    emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyStateText: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginTop: 16 },
    emptyStateSubtext: { fontSize: 14, color: '#718096', marginTop: 8 }
});
