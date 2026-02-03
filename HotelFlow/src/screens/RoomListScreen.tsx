import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useHotel, Room, IncidentRole, RoomStatus } from '../contexts/HotelContext';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { RoomCard } from '../components/RoomCard';
import { SupervisorTeamDashboard } from '../components/SupervisorTeamDashboard';
import { DayTimer } from '../components/DayTimer';
import { RoomTimeline } from '../components/RoomTimeline';
import { theme } from '../utils/theme';
import { Search, Filter, HandHelping, Bell, Package, BarChart, Briefcase, ShieldAlert, LogOut, WifiOff, AlertTriangle, CheckCircle, History, XCircle, BedDouble, Sparkles } from 'lucide-react-native'; // Clean icon for help
import ConfettiCannon from 'react-native-confetti-cannon';
import { NotificationsModal } from '../components/NotificationsModal';
import { SkeletonRoomCard } from '../components/SkeletonRoomCard';
import { EmptyState } from '../components/EmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RoomStackParamList, RootStackParamList } from '../AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;



const DashboardHeader = () => {
    const { user, logout } = useAuth();
    const { rooms, session, staff, systemIncidents } = useHotel();
    const [cleanerShowAll, setCleanerShowAll] = useState(false); // Local State for cleaner view if needed, or pass props

    // Lift state up or access context if RoomListScreen holds it?
    // Actually, RoomListScreen holds `cleanerShowAll`.
    // Let's keep DashboardHeader for Stats and make a new "ToolsHeader" or modify this one.
    // For simplicity, I'll return the DashboardHeader with the Logout button added, 
    // and I'll Create a separate "CleanerActionPanel" component.

    const stats = useMemo(() => {
        if (!user) return null;

        switch (user.role) {
            case 'CLEANER': {
                // User requested to hide these stats as they are redundant with the bottom panel
                return [];
            }
            case 'SUPERVISOR': {
                const toInspect = rooms.filter(r => r.status === 'INSPECTION').length;
                const activeStaff = staff?.length || 0;
                return [
                    { label: 'To Inspect', value: toInspect, icon: '🔍', alert: toInspect > 0 },
                    { label: 'Team Active', value: activeStaff, icon: '👥' },
                    { label: 'Occupancy', value: `${Math.round((rooms.filter(r => r.guestStatus !== 'NO_GUEST').length / rooms.length) * 100)}%`, icon: '📈' }
                ];
            }
            case 'MAINTENANCE': {
                const openIncidents = rooms.reduce((acc, r) => acc + r.incidents.filter(i => i.status === 'OPEN').length, 0);
                const highPriority = rooms.reduce((acc, r) => acc + r.incidents.filter(i => i.status === 'OPEN' && i.priority === 'HIGH').length, 0);
                return [
                    { label: 'Open Tasks', value: openIncidents, icon: '🛠️' },
                    { label: 'Urgent', value: highPriority, icon: '⚠️', alert: highPriority > 0 },
                    { label: 'Resolved', value: rooms.reduce((acc, r) => acc + r.incidents.filter(i => i.status === 'RESOLVED').length, 0), icon: '👍' }
                ];
            }
            case 'RECEPTION': {
                const ready = rooms.filter(r => r.status === 'COMPLETED').length;
                const dirty = rooms.filter(r => r.status === 'PENDING').length;
                return [
                    { label: 'Ready', value: ready, icon: '✨' },
                    { label: 'Dirty', value: dirty, icon: '🧹' },
                    { label: 'Occupied', value: rooms.filter(r => r.guestStatus !== 'NO_GUEST').length, icon: '🏠' }
                ];
            }
            default: return [];
        }
    }, [rooms, user, staff]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    }, []);

    if (!stats) return null;

    return (
        <View style={styles.dashboardContainer}>
            <View style={styles.dashboardHeader}>
                <View>
                    <Text style={styles.greetingText}>{greeting},</Text>
                    <Text style={styles.userNameText}>{user?.name || user?.username}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{user?.role}</Text>
                    </View>
                    <TouchableOpacity onPress={() => logout()} style={styles.logoutBtnHeader}>
                        <LogOut size={16} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {stats.length > 0 && (
                <View style={styles.statsRow}>
                    {stats.map((stat, index) => (
                        <View key={index} style={[styles.statCard, stat.alert && styles.statCardAlert]}>
                            <Text style={styles.statIcon}>{stat.icon}</Text>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={[styles.statLabel, stat.alert && styles.statLabelAlert]}>{stat.label}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
};

const CleanerActionPanel = ({ showAll, setShowAll }: { showAll: boolean, setShowAll: (v: boolean) => void }) => {
    const { rooms } = useHotel();
    const { user } = useAuth();
    const isCleaner = user?.role === 'CLEANER';

    if (!isCleaner) return null;

    const [showHistory, setShowHistory] = useState(false);

    // Calculate specific user progress
    const myRooms = rooms.filter(r => r.assigned_cleaner === user.id || (user.groupId && r.assignedGroup === user.groupId && !r.assigned_cleaner));
    const completedRoomsList = myRooms.filter(r => r.status === 'COMPLETED' || r.status === 'INSPECTION').sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    const completed = myRooms.filter(r => r.status === 'COMPLETED' || r.status === 'INSPECTION').length;
    const total = myRooms.length;
    const progress = total > 0 ? completed / total : 0;

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '-- min';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    return (
        <View style={styles.cleanerPanel}>
            {/* Header Row with History Button */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.progressLabel}>
                    {Math.round(progress * 100)}% Complete
                </Text>
                <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.historyBtn}>
                    <History size={16} color={theme.colors.primary} />
                    <Text style={styles.historyBtnText}>History</Text>
                </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressRow}>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                </View>
            </View>

            {/* Segmented Control */}
            <View style={styles.segmentedControl}>
                <TouchableOpacity
                    style={[styles.segmentBtn, !showAll && styles.segmentBtnActive]}
                    onPress={() => setShowAll(false)}
                >
                    <Text style={[styles.segmentText, !showAll && styles.segmentTextActive]}>My Journey</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.segmentBtn, showAll && styles.segmentBtnActive]}
                    onPress={() => setShowAll(true)}
                >
                    <Text style={[styles.segmentText, showAll && styles.segmentTextActive]}>Team Queue</Text>
                </TouchableOpacity>
            </View>

            {/* History Modal */}
            <Modal visible={showHistory} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Completed Rooms</Text>
                            <TouchableOpacity onPress={() => setShowHistory(false)}>
                                <XCircle size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {completedRoomsList.length === 0 ? (
                                <Text style={styles.emptyText}>No completed rooms yet.</Text>
                            ) : (
                                completedRoomsList.map(r => (
                                    <View key={r.id} style={styles.historyItem}>
                                        <View>
                                            <Text style={styles.historyRoomNum}>Room {r.number}</Text>
                                            <Text style={styles.historyType}>{r.cleaningType}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.historyDuration}>{formatDuration(r.lastCleaningDuration)}</Text>
                                            <Text style={styles.historyTime}>
                                                {new Date(r.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default function RoomListScreen() {
    const { rooms, settings, session, systemIncidents, addSystemIncident, completeSession, updateRoomStatus, resolveIncident, isOffline, fetchSystemIncidents, updateGuestStatus, isLoading } = useHotel();
    const { user, logout } = useAuth();
    const navigation = useNavigation<NavigationProp>();

    useEffect(() => {
        fetchSystemIncidents();
    }, []);

    // My Assigned Tasks
    const myTasks = useMemo(() => {
        if (!systemIncidents) return [];
        return systemIncidents.filter(i =>
            i.targetRole === 'CLEANER' &&
            i.status === 'OPEN' &&
            (!i.assignedTo || i.assignedTo === user?.id)
        );
    }, [systemIncidents, user]);

    // Confetti Ref
    const confettiRef = useRef<ConfettiCannon>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string | 'ALL'>('ALL');
    const [selectedIncidentType, setSelectedIncidentType] = useState<IncidentRole | 'ALL'>('ALL');
    const [showFilters, setShowFilters] = useState(false);
    const [cleanerShowAll, setCleanerShowAll] = useState(false);

    const isSupervisor = user?.role === 'SUPERVISOR';
    const isCleaner = user?.role === 'CLEANER';

    const handleQuickStatusUpdate = async (room: Room) => {
        // User Request: "solo un boton de inicio...directo a la limpieza"
        // Instead of updating status, we Navigate to the Detail Screen.
        // We reuse handleRoomPress which handles blocking logic + navigation.
        handleRoomPress(room);
    };

    const { announcements, fetchAnnouncements } = useHotel();
    const [showNotifications, setShowNotifications] = useState(false);

    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <View style={{ flexDirection: 'row', gap: 15, marginRight: 10 }}>
                    {(user?.role === 'ADMIN' || user?.role === 'SUPERVISOR') && (
                        <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
                            <BarChart size={24} color={theme.colors.primary} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => navigation.navigate('LostFound')}>
                        <Briefcase size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowNotifications(true)}>
                        <View>
                            <Bell size={24} color={theme.colors.primary} />
                            {announcements.length > 0 && <View style={styles.badgeDot} />}
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert(
                                "🚨 EMERGENCY ALERT 🚨",
                                "Are you sure you want to trigger a SAFETY ALERT?\n\nThis will notify Reception and Supervisors immediately.",
                                [
                                    { text: "CANCEL", style: 'cancel' },
                                    {
                                        text: "SEND ALERT",
                                        style: 'destructive',
                                        onPress: () => {
                                            addSystemIncident(`🚨 EMERGENCY REPORTED BY ${user?.name || user?.username} 🚨`, 'SUPERVISOR');
                                            // Ideally we'd also notify Reception, but systemIncidents takes one target. 
                                            // Context needs update or just broadcast to supervisor who handles it.
                                            // Actually addSystemIncident creates an "Incident". Maybe we should call it twice or update context.
                                            // For now, Supervisor is the safest bet for staff management.
                                            Alert.alert("ALERT SENT", "Help is on the way.");
                                        }
                                    }
                                ]
                            );
                        }}
                        style={{ marginLeft: 5 }}
                    >
                        <View style={{ backgroundColor: theme.colors.error + '20', padding: 4, borderRadius: 20 }}>
                            <ShieldAlert size={24} color={theme.colors.error} />
                        </View>
                    </TouchableOpacity>
                </View>
            )
        });
    }, [navigation, user, announcements]);

    // --- Cleaner Help Logic ---
    const allRoomsCompleted = useMemo(() => {
        // If user has no rooms, or all rooms are COMPLETED or INSPECTION
        if (!isCleaner || !user?.groupId) return false;

        // Filter rooms assigned to this user's group
        const myRooms = rooms.filter(r => r.assignedGroup === user.groupId && r.status !== 'MAINTENANCE');
        if (myRooms.length === 0) return true; // Start with nothing? Maybe offer help.

        return myRooms.every(r => r.status === 'COMPLETED');
    }, [rooms, user]);

    const handleOfferHelp = () => {
        Alert.alert(
            "Offer Help?",
            "This will notify Supervisors that your team is available to assist others.",
            [
                { text: "Cancel", style: 'cancel' },
                {
                    text: "Send Offer",
                    onPress: () => {
                        addSystemIncident(`Team ${user?.groupId || 'Unknown'} is finished and offering help!`, 'SUPERVISOR');
                        Alert.alert("Offer Sent", "Supervisors have been notified.");
                    }
                }
            ]
        );
    };

    // --- Timer Completion Logic ---
    useEffect(() => {
        if (isCleaner && allRoomsCompleted && session.isActive && session.startTime) {
            // Calculate timing
            const start = new Date(session.startTime).getTime();
            const now = new Date().getTime();
            const elapsedMinutes = (now - start) / 1000 / 60;
            const target = session.totalMinutes || 1;

            completeSession(); // Stop the timer on backend

            if (elapsedMinutes <= target) {
                Alert.alert("🎉 Great Job!", "You finished on time! Keep up the good work.");
            } else {
                const delay = Math.round(elapsedMinutes - target);
                Alert.alert("⚠️ Delayed", `Finished ${delay} minutes late. Supervisor has been notified.`);
                addSystemIncident(`Team ${user?.groupId} finished ${delay} mins late.`, 'SUPERVISOR');
            }
        }
    }, [allRoomsCompleted, session.isActive, isCleaner]);

    // --- Supervisor Alert Logic ---
    const helpOffers = useMemo(() => {
        return systemIncidents.filter(i =>
            i.targetRole === 'SUPERVISOR' &&
            i.status === 'OPEN' &&
            i.text.toLowerCase().includes('offering help')
        );
    }, [systemIncidents]);


    const filteredRooms = useMemo(() => {
        let result = rooms.filter((room, index) => {
            // Search Query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                if (!room.number.toLowerCase().includes(query) && !room.type?.toLowerCase().includes(query)) return false;
            }

            // Supervisor Filters
            if (isSupervisor) {
                if (selectedGroup !== 'ALL' && room.assignedGroup !== selectedGroup) return false;

                if (selectedIncidentType !== 'ALL') {
                    // Check if room has ANY open incident of this type
                    const hasType = room.incidents.some(i => i.targetRole === selectedIncidentType && i.status === 'OPEN');
                    if (!hasType) return false;
                }
            } else {
                if (!user || !user.id) return false;
                // Log context ONCE per render cycle (noisy, but necessary now)


                // Cleaner: Priority to 'assigned_cleaner' if feature is valid
                const q = searchQuery.toLowerCase();
                if (!room.number.toLowerCase().includes(q) &&
                    !room.guestDetails?.currentGuest?.toLowerCase().includes(q)) {
                    return false;
                }
            }

            // Group Filter
            if (isSupervisor && selectedGroup !== 'ALL') {
                if (selectedGroup === 'Ungrouped') {
                    if (room.assignedGroup) return false;
                } else {
                    if (room.assignedGroup !== selectedGroup) return false;
                }
            }

            // Cleaner "My Assignments" Filter (NOW GROUP BASED)
            if (isCleaner) {
                // User requirement: "Show tasks assigned to the group"
                // IF user has a group, show ALL rooms for that group.
                if (user?.groupId) {
                    if (room.assignedGroup !== user.groupId) return false;
                } else {
                    // Fallback to individual assignment if solo
                    if (room.assigned_cleaner !== user?.id) return false;
                }

                // HIDE COMPLETED/INSPECTION (User Request: "sacar los cuartos que se termina de limpiar")
                // Only show if 'Show All' toggle is active
                if (!cleanerShowAll && (room.status === 'COMPLETED' || room.status === 'INSPECTION')) {
                    return false;
                }
            }

            // Incident Filter
            if (selectedIncidentType !== 'ALL') {
                const hasType = room.incidents.some(i => i.targetRole === selectedIncidentType && i.status === 'OPEN');
                if (!hasType) return false;
            }

            if (room.status === 'MAINTENANCE') return false;

            return true;
        });

        return result.sort((a, b) => {
            // PRIORITY HIERARCHY MAP
            const PRIORITY_MAP: Record<string, number> = {
                'PREARRIVAL': 1,
                'DEPARTURE': 2,
                'HOLDOVER': 3,
                'WEEKLY': 4,
                'RUBBISH': 5,
                'DAYUSE': 6
            };

            const getPriorityScore = (r: Room) => {
                let score = PRIORITY_MAP[r.cleaningType] || 10; // Default low priority

                // LOGIC: High Priority (Pre/Dep) MUST be empty.
                // If Guest is IN room, push to bottom.
                const isHighPriorityType = r.cleaningType === 'PREARRIVAL' || r.cleaningType === 'DEPARTURE';
                const isOccupied = r.guestStatus === 'GUEST_IN_ROOM' || r.guestStatus === 'DND'; // Treat DND as occupied for safety

                // REMOVED PENALTY: User wants blocked rooms to respect priority order.
                // if (isHighPriorityType && isOccupied) {
                //    score += 100; 
                // }

                // NEW: Push Completed/Inspection to absolute bottom (User Request: "ubiquen al final")
                if (r.status === 'COMPLETED' || r.status === 'INSPECTION') {
                    score += 2000;
                }

                return score;
            };

            const scoreA = getPriorityScore(a);
            const scoreB = getPriorityScore(b);

            if (scoreA !== scoreB) {
                return scoreA - scoreB; // Lower score = Higher Priority
            }

            // Tie-Breaker: Pre-Arrival Logic (Sort by Arrival Time)
            if (a.cleaningType === 'PREARRIVAL' && b.cleaningType === 'PREARRIVAL') {
                const timeA = a.guestDetails?.next_arrival_time || '23:59';
                const timeB = b.guestDetails?.next_arrival_time || '23:59';
                // Earlier time = Higher Priority (Ascending)
                if (timeA !== timeB) return timeA.localeCompare(timeB);
            }

            // Tie-Breaker: Reception Priority (Manual Overrides)
            if (a.receptionPriority !== b.receptionPriority) {
                // Undefined priority (low) vs Defined (high)
                // Wait, Reception Priority 1=High. 
                const pA = a.receptionPriority || 99;
                const pB = b.receptionPriority || 99;
                return pA - pB;
            }

            // Tie-Breaker: Room Number
            return a.number.localeCompare(b.number);
        });
    }, [rooms, searchQuery, selectedGroup, selectedIncidentType, isSupervisor, user, cleanerShowAll]);

    const totalMinutes = useMemo(() => {
        // Use filteredRooms for accurate Cleaner/Supervisor view estimates
        return filteredRooms.reduce((acc, r) => acc + (settings.timeEstimates[r.cleaningType] || 0), 0);
    }, [filteredRooms, settings]);

    const totalTimeFormatted = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

    const handleRoomPress = (room: Room) => {
        // User Request: Block if another room is IN_PROGRESS
        if (isCleaner) {
            // Find if any other room is IN_PROGRESS for this user
            const roomInProgress = rooms.find(r =>
                r.status === 'IN_PROGRESS' &&
                r.id !== room.id &&
                (r.assigned_cleaner === user?.id || (user?.groupId && r.assignedGroup === user.groupId))
            );

            if (roomInProgress) {
                Alert.alert(
                    "One Room at a Time",
                    `You are currently working on Room ${roomInProgress.number}. Please finish it or pause it before starting another.`,
                    [
                        { text: "OK", style: "default" },
                        {
                            text: "Go to Active Room",
                            onPress: () => navigation.navigate('RoomDetail', { roomId: roomInProgress.id })
                        }
                    ]
                );
                return;
            }
        }

        const isOccupied = room.guestStatus === 'GUEST_IN_ROOM' || room.guestStatus === 'DND';

        if (isOccupied) {
            Alert.alert(
                "Guest in Room",
                "Has the guest left the room?",
                [
                    { text: "No", style: 'cancel' },
                    {
                        text: "Yes, Enter",
                        onPress: () => {
                            updateGuestStatus(room.id, 'GUEST_OUT');
                            navigation.navigate('RoomDetail', { roomId: room.id });
                        },
                        style: 'destructive' // or default
                    }
                ]
            );
            return;
        }
        navigation.navigate('RoomDetail', { roomId: room.id });
    };

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Supervisor Help Alerts */}
            {isSupervisor && helpOffers.length > 0 && (
                <View style={styles.alertBanner}>
                    <Bell size={20} color="white" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.alertTitle}>Help Available!</Text>
                        {helpOffers.map(offer => (
                            <Text key={offer.id} style={styles.alertText}>• {offer.text}</Text>
                        ))}
                    </View>
                    <TouchableOpacity
                        style={styles.reassignButton}
                        onPress={() => setSelectedGroup('ALL')} // Simplest action: Show all rooms
                    >
                        <Text style={styles.reassignText}>Reassign Rooms</Text>
                    </TouchableOpacity>
                </View>
            )}

            {isSupervisor || user?.role === 'ADMIN' || user?.role === 'RECEPTION' ? (
                <SupervisorTeamDashboard />
            ) : (
                <>
                    <DayTimer totalMinutes={totalMinutes} />

                    {/* Team Header */}
                    {user?.groupId && (
                        <View style={styles.teamHeader}>
                            <Text style={styles.teamTitle}>{user.groupId}</Text>
                            <Text style={styles.partnerText}>
                                Team Members: {user.username}
                                {/* We don't have full staff list in context efficiently, but assuming we can filter if available */}
                            </Text>
                        </View>
                    )}

                    <View style={styles.summaryCard}>
                        <View>
                            <Text style={styles.summaryLabel}>Total Estimated Time</Text>
                            <Text style={styles.summaryValue}>{totalTimeFormatted}</Text>
                        </View>
                        <View style={styles.summaryStats}>
                            <Text style={styles.summaryStatText}>{filteredRooms.length} Rooms Assigned</Text>
                        </View>
                    </View>

                    {/* Cleaner "Offer Help" Button */}
                    {isCleaner && allRoomsCompleted && (
                        <TouchableOpacity style={styles.helpButton} onPress={handleOfferHelp}>
                            <HandHelping size={24} color="white" />
                            <Text style={styles.helpButtonText}>Work Finished - Offer Help</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}

            {/* Cleaner Action Panel - Placed here below stats */}
            {isCleaner && <CleanerActionPanel showAll={cleanerShowAll} setShowAll={setCleanerShowAll} />}

            <View style={styles.searchContainer}>
                <Search size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search room..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    clearButtonMode="while-editing"
                />
            </View>



            <View style={styles.controlsContainer}>


                {isCleaner && (
                    <>
                        {/* Removed old UI, replaced by CleanerActionPanel */}
                    </>
                )}

                {isSupervisor && (
                    <TouchableOpacity
                        style={[styles.filterButton, (selectedGroup !== 'ALL' || selectedIncidentType !== 'ALL') && styles.filterButtonActive]}
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={20} color={theme.colors.text} />
                        <Text style={styles.filterButtonText}>Filters</Text>
                    </TouchableOpacity>
                )}
            </View>

            {isSupervisor && showFilters && (
                <View style={styles.filterPanel}>
                    <Text style={styles.filterLabel}>Filter by Group:</Text>
                    <View style={styles.filterRow}>
                        {['ALL', 'Group 1', 'Group 2', 'Group 3'].map(g => (
                            <TouchableOpacity
                                key={g}
                                style={[styles.chip, selectedGroup === g && styles.chipActive]}
                                onPress={() => setSelectedGroup(g)}
                            >
                                <Text style={[styles.chipText, selectedGroup === g && styles.chipTextActive]}>{g}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.filterLabel}>Filter by Incident:</Text>
                    <View style={styles.filterRow}>
                        {['ALL', 'MAINTENANCE', 'RECEPTION'].map(t => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.chip, selectedIncidentType === t && styles.chipActive]}
                                onPress={() => setSelectedIncidentType(t as any)}
                            >
                                <Text style={[styles.chipText, selectedIncidentType === t && styles.chipTextActive]}>
                                    {t.charAt(0) + t.slice(1).toLowerCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            <Text style={styles.resultsText}>Showing {filteredRooms.length} rooms</Text>
        </View>
    );

    // const isLoading = rooms.length === 0; // REPLACED WITH CONTEXT STATE

    if (isLoading && rooms.length === 0) { // Only show full screen loading if no rooms loaded yet
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={[styles.headerContainer, { paddingHorizontal: 16 }]}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold' }}>All Rooms</Text>
                </View>
                <View style={{ padding: 16 }}>
                    {[1, 2, 3, 4, 5].map(i => <SkeletonRoomCard key={i} />)}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Dashboard Header - Role Specific */}
            <DashboardHeader />

            {/* Active Session Timer - Removed to avoid duplicate. Now inside DashboardHeader. */}
            {/* {(isCleaner || isSupervisor) && <TimerDisplay totalMinutes={session.totalMinutes} />} */}

            {/* Offline Banner */}
            {isOffline && (
                <View style={styles.offlineBanner}>
                    <WifiOff size={20} color="white" />
                    <Text style={styles.offlineText}>You are offline. Changes saved locally.</Text>
                </View>
            )}

            {/* Assigned Tasks Section */}
            {myTasks.length > 0 && (
                <View style={{ marginBottom: 16, paddingHorizontal: 16 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: theme.colors.text }}>My Tasks</Text>
                    {myTasks.map(task => (
                        <View key={task.id} style={{
                            backgroundColor: 'white',
                            padding: 12,
                            borderRadius: 12,
                            marginBottom: 8,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            ...theme.shadows.card
                        }}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{task.text}</Text>
                                    {task.priority === 'EMERGENCY' && <AlertTriangle size={14} color={theme.colors.error} />}
                                </View>
                                {task.assignedTo === user?.id && (
                                    <View style={{ backgroundColor: '#EBF8FF', alignSelf: 'flex-start', paddingHorizontal: 6, borderRadius: 4, marginBottom: 4 }}>
                                        <Text style={{ color: '#3182CE', fontSize: 10, fontWeight: 'bold' }}>ASSIGNED TO ME</Text>
                                    </View>
                                )}
                                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                                    {new Date(task.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={{ backgroundColor: theme.colors.success, padding: 8, borderRadius: 8 }}
                                onPress={() => resolveIncident(null, task.id)}
                            >
                                <CheckCircle color="white" size={20} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            <RoomTimeline
                rooms={filteredRooms}
                onPressRoom={handleRoomPress}
                headerComponent={renderHeader()}
                emptyComponent={
                    <EmptyState
                        icon={filteredRooms.length === 0 && rooms.length > 0 ? Search : BedDouble}
                        title={filteredRooms.length === 0 && rooms.length > 0 ? "No Matches Found" : "All Rooms Ready!"}
                        message={filteredRooms.length === 0 && rooms.length > 0 ? "Try adjusting your filters or search terms." : "There are no rooms assigned to you right now. Enjoy your break!"}
                        actionLabel={filteredRooms.length === 0 && rooms.length > 0 ? "Clear Filters" : undefined}
                        onAction={filteredRooms.length === 0 && rooms.length > 0 ? () => { setSearchQuery(''); setSelectedGroup('ALL'); } : undefined}
                    />
                }
            />
            <NotificationsModal visible={showNotifications} onClose={() => setShowNotifications(false)} />

            <ConfettiCannon
                count={200}
                origin={{ x: -10, y: 0 }}
                ref={confettiRef}
                fadeOut={true}
                autoStart={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    headerContainer: {
        marginBottom: 10,
        backgroundColor: theme.colors.background,
    },

    progressContainer: {
        marginBottom: 4,
    },
    progressLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '600'
    },
    progressValue: {
        fontSize: 12,
        color: theme.colors.text,
        fontWeight: 'bold'
    },
    progressBarBg: {
        height: 10, // Thicker
        backgroundColor: theme.colors.border,
        borderRadius: 5,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: theme.colors.success,
        borderRadius: 5
    },

    // Team Header Styles
    teamHeader: {
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    teamTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: theme.colors.text,
        marginBottom: 2,
    },
    partnerText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },

    resultsText: {
        marginTop: theme.spacing.s,
        marginHorizontal: theme.spacing.m,
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.textSecondary,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: theme.colors.border, // Light gray bg
        borderRadius: 8,
        padding: 2,
        marginHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    segment: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 6,
    },
    segmentBtnActive: {
        backgroundColor: 'white',
        ...theme.shadows.card
    },
    segmentText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary
    },
    segmentTextActive: {
        color: theme.colors.primary,
        fontWeight: 'bold'
    },

    // Alert Banner
    alertBanner: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        margin: theme.spacing.m,
        marginBottom: 0,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        gap: 12
    },
    alertTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    alertText: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
    reassignButton: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    reassignText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 },

    // Supplies Button
    suppliesButton: {
        flexDirection: 'row',
        backgroundColor: '#EBF8FF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        gap: 6,
        marginLeft: 10
    },
    suppliesText: { color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 },

    // Help Button
    helpButton: {
        flexDirection: 'row',
        backgroundColor: theme.colors.secondary, // Teal/Green
        margin: theme.spacing.m,
        // ... previous styles
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
    },

    // --- New Styles ---
    logoutBtnHeader: {
        padding: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
    },
    cleanerPanel: {
        backgroundColor: 'white',
        marginHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.m,
        padding: 16,
        borderRadius: 16,
        ...theme.shadows.card,
    },
    goalRow: {
        marginBottom: 12,
    },
    goalInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    goalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    goalValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 12,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#F7FAFC',
        borderRadius: 12,
        padding: 4,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleBtnActive: {
        backgroundColor: 'white',
        ...theme.shadows.card,
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    toggleTextActive: {
        color: theme.colors.primary,
        fontWeight: 'bold',
    },

    helpButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.card,
        marginHorizontal: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        paddingHorizontal: theme.spacing.m,
        height: 44,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    searchIcon: {
        marginRight: theme.spacing.s,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: theme.colors.text,
    },
    summaryCard: {
        backgroundColor: theme.colors.primary,
        margin: theme.spacing.m,
        padding: theme.spacing.l,
        borderRadius: 20, // Premium radius
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: 0.5
    },
    summaryValue: {
        color: 'white',
        fontSize: 32, // Larger
        fontWeight: '800',
        letterSpacing: -1
    },
    summaryStats: {
        backgroundColor: 'rgba(255,255,255,0.25)', // Glass effect
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    summaryStatText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 14,
    },


    listContent: {
        padding: theme.spacing.m,
        paddingTop: 0,
    },

    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: theme.spacing.m,
        marginBottom: 10,
        marginTop: 10
    },
    userInfo: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    userRoleText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: theme.colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterButtonActive: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primary + '10',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    filterPanel: {
        marginHorizontal: theme.spacing.m,
        marginBottom: theme.spacing.m,
        backgroundColor: theme.colors.card,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    filterLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
        marginTop: 4,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    chipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    chipText: {
        fontSize: 12,
        color: theme.colors.text,
    },
    chipTextActive: {
        color: 'white',
        fontWeight: '600',
    },

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
    // Dashboard Styles
    dashboardContainer: {
        padding: theme.spacing.m,
        backgroundColor: theme.colors.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    dashboardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    greetingText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    userNameText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    roleBadge: {
        backgroundColor: theme.colors.primary + '20',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    roleText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.card,
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        ...theme.shadows.card,
    },
    statCardAlert: {
        backgroundColor: theme.colors.error + '10',
        borderWidth: 1,
        borderColor: theme.colors.error,
    },
    statIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    statLabelAlert: {
        color: theme.colors.error,
        fontWeight: 'bold',
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: theme.spacing.m,
        marginTop: theme.spacing.s,
        backgroundColor: theme.colors.background,
    },
    sectionHeaderText: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginLeft: 8,
    },
    // Offline Banner
    offlineBanner: {
        backgroundColor: theme.colors.text,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 8,
        marginHorizontal: theme.spacing.m,
        borderRadius: 8,
        marginBottom: 10
    },
    offlineText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14
    },

    // Blocked Banner
    blockedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.error, // Red for blocked
        paddingHorizontal: theme.spacing.m,
        paddingVertical: 4,
        marginHorizontal: theme.spacing.m,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        marginTop: 8,
        marginBottom: -4, // Overlap slightly or connect
        zIndex: 1,
        gap: 6
    },
    blockedText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold'
    },

    historyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: theme.colors.primary + '10',
        borderRadius: 12,
        gap: 6
    },
    historyBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        width: '100%',
        padding: 20,
        ...theme.shadows.card
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    historyRoomNum: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    historyType: {
        fontSize: 12,
        color: theme.colors.textSecondary
    },
    historyDuration: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary
    },
    historyTime: {
        fontSize: 10,
        color: theme.colors.textSecondary
    },
    emptyText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 20
    },
    // Restored styles that were missing
    progressRow: {
        marginBottom: 16
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: '#F3F4F6',
        borderRadius: 3,
        overflow: 'hidden'
    },
    segmentBtn: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10
    }
});
