import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Room, useHotel } from '../contexts/HotelContext';
import { theme } from '../utils/theme';
import { StatusBadge } from './StatusBadge';
import { AlertTriangle, Moon, Clock } from 'lucide-react-native';

interface Props {
    room: Room;
    onPress: () => void;
    showGroup?: boolean;
}

export const RoomCard: React.FC<Props> = ({ room, onPress, showGroup }) => {
    const { settings } = useHotel();
    const estimatedTime = settings.timeEstimates[room.cleaningType];

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.header}>
                <View style={styles.roomInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.roomNumber}>Room {room.number}</Text>
                        {showGroup && room.assignedGroup && (
                            <View style={styles.groupBadge}>
                                <Text style={styles.groupBadgeText}>{room.assignedGroup}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.typeRow}>
                        <Text style={[
                            styles.cleaningType,
                            room.cleaningType === 'DEPARTURE' ? styles.departure :
                                room.cleaningType === 'PREARRIVAL' ? styles.prearrival :
                                    styles.stayover
                        ]}>
                            {room.cleaningType.charAt(0) + room.cleaningType.slice(1).toLowerCase()} ({estimatedTime}m)
                        </Text>
                    </View>

                    {/* Guest Info */}
                    {room.guestDetails?.currentGuest && (
                        <Text style={styles.guestText} numberOfLines={1}>
                            👤 {room.guestDetails.currentGuest}
                            {room.guestDetails.checkOutDate ? ` • Dep: ${room.guestDetails.checkOutDate}` : ''}
                        </Text>
                    )}

                    {/* Pre-Arrival Next Guest */}
                    {room.cleaningType === 'PREARRIVAL' && room.guestDetails?.nextGuest && (
                        <Text style={styles.nextGuestText} numberOfLines={1}>
                            🔜 Next: {room.guestDetails.nextGuest}
                            {room.guestDetails.nextArrival ? ` (${new Date(room.guestDetails.nextArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
                        </Text>
                    )}
                </View>
                <StatusBadge status={room.status} />
            </View>

            <View style={styles.footer}>
                <View style={styles.icons}>
                    {room.isDND && (
                        <View style={[styles.iconTag, { backgroundColor: theme.colors.secondary + '20' }]}>
                            <Moon size={14} color={theme.colors.secondary} />
                            <Text style={[styles.iconText, { color: theme.colors.secondary }]}>DND</Text>
                        </View>
                    )}
                    {room.extraTime && (
                        <View style={[styles.iconTag, { backgroundColor: theme.colors.info + '20' }]}>
                            <Clock size={14} color={theme.colors.info} />
                            <Text style={[styles.iconText, { color: theme.colors.info }]}>Extra Time</Text>
                        </View>
                    )}
                    {room.incidents.length > 0 && (
                        <View style={[styles.iconTag, { backgroundColor: theme.colors.error + '20' }]}>
                            <AlertTriangle size={14} color={theme.colors.error} />
                            <Text style={[styles.iconText, { color: theme.colors.error }]}>{room.incidents.length} Issue{room.incidents.length > 1 ? 's' : ''}</Text>
                        </View>
                    )}
                </View>

                {/* Floor indicator */}
                <Text style={styles.floorText}>Floor {room.floor}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        ...theme.shadows.card,
        borderWidth: 1,
        borderColor: 'transparent', // Prepare for selection if needed
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.m,
    },
    roomInfo: {
        flex: 1,
    },
    roomNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text,
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    roomType: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    dot: {
        marginHorizontal: 4,
        color: theme.colors.textSecondary,
        fontSize: 10,
    },
    guestText: {
        fontSize: 13,
        color: theme.colors.text,
        marginTop: 4,
        fontWeight: '500',
    },
    nextGuestText: {
        fontSize: 12,
        color: theme.colors.primary,
        marginTop: 2,
        fontWeight: '600',
    },
    cleaningType: {
        fontSize: 13,
        fontWeight: '600',
    },
    departure: {
        color: theme.colors.error,
    },
    prearrival: {
        color: theme.colors.primary, // Purple/Primary for Prearrival
    },
    stayover: {
        color: theme.colors.info,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 4,
    },
    icons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        flex: 1,
    },
    iconTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    iconText: {
        fontSize: 11,
        fontWeight: '600',
    },
    floorText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginLeft: 8,
    },
    groupBadge: {
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    groupBadgeText: {
        color: 'white', // Ensure text is white or contrasting
        fontSize: 10,
        fontWeight: 'bold',
    }
});
