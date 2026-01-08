import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { theme } from '../utils/theme';
import { format, addDays, startOfWeek } from 'date-fns';
import { Calendar, CheckCircle2, BedDouble, PowerOff } from 'lucide-react-native';

const STATUS_OPTIONS = [
    { value: 'AVAILABLE', label: 'Full Day', color: theme.colors.success, icon: CheckCircle2 },
    { value: 'PARTIAL', label: 'Partial', color: theme.colors.primary, icon: CheckCircle2 }, // Reusing icon or new one
    { value: 'VACATION', label: 'Vacation', color: theme.colors.warning, icon: BedDouble },
    { value: 'OFF', label: 'Off Day', color: theme.colors.error, icon: PowerOff },
];

export default function AvailabilityScreen() {
    const { user } = useAuth();
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [availabilities, setAvailabilities] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Temp state for editing partial times [date]: { start, end }
    const [partialTimes, setPartialTimes] = useState<Record<string, { start: string, end: string }>>({});

    useEffect(() => {
        fetchAvailability();
    }, [weekStart]);

    const fetchAvailability = async () => {
        setLoading(true);
        try {
            const res = await api.get('/housekeeping/availability/');
            setAvailabilities(res.data);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to fetch availability");
        } finally {
            setLoading(false);
        }
    };

    const handleSetAvailability = async (dateStr: string, status: string) => {
        // If Partial, we need times. Default to 09:00-13:00 if not set
        let start_time = null;
        let end_time = null;

        if (status === 'PARTIAL') {
            const times = partialTimes[dateStr] || { start: '09:00', end: '13:00' };
            start_time = times.start;
            end_time = times.end;
        }

        try {
            const existing = availabilities.find(a => a.date === dateStr);
            const payload = {
                user: user?.id,
                date: dateStr,
                status,
                start_time,
                end_time
            };

            if (existing) {
                const res = await api.patch(`/housekeeping/availability/${existing.id}/`, payload);
                setAvailabilities(prev => prev.map(a => a.id === existing.id ? res.data : a));
            } else {
                const res = await api.post('/housekeeping/availability/', payload);
                setAvailabilities(prev => [...prev, res.data]);
            }
        } catch (e) {
            Alert.alert("Error", "Failed to update status");
        }
    };

    const updatePartialTime = (dateStr: string, field: 'start' | 'end', value: string) => {
        setPartialTimes(prev => ({
            ...prev,
            [dateStr]: {
                ...(prev[dateStr] || { start: '09:00', end: '13:00' }),
                [field]: value
            }
        }));
    };

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Weekly Availability</Text>
                <Text style={styles.subtitle}>Week of {format(weekStart, 'MMM d, yyyy')}</Text>
            </View>

            <ScrollView style={styles.content}>
                {loading && <ActivityIndicator size="large" color={theme.colors.primary} />}

                {weekDays.map((dateObj) => {
                    const dateStr = format(dateObj, 'yyyy-MM-dd');
                    const current = availabilities.find(a => a.date === dateStr);
                    const currentStatus = current ? current.status : 'AVAILABLE';

                    // Initial partial times from DB if exists
                    const displayStart = (current?.start_time || partialTimes[dateStr]?.start || '09:00').slice(0, 5);
                    const displayEnd = (current?.end_time || partialTimes[dateStr]?.end || '13:00').slice(0, 5);

                    return (
                        <View key={dateStr} style={styles.dayRow}>
                            <View style={styles.dateCol}>
                                <Text style={styles.dayName}>{format(dateObj, 'EEEE')}</Text>
                                <Text style={styles.dayDate}>{format(dateObj, 'MMM d')}</Text>
                            </View>

                            <View style={styles.optionsCol}>
                                {STATUS_OPTIONS.map(opt => {
                                    const isSelected = currentStatus === opt.value;
                                    const Icon = opt.icon;
                                    return (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[
                                                styles.optionBtn,
                                                isSelected && { backgroundColor: opt.color + '20', borderColor: opt.color }
                                            ]}
                                            onPress={() => handleSetAvailability(dateStr, opt.value)}
                                        >
                                            <Icon size={16} color={isSelected ? opt.color : '#ccc'} />
                                            <Text style={[styles.optionText, isSelected && { color: opt.color, fontWeight: 'bold' }]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {currentStatus === 'PARTIAL' && (
                                <View style={styles.timeInputRow}>
                                    <Text style={styles.timeLabel}>Hours:</Text>
                                    <TextInput
                                        style={styles.timeInput}
                                        value={displayStart}
                                        onChangeText={(t) => updatePartialTime(dateStr, 'start', t)}
                                        onEndEditing={() => handleSetAvailability(dateStr, 'PARTIAL')} // Save on blur
                                        placeholder="09:00"
                                    />
                                    <Text>-</Text>
                                    <TextInput
                                        style={styles.timeInput}
                                        value={displayEnd}
                                        onChangeText={(t) => updatePartialTime(dateStr, 'end', t)}
                                        onEndEditing={() => handleSetAvailability(dateStr, 'PARTIAL')}
                                        placeholder="13:00"
                                    />
                                </View>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { padding: 20, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderColor: theme.colors.border },
    title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text },
    subtitle: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 4 },
    content: { padding: 16 },
    dayRow: {
        backgroundColor: theme.colors.card,
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        ...theme.shadows.card
    },
    dateCol: { marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dayName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
    dayDate: { fontSize: 16, color: theme.colors.textSecondary },
    optionsCol: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    optionBtn: {
        minWidth: 70,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        gap: 4
    },
    optionText: { fontSize: 11, color: theme.colors.textSecondary },
    timeInputRow: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f9f9f9',
        padding: 8,
        borderRadius: 8
    },
    timeLabel: { fontSize: 14, color: theme.colors.textSecondary },
    timeInput: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        padding: 4,
        width: 60,
        textAlign: 'center'
    }
});
