// firebase-migration.js
// Firebase configuration and migration utilities

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcYhLhEiJk0WjQvQdwk0oNgyotp-ewKsk",
  authDomain: "milano259.firebaseapp.com",
  projectId: "milano259",
  storageBucket: "milano259.firebasestorage.app",
  messagingSenderId: "681812166818",
  appId: "1:681812166818:web:24e638784a239b0021effb",
  measurementId: "G-FSL6MSC7CT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Migration status tracking
const migrationStatus = {
  employees: false,
  reports: false,
  inventory: false,
  inventoryHistory: false,
  operations: false,
  attendance: false,
  discipline_records: false,
  settings: false
};

// Authentication helper
async function authenticateUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('Authentication successful:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Authentication failed:', error);
    
    // Try to create user if doesn't exist (for first-time setup)
    if (error.code === 'auth/user-not-found') {
      try {
        const newUser = await createUserWithEmailAndPassword(auth, email, password);
        console.log('New user created:', newUser.user.uid);
        return newUser.user;
      } catch (createError) {
        console.error('User creation failed:', createError);
        throw createError;
      }
    }
    throw error;
  }
}

// Data conversion utilities
function convertToFirestoreData(data, collectionName) {
  // Add timestamps and collection-specific transformations
  const converted = {
    ...data,
    migratedAt: serverTimestamp(),
    originalCollection: collectionName
  };

  // Collection-specific conversions
  switch (collectionName) {
    case 'employees':
      converted.phone = String(converted.phone || '');
      converted.status = converted.status || 'active';
      break;
      
    case 'inventory':
      converted.minStock = Number(converted.minStock) || 0;
      converted.currentStock = Number(converted.currentStock) || 0;
      break;
      
    case 'attendance':
    case 'discipline_records':
      converted.month = converted.month || formatDate(new Date()).substring(0, 7);
      break;
      
    case 'reports':
      converted.date = converted.date || formatDate(new Date());
      break;
  }

  return converted;
}

// Format date helper (compatible with existing database.js)
function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// Migration functions for each collection
async function migrateCollection(storeName, firestoreCollectionName) {
  try {
    console.log(`Starting migration of ${storeName}...`);
    
    // Get all data from IndexedDB
    const data = await dbGetAll(storeName);
    
    if (!data || data.length === 0) {
      console.log(`No data found in ${storeName}, skipping...`);
      migrationStatus[storeName] = true;
      return 0;
    }
    
    // Create batch for efficient writing
    const batch = writeBatch(db);
    let migratedCount = 0;
    
    // Process each document
    for (const item of data) {
      try {
        // Generate document ID (use existing ID or create new)
        const docId = item.id || item.employeeId || item.reportId || 
                      item.productId || item.historyId || item.operationId || 
                      item.attendanceId || item.key || String(Date.now()) + Math.random().toString(36).substr(2, 9);
        
        const docRef = doc(db, firestoreCollectionName, docId.toString());
        const firestoreData = convertToFirestoreData(item, storeName);
        
        batch.set(docRef, firestoreData);
        migratedCount++;
        
        // Firestore batches have limit of 500 operations
        if (migratedCount % 400 === 0) {
          await batch.commit();
          console.log(`Committed batch for ${storeName}: ${migratedCount} documents`);
        }
      } catch (itemError) {
        console.error(`Error migrating item from ${storeName}:`, itemError);
      }
    }
    
    // Commit remaining documents
    if (migratedCount > 0 && migratedCount % 400 !== 0) {
      await batch.commit();
    }
    
    console.log(`Successfully migrated ${migratedCount} documents from ${storeName} to ${firestoreCollectionName}`);
    migrationStatus[storeName] = true;
    return migratedCount;
    
  } catch (error) {
    console.error(`Error migrating ${storeName}:`, error);
    throw error;
  }
}

