
// Safe wrapper for react-native-nfc-manager
// This allows the code to run in Expo Go without crashing

let NfcManager: any = {
    start: async () => { },
    isSupported: async () => false,
    requestTechnology: async () => { },
    cancelTechnologyRequest: async () => { },
    getTag: async () => null,
    setEventListener: () => { },
    registerTagEvent: () => { },
    unregisterTagEvent: () => { },
};

let NfcTech: any = {
    Ndef: 'Ndef',
    MifareClassic: 'MifareClassic'
};

try {
    const nfc = require('react-native-nfc-manager');
    NfcManager = nfc.default;
    NfcTech = nfc.NfcTech;
} catch (e) {
    console.log("NFC Manager not found (Expo Go detected). NFC features disabled.");
}

export { NfcManager as default, NfcTech };
