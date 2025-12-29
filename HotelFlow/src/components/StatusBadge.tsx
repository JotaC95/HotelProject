import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RoomStatus } from '../contexts/HotelContext';
import { theme } from '../utils/theme';

interface Props {
    status: RoomStatus;
}

const getStatusColor = (status: RoomStatus) => {
    switch (status) {
        case 'PENDING': return theme.colors.textSecondary;
        case 'IN_PROGRESS': return theme.colors.info;
        case 'INSPECTION': return theme.colors.warning; // Orange
        case 'COMPLETED': return theme.colors.success;
        default: return theme.colors.textSecondary;
    }
};

const getStatusLabel = (status: RoomStatus) => {
    switch (status) {
        case 'PENDING': return 'Pending';
        case 'IN_PROGRESS': return 'Cleaning';
        case 'INSPECTION': return 'Inspection';
        case 'COMPLETED': return 'Ready';
        default: return status;
    }
};

export const StatusBadge: React.FC<Props> = ({ status }) => {
    const color = getStatusColor(status);

    return (
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.text, { color }]}>
                {getStatusLabel(status)}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
});
