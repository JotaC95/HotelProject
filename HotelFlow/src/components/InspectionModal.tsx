import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useHotel } from '../contexts/HotelContext';
import { CheckCircle2, XCircle } from 'lucide-react-native';

const CHECKLIST_ITEMS = [
    { id: 'bed', label: 'Bed Made Perfectly' },
    { id: 'bath', label: 'Bathroom Sanitized' },
    { id: 'amenities', label: 'Amenities Restocked' },
    { id: 'floor', label: 'Floor Vacuumed/Mopped' },
    { id: 'surfaces', label: 'Surfaces Wiped' },
    { id: 'odors', label: 'No Odors' },
    { id: 'minibar', label: 'Minibar Checked' },
];

export const InspectionModal = ({ roomId, visible, onClose }: { roomId: string, visible: boolean, onClose: () => void }) => {
    const { submitInspection, updateRoomStatus, addSystemIncident } = useHotel();
    const [checks, setChecks] = useState<Record<string, boolean>>({});

    const toggleCheck = (id: string) => {
        setChecks(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handlePass = async () => {
        const report = {
            timestamp: new Date().toISOString(),
            checks: checks,
            result: 'PASSED'
        };
        await submitInspection(roomId, report);
        onClose();
    };

    const handleFail = async () => {
        // Fail Logic: Mark as PENDING (Needs recleaning)
        await updateRoomStatus(roomId, 'PENDING');
        // Notify Cleaner?
        addSystemIncident(`Room ${roomId} FAILED inspection. Needs recleaning.`, 'SUPERVISOR');
        onClose();
    };

    const allChecked = CHECKLIST_ITEMS.every(i => checks[i.id]);

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Inspection Checklist</Text>
                    <ScrollView style={styles.list}>
                        {CHECKLIST_ITEMS.map(item => (
                            <TouchableOpacity key={item.id} style={styles.item} onPress={() => toggleCheck(item.id)}>
                                <Text style={styles.label}>{item.label}</Text>
                                <Switch value={!!checks[item.id]} onValueChange={() => toggleCheck(item.id)} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.actions}>
                        <TouchableOpacity style={[styles.btn, styles.failBtn]} onPress={handleFail}>
                            <XCircle size={20} color="#FFF" />
                            <Text style={styles.btnText}>Fail</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btn, styles.passBtn, !allChecked && styles.disabledBtn]}
                            onPress={handlePass}
                            disabled={!allChecked}
                        >
                            <CheckCircle2 size={20} color="#FFF" />
                            <Text style={styles.btnText}>Pass Cleaning</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.cancelLink} onPress={onClose}>
                        <Text style={styles.cancelText}>Cancel Inspection</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    container: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, maxHeight: '80%' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    list: { marginBottom: 20 },
    item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#EEE' },
    label: { fontSize: 16 },
    actions: { flexDirection: 'row', gap: 15 },
    btn: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    failBtn: { backgroundColor: '#F44336' },
    passBtn: { backgroundColor: '#4CAF50' },
    disabledBtn: { opacity: 0.5 },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
    cancelLink: { marginTop: 15, alignItems: 'center' },
    cancelText: { color: '#999' }
});
