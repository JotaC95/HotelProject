import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    ROOMS: 'HOTEL_APP_ROOMS',
    SESSION: 'HOTEL_APP_SESSION',
    SETTINGS: 'HOTEL_APP_SETTINGS',
    USER_PREFS: 'HOTEL_APP_USER_PREFS',
    LAST_SYNC: 'HOTEL_APP_LAST_SYNC'
};

export const storage = {
    saveRooms: async (rooms: any[]) => {
        try {
            await AsyncStorage.setItem(KEYS.ROOMS, JSON.stringify(rooms));
            await AsyncStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());
        } catch (e) {
            console.error('Failed to save rooms offline', e);
        }
    },

    getRooms: async () => {
        try {
            const data = await AsyncStorage.getItem(KEYS.ROOMS);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    saveSession: async (session: any) => {
        try {
            await AsyncStorage.setItem(KEYS.SESSION, JSON.stringify(session));
        } catch (e) {
            console.error('Failed to save session offline', e);
        }
    },

    getSession: async () => {
        try {
            const data = await AsyncStorage.getItem(KEYS.SESSION);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    saveSettings: async (settings: any) => {
        try {
            await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    },

    getSettings: async () => {
        try {
            const data = await AsyncStorage.getItem(KEYS.SETTINGS);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    clearAll: async () => {
        try {
            await AsyncStorage.multiRemove([KEYS.ROOMS, KEYS.SESSION, KEYS.SETTINGS, KEYS.LAST_SYNC]);
        } catch (e) {
            console.error('Failed to clear offline storage', e);
        }
    }
};
