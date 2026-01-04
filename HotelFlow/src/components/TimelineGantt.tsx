import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Room, RoomStatus } from '../contexts/HotelContext';
import { theme } from '../utils/theme';

const HOUR_WIDTH = 60;
const START_HOUR = 8; // 8 AM
const END_HOUR = 18; // 6 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;

const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

interface TimelineGanttProps {
    rooms: Room[];
}

export const TimelineGantt: React.FC<TimelineGanttProps> = ({ rooms }) => {

    const getStatusColor = (status: RoomStatus) => {
        switch (status) {
            case 'COMPLETED': return theme.colors.success;
            case 'PENDING': return theme.colors.error;
            case 'IN_PROGRESS': return theme.colors.primary;
            case 'INSPECTION': return theme.colors.warning;
            default: return '#CBD5E0';
        }
    };

    const getBlockPosition = (room: Room, index: number) => {
        // Mock Logic for Visualization
        // In a real app, this would use room.cleaning_scheduled_time or actual logs
        // Here we just stagger them for demo purposes
        const startOffset = index * 0.5; // Stagger each room by 30 mins
        return {
            left: startOffset * HOUR_WIDTH,
            width: room.status === 'COMPLETED' ? 45 : 30 // 45 mins if clean, 30 if dirty estimate
        };
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={styles.sidebarHeader}><Text style={styles.headerText}>Room</Text></View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.timelineHeader}>
                        {HOURS.map(hour => (
                            <View key={hour} style={styles.hourMarker}>
                                <Text style={styles.hourText}>{hour}:00</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </View>

            <ScrollView>
                <View style={styles.bodyContainer}>
                    {/* Fixed Room Column */}
                    <View style={styles.sidebar}>
                        {rooms.map(room => (
                            <View key={room.id} style={styles.roomRowLabel}>
                                <Text style={styles.roomText}>Room {room.number}</Text>
                                <View style={[styles.statusDot, { backgroundColor: getStatusColor(room.status) }]} />
                            </View>
                        ))}
                    </View>

                    {/* Scrollable Timeline */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.timelineBody}>
                            {/* Grid Lines */}
                            {HOURS.map(hour => (
                                <View key={hour} style={styles.gridLine} />
                            ))}

                            {/* Task Blocks */}
                            {rooms.map((room, index) => {
                                const { left, width } = getBlockPosition(room, index);
                                return (
                                    <View
                                        key={room.id}
                                        style={[
                                            styles.taskBlock,
                                            {
                                                top: index * 50 + 10, // 50 is row height
                                                left: left + 20, // Initial offset
                                                width: width * (HOUR_WIDTH / 15), // approximate scale
                                                backgroundColor: getStatusColor(room.status)
                                            }
                                        ]}
                                    >
                                        <Text style={styles.taskText}>{room.status}</Text>
                                    </View>
                                )
                            })}
                        </View>
                    </ScrollView>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    headerRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        backgroundColor: '#F7FAFC'
    },
    sidebarHeader: {
        width: 80,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#E2E8F0'
    },
    headerText: {
        fontWeight: 'bold',
        color: '#4A5568'
    },
    timelineHeader: {
        flexDirection: 'row',
        height: 50,
        alignItems: 'center'
    },
    hourMarker: {
        width: HOUR_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#EDF2F7',
        height: '100%'
    },
    hourText: {
        fontSize: 12,
        color: '#718096'
    },
    bodyContainer: {
        flexDirection: 'row',
    },
    sidebar: {
        width: 80,
        borderRightWidth: 1,
        borderRightColor: '#E2E8F0',
    },
    roomRowLabel: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F7FAFC',
        flexDirection: 'row',
        gap: 4
    },
    roomText: {
        fontWeight: '600',
        fontSize: 12
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3
    },
    timelineBody: {
        flexDirection: 'row',
        height: 1000, // Enough for all rooms
        position: 'relative'
    },
    gridLine: {
        width: HOUR_WIDTH,
        borderRightWidth: 1,
        borderRightColor: '#F7FAFC',
        height: '100%'
    },
    taskBlock: {
        position: 'absolute',
        height: 30,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        opacity: 0.9
    },
    taskText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold'
    }
});
