import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Share, Alert } from 'react-native';
import { useHotel, LogEntry } from '../contexts/HotelContext';
import { theme } from '../utils/theme';
import { Activity, Download, FileText } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Fix for strict typing on documentDirectory
// @ts-ignore
const reportDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;


export default function TimelineScreen() {
    const { logs, exportData } = useHotel();
    const { user } = useAuth();

    const isSupervisor = user?.role === 'SUPERVISOR';

    const handleExport = async (type: 'json' | 'csv') => {
        try {
            const data = exportData();
            let fileUri = '';
            let mimeType = '';

            if (type === 'json') {
                const jsonString = JSON.stringify(data, null, 2);
                fileUri = (reportDir || '') + 'hotel_report.json';
                await FileSystem.writeAsStringAsync(fileUri, jsonString);
                mimeType = 'application/json';
            } else {
                // CSV Logic (Simplified)
                // Header
                let csv = 'Room,Status,Incidents,DND\n';
                // @ts-ignore
                data.rooms.forEach(room => {
                    csv += `${room.number},${room.status},${room.incidents.length},${room.isDND}\n`;
                });
                fileUri = (reportDir || '') + 'hotel_report.csv';
                await FileSystem.writeAsStringAsync(fileUri, csv);
                mimeType = 'text/csv';
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: `Export ${type.toUpperCase()}` });
            } else {
                Alert.alert('Error', 'Sharing is not available on this device');
            }

        } catch (e) {
            console.log(e);
            Alert.alert('Error', 'Failed to export data');
        }
    };

    const renderItem = ({ item }: { item: LogEntry }) => {
        return (
            <View style={styles.logItem}>
                <View style={styles.iconContainer}>
                    <Activity size={16} color={theme.colors.primary} />
                </View>
                <View style={styles.logContent}>
                    <Text style={styles.logMessage}>{item.message}</Text>
                    <Text style={styles.logTime}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Activity Log</Text>
                {isSupervisor && (
                    <View style={styles.exportButtons}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleExport('json')}>
                            <FileText size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => handleExport('csv')}>
                            <Download size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <FlatList
                data={logs}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No recent activity</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
        backgroundColor: theme.colors.card,
        ...theme.shadows.card,
        zIndex: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
    },
    exportButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        padding: 8,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.s,
    },
    list: {
        padding: theme.spacing.m,
    },
    logItem: {
        flexDirection: 'row',
        marginBottom: theme.spacing.m,
        backgroundColor: theme.colors.card,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        ...theme.shadows.card,
    },
    iconContainer: {
        marginRight: theme.spacing.m,
        justifyContent: 'center',
    },
    logContent: {
        flex: 1,
    },
    logMessage: {
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: 4,
    },
    logTime: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    emptyContainer: {
        padding: theme.spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: theme.colors.textSecondary,
    }
});
