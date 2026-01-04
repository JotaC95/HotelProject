import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { useHotel, LostItem } from '../contexts/HotelContext';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Briefcase, ArrowLeft, CheckCircle, Trash2, X, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function LostFoundScreen() {
    const navigation = useNavigation();
    const { lostItems, updateLostItemStatus, rooms } = useHotel();
    const { user } = useAuth();
    const [filter, setFilter] = useState<'FOUND' | 'RETURNED' | 'DISPOSED'>('FOUND');

    const filteredItems = lostItems.filter(item => item.status === filter);
    const isManager = user?.role === 'ADMIN' || user?.role === 'RECEPTION' || user?.role === 'SUPERVISOR';

    const getRoomNumber = (roomId: string | number) => {
        const r = rooms.find(rm => rm.id === roomId || rm.id.toString() === roomId.toString());
        return r ? r.number : 'Unknown';
    };

    const handleMarkStatus = (item: LostItem, newStatus: 'RETURNED' | 'DISPOSED') => {
        Alert.alert(
            `Mark as ${newStatus}?`,
            `Are you sure you want to mark "${item.description}" as ${newStatus}?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Confirm", onPress: () => updateLostItemStatus(item.id, newStatus) }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <ArrowLeft size={24} color={theme.colors.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Lost & Found</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabs}>
                {(['FOUND', 'RETURNED', 'DISPOSED'] as const).map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.tab, filter === f && styles.activeTab]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.tabText, filter === f && styles.activeTabText]}>
                            {f.charAt(0) + f.slice(1).toLowerCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            <FlatList
                data={filteredItems}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Briefcase size={48} color={theme.colors.textSecondary} />
                        <Text style={styles.emptyText}>No items in this category</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.itemDesc}>{item.description}</Text>
                                <Text style={styles.itemSub}>Room {getRoomNumber(item.room)} • By {item.found_by_name}</Text>
                                <Text style={styles.itemDate}>{new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}</Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: item.status === 'FOUND' ? theme.colors.warning + '20' : theme.colors.success + '20' }]}>
                                <Text style={[styles.badgeText, { color: item.status === 'FOUND' ? theme.colors.warning : theme.colors.success }]}>
                                    {item.status}
                                </Text>
                            </View>
                        </View>

                        {/* Actions (Managers Only) */}
                        {isManager && item.status === 'FOUND' && (
                            <View style={styles.actions}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, { borderColor: theme.colors.success }]}
                                    onPress={() => handleMarkStatus(item, 'RETURNED')}
                                >
                                    <CheckCircle size={16} color={theme.colors.success} />
                                    <Text style={[styles.actionText, { color: theme.colors.success }]}>Return to Guest</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionBtn, { borderColor: theme.colors.textSecondary }]}
                                    onPress={() => handleMarkStatus(item, 'DISPOSED')}
                                >
                                    <Trash2 size={16} color={theme.colors.textSecondary} />
                                    <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>Dispose</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3748' },
    tabs: { flexDirection: 'row', backgroundColor: 'white', padding: 4 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: theme.colors.primary },
    tabText: { fontWeight: '600', color: '#718096' },
    activeTabText: { color: theme.colors.primary },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, ...theme.shadows.card },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    itemDesc: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', marginBottom: 4 },
    itemSub: { fontSize: 14, color: '#4A5568', marginBottom: 2 },
    itemDate: { fontSize: 12, color: '#A0AEC0' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 12, fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
    emptyText: { marginTop: 10, color: '#A0AEC0', fontSize: 16 },
    actions: { flexDirection: 'row', marginTop: 16, gap: 10 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8, borderWidth: 1, gap: 6 },
    actionText: { fontSize: 13, fontWeight: '600' }
});
