import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const SkeletonItem = ({ width, height, style }: { width: number | string, height: number, style?: any }) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[{ width, height, backgroundColor: '#E2E8F0', borderRadius: 4, opacity }, style]} />
    );
};

export const SkeletonRoomCard = () => {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <SkeletonItem width={80} height={24} />
                <SkeletonItem width={60} height={24} />
            </View>
            <View style={styles.row}>
                <SkeletonItem width={120} height={16} />
                <SkeletonItem width={40} height={16} />
            </View>
            <View style={styles.row}>
                <SkeletonItem width={180} height={16} />
            </View>
            <View style={[styles.row, { marginTop: 10 }]}>
                <SkeletonItem width={100} height={32} style={{ borderRadius: 16 }} />
                <SkeletonItem width={32} height={32} style={{ borderRadius: 16 }} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    }
});
