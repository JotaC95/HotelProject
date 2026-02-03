import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Room, RoomStatus } from '../contexts/HotelContext';
import { theme } from '../utils/theme';
import { CheckCircle, Clock, Circle, MapPin, AlertTriangle } from 'lucide-react-native';

interface RoomTimelineProps {
    rooms: Room[];
    onPressRoom: (room: Room) => void;
    headerComponent?: React.ReactNode;
    emptyComponent?: React.ReactNode;
}

export const RoomTimeline = ({ rooms, onPressRoom, headerComponent, emptyComponent }: RoomTimelineProps) => {
    // Sort logic should ideally be passed in, but assuming sorted 'rooms'.
    // We visualize them as a path.

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {headerComponent}
            {rooms.length === 0 && (
                emptyComponent ? emptyComponent : (
                    <View style={styles.emptyContainer}>
                        <CheckCircle size={48} color={theme.colors.success} />
                        <Text style={styles.emptyText}>All Caught Up!</Text>
                        <Text style={styles.emptySubText}>No rooms in your queue.</Text>
                    </View>
                )
            )}

            {rooms.map((room, index) => {
                const isFirst = index === 0;
                const isCompleted = room.status === 'COMPLETED' || room.status === 'INSPECTION';
                const isNext = !isCompleted && isFirst; // Simplification: First non-completed is "Next"
                const isActive = room.status === 'IN_PROGRESS';

                // Node Color
                let nodeColor = theme.colors.border;
                if (isCompleted) nodeColor = theme.colors.success;
                if (isActive) nodeColor = theme.colors.primary;
                if (isNext && !isActive) nodeColor = theme.colors.warning; // "Up Next"

                return (
                    <View key={room.id} style={styles.row}>
                        {/* Timeline Line */}
                        <View style={styles.timelineColumn}>
                            <View style={[styles.lineTop, index === 0 && styles.hidden]} />
                            <View style={[styles.node, { borderColor: nodeColor, backgroundColor: isActive ? nodeColor : 'white' }]}>
                                {isCompleted ? (
                                    <CheckCircle size={14} color={theme.colors.success} />
                                ) : isActive ? (
                                    <MapPin size={14} color="white" />
                                ) : (
                                    <Circle size={10} color={nodeColor} />
                                )}
                            </View>
                            <View style={[styles.lineBottom, index === rooms.length - 1 && styles.hidden]} />
                        </View>

                        {/* Content Card */}
                        <TouchableOpacity
                            style={[
                                styles.card,
                                isActive && styles.activeCard,
                                isCompleted && styles.completedCard
                            ]}
                            onPress={() => onPressRoom(room)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={[styles.roomNumber, isActive && styles.activeText]}>{room.number}</Text>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>{room.cleaningType}</Text>
                                </View>
                            </View>

                            <Text style={styles.floorText}>Floor {room.floor} • {room.type}</Text>

                            {/* Extra Badges */}
                            <View style={styles.badgesRow}>
                                {room.guestStatus === 'GUEST_IN_ROOM' && (
                                    <View style={styles.badgeSmall}>
                                        <Text style={styles.badgeSmallText}>Guest In</Text>
                                    </View>
                                )}
                                {room.cleaningType === 'PREARRIVAL' ? (
                                    <View style={[styles.badgeSmall, { backgroundColor: '#EFF6FF' }]}>
                                        <Clock size={12} color={theme.colors.info} />
                                        <Text style={[styles.badgeSmallText, { color: theme.colors.info }]}>
                                            Arr: {room.guestDetails?.next_arrival_time || 'N/A'}
                                        </Text>
                                    </View>
                                ) : (room.cleaningType === 'DEPARTURE' && (
                                    <View style={[styles.badgeSmall, { backgroundColor: '#FEF2F2' }]}>
                                        <Text style={[styles.badgeSmallText, { color: theme.colors.error }]}>Priority</Text>
                                    </View>
                                ))}
                            </View>

                            {isActive && (
                                <View style={styles.activeIndicator}>
                                    <Clock size={12} color="white" />
                                    <Text style={styles.activeIndicatorText}>Now Cleaning</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                );
            })}

            {/* End of Line */}
            {rooms.length > 0 && (
                <View style={styles.row}>
                    <View style={styles.timelineColumn}>
                        <View style={[styles.lineTop, { height: 20 }]} />
                        <View style={[styles.node, { backgroundColor: theme.colors.border, width: 12, height: 12 }]} />
                    </View>
                    <Text style={styles.endText}>End of Shift</Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingBottom: 80
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
        gap: 12
    },
    emptyText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
        letterSpacing: 0.5
    },
    emptySubText: {
        color: theme.colors.textSecondary,
        fontSize: 14
    },
    row: {
        flexDirection: 'row',
        marginBottom: 0,
        minHeight: 100 // More breathing room
    },
    timelineColumn: {
        width: 40,
        alignItems: 'center',
        marginRight: 16 // More separation
    },
    lineTop: {
        width: 2,
        backgroundColor: '#E5E7EB',
        flex: 1
    },
    lineBottom: {
        width: 2,
        backgroundColor: '#E5E7EB',
        flex: 1
    },
    dashedLine: {
        borderStyle: 'dashed',
        borderWidth: 1, // Visual trick for dashed line on View is tricky in RN without border? 
        // Actually, best way is repeating views or just keeping it solid but lighter. 
        // Let's make future lines lighter.
        backgroundColor: '#F3F4F6',
        width: 2
    },
    hidden: {
        opacity: 0
    },
    node: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 3, // Thicker border
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        marginTop: -2,
        marginBottom: -2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2
    },
    card: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 20, // More rounded
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 }, // Deeper shadow
        shadowOpacity: 0.08,
        shadowRadius: 12, // Softer shadow
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F3F4F6'
    },
    activeCard: {
        backgroundColor: theme.colors.primary,
        transform: [{ scale: 1.02 }],
        shadowOpacity: 0.25,
        shadowRadius: 16,
        borderColor: 'transparent'
    },
    completedCard: {
        opacity: 0.7,
        backgroundColor: '#F9FAFB',
        shadowOpacity: 0
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    roomNumber: {
        fontSize: 22, // Larger
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: 0.5
    },
    activeText: {
        color: 'white'
    },
    statusBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    floorText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 12,
        fontWeight: '500'
    },
    badgesRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap'
    },
    badgeSmall: {
        backgroundColor: '#FEF9C3',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    badgeSmallText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#854D0E'
    },
    activeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 6
    },
    activeIndicatorText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    endText: {
        marginTop: 20,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        fontSize: 14
    }
});
