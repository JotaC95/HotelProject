import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, FlatList } from 'react-native';
import { useHotel } from '../contexts/HotelContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { theme } from '../utils/theme';
import { format, startOfWeek, addDays } from 'date-fns';
import { Calendar, Users, AlertTriangle, RefreshCw } from 'lucide-react-native';

export default function RosterScreen() {
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday
    const [rosterData, setRosterData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [alerts, setAlerts] = useState<string[]>([]);
    const [forecast, setForecast] = useState<any[]>([]);
    const { assignRoomsDaily } = useHotel();
    const { user } = useAuth();
    const isCleaner = user?.role === 'CLEANER';

    useEffect(() => {
        fetchRoster();
        if (!isCleaner) fetchForecast();
    }, [weekStart]);

    const fetchForecast = async () => {
        try {
            const dateStr = format(weekStart, 'yyyy-MM-dd');
            const res = await api.get(`/housekeeping/roster/forecast/?start_date=${dateStr}`);
            setForecast(res.data);
        } catch (e) {
            console.log("Forecast error", e);
        }
    };

    const fetchRoster = async () => {
        setLoading(true);
        try {
            const dateStr = format(weekStart, 'yyyy-MM-dd');
            const res = await api.get(`/housekeeping/roster/week/?start_date=${dateStr}`);
            setRosterData(res.data);
            setAlerts([]); // Clear alerts on simple fetch
        } catch (e) {
            Alert.alert("Error", "Failed to fetch roster");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const dateStr = format(weekStart, 'yyyy-MM-dd');
            const res = await api.post('/housekeeping/roster/generate/', { start_date: dateStr });
            setRosterData(res.data.shifts);
            setAlerts(res.data.alerts || []);
            Alert.alert("Success", "Roster generated based on demand!");
        } catch (e) {
            Alert.alert("Error", "Failed to generate roster");
        } finally {
            setGenerating(false);
        }
    };

    const groupedByDate = rosterData.reduce((acc: any, shift: any) => {
        if (!acc[shift.date]) acc[shift.date] = [];
        acc[shift.date].push(shift);
        return acc;
    }, {});

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Staff Roster</Text>
                    <Text style={styles.subtitle}>Week of {format(weekStart, 'MMM d, yyyy')}</Text>
                </View>
            </View>
            {!isCleaner && (
                <View>
                    {/* Forecast Chart */}
                    {forecast.length > 0 && (
                        <View style={styles.forecastContainer}>
                            <Text style={styles.forecastHeader}>Weekly Demand Forecast</Text>
                            <View style={styles.chartRow}>
                                {forecast.map((day: any, i) => {
                                    const maxVal = Math.max(...forecast.map(d => Math.max(d.demand_mins, d.capacity_mins))) || 1;
                                    const demandH = (day.demand_mins / maxVal) * 80;
                                    const capH = (day.capacity_mins / maxVal) * 80;

                                    return (
                                        <View key={i} style={styles.barGroup}>
                                            <View style={styles.bars}>
                                                <View style={[styles.bar, { height: demandH || 1, backgroundColor: '#3b82f6', opacity: 0.5 }]} />
                                                <View style={[styles.bar, { height: capH || 1, backgroundColor: day.status === 'UNDERSTAFFED' ? '#ef4444' : '#22c55e' }]} />
                                            </View>
                                            <Text style={styles.barLabel}>{format(new Date(day.date), 'EEE')}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                            <View style={styles.legend}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={[styles.dot, { backgroundColor: '#3b82f6', opacity: 0.5 }]} /><Text style={styles.legendText}>Demand</Text></View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={[styles.dot, { backgroundColor: '#22c55e' }]} /><Text style={styles.legendText}>Capacity</Text></View>
                            </View>

                            {/* Team Capacity Breakdown */}
                            <Text style={[styles.forecastHeader, { marginTop: 15, fontSize: 14 }]}>Daily Team Capacity</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 15, paddingBottom: 10 }}>
                                {forecast.map((day: any, i) => {
                                    const isUnderstaffed = day.status === 'UNDERSTAFFED';
                                    const isOverstaffed = day.status === 'OVERSTAFFED';
                                    const headerColor = isUnderstaffed ? '#fee2e2' : isOverstaffed ? '#ecfccb' : theme.colors.card;
                                    const textColor = isUnderstaffed ? '#b91c1c' : isOverstaffed ? '#3f6212' : theme.colors.text;

                                    return (
                                        <View key={i} style={styles.groupStatsCard}>
                                            <View style={[styles.cardHeader, { backgroundColor: headerColor }]}>
                                                <Text style={[styles.groupStatsDate, { color: textColor }]}>
                                                    {format(new Date(day.date), 'EEE')}
                                                </Text>
                                            </View>

                                            <View style={styles.cardBody}>
                                                {day.groups && Object.keys(day.groups).length > 0 ? (
                                                    Object.entries(day.groups).map(([g, capMins]: any) => {
                                                        const count = day.group_counts ? day.group_counts[g] : 0;
                                                        const assignedMins = day.group_loads ? day.group_loads[g] : 0;
                                                        const roomCount = day.assignments ? day.assignments[g] : 0;

                                                        // Calc Percentage
                                                        const cap = capMins || 1;
                                                        const load = assignedMins;
                                                        const percent = Math.min((load / cap) * 100, 100);

                                                        // Color Logic
                                                        let progressColor = '#22c55e'; // Green
                                                        if (percent > 100) progressColor = '#ef4444'; // Red
                                                        else if (percent > 80) progressColor = '#eab308'; // Yellow

                                                        const hasLoadData = assignedMins > 0;

                                                        return (
                                                            <View key={g} style={styles.groupStatRow}>
                                                                <View style={{ flex: 1 }}>
                                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                                                        <View>
                                                                            <Text style={styles.groupStatName}>{g}</Text>
                                                                            <Text style={styles.staffCountLabel}>{count} Staff</Text>
                                                                        </View>
                                                                        <View style={{ alignItems: 'flex-end' }}>
                                                                            {hasLoadData ? (
                                                                                <Text style={styles.groupStatValue}>
                                                                                    {Math.round(assignedMins / 60)}h <Text style={{ fontSize: 10, color: '#666' }}>/ {Math.round(capMins / 60)}h</Text>
                                                                                </Text>
                                                                            ) : (
                                                                                <Text style={styles.groupStatValue}>{Math.round(capMins / 60)}h</Text>
                                                                            )}
                                                                        </View>
                                                                    </View>

                                                                    {/* Progress Bar */}
                                                                    <View style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                                                                        <View style={{ width: `${percent}%`, height: '100%', backgroundColor: progressColor }} />
                                                                    </View>
                                                                    {roomCount > 0 && (
                                                                        <Text style={styles.roomCountText}>{roomCount} Rooms</Text>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        );
                                                    })
                                                ) : (
                                                    <Text style={styles.noStats}>No Staff</Text>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={[styles.genBtn, generating && { opacity: 0.7 }]}
                            onPress={handleGenerate}
                            disabled={generating}
                        >
                            {generating ? <ActivityIndicator color="white" /> : <RefreshCw size={20} color="white" />}
                            <Text style={styles.genBtnText}>Auto-Schedule (Based on Forecast)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, { backgroundColor: '#10b981', marginTop: 10 }]} onPress={assignRoomsDaily}>
                            <Text style={styles.buttonText}>Smart Dynamic Assign</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#f97316', marginTop: 10 }]}
                            onPress={() => Alert.alert(
                                "Rebalance Workload?",
                                "This will redistribute all PENDING rooms among active staff, accounting for work already completed today. Continue?",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Rebalance", onPress: assignRoomsDaily }
                                ]
                            )}
                        >
                            <Text style={styles.buttonText}>Rebalance Workload</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )
            }

            {
                alerts.length > 0 && (
                    <View style={styles.alertsContainer}>
                        <View style={styles.alertHeader}>
                            <AlertTriangle size={20} color={theme.colors.warning} />
                            <Text style={styles.alertTitle}>Staffing Alerts</Text>
                        </View>
                        {alerts.map((alert, idx) => (
                            <Text key={idx} style={styles.alertText}>• {alert}</Text>
                        ))}
                    </View>
                )
            }

            < ScrollView style={styles.content} >
                {loading ? <ActivityIndicator size="large" color={theme.colors.primary} /> : (
                    weekDays.map(dateObj => {
                        const dateStr = format(dateObj, 'yyyy-MM-dd');
                        const shifts = groupedByDate[dateStr] || [];

                        return (
                            <View key={dateStr} style={styles.dayCard}>
                                <View style={styles.dayHeader}>
                                    <Text style={styles.dayName}>{format(dateObj, 'EEEE, MMM d')}</Text>
                                    <View style={styles.countBadge}>
                                        <Users size={14} color="white" />
                                        <Text style={styles.countText}>{shifts.length} Staff</Text>
                                    </View>
                                </View>
                                {shifts.length === 0 ? (
                                    <Text style={styles.emptyText}>No shifts assigned</Text>
                                ) : (
                                    shifts.map((shift: any) => (
                                        <View key={shift.id} style={styles.shiftRow}>
                                            <Text style={styles.staffName}>{shift.user_name}</Text>
                                            <Text style={styles.shiftTime}>{shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}</Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        );
                    })
                )
                }
            </ScrollView >
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
        padding: 20,
        backgroundColor: theme.colors.card,
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: { fontSize: 24, fontWeight: 'bold', color: theme.colors.text },
    subtitle: { fontSize: 16, color: theme.colors.textSecondary },
    genBtn: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        padding: 12,
        borderRadius: 8,
        gap: 8,
        alignItems: 'center'
    },
    genBtnText: { color: 'white', fontWeight: 'bold' },
    content: { padding: 16 },
    alertsContainer: {
        margin: 16,
        marginBottom: 0,
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.warning
    },
    alertHeader: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
    alertTitle: { fontWeight: 'bold', color: '#B45309' },
    alertText: { color: '#92400E', marginBottom: 4 },
    dayCard: {
        backgroundColor: theme.colors.card,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        ...theme.shadows.card
    },
    dayHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    dayName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text },
    countBadge: {
        backgroundColor: theme.colors.secondary,
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        alignItems: 'center'
    },
    countText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    emptyText: { color: theme.colors.textSecondary, fontStyle: 'italic' },
    shiftRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0'
    },
    staffName: { fontSize: 16, color: theme.colors.text },
    shiftTime: { color: theme.colors.textSecondary, fontFamily: 'monospace' },
    buttonGroup: {
        flexDirection: 'column',
    },
    button: {
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14
    },
    forecastContainer: {
        backgroundColor: theme.colors.card,
        padding: 16,
        margin: 16,
        marginBottom: 0,
        borderRadius: 12,
        ...theme.shadows.card
    },
    forecastHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 12
    },
    chartRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 100,
        marginBottom: 8
    },
    barGroup: {
        alignItems: 'center',
        gap: 4,
        flex: 1
    },
    bars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
        height: 80
    },
    bar: {
        width: 8,
        borderRadius: 4
    },
    barLabel: {
        fontSize: 10,
        color: theme.colors.textSecondary
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginTop: 4
    },
    legendText: {
        fontSize: 12,
        color: theme.colors.textSecondary
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    groupStatsCard: {
        backgroundColor: theme.colors.card,
        borderRadius: 8,
        marginRight: 12,
        minWidth: 140, // Wider for clarity
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden' // For header border radius
    },
    cardHeader: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    cardBody: {
        padding: 10,
        gap: 8
    },
    groupStatsDate: { fontWeight: 'bold', textAlign: 'center', fontSize: 14 },
    groupStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    groupStatName: { fontSize: 12, fontWeight: '600', color: theme.colors.text, maxWidth: '50%' },
    groupStatValue: { fontSize: 14, fontWeight: 'bold', color: theme.colors.primary },
    roomCountText: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
    staffCountLabel: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 1 },
    noStats: { textAlign: 'center', color: theme.colors.textSecondary, fontSize: 12, fontStyle: 'italic' }
});
