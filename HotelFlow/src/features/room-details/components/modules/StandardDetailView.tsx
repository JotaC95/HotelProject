import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Image } from 'react-native';
import { X, Edit2, History, ChevronDown, Save, DoorOpen, Bed, Package, User, Key, Phone, LogOut, LogIn, AlertTriangle, Moon, Clock, Briefcase, Plus, Languages, Camera } from 'lucide-react-native';
import { theme } from '../../../../utils/theme';
import { StatusBadge } from '../../../../components/StatusBadge';
import { Room, IncidentRole, INCIDENT_PRESETS } from '../../../../contexts/HotelContext';

interface StandardDetailViewProps {
    room: Room;
    user: any;
    isEditing: boolean;
    setIsEditing: (active: boolean) => void;
    // Editing State (Passed from Parent Hook)
    tempType: string;
    setTempType: (t: string) => void;
    tempCleaningType: string;
    // setTempCleaningType... simplified for brevity, assume parent handles
    // Real implementation needs full props for editing form
    onSaveDetails: () => void;

    // Conditions
    onToggleGuestWaiting: () => void;
    onToggleDND: () => void;
    onToggleExtraTime: () => void;

    // Guest Actions
    onNotifyReception: () => void;
    onGuestLeft: () => void;

    // Incidents
    newIncident: string;
    setNewIncident: (text: string) => void;
    targetRole: IncidentRole;
    setTargetRole: (role: IncidentRole) => void;
    handleAddIncident: () => void;
    isAddingIncident: boolean;
    setIsAddingIncident: (v: boolean) => void;
    attachedPhoto: string | null;
    setAttachedPhoto: (uri: string | null) => void;
    // ... more props as needed from the giant component
}

export const StandardDetailView = ({
    room, user, isEditing, setIsEditing, tempType, setTempType, onSaveDetails,
    onToggleGuestWaiting, onToggleDND, onToggleExtraTime,
    onNotifyReception, onGuestLeft,
    newIncident, setNewIncident, targetRole, setTargetRole, handleAddIncident, isAddingIncident, setIsAddingIncident,
    attachedPhoto, setAttachedPhoto
}: StandardDetailViewProps) => {

    return (
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
                        <TouchableOpacity style={{ padding: 8 }}>
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
                    </View>
                ) : (
                    <StatusBadge status={room.status} />
                )}
            </View>

            {/* Edit Mode Save Action */}
            {isEditing && (
                <View style={styles.section}>
                    <TouchableOpacity style={styles.saveDetailsButton} onPress={onSaveDetails}>
                        <Save size={18} color="white" />
                        <Text style={styles.saveDetailsText}>Save Details</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Conditions Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Conditions</Text>

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
                                onValueChange={onToggleGuestWaiting}
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
                        onValueChange={onToggleDND}
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
                        onValueChange={onToggleExtraTime}
                        trackColor={{ false: theme.colors.border, true: theme.colors.info }}
                    />
                </View>
            </View>

            {/* Incidents Section */}
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
                            <TouchableOpacity style={styles.iconButton} onPress={() => {/* Mock Image Picker */ }}>
                                <Camera size={24} color={theme.colors.textSecondary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.addIncidentButton, { flex: 1, marginLeft: 10 }]}
                                onPress={handleAddIncident}
                            >
                                <Text style={styles.addIncidentText}>Report Incident</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* List Incidents */}
                {room.incidents.map((incident, i) => (
                    <View key={i} style={styles.incidentItem}>
                        <View style={styles.incidentHeader}>
                            <Text style={styles.incidentText}>{incident.text}</Text>
                            <View style={[styles.roleTag, { backgroundColor: theme.colors.primary + '20' }]}>
                                <Text style={styles.roleTagText}>{incident.targetRole}</Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA'
    },
    headerCard: {
        backgroundColor: 'white',
        padding: 20,
        margin: 15,
        borderRadius: 16,
        alignItems: 'center',
        ...theme.shadows.card
    },
    roomBigNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.colors.text
    },
    roomType: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: 10
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
    section: {
        backgroundColor: 'white',
        marginHorizontal: 15,
        marginBottom: 15,
        borderRadius: 12,
        padding: 15,
        ...theme.shadows.card
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 15
    },
    saveDetailsButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8
    },
    saveDetailsText: {
        color: 'white',
        fontWeight: 'bold'
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12
    },
    rowLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    rowText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    addIncidentBox: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    chipContainer: {
        marginBottom: 12,
        flexDirection: 'row'
    },
    chip: {
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    chipText: {
        fontSize: 12,
        color: theme.colors.text
    },
    roleSelector: {
        marginBottom: 10
    },
    roleLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginBottom: 5
    },
    roleButtons: {
        flexDirection: 'row',
        gap: 8
    },
    incidentInput: {
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minHeight: 60,
        textAlignVertical: 'top',
        marginBottom: 10
    },
    photoPreview: {
        marginBottom: 10,
        alignItems: 'center'
    },
    previewImage: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        resizeMode: 'cover'
    },
    removePhotoText: {
        color: theme.colors.error,
        marginTop: 5,
        fontSize: 12,
        fontWeight: 'bold'
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    iconButton: {
        padding: 10,
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    addIncidentButton: {
        backgroundColor: theme.colors.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    addIncidentText: {
        color: 'white',
        fontWeight: 'bold'
    },
    incidentItem: {
        backgroundColor: '#F3F4F6',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8
    },
    incidentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    incidentText: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1
    },
    roleTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    roleTagText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: theme.colors.primary
    }
});
