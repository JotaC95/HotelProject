import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useHotel } from '../contexts/HotelContext';
import { AlertCircle, Info, X, Send, Megaphone } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../utils/theme';

export const NotificationsModal = ({ visible, onClose }: { visible: boolean, onClose: () => void }) => {
    const { announcements, fetchAnnouncements, sendAnnouncement } = useHotel();
    const { user } = useAuth();

    // Form State
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [isHighPriority, setIsHighPriority] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const canCreate = ['ADMIN', 'SUPERVISOR', 'RECEPTION'].includes(user?.role || '');

    useEffect(() => {
        if (visible) fetchAnnouncements();
    }, [visible]);

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        try {
            await sendAnnouncement(title, message, isHighPriority ? 'HIGH' : 'NORMAL');
            setTitle('');
            setMessage('');
            setIsCreating(false);
            Alert.alert("Success", "Announcement sent");
        } catch (e) {
            Alert.alert("Error", "Failed to send announcement");
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.card, item.priority === 'HIGH' && styles.highPriority]}>
            <View style={styles.header}>
                {item.priority === 'HIGH' ?
                    <AlertCircle size={20} color="#D32F2F" /> :
                    <Info size={20} color="#1976D2" />
                }
                <Text style={styles.title}>{item.title}</Text>
            </View>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.footer}>{new Date(item.timestamp).toLocaleString()} • {item.sender}</Text>
        </View>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.overlay}
            >
                <View style={[styles.container, isCreating && styles.containerExpanded]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.heading}>Announcements</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    {canCreate && !isCreating && (
                        <TouchableOpacity style={styles.createButton} onPress={() => setIsCreating(true)}>
                            <Megaphone size={20} color="white" />
                            <Text style={styles.createButtonText}>New Announcement</Text>
                        </TouchableOpacity>
                    )}

                    {isCreating && (
                        <View style={styles.formContainer}>
                            <View style={styles.formHeader}>
                                <Text style={styles.formTitle}>New Message</Text>
                                <TouchableOpacity onPress={() => setIsCreating(false)}>
                                    <Text style={{ color: '#666' }}>Cancel</Text>
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={styles.input}
                                placeholder="Title"
                                value={title}
                                onChangeText={setTitle}
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Message..."
                                multiline
                                value={message}
                                onChangeText={setMessage}
                            />

                            <View style={styles.formActions}>
                                <TouchableOpacity
                                    style={[styles.priorityToggle, isHighPriority && styles.priorityActive]}
                                    onPress={() => setIsHighPriority(!isHighPriority)}
                                >
                                    <AlertCircle size={16} color={isHighPriority ? '#D32F2F' : '#666'} />
                                    <Text style={{ color: isHighPriority ? '#D32F2F' : '#666' }}>High Priority</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                                    <Send size={16} color="white" />
                                    <Text style={styles.sendButtonText}>Send</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <FlatList
                        data={announcements}
                        keyExtractor={i => i.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.empty}>No announcements yet.</Text>}
                    />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    container: { backgroundColor: '#FFF', height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    containerExpanded: { height: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    heading: { fontSize: 24, fontWeight: 'bold' },
    list: { paddingBottom: 20, paddingTop: 10 },
    card: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#1976D2' },
    highPriority: { backgroundColor: '#FFEBEE', borderLeftColor: '#D32F2F' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    message: { fontSize: 14, color: '#444', lineHeight: 20 },
    footer: { fontSize: 12, color: '#888', marginTop: 8 },
    empty: { textAlign: 'center', color: '#999', marginTop: 50 },

    // Form Styles
    createButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 10,
        marginBottom: 15,
        gap: 8
    },
    createButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    formContainer: { backgroundColor: '#F8F9FA', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
    formHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    formTitle: { fontWeight: 'bold', fontSize: 16 },
    input: { backgroundColor: 'white', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#DDD', marginBottom: 10 },
    textArea: { height: 80, textAlignVertical: 'top' },
    formActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    priorityToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#DDD' },
    priorityActive: { borderColor: '#D32F2F', backgroundColor: '#FFEBEE' },
    sendButton: { backgroundColor: theme.colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    sendButtonText: { color: 'white', fontWeight: 'bold' }
});
