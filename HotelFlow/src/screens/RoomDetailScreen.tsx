import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Alert, KeyboardAvoidingView, Platform, LayoutAnimation, Modal, TouchableWithoutFeedback } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RoomStackParamList } from '../AppNavigator';
import { useHotel, Room, RoomStatus, INCIDENT_PRESETS, IncidentRole, CleaningType } from '../contexts/HotelContext'; // Imported presets
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';
import { Circle, CheckCircle2, AlertTriangle, Moon, Clock, Save, Plus, Play, User, LogOut, LogIn, Languages, Camera, DoorOpen, Bed, Package, Key, Phone, Wrench, UserCheck, Edit2, X, ChevronDown, Check, Briefcase, ClipboardCheck, History, XCircle, CheckCircle } from 'lucide-react-native';
import { StatusBadge } from '../components/StatusBadge';
import { InspectionModal } from '../components/InspectionModal';
import { Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '../contexts/ToastContext';
import NfcManager, { NfcTech } from '../utils/SafeNfc';

type RoomDetailRouteProp = RouteProp<RoomStackParamList, 'RoomDetail'>;

// --- Helper Components for Zen Mode ---

const Stopwatch = ({ startTime }: { startTime?: string }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!startTime) return;
        const start = new Date(startTime).getTime();
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const format = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return <Text style={styles.zenTimerText}>{format(elapsed)}</Text>;
};

// CHECKLIST REMOVED AS PER USER REQUEST

// --- Role Specific Views ---

