import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useHotel } from '../contexts/HotelContext';
import { theme } from '../utils/theme';
import { AlertTriangle } from 'lucide-react-native';

interface DayTimerProps {
    totalMinutes: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const DayTimer = React.memo(({ totalMinutes }: DayTimerProps) => {
    const { session } = useHotel();
    const [elapsed, setElapsed] = useState(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Derived logic
    const totalSeconds = totalMinutes * 60;
    const remaining = totalSeconds - elapsed;
    const isOvertime = remaining < 0; // Check strict logic vs equality

    // Animation for Overtime (Pulse)
    // Dependent strictly on isOvertime boolean state transition
    useEffect(() => {
        if (!session.isActive || !isOvertime) {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
            return;
        }

        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [isOvertime, session.isActive]); // Stable dependencies

    // Timer Interval Logic
    useEffect(() => {
        if (!session.isActive || !session.startTime) {
            setElapsed(0);
            return;
        }

        const calculateElapsed = () => {
            const start = new Date(session.startTime!).getTime();
            const now = new Date().getTime();
            // Prevent negative elapsed if system clock drifts weirdly (though unlikely with Date.now)
            return Math.max(0, Math.floor((now - start) / 1000));
        };

        setElapsed(calculateElapsed());

        const interval = setInterval(() => {
            setElapsed(calculateElapsed());
        }, 1000);

        return () => clearInterval(interval);
    }, [session.isActive, session.startTime]);

    if (!session.isActive) return null;

    const absSeconds = Math.abs(remaining);

    // Formatting
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Circular Progress settings
    const size = 200; // Increased from 160 for better visibility
    const strokeWidth = 12;
    const center = size / 2;
    const radius = size / 2 - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;

    // Progress (0 to 1) - Clamp
    const progress = Math.min(Math.max(elapsed / (totalSeconds || 1), 0), 1);

    // Fill up visual
    const fillOffset = circumference - (circumference * progress);

    const getStrokeColor = () => {
        if (isOvertime) return theme.colors.error;
        if (progress > 0.8) return theme.colors.warning;
        return theme.colors.primary;
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Session Timer</Text>
                    {isOvertime && (
                        <View style={styles.overtimeBadge}>
                            <AlertTriangle size={14} color="white" />
                            <Text style={styles.overtimeText}>OVERTIME</Text>
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
                        {!isOvertime && (
                            <G rotation="-90" origin={`${center}, ${center}`}>
                                <AnimatedCircle
                                    stroke={progress > 0.8 ? theme.colors.warning : "url(#progressGradient)"}
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={circumference}
                                    strokeDashoffset={fillOffset}
                                    strokeLinecap="round"
                                />
                            </G>
                        )}
                        {/* Overtime Ring (Static Red) */}
                        {isOvertime && (
                            <Circle
                                stroke={theme.colors.error}
                                cx={center}
                                cy={center}
                                r={radius}
                                strokeWidth={strokeWidth}
                            />
                        )}
                    </Svg>

                    {/* Center Text */}
                    <View style={styles.centerTextContainer}>
                        <Animated.View style={{ transform: [{ scale: isOvertime ? pulseAnim : 1 }] }}>
                            <Text style={[styles.timerValue, { color: isOvertime ? theme.colors.error : theme.colors.primary }]}>
                                {isOvertime ? '+' : ''}{formatTime(absSeconds)}
                            </Text>
                            <Text style={styles.subLabel}>
                                {isOvertime ? 'Over limit' : 'Remaining'}
                            </Text>
                        </Animated.View>
                    </View>
                </View>

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
    }
});
