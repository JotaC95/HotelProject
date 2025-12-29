import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useHotel, Room, IncidentRole } from '../contexts/HotelContext';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { RoomCard } from '../components/RoomCard';
import { SupervisorTeamDashboard } from '../components/SupervisorTeamDashboard';
import { theme } from '../utils/theme';
import { Search, Filter, HandHelping, Bell, Package } from 'lucide-react-native'; // Clean icon for help
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RoomStackParamList } from '../AppNavigator';

type NavigationProp = NativeStackNavigationProp<RoomStackParamList>;

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

export default function RoomListScreen() {
    const { rooms, settings, session, systemIncidents, addSystemIncident } = useHotel();
    const { user } = useAuth();
    const navigation = useNavigation<NavigationProp>();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string | 'ALL'>('ALL');
    const [selectedIncidentType, setSelectedIncidentType] = useState<IncidentRole | 'ALL'>('ALL');
    const [showFilters, setShowFilters] = useState(false);

    const isSupervisor = user?.role === 'SUPERVISOR';
    const isCleaner = user?.role === 'CLEANER';

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
            // Supervisor Priority: INSPECTION first
            if (isSupervisor) {
                if (a.status === 'INSPECTION' && b.status !== 'INSPECTION') return -1;
                if (a.status !== 'INSPECTION' && b.status === 'INSPECTION') return 1;
            }

            const guestInA = a.guestStatus === 'IN_ROOM';
            const guestInB = b.guestStatus === 'IN_ROOM';
            if (guestInA && !guestInB) return 1;
            if (!guestInA && guestInB) return -1;

            const prioA = a.receptionPriority ?? 999;
            const prioB = b.receptionPriority ?? 999;
            if (prioA !== prioB) return prioA - prioB;

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

    return (
        <View style={styles.container}>
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
        </View>
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
});
