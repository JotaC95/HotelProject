import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useHotel } from '../contexts/HotelContext';
import { theme } from '../utils/theme';
import { AlertTriangle } from 'lucide-react-native';

interface DayTimerProps {
    totalMinutes: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const DayTimer = React.memo(({ totalMinutes }: DayTimerProps) => {
    const { session, takeBreak } = useHotel();
    const [elapsed, setElapsed] = useState(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Derived logic
    const totalSeconds = totalMinutes * 60; // Target (if any)

    // Net Elapsed (Subtract break if taken)
    const breakSeconds = (session.breakMinutes || 0) * 60;
    const netElapsed = Math.max(0, elapsed - breakSeconds);

    // Break Eligibility: > 6 hours (21600 seconds)
    const canTakeBreak = elapsed > 21600 && !session.breakMinutes;

    // Animation for Overtime (Pulse)
    // Dependent strictly on isOvertime boolean state transition
    // (Keeping overtime logic if target exists, but prioritization Count Up)
    // Actually, user wants "Total Hours".

    // ... useEffects for animation (simplified or removed if generic count up) ...

    // Timer Interval Logic
    useEffect(() => {
        if (!session.isActive || !session.startTime) {
            setElapsed(0);
            return;
        }

        const calculateElapsed = () => {
            const start = new Date(session.startTime!).getTime();
            const now = new Date().getTime();
            return Math.max(0, Math.floor((now - start) / 1000));
        };

        setElapsed(calculateElapsed());

        const interval = setInterval(() => {
            setElapsed(calculateElapsed());
        }, 1000);

        return () => clearInterval(interval);
    }, [session.isActive, session.startTime]);

    // Removed: if (!session.isActive) return null;
    // We want to show 00:00:00 if not active.


    // Formatting
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Circular Progress: Now represents 8 hour work day? Or just generic spinner?
    // Let's assume a standard 8 hour day (28800s) for the visual progress if target is 0.
    const targetSeconds = totalMinutes > 0 ? totalSeconds : 28800;

    // ... (Visual props) ...
    const size = 200;
    const strokeWidth = 12;
    const center = size / 2;
    const radius = size / 2 - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max(netElapsed / targetSeconds, 0), 1);
    const fillOffset = circumference - (circumference * progress);

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Daily Timer</Text>
                    {/* Break Indicator */}
                    {session.breakMinutes > 0 && (
                        <View style={styles.breakBadge}>
                            <Text style={styles.breakText}>Break Taken (-30m)</Text>
                        </View>
                    )}
                </View>

                <View style={styles.ringContainer}>
                    <Svg width={size} height={size}>
                        <Defs>
                            <LinearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="0">
                                <Stop offset="0" stopColor={theme.colors.primary} stopOpacity="1" />
                                <Stop offset="1" stopColor="#60A5FA" stopOpacity="1" />
                            </LinearGradient>
                        </Defs>
                        {/* Background Track */}
                        <Circle
                            stroke={theme.colors.background}
                            cx={center}
                            cy={center}
                            r={radius}
                            strokeWidth={strokeWidth}
                            strokeOpacity={0.5}
                        />
                        {/* Progress Circle */}
                        <G rotation="-90" origin={`${center}, ${center}`}>
                            <AnimatedCircle
                                stroke={"url(#progressGradient)"}
                                cx={center}
                                cy={center}
                                r={radius}
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={fillOffset}
                                strokeLinecap="round"
                            />
                        </G>
                    </Svg>

                    {/* Center Text */}
                    <View style={styles.centerTextContainer}>
                        <Text style={[styles.timerValue, { color: theme.colors.primary }]}>
                            {formatTime(netElapsed)}
                        </Text>
                        <Text style={styles.subLabel}>
                            Total Worked
                        </Text>
                    </View>
                </View>

                {/* Break Button logic */}
                {canTakeBreak && (
                    <TouchableOpacity
                        style={styles.breakButton}
                        onPress={takeBreak}
                    >
                        <Text style={styles.breakButtonText}>Add 30m Break</Text>
                    </TouchableOpacity>
                )}


                {/* Footer Info */}
                <View style={styles.footer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Target</Text>
                        <Text style={styles.statValue}>{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Start</Text>
                        <Text style={styles.statValue}>
                            {session.startTime ? new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        paddingHorizontal: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        ...theme.shadows.card,
    },
    headerRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
    },
    overtimeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.error,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    overtimeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    ringContainer: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    centerTextContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerValue: {
        fontSize: 42,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
        letterSpacing: 1, // Clearer separation
    },
    subLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
    },
    footer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 16,
    },
    statItem: {
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginBottom: 2,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#f0f0f0',
    },
    breakBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    breakText: {
        color: theme.colors.primary,
        fontSize: 10,
        fontWeight: 'bold',
    },
    breakButton: {
        marginTop: 20,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.card,
    },
    breakButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    }
});
