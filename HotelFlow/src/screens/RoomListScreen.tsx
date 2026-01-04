import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useHotel, Room, IncidentRole } from '../contexts/HotelContext';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { RoomCard } from '../components/RoomCard';
import { SupervisorTeamDashboard } from '../components/SupervisorTeamDashboard';
import { theme } from '../utils/theme';
import { Search, Filter, HandHelping, Bell, Package, BarChart, Briefcase } from 'lucide-react-native'; // Clean icon for help
import { NotificationsModal } from '../components/NotificationsModal';
import { SkeletonRoomCard } from '../components/SkeletonRoomCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RoomStackParamList, RootStackParamList } from '../AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TimerDisplay = ({ totalMinutes }: { totalMinutes: number }) => {
    const { session } = useHotel();
    const [elapsed, setElapsed] = React.useState(0);

    React.useEffect(() => {
        if (!session.isActive || !session.startTime) {
            setElapsed(0);
            return;
        }

        const interval = setInterval(() => {
            const start = new Date(session.startTime!).getTime();
            const now = new Date().getTime();
            setElapsed(Math.floor((now - start) / 1000));
        }, 1000);

        return () => clearInterval(interval);
    }, [session.isActive, session.startTime]);

    const totalSeconds = totalMinutes * 60;
    const remaining = totalSeconds - elapsed;
    const isOvertime = remaining < 0;
    const absRemaining = Math.abs(remaining);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (!session.isActive) return null;

    return (
        <View style={[styles.timerCard, isOvertime ? styles.timerOvertime : null]}>
            <Text style={styles.timerLabel}>
                {isOvertime ? 'Overtime By' : 'Time Remaining'}
            </Text>
            <Text style={styles.timerValue}>
                {isOvertime ? '+' : ''}{formatTime(absRemaining)}
            </Text>
        </View>
    );
};

