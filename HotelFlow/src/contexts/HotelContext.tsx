import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { UserRole, useAuth } from './AuthContext';
import api from '../services/api';
import { Alert } from 'react-native';
import { storage } from '../utils/storage';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useToast } from './ToastContext';

export type RoomStatus = 'PENDING' | 'IN_PROGRESS' | 'INSPECTION' | 'COMPLETED' | 'MAINTENANCE';

export type IncidentRole = 'MAINTENANCE' | 'RECEPTION' | 'SUPERVISOR' | 'HOUSEMAN';
// Duplicate removed
export type IncidentStatus = 'OPEN' | 'RESOLVED';

export interface LostItem {
    id: number;
    description: string;
    room: string; // ID or Number? Usually foreign key ID from backend, but serializer might send object or ID. Let's assume ID or number string. Serializer defaults to PK usually.
    found_by_name: string;
    status: 'FOUND' | 'RETURNED' | 'DISPOSED';
    photo_uri?: string;
    created_at: string;
}

export interface Incident {
    id: string; // Added ID for resolution
    text: string;
    timestamp: string;
    user: string;
    photoUri?: string;
    targetRole: IncidentRole;
    status: IncidentStatus;
    submittingGroup?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    category: 'MAINTENANCE' | 'GUEST_REQ' | 'SUPPLY' | 'PREVENTIVE';
}

export interface Staff {
    id: number;
    username: string;
    name: string;
    role: UserRole;
    groupId?: string;
}

export interface InventoryItem {
    id: number;
    name: string;
    quantity: number;
    category: 'LINEN' | 'TOILETRIES' | 'Cleaning_Supplies' | 'OTHER';
    min_stock?: number;
    last_updated: string;
}

export interface Asset {
    id: number;
    room: number;
    name: string;
    serial_number?: string;
    install_date?: string;
    status: 'GOOD' | 'REPAIR' | 'BROKEN';
    room_number?: string;
}

export interface AssetData {
    room: string;
    name: string;
    serial_number?: string;
    room_number?: string;
}

export interface StaffData {
    username: string;
    first_name?: string;
    last_name?: string;
    role: UserRole;
    group_id?: string;
    password?: string;
    email?: string;
}

export interface InventoryItemData {
    name: string;
    quantity: number;
    category: 'LINEN' | 'TOILETRIES' | 'Cleaning_Supplies' | 'OTHER';
    min_stock?: number;
}

export type CleaningType = 'DEPARTURE' | 'PREARRIVAL' | 'WEEKLY' | 'HOLDOVER' | 'RUBBISH' | 'DAYUSE';

export type GuestStatus = 'IN_ROOM' | 'OUT' | 'GUEST_IN_ROOM' | 'GUEST_OUT' | 'NO_GUEST' | 'DND';

export interface Room {
    id: string;
    number: string;
    floor: number;
    status: RoomStatus;
    type: 'Single' | 'Double' | 'Suite';
    cleaningType: CleaningType;
    guestStatus: GuestStatus;
    checkoutTime?: string;
    nextCheckInTime?: string;
    notes: string;
    incidents: Incident[];
    isDND: boolean;
    extraTime: boolean;
    lastUpdated: string;
    receptionPriority?: number; // 1 (Highest) - 5 (Lowest)
    configuration: {
        bedrooms: number;
        beds: string;
        extras: string[];
    };
    keysFound?: boolean; // New field for Phase 9
    assignedGroup?: string; // Team Group (e.g., "Group 1", "Group 2")
    maintenanceReason?: string; // Phase 20: Reason for maintenance status

    // Phase 18 Guest Info
    guestDetails?: {
        currentGuest?: string;
        checkOutDate?: string;
        checkInDate?: string;
        nextArrival?: string;
        next_arrival_time?: string;
        nextGuest?: string; // Added for RoomDetailScreen
    };
    // Assignment
    assigned_cleaner?: number;
    assigned_cleaner_name?: string;
    supplies_used?: Record<string, number>;
    isGuestWaiting?: boolean; // Added for RoomDetailScreen
    cleaningStartedAt?: string; // Shared Timer from Server

    // Frontend helper
    isDraft?: boolean;
    lastDndTimestamp?: string;
    lastInspectionReport?: any;
    isHousemanCompleted?: boolean;
}

export interface HotelSettings {

    timeEstimates: Record<CleaningType, number>;
    themeColor: 'BLUE' | 'ORANGE' | 'GREEN';
}

export interface Session {
    id: string | null;
    startTime: string | null;
    endTime: string | null;
    isActive: boolean;
    totalMinutes: number;
}

export const INCIDENT_PRESETS = [
    "Broken Light", "Leaking Tap", "Stained Sheets",
    "Missing Towels", "TV Not Working", "Dirty Carpet",
    "Bad Smell", "Window Stuck"
];

export interface LogEntry {
    id: string;
    timestamp: string;
    message: string;
    type: 'STATUS' | 'INCIDENT' | 'DND' | 'EXTRA_TIME' | 'NOTE';
    roomId?: string;
}

// Duplicate LostItem removed

export interface Announcement {
    id: string;
    title: string;
    message: string;
    priority: 'NORMAL' | 'HIGH';
    sender: string;
    timestamp: string;
}

export interface AnalyticsData {
    totalRooms: number;
    cleanedToday: number;
    issuesOpen: number;
    lostItemsFound: number;
}

