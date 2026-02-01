import { useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useHotel, IncidentRole, INCIDENT_PRESETS } from '../../../contexts/HotelContext';
import { useToast } from '../../../contexts/ToastContext';

export const useIncidentActions = (roomId: string, user: any) => {
    const { addIncident, reportLostItem } = useHotel();
    const { showToast } = useToast();

    // Standard Incident State
    const [newIncident, setNewIncident] = useState('');
    const [isAddingIncident, setIsAddingIncident] = useState(false);
    const [targetRole, setTargetRole] = useState<IncidentRole>('MAINTENANCE');
    const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
    const [incidentModalVisible, setIncidentModalVisible] = useState(false); // For maintainance view

    // Fast Alert State (Zen Mode)
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean,
        type: 'BROKEN' | 'MISSING' | 'GENERAL',
        targetRole?: IncidentRole
    }>({ visible: false, type: 'GENERAL' });
    const [alertText, setAlertText] = useState('');
    const [alertPhoto, setAlertPhoto] = useState<string | null>(null);

    // Lost Item State
    const [lostItemModalVisible, setLostItemModalVisible] = useState(false);

    const handleAddIncident = (overrideText?: string, overrideRole?: IncidentRole, overrideCategory?: string) => {
        let text = overrideText || newIncident;
        let role = overrideRole || targetRole;
        let category = overrideCategory;

        if (!text.trim()) return;

        // Mock Translation Logic simulation handled in UI feedback or just backend
        if (!INCIDENT_PRESETS.includes(text)) {
            text = `${text}`; // Placeholder for translation indicator if needed
        }

        addIncident(roomId, text, user?.username || 'Unknown', role, user?.groupId, attachedPhoto || alertPhoto || undefined, category as any);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Incident reported', 'SUCCESS');

        // Reset States
        setNewIncident('');
        setAttachedPhoto(null);
        setIsAddingIncident(false);
        setIncidentModalVisible(false);

        // Reset Fast Alert too if used
        setAlertConfig({ ...alertConfig, visible: false });
        setAlertText('');
        setAlertPhoto(null);
    };

    const submitFastAlert = () => {
        if (!alertText && !alertPhoto) return;

        const typeMap: Record<string, string> = { 'BROKEN': 'MAINTENANCE', 'MISSING': 'SUPPLY', 'GENERAL': 'MAINTENANCE' };

        handleAddIncident(
            alertText || 'Photo Report',
            alertConfig.targetRole || 'MAINTENANCE', // Default fallback
            typeMap[alertConfig.type]
        );
    };

    const handleReportLostItem = async (desc: string) => {
        if (!desc.trim()) {
            Alert.alert("Error", "Please describe the item.");
            return;
        }
        await reportLostItem(desc, roomId);
        setLostItemModalVisible(false);
        showToast('Lost item reported', 'SUCCESS');
    };

    return {
        // State
        newIncident, setNewIncident,
        isAddingIncident, setIsAddingIncident,
        targetRole, setTargetRole,
        attachedPhoto, setAttachedPhoto,
        incidentModalVisible, setIncidentModalVisible,

        alertConfig, setAlertConfig,
        alertText, setAlertText,
        alertPhoto, setAlertPhoto,

        lostItemModalVisible, setLostItemModalVisible,

        // Actions
        handleAddIncident,
        submitFastAlert,
        handleReportLostItem
    };
};
