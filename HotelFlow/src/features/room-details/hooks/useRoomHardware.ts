import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import NfcManager, { NfcTech } from '../../../utils/SafeNfc';
import { useToast } from '../../../contexts/ToastContext';
import { Room } from '../../../contexts/HotelContext';

export const useRoomHardware = (room?: Room, onStartCleaning?: (id: string) => void, onCompleteRoom?: () => void) => {
    const { showToast } = useToast();
    const [isNfcSupported, setIsNfcSupported] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // NFC Initialization
    useEffect(() => {
        const checkNfc = async () => {
            try {
                const supported = await NfcManager.isSupported();
                if (supported) {
                    await NfcManager.start();
                    setIsNfcSupported(true);
                }
            } catch (e) {
                console.log("NFC Not Supported or Expo Go Env");
            }
        };
        checkNfc();

        return () => {
            NfcManager.cancelTechnologyRequest().catch(() => 0);
        };
    }, []);

    const startNfcScan = async () => {
        if (!isNfcSupported) return;

        try {
            setIsScanning(true);
            await NfcManager.requestTechnology(NfcTech.Ndef);
            const tag = await NfcManager.getTag();

            if (tag) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                if (room?.status === 'PENDING' && onStartCleaning && room?.id) {
                    onStartCleaning(room.id);
                    showToast(`NFC: Started Room ${room.number}`, 'SUCCESS');
                } else if (room?.status === 'IN_PROGRESS' && onCompleteRoom) {
                    onCompleteRoom();
                    showToast(`NFC: Completed Room ${room.number}`, 'SUCCESS');
                }
            }

        } catch (ex) {
            console.warn('NFC Scan Error', ex);
        } finally {
            NfcManager.cancelTechnologyRequest();
            setIsScanning(false);
        }
    };

    const pickImage = async (onSuccess: (uri: string) => void) => {
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
                onSuccess(result.assets[0].uri);
            }
        } catch (e) {
            console.error("Camera Error", e);
            Alert.alert("Error", "Could not open camera.");
        }
    };

    return {
        isNfcSupported,
        isScanning,
        startNfcScan,
        pickImage
    };
};