interface HotelContextType {
    rooms: Room[];
    logs: LogEntry[];
    settings: HotelSettings;
    session: Session;
    startSession: (groupId: string) => Promise<void>;
    completeSession: () => Promise<void>;
    checkSession: () => Promise<void>;
    updateSettings: (newSettings: HotelSettings) => void;
    updateRoomStatus: (id: string, status: RoomStatus) => void;
    toggleDND: (id: string) => void;
    toggleExtraTime: (id: string) => void;
    setPriority: (id: string, isPriority: boolean) => void; // Phase 22
    updateNotes: (id: string, notes: string) => void;
    updateGuestStatus: (id: string, status: GuestStatus, keysFound?: boolean) => void;
    startMaintenance: (id: string, reason: string) => void; // Phase 20
    resolveIncident: (roomId: string, incidentId: string) => void;
    updateRoomDetails: (id: string, updates: Partial<Room>) => Promise<void>;
    toggleGuestInRoom: (id: string, inRoom: boolean) => Promise<void>;
    toggleGuestWaiting: (id: string, waiting: boolean) => Promise<void>; // New
    addIncident: (id: string, text: string, reporter: string, targetRole: IncidentRole, group?: string, photoUri?: string, category?: Incident['category']) => void;
    getStats: () => { pending: number; inProgress: number; inspection: number; completed: number };
    exportData: () => object;

    // Phase 23: Management
    staff: Staff[];
    fetchStaff: () => Promise<void>;
    updateStaffGroup: (userId: number, groupId: string) => Promise<void>;
    createRoom: (roomData: Partial<Room>) => Promise<void>;
    assignRoomToGroup: (roomId: string, groupId: string) => Promise<void>;

    // Phase 26: Cross-Team
    systemIncidents: Incident[];
    addSystemIncident: (text: string, targetRole: IncidentRole) => Promise<void>;
    fetchSystemIncidents: () => Promise<Incident[]>;
    fetchRooms: () => Promise<void>;
    deleteRoom: (id: string) => Promise<void>;
    deleteStaff: (id: number) => Promise<void>;
    deleteGroup: (groupName: string) => Promise<void>;

    // Staff Management
    addStaff: (userData: StaffData) => Promise<void>;
    updateStaff: (id: number, userData: Partial<StaffData>) => Promise<void>;

    // Inventory Management
    inventory: InventoryItem[];
    fetchInventory: () => Promise<void>;
    addInventoryItem: (itemData: InventoryItemData) => Promise<void>;
    deleteInventoryItem: (id: number) => Promise<void>;
    updateInventoryQuantity: (id: number, quantity: number) => Promise<void>;

    // Phase 27: Admin Cleaning Types
    cleaningTypes: CleaningTypeDefinition[];
    fetchCleaningTypes: () => Promise<void>;
    addCleaningType: (name: string, minutes: number) => Promise<void>;
    deleteCleaningType: (id: number) => Promise<void>;

    // Room Move
    moveGuest: (fromRoomId: string, toRoomId: string, updateConfig?: boolean) => Promise<void>;
    assignRoomsDaily: () => Promise<void>;
    updateSupplies: (roomId: string, supplies: Record<string, number>) => Promise<void>;

    // Phase 2: Major Enhancements
    lostItems: LostItem[];
    fetchLostItems: () => Promise<void>;
    reportLostItem: (description: string, roomId?: string, photoUri?: string) => Promise<void>;
    updateLostItemStatus: (id: string, status: LostItem['status']) => Promise<void>;

    announcements: Announcement[];
    fetchAnnouncements: () => Promise<void>;
    sendAnnouncement: (title: string, message: string, priority: 'NORMAL' | 'HIGH') => Promise<void>;

    // Assets
    assets: Asset[];
    fetchAssets: (roomId?: string) => Promise<void>;
    addAsset: (assetData: AssetData) => Promise<void>;
    updateAssetStatus: (id: number, status: Asset['status']) => Promise<void>;

    fetchAnalytics: () => Promise<AnalyticsData>;
    submitInspection: (roomId: string, report: any) => Promise<void>;

    // Offline Support
    isOffline: boolean;
    isQueueProcessing: boolean;
    queue: any[];


    // Cleaning Persistence
    roomDrafts: Record<string, { notes: string, incident: string }>;
    startCleaning: (roomId: string) => Promise<void>;
    stopCleaning: (roomId: string) => Promise<void>;
    saveDraft: (roomId: string, data: { notes: string, incident: string }) => void;
}

