import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useHotel, Room } from '../contexts/HotelContext';
import { theme } from '../utils/theme';
import { Users, Clock, CheckCircle2, AlertTriangle, MapPin } from 'lucide-react-native';

const TeamCard = ({ groupName, rooms, sessionActive, sessionStartTime, timeEstimates }: any) => {
    // Stats
    const pending = rooms.filter((r: Room) => r.status === 'PENDING').length;
    const inspection = rooms.filter((r: Room) => r.status === 'INSPECTION').length;
    const completed = rooms.filter((r: Room) => r.status === 'COMPLETED').length;
    const currentRoom = rooms.find((r: Room) => r.status === 'IN_PROGRESS');

    // Timer Logic
    const totalMinutes = rooms.reduce((acc: number, r: Room) => acc + (timeEstimates[r.cleaningType] || 0), 0);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!sessionActive || !sessionStartTime) {
            setElapsed(0);
            return;
        }
        const interval = setInterval(() => {
            const start = new Date(sessionStartTime).getTime();
            const now = new Date().getTime();
            setElapsed(Math.floor((now - start) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionActive, sessionStartTime]);

    // Simple Group Timer (Based on Global Start for now - strictly per group start would require per-group session tracking)
    // For now assuming all groups start at roughly same global session start for simplicity
    const remainingSeconds = (totalMinutes * 60) - elapsed;
    const isOvertime = remainingSeconds < 0;
    const absRemaining = Math.abs(remainingSeconds);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.groupBadge}>
                    <Users size={14} color="white" />
                    <Text style={styles.groupName}>{groupName}</Text>
                </View>
                {sessionActive && (
                    <Text style={[styles.timer, isOvertime && styles.timerOvertime]}>
                        {isOvertime ? '+' : ''}{formatTime(absRemaining)}
                    </Text>
                )}
            </View>

            <View style={styles.locationContainer}>
                <MapPin size={16} color={theme.colors.primary} />
                <Text style={styles.locationText}>
                    {currentRoom ? `Currently in Room ${currentRoom.number}` :
                        pending === 0 && inspection === 0 ? 'All Rooms Finished' : 'Not Currently in Room'}
                </Text>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>To Do</Text>
                    <Text style={styles.statValue}>{pending}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: theme.colors.warning }]}>Inspect</Text>
                    <Text style={[styles.statValue, { color: theme.colors.warning }]}>{inspection}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statLabel, { color: theme.colors.success }]}>Done</Text>
                    <Text style={[styles.statValue, { color: theme.colors.success }]}>{completed}</Text>
                </View>
            </View>
        </View>
    );
};

export const SupervisorTeamDashboard = () => {
    const { rooms, settings, session, staff } = useHotel();

    // Group Rooms
    const groups = useMemo(() => {
        const grouped: Record<string, Room[]> = {};
        rooms.forEach(room => {
            if (room.assignedGroup) {
                if (!grouped[room.assignedGroup]) grouped[room.assignedGroup] = [];
                grouped[room.assignedGroup].push(room);
            }
        });
        return grouped;
    }, [rooms]);

    // Only show groups that have actual staff assigned (Active Teams)
    const activeGroups = useMemo(() => {
        const staffGroups = new Set(staff.map(s => s.groupId).filter((g): g is string => !!g));
        // Return union of groups with Rooms OR groups with Staff
        const allGroups = new Set([...Object.keys(groups), ...staffGroups]);
        return Array.from(allGroups).sort();
    }, [groups, staff]);

    if (activeGroups.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Team Dashboard</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {activeGroups.map(name => (
                    <TeamCard
                        key={name}
                        groupName={name}
                        rooms={groups[name] || []}
                        sessionActive={session.isActive}
                        sessionStartTime={session.startTime}
                        timeEstimates={settings.timeEstimates}
                    />
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.m,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
        marginLeft: theme.spacing.m,
        marginBottom: 10,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.m,
        gap: 12,
    },
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        width: 280,
        ...theme.shadows.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    groupBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.secondary,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    groupName: {
        color: 'white',
        fontWeight: '700',
        fontSize: 14,
    },
    timer: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        fontVariant: ['tabular-nums'],
    },
    timerOvertime: {
        color: theme.colors.error,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.background,
        padding: 8,
        borderRadius: 8,
        marginBottom: 12,
    },
    locationText: {
        color: theme.colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: theme.colors.border,
    }
});