const ReceptionView = ({ room, onAction, onUpdateGuest }: { room: Room, onAction: (type: string) => void, onUpdateGuest: (status: string) => void }) => {
    // Mock Payment Data
    const balance = Math.floor(Math.random() * 200);

    return (
        <ScrollView style={styles.roleContainer}>
            <View style={styles.roleHeader}>
                <View>
                    <Text style={styles.roleTitle}>Room {room.number}</Text>
                    <Text style={styles.roleSubtitle}>{room.type} • {room.floor}th Floor</Text>
                </View>
                <StatusBadge status={room.status} />
            </View>

            {/* Guest Card */}
            <View style={styles.roleCard}>
                <View style={styles.cardHeader}>
                    <User size={20} color={theme.colors.primary} />
                    <Text style={styles.cardTitle}>Guest Information</Text>
                </View>
                {room.guestDetails?.currentGuest ? (
                    <View>
                        <Text style={styles.guestName}>{room.guestDetails.currentGuest}</Text>
                        <Text style={styles.guestDates}>Departs: {new Date(room.guestDetails.nextArrival || Date.now()).toLocaleDateString()}</Text>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => onUpdateGuest('OUT')}>
                                <LogOut size={16} color={theme.colors.primary} />
                                <Text style={styles.btnTextPrimary}>Check Out</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtnOutline}>
                                <Phone size={16} color={theme.colors.primary} />
                                <Text style={styles.btnTextPrimary}>Call Room</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Room is Vaccant</Text>
                        <TouchableOpacity style={styles.actionBtnFull} onPress={() => onUpdateGuest('IN')}>
                            <LogIn size={16} color="white" />
                            <Text style={styles.btnTextWhite}>Check In Guest</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Payment & Billing */}
            <View style={styles.roleCard}>
                <View style={styles.cardHeader}>
                    <Briefcase size={20} color={theme.colors.secondary} />
                    <Text style={styles.cardTitle}>Billing</Text>
                </View>
                <View style={styles.billingRow}>
                    <Text style={styles.billingLabel}>Pending Balance</Text>
                    <Text style={[styles.billingValue, { color: balance > 0 ? theme.colors.error : theme.colors.success }]}>
                        ${balance}.00
                    </Text>
                </View>
                {balance > 0 && (
                    <TouchableOpacity style={styles.payBtn}>
                        <Text style={styles.payBtnText}>Process Payment</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Room Status Actions */}
            <View style={styles.roleCard}>
                <View style={styles.cardHeader}>
                    <History size={20} color={theme.colors.text} />
                    <Text style={styles.cardTitle}>Housekeeping Status</Text>
                </View>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Current: {room.status}</Text>
                    <TouchableOpacity onPress={() => onAction('PRIORITY')} style={styles.priorityBtn}>
                        <Text style={styles.priorityText}>Mark High Priority</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

const SupervisorView = ({ room, onAction }: { room: Room, onAction: (type: string) => void }) => {
    return (
        <ScrollView style={styles.roleContainer}>
            <View style={styles.roleHeader}>
                <View>
                    <Text style={styles.roleTitle}>Audit Room {room.number}</Text>
                    <Text style={styles.roleSubtitle}>Supervisor Inspection</Text>
                </View>
                <StatusBadge status={room.status} />
            </View>

            <View style={styles.roleCard}>
                <View style={styles.cardHeader}>
                    <ClipboardCheck size={20} color={theme.colors.primary} />
                    <Text style={styles.cardTitle}>Inspection Checklist</Text>
                </View>
                <View style={{ gap: 10 }}>
                    {['Bed Made properly', 'Bathroom Cleaned', 'Amenities Restocked', 'Floor Vacuumed', 'No Dust'].map((item, i) => (
                        <View key={i} style={styles.checklistItem}>
                            <View style={styles.checkbox}><Check size={14} color="gray" /></View>
                            <Text style={styles.checklistText}>{item}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.actionBtnFull, { backgroundColor: theme.colors.success }]} onPress={() => onAction('APPROVE')}>
                    <CheckCircle2 size={20} color="white" />
                    <Text style={styles.btnTextWhite}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtnFull, { backgroundColor: theme.colors.error }]} onPress={() => onAction('REJECT')}>
                    <XCircle size={20} color="white" />
                    <Text style={styles.btnTextWhite}>Reject</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const MaintenanceView = ({ room, onAddIncident, onViewPhoto }: { room: Room, onAddIncident: () => void, onViewPhoto: (uri: string) => void }) => {
    return (
        <ScrollView style={styles.roleContainer}>
            <View style={styles.roleHeader}>
                <View>
                    <Text style={styles.roleTitle}>Maintenance Log</Text>
                    <Text style={styles.roleSubtitle}>Room {room.number}</Text>
                </View>
                <TouchableOpacity onPress={onAddIncident} style={styles.iconBtn}>
                    <Plus size={24} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Asset List */}
            <View style={styles.roleCard}>
                <View style={styles.cardHeader}>
                    <Wrench size={20} color={theme.colors.text} />
                    <Text style={styles.cardTitle}>Assets in Room</Text>
                </View>
                <View style={{ gap: 8 }}>
                    <View style={styles.assetItem}>
                        <View><Text style={styles.assetName}>AC Unit</Text><Text style={styles.assetSerial}>SN: 12345678</Text></View>
                        <View style={[styles.assetBadge, { backgroundColor: theme.colors.success }]}><Text style={styles.assetStatusText}>Good</Text></View>
                    </View>
                    <View style={styles.assetItem}>
                        <View><Text style={styles.assetName}>TV</Text><Text style={styles.assetSerial}>SN: LG-999</Text></View>
                        <View style={[styles.assetBadge, { backgroundColor: theme.colors.success }]}><Text style={styles.assetStatusText}>Good</Text></View>
                    </View>
                </View>
            </View>

            {/* Open Tickets */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Open Tickets</Text>
                {room.incidents.filter(i => i.status === 'OPEN').length === 0 ? (
                    <Text style={styles.emptyText}>No open tickets.</Text>
                ) : (
                    room.incidents.filter(i => i.status === 'OPEN').map((inc, i) => (
                        <View key={i} style={styles.incidentItem}>
                            <AlertTriangle size={16} color={theme.colors.error} />
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.incidentText}>{inc.text}</Text>
                                {inc.photoUri && (
                                    <TouchableOpacity onPress={() => onViewPhoto(inc.photoUri!)}>
                                        <Image source={{ uri: inc.photoUri }} style={{ width: 100, height: 100, borderRadius: 8, marginTop: 4 }} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
};

const HousemanView = ({ room }: { room: Room }) => {
    return (
        <ScrollView style={styles.roleContainer}>
            <View style={styles.roleHeader}>
                <View>
                    <Text style={styles.roleTitle}>Restock Room {room.number}</Text>
                    <Text style={styles.roleSubtitle}>{room.type} • {room.configuration?.bedrooms || 1} Bed</Text>
                </View>
            </View>

            <View style={styles.roleCard}>
                <View style={styles.cardHeader}>
                    <Package size={20} color={theme.colors.primary} />
                    <Text style={styles.cardTitle}>Required Items</Text>
                </View>
                <View style={styles.suppliesGrid}>
                    <View style={styles.supplyItem}><Text style={styles.supplyLabel}>Towels</Text><Text style={styles.zenInfoValue}>4</Text></View>
                    <View style={styles.supplyItem}><Text style={styles.supplyLabel}>Soap</Text><Text style={styles.zenInfoValue}>2</Text></View>
                    <View style={styles.supplyItem}><Text style={styles.supplyLabel}>Gels</Text><Text style={styles.zenInfoValue}>2</Text></View>
                    <View style={styles.supplyItem}><Text style={styles.supplyLabel}>Water</Text><Text style={styles.zenInfoValue}>2</Text></View>
                </View>
            </View>
            <TouchableOpacity style={styles.actionBtnFull}>
                <CheckCircle size={20} color="white" />
                <Text style={styles.btnTextWhite}>Mark Restocked</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

export default function RoomDetailScreen() {
    const route = useRoute<RoomDetailRouteProp>();
    const navigation = useNavigation();
    const { roomId } = route.params;
    const { rooms, updateRoomStatus, toggleDND, toggleExtraTime, updateNotes, addIncident, updateGuestStatus, resolveIncident, updateRoomDetails, cleaningTypes, toggleGuestInRoom, toggleGuestWaiting, logs, reportLostItem, assets, fetchAssets, updateAssetStatus, settings, updateSupplies, roomDrafts, startCleaning, stopCleaning, saveDraft, staff } = useHotel();
    const { user } = useAuth();
    const { showToast } = useToast();

    const room = rooms.find(r => r.id === roomId);
    // Initialize from Draft if available, else Room Data
    const [notes, setNotes] = useState(roomDrafts[roomId]?.notes || room?.notes || '');
    const [newIncident, setNewIncident] = useState(roomDrafts[roomId]?.incident || '');

    // Save Draft on Change (Debounced effect ideally, but direct for now is valid for React Native state speed)
    useEffect(() => {
        if (room) {
            saveDraft(room.id, { notes, incident: newIncident });
        }
    }, [notes, newIncident]);
    const [incidentModalVisible, setIncidentModalVisible] = useState(false);
    const [targetRole, setTargetRole] = useState<IncidentRole>('MAINTENANCE'); // Default target
    const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
    const [isInspectionVisible, setInspectionVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isHistoryVisible, setHistoryVisible] = useState(false);

    // Lost & Found State
    const [lostItemModalVisible, setLostItemModalVisible] = useState(false);
    const [lostItemDesc, setLostItemDesc] = useState('');

    const [isAddingIncident, setIsAddingIncident] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isNfcSupported, setIsNfcSupported] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // NFC Initialization (Safe for Expo Go)
    useEffect(() => {
        const checkNfc = async () => {
            try {
                const supported = await NfcManager.isSupported();
                if (supported) {
                    await NfcManager.start();
                    setIsNfcSupported(true);
                }
            } catch (e) {
                // Silently fail in Expo Go or non-NFC devices
                console.log("NFC Not Supported or Expo Go Env");
            }
        };
        checkNfc();

        return () => {
            // Clean up
            NfcManager.cancelTechnologyRequest().catch(() => 0);
        };
    }, []);

    // NFC Scanning Logic
    const startNfcScan = async () => {
        if (!isNfcSupported) return;

        try {
            setIsScanning(true);
            // Register for any tag
            await NfcManager.requestTechnology(NfcTech.Ndef);
            const tag = await NfcManager.getTag();

            if (tag) {
                // LOGIC: Check if Tag corresponds to Room
                // For MVP, ANY tag scans triggers the action for the current room
                // In production, you would check: if (tag.id === room.nfcTagId)

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                if (room?.status === 'PENDING') {
                    startCleaning(room.id);
                    showToast(`NFC: Started Room ${room.number}`, 'SUCCESS');
                } else if (room?.status === 'IN_PROGRESS') {
                    handleAction(); // Trigger completion flow
                    showToast(`NFC: Completed Room ${room.number}`, 'SUCCESS');
                }
            } // End Tag Check

        } catch (ex) {
            console.warn('NFC Scan Error', ex);
            // Cancelled or Error
        } finally {
            // Clean up
            NfcManager.cancelTechnologyRequest();
            setIsScanning(false);
        }
    };

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

    // Fast Alert State - Updated with targetRole
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean,
        type: 'BROKEN' | 'MISSING' | 'GENERAL',
        targetRole?: IncidentRole  // Optional override
    }>({ visible: false, type: 'GENERAL' });
    const [alertText, setAlertText] = useState('');
    const [alertPhoto, setAlertPhoto] = useState<string | null>(null);

    const pickImage = async (fromCamera: boolean = true) => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.5,
                allowsEditing: false
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setAlertPhoto(result.assets[0].uri);
                if (!alertConfig.visible) {
                    setAlertConfig({ visible: true, type: 'GENERAL' });
                }
            }
        } catch (e) {
            console.error("Camera Error", e);
            Alert.alert("Error", "Could not open camera.");
        }
    };

    const submitFastAlert = () => {
        if (!alertText && !alertPhoto) return;

        let finalDescription = alertText;
        if (alertText && !/^[a-zA-Z\s]+$/.test(alertText)) {
            finalDescription = `${alertText} (Translated to EN)`;
        }

        const typeMap: Record<string, string> = { 'BROKEN': 'MAINTENANCE', 'MISSING': 'SUPPLY', 'GENERAL': 'MAINTENANCE' };

        addIncident(room?.id || roomId, finalDescription || 'Photo Report', user?.username || 'Cleaner', typeMap[alertConfig.type] as any || 'MAINTENANCE', user?.groupId, alertPhoto || undefined);

        showToast('Alert Sent!', 'SUCCESS');
        setAlertConfig({ visible: false, type: 'GENERAL' });
        setAlertText('');
        setAlertPhoto(null);
    };

    const BROKEN_PRESETS = ['Lamp', 'TV', 'AC', 'Toilet', 'Tap', 'Window'];
    const MISSING_PRESETS = ['Towels', 'Soap', 'Water', 'Remote', 'Pillows'];

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

    const roomAssets = assets.filter(a => String(a.room) === roomId || a.room_number === room?.number); // Filter by ID or Number if needed

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
            startCleaning(room.id); // Replaces updateRoomStatus directly to start timer
        } else if (room.status === 'IN_PROGRESS') {
            // Cleaner finishes
            stopCleaning(room.id); // Stops timer
            saveDraft(room.id, { notes: '', incident: '' }); // Clear Draft

            // Logic: Only DEPARTURE and PREARRIVAL go to INSPECTION
            const needsInspection = ['DEPARTURE', 'PREARRIVAL'].includes(room.cleaningType);
            const nextStatus = needsInspection ? 'INSPECTION' : 'COMPLETED';

            updateRoomStatus(room.id, nextStatus);
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
        Alert.alert(
            'Request Reception Action',
            'Is the guest still in the room past checkout time?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Request Call',
                    onPress: () => {
                        addIncident(
                            room.id,
                            'Late Checkout - Please Call Guest',
                            user?.username || 'Cleaner',
                            'RECEPTION',
                            user?.groupId,
                            undefined,
                            'GUEST_REQ' // category
                        );
                        showToast('Reception Notified', 'SUCCESS');
                    }
                }
            ]
        );
    };

    const handleGuestLeft = () => {
        Alert.alert(
            'Confirm Guest Departure',
            'Has the guest left the room? Did you find the keys?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Guest Left (No Keys)',
                    style: 'default',
                    onPress: () => {
                        updateGuestStatus(room.id, 'OUT', false);
                        showToast('Room marked Empty (No Keys)', 'INFO');
                    }
                },
                {
                    text: 'Guest Left + Keys Found',
                    style: 'default',
                    onPress: () => {
                        updateGuestStatus(room.id, 'OUT', true);
                        showToast('Room marked Empty + Keys Found', 'SUCCESS');
                    }
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

            {/* ROLE BASED RENDER */}

            {/* 1. RECEPTION VIEW */}
            {user?.role === 'RECEPTION' && (
                <ReceptionView
                    room={room}
                    onAction={(type) => {
                        if (type === 'PRIORITY') Alert.alert("Success", "Priority Updated");
                    }}
                    onUpdateGuest={(status) => {
                        if (status === 'OUT') handleGuestLeft();
                        else Alert.alert("Check In", "Navigate to Check In Flow");
                    }}
                />
            )}

            {/* 2. SUPERVISOR VIEW */}
            {user?.role === 'SUPERVISOR' && room.status === 'INSPECTION' && (
                <SupervisorView
                    room={room}
                    onAction={(action) => {
                        if (action === 'APPROVE') {
                            updateRoomStatus(room.id, 'COMPLETED');
                            navigation.goBack();
                        } else {
                            handleReject();
                        }
                    }}
                />
            )}

            {/* 3. MAINTENANCE VIEW */}
            {user?.role === 'MAINTENANCE' && (
                <MaintenanceView
                    room={room}
                    onAddIncident={() => setIncidentModalVisible(true)}
                    onViewPhoto={(uri) => setSelectedImage(uri)}
                />
            )}

            {/* 4. HOUSEMAN VIEW */}
            {user?.role === 'HOUSEMAN' && (
                <HousemanView room={room} />
            )}

            {/* 5. CLEANER VIEW (Existing Zen Mode) */}
            {(user?.role === 'CLEANER' && room.status === 'IN_PROGRESS') ? (
                <View style={styles.zenContainer}>
                    {/* Live Timer Header */}
                    <View style={styles.zenHeader}>
                        <View>
                            <Text style={styles.zenTitle}>Room {room.number}</Text>
                            <Text style={styles.zenSubtitle}>{room.cleaningType} Cleaning</Text>
                        </View>
                        <View style={styles.zenTimerContainer}>
                            {isNfcSupported && (
                                <TouchableOpacity onPress={startNfcScan} style={{ marginRight: 10 }}>
                                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 4, borderRadius: 20 }}>
                                        <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>NFC READY</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            <Clock size={20} color="white" style={{ marginRight: 6 }} />
                            <Stopwatch startTime={room.cleaningStartedAt} />
                        </View>
                    </View>

                    {/* Team Members */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 }}>
                        <Text style={{ color: theme.colors.textSecondary, marginRight: 8, fontSize: 13, fontWeight: '600' }}>TEAM:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {staff.filter(s => s.groupId === user?.groupId).map((s, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, borderWidth: 1, borderColor: '#E5E7EB' }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.success, marginRight: 6 }} />
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text }}>{s.username}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    <ScrollView style={styles.zenContent} contentContainerStyle={{ paddingBottom: 100 }}>

                        {/* Alerts & Conditions */}
                        {(room.isGuestWaiting || room.isDND || room.extraTime) && (
                            <View style={styles.zenSection}>
                                <Text style={styles.zenSectionTitle}>Important Alerts</Text>
                                <View style={{ gap: 10 }}>
                                    {room.isGuestWaiting && (
                                        <View style={[styles.zenAlertItem, { backgroundColor: theme.colors.error + '20' }]}>
                                            <AlertTriangle size={24} color={theme.colors.error} />
                                            <Text style={[styles.zenAlertText, { color: theme.colors.error }]}>GUEST WAITING (RUSH)</Text>
                                        </View>
                                    )}
                                    {room.isDND && (
                                        <View style={[styles.zenAlertItem, { backgroundColor: theme.colors.secondary + '20' }]}>
                                            <Moon size={24} color={theme.colors.secondary} />
                                            <Text style={[styles.zenAlertText, { color: theme.colors.secondary }]}>DO NOT DISTURB</Text>
                                        </View>
                                    )}
                                    {room.extraTime && (
                                        <View style={[styles.zenAlertItem, { backgroundColor: theme.colors.info + '20' }]}>
                                            <Clock size={24} color={theme.colors.info} />
                                            <Text style={[styles.zenAlertText, { color: theme.colors.info }]}>EXTRA TIME REQUESTED</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Room Setup Info (User Request: "setup de la habitacion") */}
                        <View style={styles.zenSection}>
                            <Text style={styles.zenSectionTitle}>Room Setup</Text>
                            <View style={styles.zenGrid}>
                                <View style={styles.zenInfoCard}>
                                    <Bed size={20} color={theme.colors.primary} />
                                    <Text style={styles.zenInfoLabel}>Beds</Text>
                                    <Text style={styles.zenInfoValue}>{room.configuration?.beds || 'Standard'}</Text>
                                </View>
                                <View style={styles.zenInfoCard}>
                                    <DoorOpen size={20} color={theme.colors.primary} />
                                    <Text style={styles.zenInfoLabel}>Bedrooms</Text>
                                    <Text style={styles.zenInfoValue}>{room.configuration?.bedrooms || 1}</Text>
                                </View>
                                {room.configuration?.extras && room.configuration.extras.length > 0 && (
                                    <View style={[styles.zenInfoCard, { width: '100%' }]}>
                                        <Package size={20} color={theme.colors.warning} />
                                        <Text style={styles.zenInfoLabel}>Extras Required</Text>
                                        <Text style={styles.zenInfoValue}>{room.configuration.extras.join(', ')}</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Houseman Status (New) */}
                        <View style={styles.zenSection}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.zenSectionTitle}>Houseman Status</Text>
                                {room.isHousemanCompleted ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                                        <CheckCircle size={16} color="#059669" style={{ marginRight: 6 }} />
                                        <Text style={{ color: '#059669', fontWeight: 'bold', fontSize: 13 }}>READY</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#FCD34D' }}
                                        onPress={() => {
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                            addIncident(room.id, "Houseman Prep Request", user?.username || "Cleaner", "HOUSEMAN", user?.groupId, undefined, 'GUEST_REQ');
                                            showToast("Houseman Requested!", "SUCCESS");
                                        }}
                                    >
                                        <AlertTriangle size={16} color="#D97706" style={{ marginRight: 6 }} />
                                        <Text style={{ color: "#D97706", fontWeight: 'bold', fontSize: 13 }}>REQUEST PREP</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Cleaner Notes (Editable) */}
                        <View style={styles.zenSection}>
                            <Text style={styles.zenSectionTitle}>My Notes</Text>
                            <TextInput
                                style={styles.zenNotesInput}
                                placeholder="Add notes about this room..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                value={notes}
                                onChangeText={setNotes}
                                onBlur={handleSaveNotes} // Save when leaving field
                            />
                        </View>

                        {/* Incidents Warning */}
                        {room.incidents.some(i => i.status === 'OPEN') && (
                            <View style={[styles.zenSection, { borderColor: theme.colors.warning, borderWidth: 1 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                    <AlertTriangle size={20} color={theme.colors.warning} style={{ marginRight: 8 }} />
                                    <Text style={[styles.zenSectionTitle, { marginBottom: 0 }]}>Open Incidents</Text>
                                </View>
                                {room.incidents.filter(i => i.status === 'OPEN').map((inc, i) => (
                                    <Text key={i} style={{ fontSize: 14, color: theme.colors.text, marginBottom: 4 }}>• {inc.text}</Text>
                                ))}
                            </View>
                        )}

                        {/* Fast Alert Toolbar (New) */}
                        <View style={styles.zenSection}>
                            <Text style={styles.zenSectionTitle}>Fast Alert</Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TouchableOpacity
                                    style={[styles.zenFastBtn, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}
                                    onPress={() => pickImage(true)}
                                >
                                    <Camera size={24} color="#4F46E5" />
                                    <Text style={[styles.zenFastBtnText, { color: '#4F46E5' }]}>Photo</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.zenFastBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                                    onPress={() => setAlertConfig({ visible: true, type: 'BROKEN' })}
                                >
                                    <Wrench size={24} color="#DC2626" />
                                    <Text style={[styles.zenFastBtnText, { color: '#DC2626' }]}>Broken</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.zenFastBtn, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}
                                    onPress={() => setAlertConfig({ visible: true, type: 'MISSING' })}
                                >
                                    <Package size={24} color="#EA580C" />
                                    <Text style={[styles.zenFastBtnText, { color: '#EA580C' }]}>Missing</Text>
                                </TouchableOpacity>
                            </View>
                        </View>



                        {/* Quick Incidents (Legacy Presets) */}
                        <View style={styles.zenSection}>
                            <Text style={styles.zenSectionTitle}>Quick Report</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                {INCIDENT_PRESETS.map((preset) => (
                                    <TouchableOpacity
                                        key={preset}
                                        style={styles.zenChip}
                                        onPress={() => {
                                            // Optimistic Haptic
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                            // Report immediately
                                            addIncident(room.id, preset, user?.username || 'Cleaner', 'MAINTENANCE', user?.groupId);
                                            showToast(`Reported: ${preset}`, 'SUCCESS');
                                        }}
                                    >
                                        <AlertTriangle size={14} color={theme.colors.error} />
                                        <Text style={styles.zenChipText}>{preset}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.zenSection}>
                            <Text style={styles.zenSectionTitle}>Linen & Towels Used</Text>
                            <View style={styles.suppliesGrid}>
                                {['Large Towel', 'Hand Towel', 'Face Towel', 'Bath Mat'].map(item => (
                                    <View key={item} style={styles.supplyItem}>
                                        <Text style={styles.supplyLabel}>{item}</Text>
                                        <View style={styles.counterRow}>
                                            <TouchableOpacity
                                                style={styles.counterBtn}
                                                onPress={() => updateSupplies(room.id, { ...room.supplies_used, [item]: Math.max(0, (room.supplies_used?.[item] || 0) - 1) })}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <Text style={styles.counterBtnText}>-</Text>
                                            </TouchableOpacity>
                                            <Text style={styles.counterValue}>{room.supplies_used?.[item] || 0}</Text>
                                            <TouchableOpacity
                                                style={styles.counterBtn}
                                                onPress={() => updateSupplies(room.id, { ...room.supplies_used, [item]: (room.supplies_used?.[item] || 0) + 1 })}
                                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            >
                                                <Text style={styles.counterBtnText}>+</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Report Issue Button */}
                        <TouchableOpacity
                            style={styles.zenReportTopBtn}
                            onPress={() => { setNewIncident(''); setIsAddingIncident(true); }}
                        >
                            <AlertTriangle size={20} color={theme.colors.error} />
                            <Text style={styles.zenReportTopText}>Report Maintenance Issue</Text>
                        </TouchableOpacity>

                    </ScrollView>

                    {/* Fast Alert Modal */}
                    <Modal
                        visible={alertConfig.visible}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setAlertConfig({ ...alertConfig, visible: false })}
                    >
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                            <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 400 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
                                        {alertConfig.type === 'BROKEN' ? 'Report Broken Item' :
                                            alertConfig.type === 'MISSING' ? 'Report Missing Item' : 'New Report'}
                                    </Text>
                                    <TouchableOpacity onPress={() => setAlertConfig({ ...alertConfig, visible: false })}>
                                        <X size={24} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>

                                {/* Presets Grid */}
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                                    {(alertConfig.type === 'BROKEN' ? BROKEN_PRESETS : alertConfig.type === 'MISSING' ? MISSING_PRESETS : []).map(preset => (
                                        <TouchableOpacity
                                            key={preset}
                                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' }}
                                            onPress={() => setAlertText(preset)}
                                        >
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>{preset}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Role Selector */}
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase' }}>Assign To:</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                        {(['MAINTENANCE', 'HOUSEMAN', 'RECEPTION', 'SUPERVISOR'] as const).map(role => {
                                            const roleLabel = role === 'HOUSEMAN' ? 'HOUSEKEEPING' : role; // Display label
                                            const isSelected = alertConfig.targetRole === role || (!alertConfig.targetRole && (
                                                (alertConfig.type === 'BROKEN' && role === 'MAINTENANCE') ||
                                                (alertConfig.type === 'MISSING' && role === 'HOUSEMAN')
                                            ));

                                            // Determine if this role is currently "active" for visual state
                                            const active = alertConfig.targetRole === role || (!alertConfig.targetRole && (
                                                (alertConfig.type === 'BROKEN' && role === 'MAINTENANCE') ||
                                                (alertConfig.type === 'MISSING' && role === 'HOUSEMAN') ||
                                                (alertConfig.type === 'GENERAL' && role === 'MAINTENANCE')
                                            ));

                                            return (
                                                <TouchableOpacity
                                                    key={role}
                                                    style={{
                                                        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
                                                        backgroundColor: active ? theme.colors.primary : '#F3F4F6',
                                                        borderWidth: 1, borderColor: active ? theme.colors.primary : '#E5E7EB'
                                                    }}
                                                    onPress={() => setAlertConfig({ ...alertConfig, targetRole: role as IncidentRole })}
                                                >
                                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: active ? 'white' : '#374151' }}>
                                                        {roleLabel}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>

                                {/* Input Area */}
                                <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
                                    <TextInput
                                        placeholder={alertConfig.type === 'BROKEN' ? "Describe damage..." : "What's missing?"}
                                        value={alertText}
                                        onChangeText={setAlertText}
                                        multiline
                                        style={{ minHeight: 60, fontSize: 16, textAlignVertical: 'top' }}
                                    />
                                    {/* Smart Translation Badge */}
                                    {alertText.length > 3 && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 8 }}>
                                            <CheckCircle size={14} color={theme.colors.success} style={{ marginRight: 4 }} />
                                            <Text style={{ fontSize: 12, color: theme.colors.success, fontStyle: 'italic' }}>Auto-Translate Active</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Photo Preview / Add Button */}
                                <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                                    {alertPhoto ? (
                                        <View style={{ position: 'relative' }}>
                                            <Image source={{ uri: alertPhoto }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                                            <TouchableOpacity
                                                style={{ position: 'absolute', top: -8, right: -8, backgroundColor: 'white', borderRadius: 12 }}
                                                onPress={() => setAlertPhoto(null)}
                                            >
                                                <XCircle size={20} color="red" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#9CA3AF', borderRadius: 8, flex: 1, justifyContent: 'center' }}
                                            onPress={() => pickImage(true)}
                                        >
                                            <Camera size={20} color="#6B7280" style={{ marginRight: 8 }} />
                                            <Text style={{ color: '#6B7280' }}>Add Photo Evidence</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* Submit Button */}
                                <TouchableOpacity
                                    style={{ backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' }}
                                    onPress={submitFastAlert}
                                >
                                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Send Report</Text>
                                </TouchableOpacity>

                            </View>
                        </View>
                    </Modal>

                    {/* Fixed Bottom Action Bar */}
                    <View style={styles.zenFooter}>
                        <TouchableOpacity style={styles.zenFinishButton} onPress={handleAction}>
                            <CheckCircle2 size={24} color={theme.colors.primary} fill="white" />
                            <Text style={styles.zenFinishText}>Complete Room</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <>
                    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
                        {/* Header Card */}
                        <View style={styles.headerCard}>
                            <View style={{ width: '100%', alignItems: 'center', marginBottom: 5, marginTop: 10 }}>
                                <Text style={styles.roomBigNumber}>{room.number}</Text>

                                <View style={{ position: 'absolute', right: 0, top: 10, flexDirection: 'row' }}>
                                    {['SUPERVISOR', 'RECEPTION', 'ADMIN'].includes(user?.role?.toUpperCase() || '') && (
                                        <TouchableOpacity onPress={() => setIsEditing(!isEditing)} style={{ padding: 8 }}>
                                            {isEditing ? <X color={theme.colors.text} /> : <Edit2 color={theme.colors.textSecondary} />}
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity onPress={() => setHistoryVisible(true)} style={{ padding: 8 }}>
                                        <History color={theme.colors.primary} />
                                    </TouchableOpacity>
                                </View>
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
                                                <Text style={styles.guestActionText}>Request Call</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.guestActionButton, styles.guestActionOutline]} onPress={handleGuestLeft}>
                                                <LogOut size={16} color={theme.colors.text} />
                                                <Text style={[styles.guestActionText, { color: theme.colors.text }]}>Guest Left / Keys</Text>
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
                                                <TouchableOpacity onPress={() => setSelectedImage(inc.photoUri!)}>
                                                    <Image source={{ uri: inc.photoUri }} style={styles.incidentImage} />
                                                </TouchableOpacity>
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
                                    <Text style={styles.saveButtonText}>Save Note</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                    </ScrollView>

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
                                    <View style={[styles.modalContent, { maxHeight: '70%', paddingBottom: 30 }]}>
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

                    {/* Photo Lightbox Modal */}
                    <Modal visible={!!selectedImage} transparent={true} animationType="fade">
                        <View style={styles.lightboxContainer}>
                            <TouchableOpacity style={styles.lightboxClose} onPress={() => setSelectedImage(null)}>
                                <X color="white" size={30} />
                            </TouchableOpacity>
                            <Image source={{ uri: selectedImage || '' }} style={styles.lightboxImage} resizeMode="contain" />
                        </View>
                    </Modal>
                </>
            )
            }
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
        fontSize: 48,
        fontWeight: '800',
        color: theme.colors.text,
        letterSpacing: -1,
        includeFontPadding: false
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
    },
    // Zen Mode Info Styles
    zenAlertItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        gap: 12
    },
    zenAlertText: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    zenGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12
    },
    zenInfoCard: {
        width: '48%',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        alignItems: 'flex-start'
    },
    zenInfoLabel: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 8,
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    zenInfoValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    zenNotesText: {
        fontSize: 15,
        color: theme.colors.text,
        lineHeight: 22,
        fontStyle: 'italic'
    },
    zenNotesInput: {
        fontSize: 14,
        color: theme.colors.text,
        lineHeight: 22,
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 12,
        minHeight: 80,
        textAlignVertical: 'top'
    },
    zenFastBtn: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8
    },
    zenFastBtnText: {
        fontSize: 14,
        fontWeight: 'bold'
    },

    zenChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: theme.colors.error + '40', // Light Opacity
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        gap: 6
    },
    zenChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.error
    },
    // Zen Mode Styles (Enhanced)
    zenContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA', // Light Gray-ish
    },
    zenHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60, // Safe Area
        paddingBottom: 20,
        backgroundColor: theme.colors.primary,
    },
    zenTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    zenSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    zenTimerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    zenTimerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        fontVariant: ['tabular-nums']
    },
    zenContent: {
        flex: 1,
        padding: 20,
    },
    zenSection: {
        marginBottom: 25,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        ...theme.shadows.card,
    },
    zenSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 15,
    },

    // Checklist
    checklistContainer: {
        gap: 12,
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'transparent'
    },
    checklistItemActive: {
        backgroundColor: '#F0FDF4', // Light Green
        borderColor: theme.colors.success
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white'
    },
    checkboxActive: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success
    },
    checklistText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        fontWeight: '500'
    },
    checklistTextActive: {
        color: theme.colors.text,
        fontWeight: '600',
        textDecorationLine: 'line-through',
        textDecorationStyle: 'solid',
        opacity: 0.8
    },

    // Supplies (Existing reuse)
    suppliesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    supplyItem: {
        width: '48%',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    supplyLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 8,
        fontWeight: '600'
    },
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    counterBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.card
    },
    counterBtnText: {
        fontSize: 18,
        color: theme.colors.primary,
        fontWeight: 'bold',
        marginTop: -2
    },
    counterValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
    },

    // Footer Actions
    zenReportTopBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        marginTop: 10,
        marginBottom: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.error,
        borderStyle: 'dashed',
        backgroundColor: '#FEF2F2'
    },
    zenReportTopText: {
        color: theme.colors.error,
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 16
    },
    zenFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
        ...theme.shadows.card
    },
    zenFinishButton: {
        backgroundColor: theme.colors.primary, // Or Brand Color
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6
    },
    zenFinishText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },

    roleContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    roleHeader: {
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    roleTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    roleSubtitle: {
        fontSize: 14,
        color: theme.colors.textSecondary
    },
    roleCard: {
        backgroundColor: 'white',
        margin: 15,
        borderRadius: 12,
        padding: 15,
        ...theme.shadows.card
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingBottom: 10
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text
    },
    guestName: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 4
    },
    guestDates: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginBottom: 15
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10
    },
    actionBtnOutline: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        gap: 6
    },
    actionBtnFull: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: theme.colors.primary,
        gap: 6
    },
    btnTextPrimary: {
        color: theme.colors.primary,
        fontWeight: '600'
    },
    btnTextWhite: {
        color: 'white',
        fontWeight: '600'
    },
    emptyState: {
        alignItems: 'center',
        padding: 20,
        gap: 15
    },
    billingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15
    },
    billingLabel: {
        fontSize: 16,
        color: theme.colors.textSecondary
    },
    billingValue: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    payBtn: {
        backgroundColor: theme.colors.secondary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    payBtnText: {
        color: 'white',
        fontWeight: 'bold'
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text
    },
    priorityBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: theme.colors.warning + '20',
        borderRadius: 20
    },
    priorityText: {
        color: theme.colors.warning,
        fontWeight: 'bold',
        fontSize: 12
    },
    iconBtn: {
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 8
    },
    lightboxContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center'
    },
    lightboxClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20
    },
    lightboxImage: {
        width: '100%',
        height: '80%'
    }
});
// End of Styles
