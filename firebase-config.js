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

// Enable persistence với error handling
db.enablePersistence()
  .then(() => console.log('✅ Offline persistence enabled'))
  .catch(err => {
      if (err.code == 'failed-precondition') {
          console.log('ℹ️ Multiple tabs open, persistence enabled in first tab only');
      } else if (err.code == 'unimplemented') {
          console.log('⚠️ Browser does not support persistence');
      } else {
          console.log('❌ Persistence error:', err);
      }
  });

console.log('🚀 Firebase initialized successfully');