export interface CleaningTypeDefinition {
    id: number;
    name: string;
    estimated_minutes: number;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

const TYPES: ('Single' | 'Double' | 'Suite')[] = ['Single', 'Double', 'Suite'];
const CLEANING_TYPES: CleaningType[] = ['DEPARTURE', 'PREARRIVAL', 'WEEKLY', 'HOLDOVER', 'RUBBISH', 'DAYUSE'];
const GUEST_STATUSES: GuestStatus[] = ['GUEST_IN_ROOM', 'GUEST_OUT', 'NO_GUEST', 'DND'];

// MOCK_ROOMS Removed
const MOCK_ROOMS: Room[] = [];

const DEFAULT_SETTINGS: HotelSettings = {
    timeEstimates: {
        DEPARTURE: 30,
        PREARRIVAL: 60,
        WEEKLY: 45,
        HOLDOVER: 10,
        RUBBISH: 5,
        DAYUSE: 15
    },
    themeColor: 'BLUE'
};



export const HotelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]); // Phase 23
    const [systemIncidents, setSystemIncidents] = useState<Incident[]>([]); // Phase 26
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [settings, setSettings] = useState<HotelSettings>(DEFAULT_SETTINGS);
    const [session, setSession] = useState<Session>({ id: null, startTime: null, endTime: null, isActive: false, totalMinutes: 0 });

    // New Feature States
    const [lostItems, setLostItems] = useState<LostItem[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);

    // Offline & Sync
    const [isOffline, setIsOffline] = useState(false);
    const [queue, setQueue] = useState<any[]>([]);
    const [isQueueProcessing, setIsQueueProcessing] = useState(false);


    // Persistence State (Drafts Only - Timer is now Server Synced)
    const [roomDrafts, setRoomDrafts] = useState<Record<string, { notes: string, incident: string }>>({});

    // Load Persistence Data
    useEffect(() => {
        const loadPersistence = async () => {
            try {
                const drafts = await AsyncStorage.getItem('roomDrafts');
                if (drafts) setRoomDrafts(JSON.parse(drafts));
            } catch (e) {
                console.error("Failed to load persistence data", e);
            }
        };
        loadPersistence();
    }, []);

    const startCleaning = async (roomId: string) => {
        // Optimistic Update: Set cleaningStartedAt to NOW
        const now = new Date().toISOString();
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: 'IN_PROGRESS', cleaningStartedAt: now } : r));
        updateRoomStatus(roomId, 'IN_PROGRESS');
    };

    const stopCleaning = async (roomId: string) => {
        // No local timer cleanup needed anymore
        // Status update handled by caller
    };

    const saveDraft = (roomId: string, data: { notes: string, incident: string }) => {
        setRoomDrafts(prev => {
            const next = { ...prev, [roomId]: data };
            AsyncStorage.setItem('roomDrafts', JSON.stringify(next));
            return next;
        });
    };

    // Initial Load & Network Listener
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const offline = !state.isConnected;
            setIsOffline(offline);
            if (!offline) processQueue();
        });
        return () => unsubscribe();
    }, []);

    const processQueue = async () => {
        const storedQueue = await AsyncStorage.getItem('OFFLINE_QUEUE');
        if (!storedQueue) return;

        const actions = JSON.parse(storedQueue);
        if (actions.length === 0) return;

        setIsQueueProcessing(true);
        const remaining = [];

        for (const action of actions) {
            try {
                if (action.type === 'UPDATE_ROOM') {
                    await api.patch(`/housekeeping/rooms/${action.payload.id}/`, action.payload.data);
                } else if (action.type === 'ADD_INCIDENT') {
                    await api.post('/housekeeping/incidents/', action.payload.data);
                }
            } catch (e) {
                console.error("Failed to replay action", action, e);
                remaining.push(action);
            }
        }

        await AsyncStorage.setItem('OFFLINE_QUEUE', JSON.stringify(remaining));
        setQueue(remaining);
        setIsQueueProcessing(false);
        fetchRooms();
    };

    const queueAction = async (type: string, payload: any) => {
        const newAction = { id: Date.now(), type, payload };
        const newQueue = [...queue, newAction];
        setQueue(newQueue);
        await AsyncStorage.setItem('OFFLINE_QUEUE', JSON.stringify(newQueue));
        Alert.alert("Offline", "Action queued. Will sync when online.");
    };

    const checkSession = async () => {
        if (!user?.groupId) return;
        try {
            const res = await api.get(`/housekeeping/cleaning-sessions/current/?group_id=${user.groupId}`);
            if (res.data) { // Active session found
                setSession({
                    id: res.data.id,
                    startTime: res.data.start_time,
                    endTime: null,
                    isActive: true,
                    totalMinutes: res.data.target_duration_minutes
                });
            } else {
                setSession({ id: null, startTime: null, endTime: null, isActive: false, totalMinutes: 0 });
            }
        } catch (e) {
            console.error("Check session failed", e);
        }
    };

    const startSession = async (groupId: string) => {
        try {
            const res = await api.post('/housekeeping/cleaning-sessions/', { group_id: groupId });
            setSession({
                id: res.data.id,
                startTime: res.data.start_time,
                endTime: null,
                isActive: true,
                totalMinutes: res.data.target_duration_minutes
            });
            fetchRooms(); // Refresh rooms to ensure consistent state
        } catch (e) {
            console.error("Start session failed", e);
        }
    };

    const completeSession = async () => {
        if (!session.id) return;
        try {
            await api.patch(`/housekeeping/cleaning-sessions/${session.id}/`, {
                status: 'COMPLETED',
                end_time: new Date().toISOString()
            });
            setSession(prev => ({ ...prev, isActive: false, endTime: new Date().toISOString() }));
        } catch (e) {
            console.error("Complete session failed", e);
        }
    };

    // Fetch rooms from API
    const fetchRooms = async () => {
        try {
            const res = await api.get('/housekeeping/rooms/');

            // Transform
            const transformed = res.data.map((r: any) => ({
                id: r.id.toString(),
                number: r.number,
                status: r.status,
                cleaningType: r.cleaning_type || 'DEPARTURE',
                bedSetup: r.bed_setup || 'Standard',
                priority: r.priority || false,
                isGuestWaiting: r.is_guest_waiting || false,
                lastDnd: r.last_dnd_timestamp,
                incidents: [],
                notes: r.maintenance_reason || '',
                guestDetails: {
                    name: r.current_guest_name,
                    checkOut: r.check_out_date,
                    nextArrival: r.next_arrival_time
                },
                guestStatus: r.guest_status,
                receptionPriority: 0, // Mock
                assignedGroup: r.assigned_group,
                assigned_cleaner: r.assigned_cleaner, // Correctly mapped
                configuration: {
                    beds: r.bed_setup,
                    extras: r.extras_text ? r.extras_text.split(',') : []
                },
                cleaningStartedAt: r.cleaning_started_at,
                lastInspection: r.last_inspection_report,
                isHousemanCompleted: r.is_houseman_completed || false
            }));

            // console.log("FETCH ROOMS SUCCESS. Count:", transformed.length);
            // const r16 = transformed.find((r: any) => r.number === '16');
            // console.log("DEBUG ROOM 16:", JSON.stringify(r16));
            // if (transformed.length > 0) {
            //     console.log("Sample Room 0:", JSON.stringify(transformed[0]));
            // }

            // Fetch incidents (could be optimized)
            try {
                const incidentsRes = await api.get('/housekeeping/incidents/');
                const incidents = incidentsRes.data.map((i: any) => ({
                    id: i.id.toString(),
                    roomId: i.room ? i.room.toString() : null,
                    reporter: i.reported_by_name || 'Unknown',
                    description: i.text,
                    timestamp: i.created_at,
                    priority: i.priority,
                    status: i.status,
                    photoUri: i.photo_uri,
                    type: 'Maintenance',
                    targetRole: i.target_role
                }));

                // Merge Incidents into Rooms
                transformed.forEach((room: any) => {
                    room.incidents = incidents.filter((i: any) => i.roomId === room.id && i.status === 'OPEN');
                });
            } catch (err) {
                console.error("Failed to fetch incidents", err);
            }

            // Persist for Offline View
            storage.saveRooms(transformed);
            setRooms(transformed);
        } catch (e) {
            console.error("Fetch Rooms Failed", e);
            // Load from Storage if error (Offline mode fallback)
            const cached = await storage.getRooms();
            if (cached) setRooms(cached);
        }
    };

    useEffect(() => {
        if (user) {
            storage.getRooms().then(cached => {
                if (cached) setRooms(cached);
                fetchRooms();
            });
            checkSession();

            // Safer optional call
            if (typeof fetchAnnouncements === 'function') fetchAnnouncements();

            const role = user.role || '';
            if (['RECEPTION', 'ADMIN', 'SUPERVISOR'].includes(role)) {
                if (typeof fetchLostItems === 'function') fetchLostItems();
                // Fetch Staff for Team Dashboard
                if (typeof fetchStaff === 'function') fetchStaff();
            }

            // POLLING
            const interval = setInterval(() => {
                fetchRooms();
                checkSession();
                if (typeof fetchAnnouncements === 'function') fetchAnnouncements();
                if (typeof fetchAssets === 'function') fetchAssets();
                const currentRole = user.role || '';
                if (['RECEPTION', 'ADMIN', 'MAINTENANCE'].includes(currentRole)) {
                    if (typeof fetchLostItems === 'function') fetchLostItems();
                }
            }, 10000); // 10s
            return () => clearInterval(interval);
        } else {
            setRooms([]);
        }
    }, [user]);

    const updateSettings = (newSettings: HotelSettings) => {
        setSettings(newSettings);
        addLog('Settings updated', 'NOTE');
    };

    const addLog = (message: string, type: LogEntry['type'], roomId?: string) => {
        setLogs(prev => [{
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            message,
            type,
            roomId
        }, ...prev]);
    };

    const updateRoomStatus = async (id: string, status: RoomStatus) => {
        // Auto-Start Session for Cleaners
        if (status === 'IN_PROGRESS' && !session.isActive && user?.role === 'CLEANER' && user.groupId) {
            startSession(user.groupId);
        }

        // Optimistic Update
        setRooms(prev => prev.map(room =>
            room.id === id ? { ...room, status, lastUpdated: new Date().toISOString() } : room
        ));

        try {
            await api.patch(`/housekeeping/rooms/${id}/`, { status }, {
                headers: { 'X-CSRFToken': 'skipped' }
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`Room updated to ${status}`, 'SUCCESS');

            // Add log
            addLog(`Room ${rooms.find(r => r.id === id)?.number || id} marked as ${status}`, 'STATUS');

        } catch (error) {
            console.error("Failed to update status", error);
            // Revert Optimistic Update
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast("Failed to update status", 'ERROR');
            fetchRooms();
        }
    };

    const addIncident = async (id: string, text: string, reporter: string, targetRole: IncidentRole, group?: string, photoUri?: string, category: Incident['category'] = 'MAINTENANCE') => {
        // Optimistic UI Update
        const mockId = Math.random().toString(36).substr(2, 9);
        const newIncident = {
            id: mockId,
            text,
            timestamp: new Date().toISOString(),
            user: reporter,
            photoUri,
            targetRole,
            status: 'OPEN' as IncidentStatus,
            submittingGroup: group,
            category
        };

        setRooms(prev => prev.map(room => {
            if (room.id === id) {
                return {
                    ...room,
                    incidents: [...room.incidents, newIncident],
                    lastUpdated: new Date().toISOString()
                };
            }
            return room;
        }));

        try {
            await api.post('/housekeeping/incidents/', {
                room: id,
                text,
                priority: 'MEDIUM',
                targetRole: targetRole,
                photoUri: photoUri,
                category: category
            });
            fetchRooms(); // Refresh to get real ID
        } catch (e) {
            console.error("Failed to add incident", e);
            // Revert optimism? Or show error.
        }
    };

    const resolveIncident = async (roomId: string, incidentId: string) => {
        // Optimistic
        setRooms(prev => prev.map(room => {
            if (room.id === roomId) {
                const updatedIncidents = room.incidents.map(inc =>
                    inc.id === incidentId ? { ...inc, status: 'RESOLVED' as IncidentStatus } : inc
                );
                return { ...room, incidents: updatedIncidents };
            }
            return room;
        }));

        try {
            await api.patch(`/housekeeping/incidents/${incidentId}/`, { status: 'RESOLVED' });
        } catch (e) {
            console.error("Failed to resolve incident", e);
            fetchRooms();
        }
    };

    const updateRoomDetails = async (id: string, updates: Partial<Room>) => {
        // Optimistic
        setRooms(prev => prev.map(room => room.id === id ? { ...room, ...updates } : room));

        try {
            // Map frontend keys to backend keys
            const payload: any = {};
            if (updates.cleaningType) payload.cleaning_type = updates.cleaningType;

            // Fix for 400 Error: Backend requires current_guest_name
            const currentRoom = rooms.find(r => r.id === id);
            const guestName = updates.guestDetails?.currentGuest ?? currentRoom?.guestDetails?.currentGuest ?? '';
            payload.current_guest_name = guestName;
            // if (updates.guestDetails?.nextGuest !== undefined) payload.next_guest_name = updates.guestDetails.nextGuest; // Removed as not in type
            if (updates.type) payload.room_type = updates.type; // Map local 'type' to backend 'room_type'

            // New Editable Fields
            if (updates.configuration?.beds) payload.bed_setup = updates.configuration.beds;
            if (updates.configuration?.bedrooms) payload.bedroom_count = updates.configuration.bedrooms;
            if (updates.guestDetails?.checkInDate) payload.check_in_date = updates.guestDetails.checkInDate;
            if (updates.guestDetails?.checkOutDate) payload.check_out_date = updates.guestDetails.checkOutDate;
            if (updates.guestDetails?.nextArrival) payload.next_arrival_time = updates.guestDetails.nextArrival;
            if (updates.isHousemanCompleted !== undefined) payload.is_houseman_completed = updates.isHousemanCompleted;

            await api.patch(`/housekeeping/rooms/${id}/`, payload);
            addLog(`Room details updated for ${id}`, 'NOTE');
            fetchRooms(); // Refresh to ensure sync
        } catch (e: any) {
            console.error("Failed to update room details", e);
            Alert.alert("Error", e.response?.data ? JSON.stringify(e.response.data) : "Failed to update details");
            fetchRooms(); // Revert
        }
    };

    const updateSupplies = async (roomId: string, supplies: Record<string, number>) => {
        // Optimistic
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, supplies_used: supplies } : r));
        try {
            await api.patch(`/housekeeping/rooms/${roomId}/`, { supplies_used: supplies });
        } catch (error) {
            console.error(error);
            fetchRooms(); // Revert
        }
    };

    const toggleGuestInRoom = async (id: string, inRoom: boolean) => {
        // Optimistic
        setRooms(prev => prev.map(room => {
            if (room.id === id) {
                return { ...room, guestStatus: inRoom ? 'GUEST_IN_ROOM' : 'GUEST_OUT' };
            }
            return room;
        }));

        try {
            await api.patch(`/housekeeping/rooms/${id}/`, {
                guest_status: inRoom ? 'GUEST_IN_ROOM' : 'GUEST_OUT'
            });
        } catch (e) {
            console.error(e);
            fetchRooms(); // Revert
        }
    };

    const toggleGuestWaiting = async (id: string, waiting: boolean) => {
        // Optimistic
        setRooms(prev => prev.map(room => {
            if (room.id === id) {
                return { ...room, isGuestWaiting: waiting, lastUpdated: new Date().toISOString() };
            }
            return room;
        }));

        try {
            await api.patch(`/housekeeping/rooms/${id}/`, {
                is_guest_waiting: waiting
            });
            // The original instruction provided a log message that was not syntactically correct for this context.
            // Assuming the intent was to pass the roomId to the existing log message.
            addLog(`Room ${id} Guest Waiting: ${waiting}`, 'STATUS', id);
        } catch (e) {
            console.error(e);
            fetchRooms(); // Revert
        }
    };

    const toggleDND = (id: string) => {
        setRooms(prev => prev.map(room => {
            if (room.id === id) {
                const newDndState = !room.isDND;
                addLog(`Room ${room.number} DND ${newDndState ? 'enabled' : 'disabled'}`, 'DND', id);
                return {
                    ...room,
                    isDND: newDndState,
                    lastDndTimestamp: newDndState ? new Date().toISOString() : room.lastDndTimestamp,
                    lastUpdated: new Date().toISOString()
                };
            }
            return room;
        }));

        try {
            const room = rooms.find(r => r.id === id);
            if (room) {
                const newDnd = !room.isDND;
                const payload: any = { guest_status: newDnd ? 'DND' : 'NO_GUEST' };
                if (newDnd) payload.last_dnd_timestamp = new Date().toISOString();
                api.patch(`/housekeeping/rooms/${id}/`, payload);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleExtraTime = (id: string) => {
        setRooms(prev => prev.map(room => {
            if (room.id === id) {
                addLog(`Room ${room.number} Extra Time ${!room.extraTime ? 'requested' : 'cancelled'}`, 'EXTRA_TIME');
                return { ...room, extraTime: !room.extraTime, lastUpdated: new Date().toISOString() };
            }
            return room;
        }));
    };

    const updateNotes = (id: string, notes: string) => {
        setRooms(prev => prev.map(room => {
            if (room.id === id) {
                addLog(`Notes updated for Room ${room.number}`, 'NOTE');
                return { ...room, notes, lastUpdated: new Date().toISOString() };
            }
            return room;
        }));
    };

    const updateGuestStatus = async (id: string, status: GuestStatus, keysFound?: boolean) => {
        // Optimistic Update
        setRooms(prev => prev.map(room => {
            if (room.id === id) {
                const keysMsg = keysFound !== undefined ? ` (Keys Found: ${keysFound})` : '';
                addLog(`Guest Status updated for Room ${room.number}: ${status}${keysMsg}`, 'STATUS');
                return {
                    ...room,
                    guestStatus: status,
                    keysFound: keysFound,
                    lastUpdated: new Date().toISOString()
                };
            }
            return room;
        }));

        try {
            const payload: any = { guest_status: status };
            if (keysFound !== undefined) payload.keys_found = keysFound;

            await api.patch(`/housekeeping/rooms/${id}/`, payload);
        } catch (e) {
            console.error("Failed to update guest status", e);
            fetchRooms(); // Revert on failure
        }
    };

    const setPriority = async (id: string, isPriority: boolean) => {
        setRooms(prev => prev.map(room =>
            room.id === id ? { ...room, receptionPriority: isPriority ? 1 : undefined, lastUpdated: new Date().toISOString() } : room
        ));

        try {
            await api.patch(`/housekeeping/rooms/${id}/`, { priority: isPriority });
            addLog(`Room Prioirty Set: ${isPriority}`, 'STATUS');
        } catch (e) {
            console.error("Failed to set priority", e);
            fetchRooms();
        }
    };

    const startMaintenance = async (id: string, reason: string) => {
        // Optimistic
        setRooms(prev => prev.map(room =>
            room.id === id ? { ...room, status: 'MAINTENANCE', maintenanceReason: reason, lastUpdated: new Date().toISOString() } : room
        ));

        try {
            await api.patch(`/housekeeping/rooms/${id}/`, { status: 'MAINTENANCE', maintenance_reason: reason });
            addLog(`Room maintenance started: ${reason}`, 'STATUS');
        } catch (e) {
            console.error("Failed to start maintenance", e);
            fetchRooms();
        }
    };

    // Phase 23: Staff Management
    const fetchStaff = async () => {
        try {
            const response = await api.get('/users/');
            const mappedStaff = response.data.map((u: any) => ({
                id: u.id,
                username: u.username,
                name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
                role: u.role,
                groupId: u.group_id
            }));
            setStaff(mappedStaff);
        } catch (e) {
            console.error("Failed to fetch staff", e);
        }
    };

    const updateStaffGroup = async (userId: number, groupId: string) => {
        try {
            await api.patch(`/users/${userId}/`, { group_id: groupId });
            setStaff(prev => prev.map(u => u.id === userId ? { ...u, groupId } : u));
            addLog(`Staff member updated to Group ${groupId}`, 'NOTE');
        } catch (e) {
            console.error("Failed to update staff group", e);
            Alert.alert("Error", "Could not update staff group");
        }
    };

    const createRoom = async (roomData: Partial<Room>) => {
        try {
            await api.post('/housekeeping/rooms/', {
                number: roomData.number,
                floor: roomData.floor || 1, // Add floor
                room_type: roomData.type,
                cleaning_type: roomData.cleaningType || 'DEPARTURE',
                bed_setup: roomData.configuration?.beds || '1 King', // Default
                bedroom_count: roomData.configuration?.bedrooms || 1, // Default
                status: 'PENDING'
            });
            fetchRooms();
            addLog(`Room ${roomData.number} created`, 'NOTE');
        } catch (e) {
            console.error("Failed to create room", e);
            Alert.alert("Error", "Could not create room. Ensure number is unique.");
        }
    };

    const moveGuest = async (fromRoomId: string, toRoomId: string) => {
        const fromRoom = rooms.find(r => r.id === fromRoomId);
        const toRoom = rooms.find(r => r.id === toRoomId);

        if (!fromRoom || !toRoom) {
            Alert.alert("Error", "Invalid rooms selected");
            return;
        }

        if (!fromRoom.guestDetails?.currentGuest) {
            Alert.alert("Error", "Source room has no guest");
            return;
        }

        const guestData = { ...fromRoom.guestDetails };

        // Optimistic Update
        setRooms(prev => prev.map(r => {
            if (r.id === fromRoomId) {
                return {
                    ...r,
                    status: 'PENDING', // Dirty/Departure
                    cleaningType: 'DEPARTURE',
                    guestStatus: 'OUT',
                    guestDetails: { ...r.guestDetails, currentGuest: undefined, checkOut: new Date().toISOString().split('T')[0] },
                    lastUpdated: new Date().toISOString()
                };
            }
            if (r.id === toRoomId) {
                return {
                    ...r,
                    status: 'IN_PROGRESS', // Or Occupied? GUEST_IN_ROOM isn't a status, it's guestStatus. Status usually CLEAN/DIRTY.
                    // Wait, RoomStatus = 'PENDING' | 'IN_PROGRESS' | 'INSPECTION' | 'COMPLETED' | 'MAINTENANCE'
                    // Occupied room usually has status 'COMPLETED' (Clean) but guestStatus 'GUEST_IN_ROOM'.
                    // Or if we want to mark it as Clean, keep it COMPLETED.
                    guestStatus: 'GUEST_IN_ROOM',
                    guestDetails: { ...guestData },
                    lastUpdated: new Date().toISOString()
                };
            }
            return r;
        }));

        try {
            // 1. Clear From Room
            await api.patch(`/housekeeping/rooms/${fromRoomId}/`, {
                cleaning_type: 'DEPARTURE',
                status: 'PENDING',
                guest_status: 'OUT',
                current_guest_name: '', // Backend handles clearing?
                check_out_date: new Date().toISOString().split('T')[0]
            });

            // 2. Set To Room
            await api.patch(`/housekeeping/rooms/${toRoomId}/`, {
                guest_status: 'GUEST_IN_ROOM',
                current_guest_name: guestData.currentGuest,
                check_in_date: guestData.checkInDate,
                check_out_date: guestData.checkOutDate,
                next_arrival_time: guestData.nextArrival
            });

            addLog(`Moved guest from ${fromRoom.number} to ${toRoom.number}`, 'STATUS');
            showToast(`Moved guest to Room ${toRoom.number}`, 'SUCCESS');
            fetchRooms(); // Sync
        } catch (e) {
            console.error("Move Guest Failed", e);
            Alert.alert("Error", "Failed to move guest");
            fetchRooms(); // Revert
        }
    };

    const assignRoomToGroup = async (roomId: string, groupId: string) => {
        try {
            await api.patch(`/housekeeping/rooms/${roomId}/`, { assigned_group: groupId });
            setRooms(prev => prev.map(r => r.id === roomId ? { ...r, assignedGroup: groupId } : r));
            addLog(`Room assigned to Group ${groupId || 'None'}`, 'NOTE');
        } catch (e) {
            console.error("Failed to assign room group", e);
            Alert.alert("Error", "Could not assign group.");
        }
    };

    const deleteRoom = async (id: string) => {
        try {
            await api.delete(`/housekeeping/rooms/${id}/`);
            setRooms(prev => prev.filter(r => r.id !== id));
            addLog(`Room deleted`, 'NOTE');
        } catch (e) {
            console.error("Failed to delete room", e);
            Alert.alert("Error", "Could not delete room.");
        }
    };

    const deleteStaff = async (id: number) => {
        try {
            await api.delete(`/users/${id}/`);
            setStaff(prev => prev.filter(u => u.id !== id));
            addLog(`Staff member deleted`, 'NOTE');
        } catch (e) {
            console.error("Failed to delete staff", e);
            Alert.alert("Error", "Could not delete staff.");
        }
    };

    // Phase 26: Cross-Team
    const fetchSystemIncidents = async () => {
        try {
            const response = await api.get('/housekeeping/incidents/');
            // Filter for incidents with no room (System Level)
            const sysIncidents = response.data
                .filter((i: any) => !i.room)
                .map((i: any) => ({
                    id: i.id.toString(),
                    text: i.text,
                    timestamp: i.timestamp,
                    user: i.user,
                    targetRole: i.targetRole,
                    status: i.status
                }));
            setSystemIncidents(sysIncidents);
            return sysIncidents;
        } catch (e) {
            console.error("Failed to fetch system incidents", e);
            return [];
        }
    };

    const addSystemIncident = async (text: string, targetRole: IncidentRole) => {
        try {
            await api.post('/housekeeping/incidents/', {
                text,
                target_role: targetRole,
                room: null
            });
            fetchSystemIncidents();
            // Also refresh rooms in case it affects anything (not really needed but safe)
        } catch (e) {
            console.error("Failed to add system incident", e);
            Alert.alert("Error", "Could not submit help offer.");
        }
    };

    const deleteGroup = async (groupName: string) => {
        try {
            // Unassign Staff
            const staffInGroup = staff.filter(s => s.groupId === groupName);
            for (const s of staffInGroup) {
                await updateStaffGroup(s.id, '');
            }

            // Unassign Rooms
            const roomsInGroup = rooms.filter(r => r.assignedGroup === groupName);
            for (const r of roomsInGroup) {
                await assignRoomToGroup(r.id, '');
            }

            addLog(`Group "${groupName}" deleted`, 'NOTE');
        } catch (e) {
            console.error("Failed to delete group", e);
            Alert.alert("Error", `Could not delete group ${groupName}`);
        }
    };

    // --- Staff Management ---
    const addStaff = async (userData: any) => {
        try {
            await api.post('/users/', userData);
            fetchStaff();
            addLog(`Created user ${userData.username}`, 'NOTE');
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to create user");
        }
    };

    const updateStaff = async (id: number, userData: any) => {
        try {
            await api.patch(`/users/${id}/`, userData);
            fetchStaff();
            addLog(`Updated user ${id}`, 'NOTE');
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to update user");
        }
    };

    // --- Inventory Management ---
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

    const fetchInventory = async () => {
        try {
            const res = await api.get('/housekeeping/inventory/');
            setInventory(res.data);
        } catch (e) {
            console.error("Failed to fetch inventory", e);
        }
    };

    const addInventoryItem = async (itemData: any) => {
        try {
            await api.post('/housekeeping/inventory/', itemData);
            fetchInventory();
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to add inventory");
        }
    };

    const deleteInventoryItem = async (id: number) => {
        try {
            await api.delete(`/housekeeping/inventory/${id}/`);
            fetchInventory();
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to delete item");
        }
    };

    const updateInventoryQuantity = async (id: number, quantity: number) => {
        try {
            await api.patch(`/housekeeping/inventory/${id}/`, { quantity });
            fetchInventory();
        } catch (e) {
            console.error(e);
        }
    };

    // --- Cleaning Types Management ---
    const [cleaningTypes, setCleaningTypes] = useState<CleaningTypeDefinition[]>([]);

    const fetchCleaningTypes = async () => {
        try {
            const res = await api.get('/housekeeping/cleaning-types/');
            setCleaningTypes(res.data);

            // Sync with settings for compatibility
            const newEstimates: any = {};
            res.data.forEach((ct: CleaningTypeDefinition) => {
                newEstimates[ct.name] = ct.estimated_minutes;
            });
            // Update settings silently or just use a derived value? 
            // For now, let's update proper settings state if it exists, or better yet, rely on cleaningTypes directly in components?
            // Existing components use settings.timeEstimates. Let's patch it.
            setSettings(prev => ({
                ...prev,
                timeEstimates: { ...prev.timeEstimates, ...newEstimates }
            }));

        } catch (e) {
            console.error("Failed to fetch cleaning types", e);
        }
    };

    const addCleaningType = async (name: string, minutes: number) => {
        try {
            await api.post('/housekeeping/cleaning-types/', { name, estimated_minutes: minutes });
            fetchCleaningTypes();
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to add cleaning type");
        }
    };

    const deleteCleaningType = async (id: number) => {
        try {
            await api.delete(`/housekeeping/cleaning-types/${id}/`);
            fetchCleaningTypes();
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to delete cleaning type");
        }
    };

    useEffect(() => {
        if (session.isActive) {
            fetchCleaningTypes();
        }
    }, [session.isActive]);

    const fetchLostItems = async () => {
        try {
            const res = await api.get('/housekeeping/lost-items/');
            setLostItems(res.data.map((i: any) => ({
                id: i.id.toString(),
                description: i.description,
                room: i.room ? i.room.toString() : undefined,
                foundBy: i.found_by_name || 'Unknown',
                status: i.status,
                photoUri: i.photo_uri,
                timestamp: i.created_at
            })));
        } catch (e) { console.error("Fetch lost items failed", e); }
    };

    const reportLostItem = async (description: string, roomId?: string, photoUri?: string) => {
        try {
            await api.post('/housekeeping/lost-items/', { description, room: roomId, photo_uri: photoUri });
            Alert.alert("Success", "Lost item reported");
            fetchLostItems();
        } catch (e) { console.error(e); Alert.alert("Error", "Failed to report item"); }
    };

    const updateLostItemStatus = async (id: string, status: LostItem['status']) => {
        try {
            await api.patch(`/housekeeping/lost-items/${id}/`, { status });
            fetchLostItems();
        } catch (e) { console.error(e); }
    };

    const fetchAnnouncements = async () => {
        try {
            const res = await api.get('/housekeeping/announcements/');
            setAnnouncements(res.data.map((a: any) => ({
                id: a.id.toString(),
                title: a.title,
                message: a.message,
                priority: a.priority,
                sender: a.sender_name || 'System',
                timestamp: a.created_at
            })));
        } catch (e) { console.error("Fetch announcements failed", e); }
    };

    const sendAnnouncement = async (title: string, message: string, priority: 'NORMAL' | 'HIGH') => {
        try {
            await api.post('/housekeeping/announcements/', { title, message, priority });
            fetchAnnouncements();
        } catch (e) { console.error(e); }
    };

    const fetchAssets = async (roomId?: string) => {
        try {
            const url = roomId ? `/housekeeping/assets/?room=${roomId}` : '/housekeeping/assets/';
            const res = await api.get(url);
            setAssets(res.data);
        } catch (e) { console.error("Fetch assets failed", e); }
    };

    const addAsset = async (assetData: any) => {
        try {
            await api.post('/housekeeping/assets/', assetData);
            Alert.alert("Success", "Asset added");
            fetchAssets(assetData.room);
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to add asset");
        }
    };

    const assignRoomsDaily = async () => {
        try {
            const response = await api.post('/housekeeping/assign-rooms/assign_daily/');
            await fetchRooms();
            showToast(response.data.message || "Rooms distributed successfully", "SUCCESS");
        } catch (e: any) {
            console.error(e);
            const msg = e.response?.data?.error || "Failed to assign rooms";
            Alert.alert("Assignment Failed", msg);
        }
    };

    const updateAssetStatus = async (id: number, status: Asset['status']) => {
        try {
            await api.patch(`/housekeeping/assets/${id}/`, { status });
            setAssets(prev => prev.map(a => a.id === id ? { ...a, status } : a));
        } catch (e) { console.error(e); fetchAssets(); }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/housekeeping/stats/dashboard/');
            return {

                totalRooms: res.data.total_rooms,
                cleanedToday: res.data.cleaned_today,
                issuesOpen: res.data.issues_open,
                lostItemsFound: res.data.lost_items_found,
                statusDistribution: res.data.status_distribution,
                incidentDistribution: res.data.incident_distribution,
                weeklyActivity: res.data.weekly_activity
            };
        } catch (e) {
            console.error(e);
            return { totalRooms: 0, cleanedToday: 0, issuesOpen: 0, lostItemsFound: 0, statusDistribution: {}, incidentDistribution: {}, weeklyActivity: { labels: [], data: [] } };
        }
    };

    const submitInspection = async (roomId: string, report: any) => {
        // Optimistic Update
        setRooms(prev => prev.map(room =>
            room.id === roomId ? { ...room, status: 'COMPLETED', lastInspectionReport: report, lastUpdated: new Date().toISOString() } : room
        ));

        if (isOffline) {
            queueAction('UPDATE_ROOM', {
                id: roomId,
                data: { status: 'COMPLETED', last_inspection_report: report }
            });
            addLog(`Inspection completed (Offline) for Room ${roomId}`, 'STATUS');
            return;
        }

        try {
            await api.patch(`/housekeeping/rooms/${roomId}/`, {
                status: 'COMPLETED',
                last_inspection_report: report
            });
            fetchRooms();
            addLog(`Inspection completed for Room ${roomId}`, 'STATUS');
        } catch (e) {
            console.error(e);
            // Only alert if we failed and we are NOT offline (though that case is handled above)
            // If API fails for other reasons, we might want to revert logic, but for now we keep it simple
            Alert.alert("Error", "Failed to submit inspection");
            fetchRooms(); // Cloud sync to revert if needed
        }
    };

    const getStats = () => {
        return {
            pending: rooms.filter(r => r.status === 'PENDING').length,
            inProgress: rooms.filter(r => r.status === 'IN_PROGRESS').length,
            inspection: rooms.filter(r => r.status === 'INSPECTION').length,
            completed: rooms.filter(r => r.status === 'COMPLETED').length,
        };
    };

    const exportData = () => {
        return {
            date: new Date().toISOString(),
            totalRooms: rooms.length,
            stats: getStats(),
            rooms: rooms,
            logs: logs
        }
    }

    return (
        <HotelContext.Provider value={{
            rooms, logs, settings, session,
            startSession, completeSession, checkSession,
            updateSettings, updateRoomStatus, addIncident, resolveIncident,
            updateRoomDetails, toggleGuestInRoom, toggleGuestWaiting,
            toggleDND, toggleExtraTime, setPriority, updateNotes, updateGuestStatus,
            startMaintenance, getStats, exportData,
            staff, fetchStaff, updateStaffGroup, createRoom, assignRoomToGroup,
            systemIncidents, addSystemIncident, fetchSystemIncidents, fetchRooms, deleteRoom, deleteStaff, deleteGroup,
            addStaff, updateStaff,
            inventory, fetchInventory, addInventoryItem, deleteInventoryItem, updateInventoryQuantity,
            cleaningTypes, fetchCleaningTypes, addCleaningType, deleteCleaningType, moveGuest,
            assignRoomsDaily, updateSupplies,

            // Phase 2
            lostItems, fetchLostItems, reportLostItem, updateLostItemStatus,
            announcements, fetchAnnouncements, sendAnnouncement,
            assets, fetchAssets, addAsset, updateAssetStatus,
            fetchAnalytics,

            submitInspection,
            // Persistence Expose
            roomDrafts,
            startCleaning,
            stopCleaning,
            saveDraft,
            isOffline,
            isQueueProcessing,
            queue
        }}>
            {children}
        </HotelContext.Provider>
    );
}

export const useHotel = () => {
    const context = useContext(HotelContext);
    if (!context) throw new Error("useHotel must be used within a HotelProvider");
    return context;
};

