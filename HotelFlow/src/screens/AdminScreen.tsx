import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useHotel, Room, Staff } from '../contexts/HotelContext';
import { theme } from '../utils/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, BedDouble, Package, LogOut, Plus, Trash2, Edit2, AlertCircle, Clock, Bell } from 'lucide-react-native';
import api from '../services/api';
import { NotificationsModal } from '../components/NotificationsModal';

type AdminTab = 'USERS' | 'ROOMS' | 'INVENTORY' | 'CLEANING';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../AppNavigator';

export default function AdminScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { logout, user } = useAuth();
    const {
        staff, rooms, inventory, cleaningTypes, announcements,
        addStaff, updateStaff, deleteStaff,
        createRoom, deleteRoom,
        addInventoryItem, deleteInventoryItem, updateInventoryQuantity,
        addCleaningType, deleteCleaningType,
        deleteGroup,
        fetchStaff, fetchRooms, fetchInventory, fetchCleaningTypes
    } = useHotel();
    const [activeTab, setActiveTab] = useState<AdminTab>('USERS');
    const [notificationsVisible, setNotificationsVisible] = useState(false);

    // Modal States
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [isInvModalOpen, setIsInvModalOpen] = useState(false);
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

    // Form States
    const [editingUser, setEditingUser] = useState<Staff | null>(null);
    const [userForm, setUserForm] = useState({ username: '', password: '', role: 'CLEANER', name: '', groupId: '' });
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newRoom, setNewRoom] = useState({ number: '', type: 'Single', floor: '1' });
    const [invForm, setInvForm] = useState({ name: '', quantity: '0', min_stock: '10', category: 'OTHER' });
    const [typeForm, setTypeForm] = useState({ name: '', minutes: '30' });

    useEffect(() => {
        fetchStaff();
        fetchInventory();
        fetchCleaningTypes();
    }, []);

    // --- User Management ---
    const openAddUser = () => {
        setEditingUser(null);
        setUserForm({ username: '', password: '', role: 'CLEANER', name: '', groupId: '' });
        setIsUserModalOpen(true);
    };

    const openEditUser = (u: Staff) => {
        setEditingUser(u);
        setUserForm({
            username: u.username,
            password: '',
            role: u.role || 'CLEANER',
            name: u.name,
            groupId: u.groupId || ''
        });
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async () => {
        const payload: any = {
            username: userForm.username,
            role: userForm.role,
            first_name: userForm.name,
            group_id: userForm.groupId
        };
        if (userForm.password) payload.password = userForm.password;

        if (editingUser) {
            await updateStaff(editingUser.id, payload);
        } else {
            if (!userForm.password) { Alert.alert("Error", "Password required for new user"); return; }
            await addStaff(payload);
        }
        setIsUserModalOpen(false);
    };

    // --- Room Management ---
    const handleCreateRoom = async () => {
        if (!newRoom.number) return;
        await createRoom({
            number: newRoom.number,
            type: newRoom.type as any,
            floor: parseInt(newRoom.floor),
            status: 'PENDING'
        });
        setIsRoomModalOpen(false);
        fetchRooms();
    };

    // --- Inventory Management ---
    const handleAddInventory = async () => {
        await addInventoryItem({
            name: invForm.name,
            quantity: parseInt(invForm.quantity),
            min_stock: parseInt(invForm.min_stock),
            category: invForm.category
        });
        setIsInvModalOpen(false);
    };

    const handleDeleteInventory = (id: number) => {
        Alert.alert("Delete Item", "Are you sure?", [
            { text: "Cancel" },
            {
                text: "Delete", style: 'destructive', onPress: async () => {
                    await api.delete(`/housekeeping/inventory/${id}/`);
                    fetchInventory();
                }
            }
        ]);
    };

    // --- Cleaning Types Management ---
    const handleAddType = async () => {
        if (!typeForm.name) return;
        await addCleaningType(typeForm.name, parseInt(typeForm.minutes) || 30);
        setIsTypeModalOpen(false);
        setTypeForm({ name: '', minutes: '30' });
    };

    const confirmDeleteType = (id: number) => {
        Alert.alert("Delete Type", "Are you sure? This may affect estimates.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deleteCleaningType(id) }
        ]);
    };

    // --- Renders ---
    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <TouchableOpacity onPress={() => setActiveTab('USERS')} style={[styles.tab, activeTab === 'USERS' && styles.activeTab]}>
                <Users size={20} color={activeTab === 'USERS' ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.tabText, activeTab === 'USERS' && styles.activeTabText]}>Users</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('ROOMS')} style={[styles.tab, activeTab === 'ROOMS' && styles.activeTab]}>
                <BedDouble size={20} color={activeTab === 'ROOMS' ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.tabText, activeTab === 'ROOMS' && styles.activeTabText]}>Rooms</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('INVENTORY')} style={[styles.tab, activeTab === 'INVENTORY' && styles.activeTab]}>
                <Package size={20} color={activeTab === 'INVENTORY' ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.tabText, activeTab === 'INVENTORY' && styles.activeTabText]}>Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('CLEANING')} style={[styles.tab, activeTab === 'CLEANING' && styles.activeTab]}>
                <Clock size={20} color={activeTab === 'CLEANING' ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.tabText, activeTab === 'CLEANING' && styles.activeTabText]}>Cleaning</Text>
            </TouchableOpacity>
        </View>
    );

    const renderUsers = () => (
        <View style={styles.content}>
            <TouchableOpacity style={styles.addButton} onPress={openAddUser}>
                <Plus color="white" />
                <Text style={styles.addButtonText}>Add User</Text>
            </TouchableOpacity>
            <FlatList
                data={staff}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View>
                            <Text style={styles.cardTitle}>{item.name}</Text>
                            <Text style={styles.cardSubtitle}>{item.role} • {item.groupId || 'No Group'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={[styles.cardStatus, { marginRight: 10 }]}>{item.username}</Text>
                            <TouchableOpacity onPress={() => openEditUser(item)} style={{ marginRight: 10 }}>
                                <Edit2 size={18} color={theme.colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => {
                                Alert.alert("Delete User", "Are you sure?", [
                                    { text: "Cancel" },
                                    { text: "Delete", style: 'destructive', onPress: () => deleteStaff(item.id) }
                                ]);
                            }}>
                                <Trash2 size={18} color={theme.colors.error} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        </View>
    );

    const renderRooms = () => (
        <View style={styles.content}>
            <TouchableOpacity style={styles.addButton} onPress={() => setIsRoomModalOpen(true)}>
                <Plus color="white" />
                <Text style={styles.addButtonText}>Create Room</Text>
            </TouchableOpacity>
            <FlatList
                data={rooms}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.cardTitle}>Room {item.number}</Text>
                                <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{item.status}</Text>
                            </View>
                            <Text style={styles.cardSubtitle}>{item.type} • {item.cleaningType}</Text>

                            {/* Guest Info */}
                            {item.guestDetails?.currentGuest ? (
                                <View style={{ marginTop: 4 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>
                                        👤 {item.guestDetails.currentGuest}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>
                                        {item.guestDetails.checkInDate} - {item.guestDetails.checkOutDate}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>Vacant</Text>
                            )}

                            {/* Assigned Team */}
                            {item.assignedGroup && (
                                <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: 'bold' }}>
                                        Team: {item.assignedGroup}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={{ gap: 10 }}>
                            <TouchableOpacity onPress={() => navigation.navigate('RoomDetail', { roomId: item.id })} style={{ padding: 8 }}>
                                <Edit2 size={20} color={theme.colors.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => {
                                Alert.alert("Delete Room", `Delete Room ${item.number}?`, [
                                    { text: "Cancel" },
                                    { text: "Delete", style: 'destructive', onPress: () => deleteRoom(item.id) }
                                ]);
                            }} style={{ padding: 8 }}>
                                <Trash2 size={20} color={theme.colors.error} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        </View>
    );

    const renderInventory = () => (
        <View style={styles.content}>
            <TouchableOpacity style={styles.addButton} onPress={() => setIsInvModalOpen(true)}>
                <Plus color="white" />
                <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
            <FlatList
                data={inventory}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{item.name}</Text>
                            <Text style={styles.cardSubtitle}>Category: {item.category}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <TouchableOpacity onPress={() => updateInventoryQuantity(item.id, Math.max(0, item.quantity - 1))} style={styles.countBtn}>
                                    <Text style={styles.countBtnText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.countValue}>{item.quantity}</Text>
                                <TouchableOpacity onPress={() => updateInventoryQuantity(item.id, item.quantity + 1)} style={styles.countBtn}>
                                    <Text style={styles.countBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteInventory(item.id)}>
                                <Trash2 size={20} color={theme.colors.error} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />
        </View>
    );

    const renderCleaningTypes = () => (
        <View style={styles.content}>
            <TouchableOpacity style={styles.addButton} onPress={() => setIsTypeModalOpen(true)}>
                <Plus color="white" />
                <Text style={styles.addButtonText}>Add Cleaning Type</Text>
            </TouchableOpacity>
            <FlatList
                data={cleaningTypes}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{item.name}</Text>
                            <Text style={styles.cardSubtitle}>Est. Time: {item.estimated_minutes} mins</Text>
                        </View>
                        <TouchableOpacity onPress={() => confirmDeleteType(item.id)}>
                            <Trash2 size={20} color={theme.colors.error} />
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Administrator</Text>
                <View style={{ flexDirection: 'row', gap: 15 }}>
                    <TouchableOpacity onPress={() => setNotificationsVisible(true)}>
                        <View>
                            <Bell size={24} color={theme.colors.primary} />
                            {announcements.length > 0 && <View style={styles.badgeDot} />}
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={logout}>
                        <LogOut color={theme.colors.error} />
                    </TouchableOpacity>
                </View>
            </View>

            {renderTabs()}

            {activeTab === 'USERS' && renderUsers()}
            {activeTab === 'ROOMS' && renderRooms()}
            {activeTab === 'INVENTORY' && renderInventory()}
            {activeTab === 'CLEANING' && renderCleaningTypes()}

            {/* Cleaning Type Modal */}
            <Modal visible={isTypeModalOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Cleaning Type</Text>
                        <TextInput placeholder="Name (e.g. Departure)" style={styles.input} value={typeForm.name} onChangeText={t => setTypeForm({ ...typeForm, name: t })} />
                        <TextInput placeholder="Minutes (e.g. 30)" style={styles.input} value={typeForm.minutes} onChangeText={t => setTypeForm({ ...typeForm, minutes: t })} keyboardType="numeric" />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setIsTypeModalOpen(false)} style={styles.cancelButton}><Text>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity onPress={handleAddType} style={styles.saveButton}><Text style={styles.saveButtonText}>Add</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* User Modal */}
            <Modal visible={isUserModalOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingUser ? 'Edit User' : 'Add New User'}</Text>
                        <TextInput placeholder="Username" style={styles.input} value={userForm.username} onChangeText={t => setUserForm({ ...userForm, username: t })} editable={!editingUser} />
                        <TextInput placeholder={editingUser ? "New Password (Optional)" : "Password"} style={styles.input} value={userForm.password} onChangeText={t => setUserForm({ ...userForm, password: t })} secureTextEntry />
                        <TextInput placeholder="Full Name" style={styles.input} value={userForm.name} onChangeText={t => setUserForm({ ...userForm, name: t })} />

                        <View style={styles.roleRow}>
                            {['CLEANER', 'SUPERVISOR', 'RECEPTION', 'MAINTENANCE', 'HOUSEMAN', 'ADMIN'].map(r => (
                                <TouchableOpacity key={r} onPress={() => setUserForm({ ...userForm, role: r })} style={[styles.roleChip, userForm.role === r && styles.roleChipActive]}>
                                    <Text style={[styles.roleText, userForm.role === r && styles.roleTextActive]}>{r[0] + r.slice(1).toLowerCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Group Selection */}
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4, marginTop: 10 }}>Assign Team:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                            {Array.from(new Set(staff.map(s => s.groupId).filter(Boolean))).map((g: any) => (
                                <TouchableOpacity
                                    key={g}
                                    onPress={() => {
                                        setUserForm({ ...userForm, groupId: g });
                                        setIsCreatingGroup(false);
                                    }}
                                    onLongPress={() => {
                                        Alert.alert(
                                            "Delete Team",
                                            `Delete "${g}"? This will unassign all members.`,
                                            [
                                                { text: "Cancel" },
                                                { text: "Delete", style: 'destructive', onPress: () => deleteGroup(g) }
                                            ]
                                        );
                                    }}
                                    style={{
                                        paddingHorizontal: 12, paddingVertical: 6,
                                        backgroundColor: (!isCreatingGroup && userForm.groupId === g) ? theme.colors.primary : '#EDF2F7',
                                        borderRadius: 16
                                    }}
                                >
                                    <Text style={{ fontSize: 13, color: (!isCreatingGroup && userForm.groupId === g) ? 'white' : theme.colors.text }}>{g}</Text>
                                </TouchableOpacity>
                            ))}

                            {/* Create New Chip */}
                            <TouchableOpacity
                                onPress={() => {
                                    setUserForm({ ...userForm, groupId: '' });
                                    setIsCreatingGroup(true);
                                }}
                                style={{
                                    paddingHorizontal: 12, paddingVertical: 6,
                                    backgroundColor: isCreatingGroup ? theme.colors.primary : 'white',
                                    borderWidth: 1, borderColor: theme.colors.primary,
                                    borderRadius: 16,
                                    flexDirection: 'row', alignItems: 'center'
                                }}
                            >
                                <Plus size={12} color={isCreatingGroup ? 'white' : theme.colors.primary} style={{ marginRight: 4 }} />
                                <Text style={{ fontSize: 13, color: isCreatingGroup ? 'white' : theme.colors.primary, fontWeight: '600' }}>New Team</Text>
                            </TouchableOpacity>
                        </View>

                        {isCreatingGroup && (
                            <View>
                                <Text style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>Enter New Team Name:</Text>
                                <TextInput
                                    placeholder="e.g. Night Squad"
                                    style={styles.input}
                                    value={userForm.groupId}
                                    onChangeText={t => setUserForm({ ...userForm, groupId: t })}
                                    autoFocus
                                />
                            </View>
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setIsUserModalOpen(false)} style={styles.cancelButton}><Text>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity onPress={handleSaveUser} style={styles.saveButton}><Text style={styles.saveButtonText}>{editingUser ? 'Update' : 'Create'}</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Room Modal */}
            <Modal visible={isRoomModalOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Create Room</Text>
                        <TextInput placeholder="Number" style={styles.input} value={newRoom.number} onChangeText={t => setNewRoom({ ...newRoom, number: t })} />

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setIsRoomModalOpen(false)} style={styles.cancelButton}><Text>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity onPress={handleCreateRoom} style={styles.saveButton}><Text style={styles.saveButtonText}>Create Room</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Inventory Modal */}
            <Modal visible={isInvModalOpen} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Item</Text>
                        <TextInput placeholder="Item Name" style={styles.input} value={invForm.name} onChangeText={t => setInvForm({ ...invForm, name: t })} />
                        <TextInput placeholder="Initial Qty" style={styles.input} value={invForm.quantity} onChangeText={t => setInvForm({ ...invForm, quantity: t })} keyboardType="numeric" />
                        <TextInput placeholder="Min Stock Level" style={styles.input} value={invForm.min_stock} onChangeText={t => setInvForm({ ...invForm, min_stock: t })} keyboardType="numeric" />

                        <View style={styles.roleRow}>
                            {['LINEN', 'TOILETRIES', 'CLEANING', 'OTHER'].map(c => (
                                <TouchableOpacity key={c} onPress={() => setInvForm({ ...invForm, category: c })} style={[styles.roleChip, invForm.category === c && styles.roleChipActive]}>
                                    <Text style={[styles.roleText, invForm.category === c && styles.roleTextActive]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setIsInvModalOpen(false)} style={styles.cancelButton}><Text>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity onPress={handleAddInventory} style={styles.saveButton}><Text style={styles.saveButtonText}>Add Item</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <NotificationsModal
                visible={notificationsVisible}
                onClose={() => setNotificationsVisible(false)}
            />

        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    tabContainer: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
    tab: { flex: 1, alignItems: 'center', gap: 4 },
    activeTab: { borderBottomWidth: 2, borderColor: theme.colors.primary },
    tabText: { fontSize: 12, color: theme.colors.textSecondary },
    activeTabText: { color: theme.colors.primary, fontWeight: 'bold' },
    content: { flex: 1, padding: 16 },
    card: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...theme.shadows.card },
    cardTitle: { fontWeight: 'bold', fontSize: 16 },
    cardSubtitle: { color: theme.colors.textSecondary, marginTop: 4 },
    cardStatus: { fontWeight: '600', color: theme.colors.primary },
    addButton: { flexDirection: 'row', backgroundColor: theme.colors.primary, padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 16 },
    addButtonText: { color: 'white', fontWeight: 'bold' },
    row: { flexDirection: 'row', alignItems: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
    input: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 12 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
    cancelButton: { padding: 12 },
    saveButton: { backgroundColor: theme.colors.primary, padding: 12, borderRadius: 8 },
    saveButtonText: { color: 'white', fontWeight: 'bold' },
    roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    roleChip: { padding: 8, borderRadius: 16, backgroundColor: '#f0f0f0' },
    roleChipActive: { backgroundColor: theme.colors.primary },
    roleText: { fontSize: 12 },
    roleTextActive: { color: 'white' },
    countBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EDF2F7', alignItems: 'center', justifyContent: 'center' },
    countBtnText: { fontSize: 18, fontWeight: 'bold' },
    countValue: { fontSize: 16, fontWeight: 'bold', minWidth: 24, textAlign: 'center' },
    badgeDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'red',
        borderWidth: 1,
        borderColor: 'white'
    }
});
