import React, { createContext, useState, useContext, useEffect } from 'react';
import { UserRole, useAuth } from './AuthContext';
import { Alert } from 'react-native';

export type RoomStatus = 'PENDING' | 'IN_PROGRESS' | 'INSPECTION' | 'COMPLETED' | 'MAINTENANCE';

export type IncidentRole = 'MAINTENANCE' | 'RECEPTION' | 'SUPERVISOR' | 'HOUSEMAN';
export type IncidentStatus = 'OPEN' | 'RESOLVED';

export interface Incident {
    id: string; // Added ID for resolution
    text: string;
    timestamp: string;
    user: string;
    photoUri?: string;
    targetRole: IncidentRole;
    status: IncidentStatus;
    submittingGroup?: string; // Group that reported the incident
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

export type CleaningType = 'DEPARTURE' | 'STAYOVER' | 'WEEKLY' | 'DAYUSE' | 'HOLDOVER' | 'PREARRIVAL' | 'RUBBISH';

export type GuestStatus = 'IN_ROOM' | 'OUT';

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
        nextGuest?: string;
        nextArrival?: string;
    };
}

export interface HotelSettings {
    timeEstimates: Record<CleaningType, number>;
}

export interface Session {
    startTime: string | null;
    endTime: string | null;
    isActive: boolean;
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
}

interface HotelContextType {
    rooms: Room[];
    logs: LogEntry[];
    settings: HotelSettings;
    session: Session;
    updateSettings: (newSettings: HotelSettings) => void;
    updateRoomStatus: (id: string, status: RoomStatus) => void;
    toggleDND: (id: string) => void;
    toggleExtraTime: (id: string) => void;
    setPriority: (id: string, isPriority: boolean) => void; // Phase 22
    updateNotes: (id: string, notes: string) => void;
    updateGuestStatus: (id: string, status: GuestStatus, keysFound?: boolean) => void;
    startMaintenance: (id: string, reason: string) => void; // Phase 20
    resolveIncident: (roomId: string, incidentId: string) => void;
    addIncident: (id: string, text: string, reporter: string, targetRole: IncidentRole, group?: string, photoUri?: string) => void;
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
    addStaff: (userData: any) => Promise<void>;
    updateStaff: (id: number, userData: any) => Promise<void>;

    // Inventory Management
    inventory: InventoryItem[];
    fetchInventory: () => Promise<void>;
    addInventoryItem: (itemData: any) => Promise<void>;
    deleteInventoryItem: (id: number) => Promise<void>;
    updateInventoryQuantity: (id: number, quantity: number) => Promise<void>;

    // Phase 27: Admin Cleaning Types
    cleaningTypes: CleaningTypeDefinition[];
    fetchCleaningTypes: () => Promise<void>;
    addCleaningType: (name: string, minutes: number) => Promise<void>;
    deleteCleaningType: (id: number) => Promise<void>;
}

export interface CleaningTypeDefinition {
    id: number;
    name: string;
    estimated_minutes: number;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

const TYPES: ('Single' | 'Double' | 'Suite')[] = ['Single', 'Double', 'Suite'];
const CLEANING_TYPES: CleaningType[] = ['DEPARTURE', 'STAYOVER', 'WEEKLY', 'PREARRIVAL', 'RUBBISH']; // Commonly used in mock
const GUEST_STATUSES: GuestStatus[] = ['IN_ROOM', 'OUT'];

// MOCK_ROOMS Removed
const MOCK_ROOMS: Room[] = [];

const DEFAULT_SETTINGS: HotelSettings = {
    timeEstimates: {
        DEPARTURE: 30,
        STAYOVER: 20,
        WEEKLY: 45,
        DAYUSE: 15,
        HOLDOVER: 10,
        PREARRIVAL: 60,
        RUBBISH: 5
    }
};

import api from '../services/api';

export const HotelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [staff, setStaff] = useState<Staff[]>([]); // Phase 23
    const [systemIncidents, setSystemIncidents] = useState<Incident[]>([]); // Phase 26
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [settings, setSettings] = useState<HotelSettings>(DEFAULT_SETTINGS);
    const [session, setSession] = useState<Session>({ startTime: null, endTime: null, isActive: false });
    const { user } = useAuth();

