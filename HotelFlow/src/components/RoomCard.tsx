import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, Alert } from 'react-native';
import { Room, Incident, useHotel } from '../contexts/HotelContext';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { StatusBadge } from './StatusBadge';
import { AlertTriangle, Moon, Clock, UserCheck, Play, CheckCircle, Package, HelpCircle } from 'lucide-react-native';

interface Props {
    room: Room;
    onPress: () => void;
    showGroup?: boolean;
    onQuickAction?: () => void;
    style?: ViewStyle;
}

export const RoomCard: React.FC<Props> = ({ room, onPress, showGroup, onQuickAction, style }) => {
    const { settings, addIncident, updateGuestStatus } = useHotel();
    const { user } = useAuth();
    const estimatedTime = settings.timeEstimates[room.cleaningType];

    // Determine border color based on cleaning type
    const getBorderColor = () => {
        switch (room.cleaningType) {
            case 'DEPARTURE': return theme.colors.error; // Red
            case 'PREARRIVAL': return theme.colors.primary; // Purple
            case 'HOLDOVER': return theme.colors.info; // Blue
            case 'WEEKLY': return theme.colors.warning; // Orange
            case 'RUBBISH': return '#718096'; // Gray
            case 'DAYUSE': return '#D53F8C'; // Pink
            default: return theme.colors.text; // Default to visible text color (though border might be weird)
        }
    };

    const stripColor = getBorderColor();

    return (
        <TouchableOpacity
            style={[
                styles.card,
                { borderLeftColor: stripColor, borderLeftWidth: 6 },
                style
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Status & Priority Banner - Absolute Top Right if needed, or inline */}
            {room.isGuestWaiting && (
                <View style={styles.rushBanner}>
                    <AlertTriangle size={12} color="white" />
                    <Text style={styles.rushText}>GUEST WAITING</Text>
                </View>
            )}

            <View style={styles.contentContainer}>
                {/* Header Row: Room #, Badges, Status */}
                <View style={styles.headerRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.roomNumber}>{room.number}</Text>
                        <View style={{ backgroundColor: theme.colors.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.border }}>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: theme.colors.textSecondary }}>{room.type}</Text>
                        </View>

                        {/* Status Badge moved here for alignment */}
                        <StatusBadge status={room.status} />

                        {showGroup && room.assignedGroup && (
                            <View style={styles.groupBadge}>
                                <Text style={styles.groupBadgeText}>{room.assignedGroup}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Info Row: Type, Guest, Time */}
                <View style={styles.infoRow}>
                    <View style={styles.mainInfo}>
                        <Text style={[styles.cleaningType, { color: stripColor }]}>
                            {room.cleaningType ? (room.cleaningType.replace('_', ' ').charAt(0) + room.cleaningType.slice(1).toLowerCase().replace('_', ' ')) : 'Unknown'} <Text style={styles.timeEst}>• {estimatedTime}m</Text>
                        </Text>

                        {room.guestDetails?.currentGuest && (
                            <Text style={styles.guestText} numberOfLines={1}>
                                {room.guestDetails.currentGuest}
                            </Text>
                        )}
                        {(room.guestDetails?.nextGuest || room.guestDetails?.nextArrival) && (
                            <Text style={styles.nextGuestText} numberOfLines={1}>
                                🔜 {room.guestDetails.nextGuest || 'Next'} {room.guestDetails.nextArrival ? `@${room.guestDetails.nextArrival} ` : ''}
                            </Text>
                        )}
                    </View>

                    <View style={{ gap: 8 }}>
                        {/* Linen Request Button - Only for Departures/Pending */}
                        {room.cleaningType === 'DEPARTURE' && room.status === 'PENDING' && (
                            <TouchableOpacity
                                style={[styles.quickActionButton, { backgroundColor: theme.colors.warning }]}
                                onPress={() => {
                                    Alert.alert(
                                        "Request Linen",
                                        "Notify Houseman that linen is missing?",
                                        [
                                            { text: "Cancel", style: "cancel" },
                                            {
                                                text: "Request",
                                                onPress: () => {
                                                    addIncident(
                                                        room.id,
                                                        'Linen Kits Missing',
                                                        user?.username || 'Cleaner',
                                                        'HOUSEMAN',
                                                        undefined,
                                                        undefined,
                                                        'SUPPLY'
                                                    );
                                                    Alert.alert("Sent", "Houseman notified.");
                                                }
                                            }
                                        ]
                                    );
                                }}
                            >
                                <Package size={14} color="white" />
                                <Text style={styles.quickActionText}>Needs Linen</Text>
                            </TouchableOpacity>
                        )}

                        {/* Guest Left Button */}
                        {room.guestStatus === 'GUEST_IN_ROOM' && (
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    style={[styles.quickActionButton, { backgroundColor: theme.colors.info }]}
                                    onPress={() => {
                                        Alert.alert(
                                            "Guest Departure",
                                            "Has the guest left the room?",
                                            [
                                                { text: "Cancel", style: "cancel" },
                                                {
                                                    text: "Yes, Guest Left",
                                                    onPress: () => {
                                                        updateGuestStatus(room.id, 'OUT');
                                                        Alert.alert("Updated", "Room marked as Guest Out.");
                                                    }
                                                }
                                            ]
                                        );
                                    }}
                                >
                                    <UserCheck size={14} color="white" />
                                    <Text style={styles.quickActionText}>Guest Out?</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.quickActionButton, { backgroundColor: theme.colors.secondary }]}
                                    onPress={() => {
                                        Alert.alert(
                                            "Ask Reception",
                                            "Request Reception to check guest status?",
                                            [
                                                { text: "Cancel", style: "cancel" },
                                                {
                                                    text: "Ask",
                                                    onPress: () => {
                                                        addIncident(
                                                            room.id,
                                                            'Please verify if guest has departed.',
                                                            user?.username || 'Cleaner',
                                                            'RECEPTION',
                                                            undefined,
                                                            undefined,
                                                            'GUEST_REQ'
                                                        );
                                                        Alert.alert("Sent", "Reception notified to check room.");
                                                    }
                                                }
                                            ]
                                        );
                                    }}
                                >
                                    <HelpCircle size={14} color="white" />
                                    <Text style={styles.quickActionText}>Ask Front Desk</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Guest IN Button (For Safety/Error Correction) */}
                        {room.guestStatus === 'NO_GUEST' && (
                            <TouchableOpacity
                                style={[styles.quickActionButton, { backgroundColor: theme.colors.warning }]}
                                onPress={() => {
                                    Alert.alert(
                                        "Guest In Room?",
                                        "Mark this room as occupied?",
                                        [
                                            { text: "Cancel", style: "cancel" },
                                            {
                                                text: "Yes, Guest Present",
                                                onPress: () => updateGuestStatus(room.id, 'GUEST_IN_ROOM')
                                            }
                                        ]
                                    );
                                }}
                            >
                                <UserCheck size={14} color="white" />
                                <Text style={styles.quickActionText}>Guest In?</Text>
                            </TouchableOpacity>
                        )}

                        {/* Quick Action Button */}
                        {onQuickAction && room.status !== 'INSPECTION' && (
                            <TouchableOpacity
                                style={[styles.quickActionButton, { backgroundColor: room.status === 'PENDING' ? theme.colors.primary : theme.colors.success }]}
                                onPress={onQuickAction}
                            >
                                {room.status === 'PENDING' ? (
                                    <Play size={16} color="white" fill="white" />
                                ) : (
                                    <CheckCircle size={16} color="white" />
                                )}
                                <Text style={styles.quickActionText}>
                                    {room.status === 'PENDING' ? 'Start' : 'Finish'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Footer: Icons & Floor */}
                <View style={styles.footer}>
                    <View style={styles.icons}>
                        {room.guestStatus === 'GUEST_IN_ROOM' && (
                            <View style={[styles.iconTag, { backgroundColor: theme.colors.warning + '20' }]}>
                                <UserCheck size={12} color={theme.colors.warning} />
                                <Text style={[styles.iconText, { color: theme.colors.warning }]}>Guest In</Text>
                            </View>
                        )}
                        {room.isDND && (
                            <View style={[styles.iconTag, { backgroundColor: theme.colors.secondary + '20' }]}>
                                <Moon size={12} color={theme.colors.secondary} />
                                <Text style={[styles.iconText, { color: theme.colors.secondary }]}>DND</Text>
                            </View>
                        )}
                        {room.incidents.length > 0 && (
                            <View style={[styles.iconTag, { backgroundColor: theme.colors.error + '20' }]}>
                                <AlertTriangle size={12} color={theme.colors.error} />
                                <Text style={[styles.iconText, { color: theme.colors.error }]}>{room.incidents.length} Issue</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.floorText}>Floor {room.floor}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.m,
        marginBottom: theme.spacing.m,
        ...theme.shadows.card,
        overflow: 'hidden', // Ensure strip respects border radius
        paddingRight: theme.spacing.m, // Only pad right/top/bottom, left is handled by strip
        paddingTop: theme.spacing.s,
        paddingBottom: theme.spacing.s,
    },
    contentContainer: {
        marginLeft: theme.spacing.s, // Spacing from the border strip
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    roomNumber: {
        fontSize: 22, // Larger
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    mainInfo: {
        flex: 1,
    },
    cleaningType: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    timeEst: {
        fontWeight: 'normal',
        color: theme.colors.textSecondary,
    },
    guestText: {
        fontSize: 14,
        color: theme.colors.text,
        fontWeight: '500',
    },
    nextGuestText: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 8,
    },
    icons: {
        flexDirection: 'row',
        gap: 6,
    },
    iconTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 4,
    },
    iconText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    floorText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    groupBadge: {
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    groupBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    rushBanner: {
        backgroundColor: theme.colors.error,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 2,
        marginBottom: 4,
        marginRight: -16, // Extend to edge? No, keep contained
        marginLeft: -8,
        gap: 6,
        borderTopRightRadius: 8,
    },
    rushText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 10
    },
    quickActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20, // Pill shape
        gap: 4,
    },
    quickActionText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    }
});