const DashboardHeader = () => {
    const { user } = useAuth();
    const { rooms, session, staff } = useHotel();

    const stats = useMemo(() => {
        if (!user) return null;

        switch (user.role) {
            case 'CLEANER': {
                const myRooms = rooms.filter(r => r.assignedGroup === user.groupId);
                const completed = myRooms.filter(r => r.status === 'COMPLETED').length;
                const total = myRooms.length;
                return [
                    { label: 'Assigned', value: total, icon: '🛏️' },
                    { label: 'Done', value: completed, icon: '✅' },
                    { label: 'Progress', value: `${total ? Math.round((completed / total) * 100) : 0}%`, icon: '📊' }
                ];
            }
            case 'SUPERVISOR': {
                const toInspect = rooms.filter(r => r.status === 'INSPECTION').length;
                const activeStaff = staff?.length || 0; // Mock if staff list not populated
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
                // Reception cares about Room Status for Check-in
                const ready = rooms.filter(r => r.status === 'COMPLETED').length;
                const dirty = rooms.filter(r => r.status === 'PENDING').length; // Or 'DIRTY' if mapped
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
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{user?.role}</Text>
                </View>
            </View>

            <View style={styles.statsRow}>
                {stats.map((stat, index) => (
                    <View key={index} style={[styles.statCard, stat.alert && styles.statCardAlert]}>
                        <Text style={styles.statIcon}>{stat.icon}</Text>
                        <Text style={styles.statValue}>{stat.value}</Text>
                        <Text style={[styles.statLabel, stat.alert && styles.statLabelAlert]}>{stat.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

export default function RoomListScreen() {
    const { rooms, settings, session, systemIncidents, addSystemIncident, completeSession } = useHotel();
    const { user } = useAuth();
    const navigation = useNavigation<NavigationProp>();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string | 'ALL'>('ALL');
    const [selectedIncidentType, setSelectedIncidentType] = useState<IncidentRole | 'ALL'>('ALL');
    const [showFilters, setShowFilters] = useState(false);

    const isSupervisor = user?.role === 'SUPERVISOR';
    const isCleaner = user?.role === 'CLEANER';

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
        let result = rooms.filter(room => {
            // Search Query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                if (!room.number.includes(query) && !room.type.toLowerCase().includes(query)) return false;
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
                // Cleaner: Only show my group's rooms (if assigned)
                if (user?.groupId && room.assignedGroup && room.assignedGroup !== user.groupId) {
                    return false;
                }

                if (room.status === 'MAINTENANCE') {
                    return false;
                }
            }

            return true;
        });

        return result.sort((a, b) => {
            // 1. Next Arrival High Priority
            const hasArrivalA = !!a.guestDetails?.nextArrival;
            const hasArrivalB = !!b.guestDetails?.nextArrival;
            if (hasArrivalA && !hasArrivalB) return -1;
            if (!hasArrivalA && hasArrivalB) return 1;

            // 2. Supervisor Priority: INSPECTION first
            if (isSupervisor) {
                if (a.status === 'INSPECTION' && b.status !== 'INSPECTION') return -1;
                if (a.status !== 'INSPECTION' && b.status === 'INSPECTION') return 1;
            }

            // 3. Guest In Room Priority (Usually lower priority for full cleaning, but higher for "Check" tasks? 
            // User said "marked so they take into account". Usually empty rooms are prioritized for new arrivals.
            // Let's stick to standard flow: Departure > Stayover.
            // But if "Guest In Room", maybe push down? Or keep neutral. 
            // Let's keep existing logic but after manual priority.

            // 4. Manual Reception Priority
            const prioA = a.receptionPriority ?? 999;
            const prioB = b.receptionPriority ?? 999;
            if (prioA !== prioB) return prioA - prioB;

            // 5. Cleaning Type Priority
            const isPreA = a.cleaningType === 'PREARRIVAL';
            const isPreB = b.cleaningType === 'PREARRIVAL';
            if (isPreA && !isPreB) return -1;
            if (!isPreA && isPreB) return 1;

            const isDepA = a.cleaningType === 'DEPARTURE';
            const isDepB = b.cleaningType === 'DEPARTURE';
            if (isDepA && !isDepB) return -1;
            if (!isDepA && isDepB) return 1;

            return a.number.localeCompare(b.number);
        });
    }, [rooms, searchQuery, selectedGroup, selectedIncidentType, isSupervisor, user]);

    const totalMinutes = useMemo(() => {
        // Use filteredRooms for accurate Cleaner/Supervisor view estimates
        return filteredRooms.reduce((acc, r) => acc + (settings.timeEstimates[r.cleaningType] || 0), 0);
    }, [filteredRooms, settings]);

    const totalTimeFormatted = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

    const handleRoomPress = (room: Room) => {
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

            {isSupervisor ? (
                <SupervisorTeamDashboard />
            ) : (
                <>
                    <TimerDisplay totalMinutes={totalMinutes} />
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
                <View style={styles.userInfo}>
                    <Text style={styles.userRoleText}>
                        {user?.role === 'SUPERVISOR' ? 'Supervisor Mode' : `${user?.name} (${user?.groupId || 'No Group'})`}
                    </Text>
                </View>

                {isCleaner && (
                    <TouchableOpacity style={styles.suppliesButton} onPress={() => {
                        Alert.prompt(
                            "Request Supplies",
                            "What do you need?",
                            (text) => {
                                if (text) {
                                    addSystemIncident(`${user.name} (Room ?): ${text}`, 'HOUSEMAN');
                                    Alert.alert("Request Sent", "Houseman notified.");
                                }
                            }
                        );
                    }}>
                        <Package size={16} color={theme.colors.primary} />
                        <Text style={styles.suppliesText}>Supplies</Text>
                        {/* Show open request count */}
                        {systemIncidents.filter(i => i.user.includes(user.name) && i.status === 'OPEN').length > 0 && (
                            <View style={{ backgroundColor: theme.colors.error, borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                                    {systemIncidents.filter(i => i.user.includes(user.name) && i.status === 'OPEN').length}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
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

    const isLoading = rooms.length === 0; // Simple check, or add proper loading state context

    if (isLoading) {
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

            {/* Active Session Timer */}
            {(isCleaner || isSupervisor) && <TimerDisplay totalMinutes={session.totalMinutes} />}

            <FlatList
                data={filteredRooms}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <RoomCard
                        room={item}
                        onPress={() => handleRoomPress(item)}
                        showGroup={isSupervisor} // Show group badge only for supervisor
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderHeader}
            />
            <NotificationsModal visible={showNotifications} onClose={() => setShowNotifications(false)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    headerContainer: {
        backgroundColor: theme.colors.background,
        paddingBottom: theme.spacing.s,
        paddingTop: theme.spacing.s,
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
        marginTop: 0,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        ...theme.shadows.float
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
        borderRadius: theme.borderRadius.l,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...theme.shadows.float,
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    summaryValue: {
        color: 'white',
        fontSize: 28,
        fontWeight: '800',
    },
    summaryStats: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    summaryStatText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 12,
    },
    resultsText: {
        marginTop: theme.spacing.s,
        marginHorizontal: theme.spacing.m,
        fontSize: 12,
        color: theme.colors.textSecondary,
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
    timerCard: {
        backgroundColor: theme.colors.secondary,
        marginHorizontal: theme.spacing.m,
        marginTop: theme.spacing.m,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        ...theme.shadows.card,
    },
    timerOvertime: {
        backgroundColor: theme.colors.error,
    },
    timerLabel: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    timerValue: {
        color: 'white',
        fontSize: 32,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
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
        ...theme.shadows.small,
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
});
