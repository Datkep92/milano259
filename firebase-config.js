// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAKPaTK5565yymhgdg7SW_-k5lx4-r3BfE",
    authDomain: "milano-2a686.firebaseapp.com",
    projectId: "milano-2a686",
    storageBucket: "milano-2a686.firebasestorage.app",
    messagingSenderId: "1060141074286",
    appId: "1:1060141074286:web:ec528fc13ac8fd2afbe37f",
    measurementId: "G-TK1GC0FT8Y"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 🚀 Tối ưu Firestore settings - THÊM {merge: true}
const firestoreSettings = {
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
};

// Áp dụng settings với merge
db.settings(firestoreSettings, { merge: true });

// 🎯 Enable persistence với error handling
async function enableFirestorePersistence() {
    try {
        await db.enablePersistence();
        console.log('✅ Offline persistence enabled');
    } catch (err) {
        switch (err.code) {
            case 'failed-precondition':
                console.log('ℹ️ Multiple tabs open - persistence enabled in first tab only');
                break;
            case 'unimplemented':
                console.log('⚠️ Browser does not support offline persistence');
                break;
            default:
                console.log('❌ Persistence error:', err.message);
        }
    }
}

// 🚀 Khởi chạy persistence (không chặn app khởi động)
setTimeout(() => {
    enableFirestorePersistence();
}, 1000);

console.log('🚀 Firebase initialized successfully');