// Main migration function
async function migrateAllData(email, password) {
  try {
    console.log('Starting data migration to Firebase...');
    
    // Authenticate user
    await authenticateUser(email, password);
    
    // Ensure IndexedDB is initialized
    if (!window.db) {
      await initializeDatabase();
    }
    
    const migrationResults = {
      totalMigrated: 0,
      collections: {}
    };
    
    // Define migration mapping
    const migrationMap = [
      { indexedDB: 'employees', firestore: 'employees' },
      { indexedDB: 'reports', firestore: 'reports' },
      { indexedDB: 'inventory', firestore: 'inventory' },
      { indexedDB: 'inventoryHistory', firestore: 'inventory_history' },
      { indexedDB: 'operations', firestore: 'operations' },
      { indexedDB: 'attendance', firestore: 'attendance' },
      { indexedDB: 'discipline_records', firestore: 'discipline_records' },
      { indexedDB: 'settings', firestore: 'settings' }
    ];
    
    // Migrate each collection
    for (const { indexedDB, firestore } of migrationMap) {
      try {
        const count = await migrateCollection(indexedDB, firestore);
        migrationResults.collections[indexedDB] = {
          success: true,
          count: count
        };
        migrationResults.totalMigrated += count;
      } catch (collectionError) {
        console.error(`Failed to migrate ${indexedDB}:`, collectionError);
        migrationResults.collections[indexedDB] = {
          success: false,
          error: collectionError.message,
          count: 0
        };
      }
    }
    
    // Save migration summary
    const summaryRef = doc(db, 'migration_logs', Date.now().toString());
    await setDoc(summaryRef, {
      timestamp: serverTimestamp(),
      results: migrationResults,
      status: migrationStatus,
      migratedBy: auth.currentUser?.uid,
      migratedByEmail: email
    });
    
    console.log('Migration completed!');
    console.log('Summary:', migrationResults);
    
    return migrationResults;
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Data sync function (for incremental updates)
async function syncIncrementalData(collectionName) {
  try {
    console.log(`Starting incremental sync for ${collectionName}...`);
    
    // Get last sync timestamp from Firestore
    const syncDoc = await getDocs(collection(db, 'sync_metadata'));
    let lastSync = null;
    
    if (!syncDoc.empty) {
      syncDoc.forEach(doc => {
        if (doc.data().collection === collectionName) {
          lastSync = doc.data().lastSync;
        }
      });
    }
    
    // Get new/updated data from IndexedDB
    let data;
    if (lastSync) {
      // In a real implementation, you'd query by updatedAt > lastSync
      data = await dbGetAll(collectionName);
      data = data.filter(item => {
        const updated = new Date(item.updatedAt || item.createdAt || 0);
        return updated > lastSync;
      });
    } else {
      data = await dbGetAll(collectionName);
    }
    
    // Migrate only new/updated data
    if (data.length > 0) {
      const batch = writeBatch(db);
      
      for (const item of data) {
        const docId = item.id || item.employeeId || item.reportId || 
                     item.productId || item.historyId || item.operationId || 
                     item.attendanceId || item.key || String(Date.now()) + Math.random().toString(36).substr(2, 9);
        
        const docRef = doc(db, collectionName, docId.toString());
        const firestoreData = convertToFirestoreData(item, collectionName);
        
        batch.set(docRef, firestoreData, { merge: true });
      }
      
      await batch.commit();
      console.log(`Synced ${data.length} documents for ${collectionName}`);
      
      // Update sync metadata
      const metadataRef = doc(db, 'sync_metadata', collectionName);
      await setDoc(metadataRef, {
        collection: collectionName,
        lastSync: serverTimestamp(),
        documentsSynced: data.length
      });
      
      return data.length;
    }
    
    console.log(`No new data to sync for ${collectionName}`);
    return 0;
    
  } catch (error) {
    console.error(`Sync failed for ${collectionName}:`, error);
    throw error;
  }
}

// Export migration status and functions
function getMigrationStatus() {
  return { ...migrationStatus };
}

function resetMigrationStatus() {
  Object.keys(migrationStatus).forEach(key => {
    migrationStatus[key] = false;
  });
}

// Export functions for use in other modules
export {
  app,
  db,
  auth,
  migrateAllData,
  syncIncrementalData,
  getMigrationStatus,
  resetMigrationStatus,
  authenticateUser,
  migrationStatus
};

// Make functions globally available for easy access
window.firebaseMigration = {
  migrateAllData,
  syncIncrementalData,
  getMigrationStatus,
  resetMigrationStatus,
  authenticateUser,
  getAuth: () => auth,
  getDb: () => db
};

console.log('Firebase migration module loaded. Use firebaseMigration.migrateAllData(email, password) to start migration.');