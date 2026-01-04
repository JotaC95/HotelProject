import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Alert, KeyboardAvoidingView, Platform, LayoutAnimation, Modal, TouchableWithoutFeedback } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RoomStackParamList } from '../AppNavigator';
import { useHotel, Room, RoomStatus, INCIDENT_PRESETS, IncidentRole, CleaningType } from '../contexts/HotelContext'; // Imported presets
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { Circle, CheckCircle2, AlertTriangle, Moon, Clock, Save, Plus, Play, User, LogOut, LogIn, Languages, Camera, DoorOpen, Bed, Package, Key, Phone, Wrench, UserCheck, Edit2, X, ChevronDown, Check, Briefcase, ClipboardCheck, History } from 'lucide-react-native';
import { StatusBadge } from '../components/StatusBadge';
import { InspectionModal } from '../components/InspectionModal';
import { Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useToast } from '../contexts/ToastContext';

type RoomDetailRouteProp = RouteProp<RoomStackParamList, 'RoomDetail'>;

export default function RoomDetailScreen() {
    const route = useRoute<RoomDetailRouteProp>();
    const navigation = useNavigation();
    const { roomId } = route.params;
    const { rooms, updateRoomStatus, toggleDND, toggleExtraTime, updateNotes, addIncident, updateGuestStatus, resolveIncident, updateRoomDetails, cleaningTypes, toggleGuestInRoom, toggleGuestWaiting, logs, reportLostItem, assets, fetchAssets, updateAssetStatus } = useHotel();
    const { user } = useAuth();
    const { showToast } = useToast();

    const room = rooms.find(r => r.id === roomId);
    const [notes, setNotes] = useState(room?.notes || '');
    const [incidentModalVisible, setIncidentModalVisible] = useState(false);
    const [targetRole, setTargetRole] = useState<IncidentRole>('MAINTENANCE'); // Default target
    const [newIncident, setNewIncident] = useState('');
    const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
    const [isInspectionVisible, setInspectionVisible] = useState(false);
    const [isHistoryVisible, setHistoryVisible] = useState(false);

    // Lost & Found State
    const [lostItemModalVisible, setLostItemModalVisible] = useState(false);
    const [lostItemDesc, setLostItemDesc] = useState('');

    const [isAddingIncident, setIsAddingIncident] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [tempCleaningType, setTempCleaningType] = useState<CleaningType>(room?.cleaningType || 'DEPARTURE');
    const [tempType, setTempType] = useState(room?.type || 'Single');
    const [tempBeds, setTempBeds] = useState(room?.configuration?.beds || '1 King');
    const [tempBedrooms, setTempBedrooms] = useState(room?.configuration?.bedrooms?.toString() || '1');
    const [tempCurrentGuest, setTempCurrentGuest] = useState(room?.guestDetails?.currentGuest || '');
    const [tempNextGuest, setTempNextGuest] = useState(room?.guestDetails?.nextGuest || '');
    const [tempNextArrival, setTempNextArrival] = useState(() => {
        // Initialize with formatted time if exists
        const iso = room?.guestDetails?.nextArrival;
        if (!iso) return '';
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (e) { return ''; }
    });
    const [showTypePicker, setShowTypePicker] = useState(false);

    const handleReportLostItem = async () => {
        if (!lostItemDesc.trim()) {
            Alert.alert("Error", "Please describe the item.");
            return;
        }
        await reportLostItem(lostItemDesc, room?.id || roomId);
        setLostItemModalVisible(false);
        setLostItemDesc('');
    };

    useEffect(() => {
        if (room) {
            setNotes(room.notes);
            if (!isEditing) {
                setTempCleaningType(room.cleaningType);
                setTempType(room.type);
                setTempBeds(room.configuration?.beds || '1 King');
                setTempBedrooms(room.configuration?.bedrooms?.toString() || '1');
                setTempCurrentGuest(room.guestDetails?.currentGuest || '');
                setTempNextGuest(room.guestDetails?.nextGuest || '');

                // Format ISO to HH:MM for display
                const iso = room.guestDetails?.nextArrival;
                if (iso) {
                    try {
                        const d = new Date(iso);
                        setTempNextArrival(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
                    } catch { setTempNextArrival(''); }
                } else {
                    setTempNextArrival('');
                }
            }
        }
    }, [room, isEditing]);

    useEffect(() => {
        fetchAssets(); // Ensure assets are loaded
    }, []);

    const roomAssets = assets.filter(a => a.room === roomId || a.room_number === room?.number); // Filter by ID or Number if needed

    const handleSaveDetails = async () => {
        if (!room) return;

        // Convert HH:MM to ISO for today
        let finalNextArrival = tempNextArrival;
        if (tempNextArrival.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
            const now = new Date();
            const [h, m] = tempNextArrival.split(':');
            now.setHours(parseInt(h), parseInt(m), 0, 0);
            finalNextArrival = now.toISOString();
        }

        await updateRoomDetails(room.id, {
            cleaningType: tempCleaningType,
            type: tempType,
            configuration: { ...room.configuration, beds: tempBeds, bedrooms: parseInt(tempBedrooms) },
            guestDetails: {
                ...room.guestDetails,
                currentGuest: tempCurrentGuest,
                nextGuest: tempNextGuest,
                nextArrival: finalNextArrival
            }
        });
        setIsEditing(false);
    };

    if (!room) return <View><Text>Room not found</Text></View>;

    const isSupervisor = user?.role === 'SUPERVISOR';

    const handleAction = () => {
        if (room.status === 'PENDING') {
            updateRoomStatus(room.id, 'IN_PROGRESS');
        } else if (room.status === 'IN_PROGRESS') {
            // Cleaner finishes -> Moves to INSPECTION
            updateRoomStatus(room.id, 'INSPECTION');
            navigation.goBack();
        } else if (room.status === 'INSPECTION' && isSupervisor) {
            // Open Inspection Modal
            setInspectionVisible(true);
        }
    };

    const handleReject = () => {
        if (room.status === 'INSPECTION' && isSupervisor) {
            Alert.alert('Room Rejected', 'Room sent back to In Progress.');
            updateRoomStatus(room.id, 'IN_PROGRESS');
            navigation.goBack();
        }
    };

    const blockingIncidents = room.incidents.filter(i =>
        i.status === 'OPEN' && (i.targetRole === 'MAINTENANCE' || i.targetRole === 'RECEPTION')
    );
    const isBlocked = blockingIncidents.length > 0;

    const handleSaveNotes = () => {
        updateNotes(room.id, notes);
        Alert.alert('Success', 'Notes saved');
    };

    const handleAddIncident = () => {
        if (!newIncident.trim()) return;

        // Mock Translation Logic
        setIsTranslating(true);
        setTimeout(() => {
            // Simulate "translating" if it's not one of the presets (primitive check)
            let finalText = newIncident;
            if (!INCIDENT_PRESETS.includes(newIncident)) {
                finalText = `${newIncident} [Auto-Translated]`;
            }

            addIncident(room.id, finalText, user?.username || 'Unknown', targetRole, user?.groupId, attachedPhoto || undefined);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Incident reported', 'SUCCESS');
            setNewIncident('');
            setAttachedPhoto(null);
            setIsAddingIncident(false);
            setIsTranslating(false);
        }, 800);
    };

    const handleAttachPhoto = () => {
        // Mock Photo Selection
        const mockPhotos = [
            'https://picsum.photos/200/300',
            'https://picsum.photos/200/200',
            'https://picsum.photos/300/200'
        ];
        const randomPhoto = mockPhotos[Math.floor(Math.random() * mockPhotos.length)];
        setAttachedPhoto(randomPhoto);
        Alert.alert('Photo Added', 'A photo has been attached to this incident.');
    };

    const handleNotifyReception = () => {
        Alert.alert('Reception Notified', `Reception has been notified to check on Room ${room.number}.`);
    };

    const handleGuestLeft = () => {
        Alert.alert(
            'Confirm Guest Departure',
            'Did you find the room keys?',
            [
                {
                    text: 'No Keys Found',
                    style: 'default',
                    onPress: () => {
                        updateGuestStatus(room.id, 'OUT', false);
                        Alert.alert('Updated', 'Room marked as empty (No Keys).');
                    }
                },
                {
                    text: 'Yes, Keys Found',
                    style: 'default',
                    onPress: () => {
                        updateGuestStatus(room.id, 'OUT', true);
                        Alert.alert('Updated', 'Room marked as empty (Keys Found).');
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header Card */}
                <View style={styles.headerCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={styles.roomBigNumber}>{room.number}</Text>
                        {['SUPERVISOR', 'RECEPTION', 'ADMIN'].includes(user?.role?.toUpperCase() || '') && (
                            <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={{ padding: 8 }}>
                                {isEditing ? <X color={theme.colors.text} /> : <Edit2 color={theme.colors.textSecondary} />}
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => setHistoryVisible(true)} style={{ padding: 8 }}>
                            <History color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.roomType}>{room.type} • Floor {room.floor}</Text>

                    {isEditing ? (
                        <View style={{ gap: 8, width: '100%', alignItems: 'center' }}>
                            {/* Room Type Selector */}
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {(['Single', 'Double', 'Suite'] as const).map((t) => (
                                    <TouchableOpacity
                                        key={t}
                                        style={[
                                            styles.roleButton,
                                            tempType === t && styles.roleButtonActive
                                        ]}
                                        onPress={() => setTempType(t)}
                                    >
                                        <Text style={[
                                            styles.roleButtonText,
                                            tempType === t && styles.roleButtonTextActive
                                        ]}>{t}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={styles.cleaningTypeSelector}
                                onPress={() => setShowTypePicker(true)}
                            >
                                <Text style={styles.cleaningTypeSelectorText}>{tempCleaningType}</Text>
                                <ChevronDown size={16} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <StatusBadge status={room.status} />
                    )}
                    {/* Hack: Show status badge below type in edit mode too if needed, or replace it. Currently replacing status badge with type selector in edit mode for focus */}
                </View>

                {/* Edit Mode Save Action */}
                {isEditing && (
                    <View style={styles.section}>
                        <TouchableOpacity style={styles.saveDetailsButton} onPress={handleSaveDetails}>
                            <Save size={18} color="white" />
                            <Text style={styles.saveDetailsText}>Save Details</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Room Setup (Phase 6) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Room Setup</Text>
                    {isEditing ? (
                        <View style={{ gap: 10 }}>
                            <TextInput value={tempBeds} onChangeText={setTempBeds} placeholder="Bed Setup (e.g. 1 King)" style={styles.input} />
                            <TextInput value={tempBedrooms} onChangeText={setTempBedrooms} placeholder="Bedrooms (e.g. 2)" keyboardType="numeric" style={styles.input} />
                        </View>
                    ) : (
                        <View style={styles.configGrid}>
                            <View style={styles.configItem}>
                                <DoorOpen size={20} color={theme.colors.primary} />
                                <View>
                                    <Text style={styles.configLabel}>Bedrooms</Text>
                                    <Text style={styles.configValue}>{room.configuration?.bedrooms || 1} Open</Text>
                                </View>
                            </View>
                            <View style={styles.dividerVertical} />
                            <View style={styles.configItem}>
                                <Bed size={20} color={theme.colors.primary} />
                                <View>
                                    <Text style={styles.configLabel}>Bedding</Text>
                                    <Text style={styles.configValue}>{room.configuration?.beds || 'Standard'}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {room.configuration?.extras && room.configuration.extras.length > 0 && (
                        <View style={styles.extrasContainer}>
                            <Package size={20} color={theme.colors.warning} />
                            <Text style={styles.extrasText}>Extras: {room.configuration.extras.join(', ')}</Text>
                        </View>
                    )}
                </View>

                {/* Guest Information (Phase 3) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Guest Information</Text>

                    {isEditing ? (
                        <View style={{ gap: 10 }}>
                            <View>
                                <Text style={styles.inputLabel}>Current Guest (Required)</Text>
                                <TextInput
                                    style={styles.editInput}
                                    value={tempCurrentGuest}
                                    onChangeText={setTempCurrentGuest}
                                    placeholder="Guest Name"
                                />
                            </View>

                            {/* Logic: Disable Next Guest for Departure/Weekly/Rubbish */}
                            {['DEPARTURE', 'WEEKLY', 'RUBBISH'].includes(tempCleaningType) ? (
                                <Text style={styles.helperText}>* Next Guest not applicable for {tempCleaningType}</Text>
                            ) : (
                                <View>
                                    <Text style={styles.inputLabel}>Next Guest</Text>
                                    <TextInput
                                        style={styles.editInput}
                                        value={tempNextGuest}
                                        onChangeText={setTempNextGuest}
                                        placeholder="Next Guest Name"
                                    />
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.guestRow}>
                            <View style={styles.guestInfoItem}>
                                <User size={20} color={room.guestStatus === 'IN_ROOM' ? theme.colors.warning : theme.colors.success} />
                                <View>
                                    <Text style={[
                                        styles.guestStatusText,
                                        { color: room.guestStatus === 'IN_ROOM' ? theme.colors.warning : theme.colors.success }
                                    ]}>
                                        {room.guestStatus === 'IN_ROOM' ? 'Guest in Room' : 'Room Empty'}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: theme.colors.text }}>Current: {room.guestDetails?.currentGuest || 'Unknown'}</Text>
                                </View>
                                {room.keysFound !== undefined && (
                                    <View style={styles.keysBadge}>
                                        <Key size={14} color={theme.colors.textSecondary} />
                                        <Text style={styles.keysText}>{room.keysFound ? 'Keys Found' : 'No Keys'}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Guest In Room Actions */}
                            {room.guestStatus === 'IN_ROOM' && (
                                <View style={styles.guestActions}>
                                    <TouchableOpacity style={styles.guestActionButton} onPress={handleNotifyReception}>
                                        <Phone size={16} color={theme.colors.primary} />
                                        <Text style={styles.guestActionText}>Notify Reception</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.guestActionButton, styles.guestActionOutline]} onPress={handleGuestLeft}>
                                        <LogOut size={16} color={theme.colors.text} />
                                        <Text style={[styles.guestActionText, { color: theme.colors.text }]}>Mark Guest Left</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}

                    {!isEditing && room.cleaningType === 'DEPARTURE' && (
                        <View style={styles.timeRow}>
                            <View style={styles.timeItem}>
                                <LogOut size={16} color={theme.colors.textSecondary} />
                                <View>
                                    <Text style={styles.timeLabel}>Checkout</Text>
                                    <Text style={styles.timeValue}>{room.checkoutTime}</Text>
                                </View>
                            </View>
                            <View style={styles.dividerVertical} />
                            <View style={styles.timeItem}>
                                <LogIn size={16} color={theme.colors.textSecondary} />
                                <View>
                                    <Text style={styles.timeLabel}>Next Check-in</Text>
                                    <Text style={styles.timeValue}>{room.nextCheckInTime}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Conditions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Conditions</Text>

                    {/* Rush Mode (Reception/Admin Only) */}
                    {['RECEPTION', 'ADMIN', 'SUPERVISOR'].includes(user?.role || '') && (
                        <>
                            <View style={[styles.row, room.isGuestWaiting && { backgroundColor: '#FFF5F5' }]}>
                                <View style={styles.rowLabel}>
                                    <AlertTriangle size={20} color={theme.colors.error} />
                                    <View>
                                        <Text style={[styles.rowText, { color: theme.colors.error, fontWeight: 'bold' }]}>GUEST WAITING (RUSH)</Text>
                                        <Text style={{ fontSize: 10, color: theme.colors.error }}>Signals highest priority!</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={room.isGuestWaiting}
                                    onValueChange={() => toggleGuestWaiting(room.id, !room.isGuestWaiting)}
                                    trackColor={{ false: theme.colors.border, true: theme.colors.error }}
                                />
                            </View>
                            <View style={styles.divider} />
                        </>
                    )}

                    <View style={styles.row}>
                        <View style={styles.rowLabel}>
                            <Moon size={20} color={theme.colors.secondary} />
                            <Text style={styles.rowText}>Do Not Disturb</Text>
                        </View>
                        <Switch
                            value={room.isDND}
                            onValueChange={() => toggleDND(room.id)}
                            trackColor={{ false: theme.colors.border, true: theme.colors.secondary }}
                        />
                    </View>
                    <View style={styles.divider} />

                    <View style={[styles.row]}>
                        <View style={styles.rowLabel}>
                            <Clock size={20} color={theme.colors.info} />
                            <Text style={styles.rowText}>Extra Time Needed</Text>
                        </View>
                        <Switch
                            value={room.extraTime}
                            onValueChange={() => toggleExtraTime(room.id)}
                            trackColor={{ false: theme.colors.border, true: theme.colors.info }}
                        />
                    </View>
                </View>

                {/* Lost & Found Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Lost & Found</Text>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.colors.warning }]}
                        onPress={() => setLostItemModalVisible(true)}
                    >
                        <Briefcase size={20} color="white" />
                        <Text style={styles.actionButtonText}>Report Found Item</Text>
                    </TouchableOpacity>
                </View>

                {/* Cleaner Quick Reports */}
                {user?.role === 'CLEANER' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quick Report</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                            {[
                                { label: 'Bulb', icon: '💡', text: 'Light bulb replacement needed', role: 'MAINTENANCE', category: 'MAINTENANCE' },
                                { label: 'Leak', icon: '🚿', text: 'Water leak detected', role: 'MAINTENANCE', category: 'MAINTENANCE' },
                                { label: 'Soap', icon: '🧴', text: 'Missing Soap/Shampoo', role: 'HOUSEMAN', category: 'SUPPLY' },
                                { label: 'Towels', icon: '🧖', text: 'Extra Towels needed', role: 'HOUSEMAN', category: 'SUPPLY' },
                                { label: 'Linen', icon: '🛏️', text: 'Fresh Linen needed', role: 'HOUSEMAN', category: 'SUPPLY' },
                                { label: 'Stain', icon: '🧽', text: 'Carpet/Sheet Stain', role: 'MAINTENANCE', category: 'MAINTENANCE' },
                                { label: 'TV', icon: '📺', text: 'TV Remote Issues', role: 'MAINTENANCE', category: 'MAINTENANCE' }
                            ].map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.quickReportBtn}
                                    onPress={() => {
                                        Alert.alert("Report Issue", `Report "${item.text}"?`, [
                                            { text: "Cancel", style: "cancel" },
                                            { text: "Report", onPress: () => addIncident(room.id, item.text, user.username, item.role as any, user.groupId, undefined, item.category as any) }
                                        ]);
                                    }}
                                >
                                    <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                                    <Text style={styles.quickReportText}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}




                {/* Incidents */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Incidents</Text>
                        <TouchableOpacity onPress={() => setIsAddingIncident(!isAddingIncident)}>
                            <Plus color={theme.colors.primary} size={24} />
                        </TouchableOpacity>
                    </View>

                    {isAddingIncident && (
                        <View style={styles.addIncidentBox}>
                            {/* Quick Chips */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
                                {INCIDENT_PRESETS.map((preset, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.chip}
                                        onPress={() => setNewIncident(preset)}
                                    >
                                        <Text style={styles.chipText}>{preset}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Role Selection */}
                            <View style={styles.roleSelector}>
                                <Text style={styles.roleLabel}>Assign To:</Text>
                                <View style={styles.roleButtons}>
                                    {(['MAINTENANCE', 'RECEPTION', 'SUPERVISOR'] as IncidentRole[]).map((role) => (
                                        <TouchableOpacity
                                            key={role}
                                            style={[styles.roleButton, targetRole === role && styles.roleButtonActive]}
                                            onPress={() => setTargetRole(role)}
                                        >
                                            <Text style={[styles.roleButtonText, targetRole === role && styles.roleButtonTextActive]}>
                                                {role.charAt(0) + role.slice(1).toLowerCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <TextInput
                                style={styles.incidentInput}
                                placeholder="Describe the issue..."
                                value={newIncident}
                                onChangeText={setNewIncident}
                            />

                            {attachedPhoto && (
                                <View style={styles.photoPreview}>
                                    <Image source={{ uri: attachedPhoto }} style={styles.previewImage} />
                                    <TouchableOpacity onPress={() => setAttachedPhoto(null)}>
                                        <Text style={styles.removePhotoText}>Remove Photo</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.iconButton} onPress={handleAttachPhoto}>
                                    <Camera size={24} color={theme.colors.textSecondary} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.addIncidentButton, isTranslating && styles.buttonDisabled, { flex: 1, marginLeft: 10 }]}
                                    onPress={handleAddIncident}
                                    disabled={isTranslating}
                                >
                                    {isTranslating ? (
                                        <Languages size={18} color="white" />
                                    ) : (
                                        <Text style={styles.addIncidentButtonText}>Report</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {room.incidents.length === 0 ? (
                        <Text style={styles.emptyText}>No incidents reported.</Text>
                    ) : (
                        room.incidents.map((inc, i) => (
                            <View key={i} style={[styles.incidentItem, inc.status === 'RESOLVED' && styles.incidentResolved]}>
                                {inc.status === 'RESOLVED' ? (
                                    <CheckCircle2 size={16} color={theme.colors.success} style={{ marginTop: 2 }} />
                                ) : (
                                    <AlertTriangle size={16} color={theme.colors.error} style={{ marginTop: 2 }} />
                                )}
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <View style={styles.incidentHeader}>
                                        <Text style={[styles.incidentText, inc.status === 'RESOLVED' && styles.textResolved]}>
                                            {inc.text}
                                        </Text>
                                        <View style={[styles.roleTag, { backgroundColor: inc.targetRole === 'MAINTENANCE' ? theme.colors.warning + '20' : theme.colors.info + '20' }]}>
                                            <Text style={styles.roleTagText}>{inc.targetRole}</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.incidentMeta}>
                                        {new Date(inc.timestamp).toLocaleTimeString()} • {inc.user} • {inc.status}
                                    </Text>
                                    {inc.photoUri && (
                                        <Image source={{ uri: inc.photoUri }} style={styles.incidentImage} />
                                    )}

                                    {inc.status === 'OPEN' && (
                                        <TouchableOpacity
                                            style={styles.resolveButton}
                                            onPress={() => {
                                                resolveIncident(room.id, inc.id);
                                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                            }}
                                        >
                                            <Text style={styles.resolveButtonText}>Mark Resolved</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* Notes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Housekeeping Notes</Text>
                    <View style={styles.notesContainer}>
                        <TextInput
                            style={styles.notesInput}
                            multiline
                            placeholder="Add notes about this room..."
                            value={notes}
                            onChangeText={setNotes}
                            textAlignVertical="top"
                        />
                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveNotes}>
                            <Save size={16} color="white" />
                            <Text style={styles.saveButtonText}>Save Note</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView >

            {/* Floating Action Button (Phase 3) */}
            {
                room.status !== 'COMPLETED' && (
                    <View style={styles.footerOverlay}>
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                {
                                    backgroundColor:
                                        room.guestStatus === 'IN_ROOM' || isBlocked ? theme.colors.border :
                                            (room.status === 'PENDING' ? theme.colors.primary :
                                                room.status === 'INSPECTION' ? theme.colors.success : // Approve
                                                    theme.colors.info), // Finish -> Inspection
                                    opacity: (room.guestStatus === 'IN_ROOM' || isBlocked) ? 0.8 : 1
                                }
                            ]}
                            onPress={handleAction}
                            disabled={room.guestStatus === 'IN_ROOM' || isBlocked}
                        >
                            {isBlocked ? (
                                <>
                                    <AlertTriangle size={24} color={theme.colors.textSecondary} />
                                    <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>Resolve Incidents First</Text>
                                </>
                            ) : room.guestStatus === 'IN_ROOM' ? (
                                <>
                                    <User size={24} color={theme.colors.textSecondary} />
                                    <Text style={[styles.actionButtonText, { color: theme.colors.textSecondary }]}>Guest In Room</Text>
                                </>
                            ) : room.status === 'PENDING' ? (
                                <>
                                    <Play size={24} color="white" fill="white" />
                                    <Text style={styles.actionButtonText}>Start Cleaning</Text>
                                </>
                            ) : room.status === 'INSPECTION' && isSupervisor ? (
                                <>
                                    <CheckCircle2 size={24} color="white" />
                                    <Text style={styles.actionButtonText}>Approve Inspection</Text>
                                </>
                            ) : room.status === 'INSPECTION' && !isSupervisor ? (
                                <>
                                    <Clock size={24} color="white" />
                                    <Text style={styles.actionButtonText}>Pending Inspection</Text>
                                </>
                            ) : (
                                <>
                                    <UserCheck size={24} color="white" />
                                    <Text style={styles.actionButtonText}>Finish & Request Inspection</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {room.status === 'INSPECTION' && isSupervisor && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.rejectButton]}
                                onPress={handleReject}
                            >
                                <AlertTriangle size={24} color="white" />
                                <Text style={styles.actionButtonText}>Reject</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )
            }

            {/* Cleaning Type Picker Modal */}
            <Modal visible={showTypePicker} transparent animationType="slide">
                <TouchableWithoutFeedback onPress={() => setShowTypePicker(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Select Cleaning Type</Text>
                                <ScrollView>
                                    {(['DEPARTURE', 'PREARRIVAL', 'WEEKLY', 'HOLDOVER', 'RUBBISH', 'DAYUSE'] as CleaningType[]).map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[styles.typeOption, tempCleaningType === type && styles.typeOptionSelected]}
                                            onPress={() => {
                                                setTempCleaningType(type);
                                                setShowTypePicker(false);
                                            }}
                                        >
                                            <Text style={[styles.typeOptionText, tempCleaningType === type && styles.typeOptionTextSelected]}>{type}</Text>
                                            {tempCleaningType === type && <Check size={20} color={theme.colors.primary} />}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity style={styles.closeButton} onPress={() => setShowTypePicker(false)}>
                                    <Text style={styles.closeButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* History Modal */}
            <Modal visible={isHistoryVisible} transparent animationType="slide">
                <TouchableWithoutFeedback onPress={() => setHistoryVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.modalContent, { maxHeight: '70%' }]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                    <Text style={styles.modalTitle}>History Log</Text>
                                    <TouchableOpacity onPress={() => setHistoryVisible(false)}>
                                        <X size={24} color={theme.colors.text} />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView>
                                    {logs.filter(log => log.roomId === room.id || log.message.includes(`Room ${room.number}`)).length > 0 ? (
                                        logs
                                            .filter(log => log.roomId === room.id || log.message.includes(`Room ${room.number}`))
                                            .map((log) => (
                                                <View key={log.id} style={styles.historyItem}>
                                                    <View style={[styles.historyDot, { backgroundColor: log.type === 'STATUS' ? theme.colors.primary : log.type === 'INCIDENT' ? theme.colors.error : theme.colors.textSecondary }]} />
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.historyMessage}>{log.message}</Text>
                                                        <Text style={styles.historyTime}>{new Date(log.timestamp).toLocaleString()}</Text>
                                                    </View>
                                                </View>
                                            ))
                                    ) : (
                                        <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, marginTop: 20 }}>No available history for this room.</Text>
                                    )}
                                </ScrollView>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </KeyboardAvoidingView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.m,
    },
    cleaningTypeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: 10,
        borderRadius: theme.borderRadius.s,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        marginTop: 5,
        gap: 8
    },
    cleaningTypeSelectorText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text
    },
    assetItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#F7FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#EDF2F7' },
    assetName: { fontSize: 14, fontWeight: 'bold', color: theme.colors.text },
    assetSerial: { fontSize: 12, color: theme.colors.textSecondary },
    assetBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    assetStatusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

    quickReportBtn: {
        backgroundColor: '#F7FAFC',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EDF2F7',
        width: 70
    },
    quickReportText: {
        fontSize: 10,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 4
    },
    saveDetailsButton: {
        backgroundColor: theme.colors.primary,
        padding: 12,
        borderRadius: theme.borderRadius.m,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8
    },
    saveDetailsText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    editInput: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: 12,
        borderRadius: theme.borderRadius.s,
        fontSize: 16,
    },

    helperText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 4
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '50%'
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center'
    },
    typeOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border
    },
    typeOptionSelected: {
        backgroundColor: theme.colors.primary + '10'
    },
    typeOptionText: {
        fontSize: 16,
        color: theme.colors.text
    },
    typeOptionTextSelected: {
        color: theme.colors.primary,
        fontWeight: 'bold'
    },
    historyItem: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        alignItems: 'flex-start'
    },
    historyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
        marginRight: 10
    },
    historyMessage: {
        fontSize: 14,
        color: theme.colors.text,
        marginBottom: 2
    },
    historyTime: {
        fontSize: 12,
        color: theme.colors.textSecondary
    },
    closeButton: {
        marginTop: 15,
        padding: 15,
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.m,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '600'
    },
    headerCard: {
        alignItems: 'center',
        paddingVertical: theme.spacing.l,
        marginBottom: theme.spacing.m,
    },
    roomBigNumber: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.colors.text,
    },
    roomType: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    section: {
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        ...theme.shadows.card,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: theme.spacing.s,
    },
    statusContainer: {
        gap: 10,
    },
    statusButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        borderWidth: 1,
        gap: 10,
    },
    statusButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.s,
    },
    rowLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    rowText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    disabledRow: {
        opacity: 0.5,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 4,
    },
    helpText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    incidentItem: {
        flexDirection: 'row',
        padding: theme.spacing.s,
        backgroundColor: theme.colors.error + '10',
        borderRadius: theme.borderRadius.s,
        marginBottom: 8,
    },
    incidentText: {
        color: theme.colors.text,
        fontSize: 14,
    },
    incidentMeta: {
        color: theme.colors.textSecondary,
        fontSize: 11,
        marginTop: 2,
    },
    emptyText: {
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
    addIncidentBox: {
        marginBottom: theme.spacing.m,
    },
    chipContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    chip: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
    },
    chipText: {
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '600',
    },
    incidentInput: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.s,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 10,
    },
    addIncidentButton: {
        backgroundColor: theme.colors.error,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: theme.borderRadius.s,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    addIncidentButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    notesContainer: {
        gap: 10,
    },
    notesInput: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        minHeight: 80,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    saveButton: {
        flexDirection: 'row',
        backgroundColor: theme.colors.primary,
        padding: 12,
        borderRadius: theme.borderRadius.m,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    guestRow: {
        marginBottom: theme.spacing.m,
    },
    guestInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    guestStatusText: {
        fontSize: 16,
        fontWeight: '600',
    },
    keysBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    keysText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    guestActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    guestActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.background,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: theme.borderRadius.s,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    guestActionOutline: {
        borderColor: theme.colors.border,
    },
    guestActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.s,
    },
    timeItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dividerVertical: {
        width: 1,
        height: '100%',
        backgroundColor: theme.colors.border,
        marginVertical: 4,
        marginHorizontal: theme.spacing.m,
    },
    timeLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    timeValue: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
    },
    footerOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: theme.spacing.m,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        paddingBottom: 34,
    },
    actionButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: theme.borderRadius.l,
        ...theme.shadows.float,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: 10,
        backgroundColor: theme.colors.card,
        borderRadius: theme.borderRadius.s,
        borderWidth: 1,
        borderColor: theme.colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoPreview: {
        marginBottom: 10,
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: theme.borderRadius.s,
        marginBottom: 8,
    },
    removePhotoText: {
        color: theme.colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
    incidentImage: {
        width: 60,
        height: 60,
        borderRadius: theme.borderRadius.s,
        marginTop: 8,
    },
    configGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    configItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    configLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    configValue: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    extrasContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: theme.colors.warning + '20', // Light orange
        padding: 10,
        borderRadius: theme.borderRadius.s,
        marginTop: 4,
    },
    extrasText: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 14,
    },
    roleSelector: {
        marginTop: 10,
        marginBottom: 10,
    },
    roleLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    roleButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    roleButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    roleButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    roleButtonText: {
        fontSize: 12,
        color: theme.colors.text,
    },
    roleButtonTextActive: {
        color: 'white',
        fontWeight: '600',
    },
    incidentResolved: {
        opacity: 0.6,
        backgroundColor: theme.colors.success + '10',
    },
    textResolved: {
        textDecorationLine: 'line-through',
        color: theme.colors.textSecondary,
    },
    incidentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    roleTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    roleTagText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    resolveButton: {
        marginTop: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: theme.colors.primary,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    resolveButtonText: {
        fontSize: 12,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    rejectButton: {
        backgroundColor: theme.colors.error,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#F7FAFC',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 4,
    }
});