    // Fetch rooms from API
    const fetchRooms = async () => {
        try {
            const response = await api.get('/housekeeping/rooms/');
            // Transform API data to Room interface if necessary
            // For now assuming direct match except mapping snake_case from DB to camelCase for TS
            const apiRooms = response.data.map((r: any) => ({
                id: r.id.toString(),
                number: r.number,
                floor: Math.floor(parseInt(r.number) / 100), // Simple helper
                status: r.status,
                type: r.room_type || 'Single', // Handle fallback
                cleaningType: r.cleaning_type || 'DEPARTURE',
                guestStatus: r.guest_status || 'NO_GUEST',
                notes: '', // Backend might need notes field
                // Map Incidents
                incidents: r.incidents ? r.incidents.map((i: any) => ({
                    id: i.id.toString(),
                    text: i.text,
                    timestamp: i.timestamp,
                    user: i.user,
                    photoUri: i.photoUri,
                    targetRole: i.targetRole,
                    status: i.status,
                    submittingGroup: '' // Not yet in backend serializer
                })) : [],
                isDND: r.guest_status === 'DND',
                extraTime: false,
                lastUpdated: new Date().toISOString(),
                configuration: {
                    bedrooms: r.bedroom_count || 1,
                    beds: r.bed_setup || '1 King',
                    extras: r.extras_text ? r.extras_text.split(',').map((s: string) => s.trim()) : []
                },
                assignedGroup: r.assigned_group,
                maintenanceReason: r.maintenance_reason, // Map new field
                receptionPriority: r.priority ? 1 : undefined,

                // Map Guest Details
                guestDetails: {
                    currentGuest: r.current_guest_name,
                    checkOutDate: r.check_out_date,
                    checkInDate: r.check_in_date,
                    nextGuest: r.next_guest_name,
                    nextArrival: r.next_arrival_time
                }
            }));
            setRooms(apiRooms);
        } catch (error) {
            console.error("Failed to fetch rooms:", error);
            // Fallback to empty or handled error
        }
    };

    useEffect(() => {
        if (user) {
            fetchRooms();
            const interval = setInterval(fetchRooms, 10000); // Polling for updates
            return () => clearInterval(interval);
        } else {
            setRooms([]); // Clear rooms on logout
        }
    }, [user]);

    const updateSettings = (newSettings: HotelSettings) => {
        setSettings(newSettings);
        addLog('Settings updated', 'NOTE');
    };

    const addLog = (message: string, type: LogEntry['type']) => {
        setLogs(prev => [{
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            message,
            type
        }, ...prev]);
    };

    const updateRoomStatus = async (id: string, status: RoomStatus) => {
        // Optimistic Update
        setRooms(prev => prev.map(room =>
            room.id === id ? { ...room, status, lastUpdated: new Date().toISOString() } : room
        ));

        try {
            await api.patch(`/housekeeping/rooms/${id}/`, { status });
            addLog(`Room status updated to ${status}`, 'STATUS');
        } catch (e) {
            console.error("Failed to update status", e);
            fetchRooms(); // Revert on error
        }
    };

    const addIncident = async (id: string, text: string, reporter: string, targetRole: IncidentRole, group?: string, photoUri?: string) => {
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
            submittingGroup: group
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
                photoUri: photoUri
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

    const toggleDND = (id: string) => {
        setRooms(prev => prev.map(room => {
            if (room.id === id) {
                addLog(`Room ${room.number} DND ${!room.isDND ? 'enabled' : 'disabled'}`, 'DND');
                return { ...room, isDND: !room.isDND, lastUpdated: new Date().toISOString() };
            }
            return room;
        }));
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

    const updateGuestStatus = (id: string, status: GuestStatus, keysFound?: boolean) => {
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
            updateSettings, updateRoomStatus, addIncident, resolveIncident,
            toggleDND, toggleExtraTime, setPriority, updateNotes, updateGuestStatus,
            startMaintenance, getStats, exportData,
            staff, fetchStaff, updateStaffGroup, createRoom, assignRoomToGroup,
            systemIncidents, addSystemIncident, fetchSystemIncidents, fetchRooms, deleteRoom, deleteStaff, deleteGroup,
            addStaff, updateStaff,
            inventory, fetchInventory, addInventoryItem, deleteInventoryItem, updateInventoryQuantity,
            cleaningTypes, fetchCleaningTypes, addCleaningType, deleteCleaningType
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

