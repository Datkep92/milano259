// Database configuration and utilities
const DB_NAME = 'CafeManagementDB';
const DB_VERSION = 5;

// Database instance
let db = null;

// Initialize database
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Database error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('Database opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            createObjectStores(database);
        };
    });
}

// Create object stores
function createObjectStores(database) {
    // Employees store
    if (!database.objectStoreNames.contains('employees')) {
        const employeesStore = database.createObjectStore('employees', { 
            keyPath: 'employeeId',
            autoIncrement: false 
        });
        employeesStore.createIndex('phone', 'phone', { unique: true });
        employeesStore.createIndex('status', 'status', { unique: false });
    }

    // Reports store
    if (!database.objectStoreNames.contains('reports')) {
        const reportsStore = database.createObjectStore('reports', { 
            keyPath: 'reportId' 
        });
        reportsStore.createIndex('date', 'date', { unique: true });
        reportsStore.createIndex('createdBy', 'createdBy', { unique: false });
    }

    // Inventory store
    if (!database.objectStoreNames.contains('inventory')) {
        const inventoryStore = database.createObjectStore('inventory', { 
            keyPath: 'productId' 
        });
        inventoryStore.createIndex('name', 'name', { unique: false });
        inventoryStore.createIndex('minStock', 'minStock', { unique: false });
    }

    // Inventory History store
    if (!database.objectStoreNames.contains('inventoryHistory')) {
        const historyStore = database.createObjectStore('inventoryHistory', { 
            keyPath: 'historyId',
            autoIncrement: true 
        });
        historyStore.createIndex('productId', 'productId', { unique: false });
        historyStore.createIndex('date', 'date', { unique: false });
        historyStore.createIndex('type', 'type', { unique: false });
    }

    // Operations store
    if (!database.objectStoreNames.contains('operations')) {
        const operationsStore = database.createObjectStore('operations', { 
            keyPath: 'operationId',
            autoIncrement: true 
        });
        operationsStore.createIndex('date', 'date', { unique: false });
        operationsStore.createIndex('type', 'type', { unique: false });
    }

    // Attendance store
    if (!database.objectStoreNames.contains('attendance')) {
        const attendanceStore = database.createObjectStore('attendance', { 
            keyPath: 'attendanceId',
            autoIncrement: true 
        });
        attendanceStore.createIndex('employeeId', 'employeeId', { unique: false });
        attendanceStore.createIndex('date', 'date', { unique: false });
        attendanceStore.createIndex('month', 'month', { unique: false });
    }

    // ⭐ NEW: Discipline Records store (thưởng/phạt)
    if (!database.objectStoreNames.contains('discipline_records')) {
        const disciplineStore = database.createObjectStore('discipline_records', { 
            keyPath: 'id',
            autoIncrement: true 
        });

        disciplineStore.createIndex('employeeId', 'employeeId', { unique: false });
        disciplineStore.createIndex('month', 'month', { unique: false });
        disciplineStore.createIndex('type', 'type', { unique: false });
    }

    // Settings store
    if (!database.objectStoreNames.contains('settings')) {
        const settingsStore = database.createObjectStore('settings', { 
            keyPath: 'key' 
        });
    }

    console.log('Object stores created successfully');
}


// Generic database operations
function dbAdd(storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}


function dbUpdate(storeName, key, updates) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(key);

        getRequest.onsuccess = () => {
            const existing = getRequest.result;
            if (!existing) {
                reject(new Error('Record not found'));
                return;
            }

            const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
            const putRequest = store.put(updated);

            putRequest.onsuccess = () => resolve(updated);
            putRequest.onerror = () => reject(putRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
}

function dbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Utility functions for date handling
function formatDate(date = new Date()) {
    return date.toISOString().split('T')[0];
}

function formatDateDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('vi-VN');
}

function getMonthRange(monthString) {
    const [year, month] = monthString.split('-');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    return {
        start: formatDate(startDate),
        end: formatDate(endDate)
    };
}

function getPreviousMonth(monthString) {
    const [year, month] = monthString.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
    }
    
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

// THÊM hàm dbGetAllByRange
function dbGetAllByRange(storeName, indexName, keyRange) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(keyRange);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// SỬA hàm dbGetAll
function dbGetAll(storeName, indexName = null, range = null) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        let request;
        if (indexName && range) {
            const index = store.index(indexName);
            request = index.getAll(range);
        } else if (indexName) {
            const index = store.index(indexName);
            request = index.getAll();
        } else {
            request = store.getAll();
        }

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ==================== FIREBASE SYNC INTEGRATION ====================

let firebaseSync = {
    enabled: true,
    isSyncing: false,
    pendingSyncs: [],
    db: null
};

// Khởi tạo Firebase (chỉ gọi một lần)
function initFirebase() {
    try {
        // Kiểm tra xem firebase đã được load chưa
        if (typeof firebase === 'undefined') {
            console.warn('⚠️ Firebase chưa được load');
            return null;
        }
        
        if (!firebase.apps || firebase.apps.length === 0) {
            console.warn('⚠️ Firebase chưa được khởi tạo');
            return null;
        }
        
        if (!firebase.firestore) {
            console.warn('⚠️ Firestore chưa được load');
            return null;
        }
        
        if (!firebaseSync.db) {
            firebaseSync.db = firebase.firestore();
            console.log('✅ Firebase Firestore initialized');
        }
        return firebaseSync.db;
    } catch (error) {
        console.warn('⚠️ Firebase không khả dụng:', error);
        return null;
    }
}

// Đồng bộ từ Firebase về IndexedDB
async function syncFromFirebase() {
    if (!firebaseSync.enabled || firebaseSync.isSyncing) return;
    
    const firestore = initFirebase();
    if (!firestore) return;
    
    firebaseSync.isSyncing = true;
    console.log('🔄 Đồng bộ từ Firebase...');
    
    try {
        // Đồng bộ từng collection
        await syncCollection(firestore, 'employees', 'employees', 'employeeId');
        await syncCollection(firestore, 'inventory', 'inventory', 'productId');
        await syncCollection(firestore, 'reports', 'reports', 'reportId');
        await syncCollection(firestore, 'attendance', 'attendance', 'attendanceId');
        await syncCollection(firestore, 'discipline_records', 'discipline_records', 'id');
        
        console.log('✅ Đồng bộ Firebase hoàn tất');
    } catch (error) {
        console.error('❌ Lỗi đồng bộ Firebase:', error);
    } finally {
        firebaseSync.isSyncing = false;
    }
}
// Tự động khởi động sync sau khi DB sẵn sàng
// Tự động khởi động sync sau khi DB sẵn sàng
setTimeout(async () => {
    console.log('🔄 Initializing Firebase sync...');
    
    // Đợi Firebase load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const firestore = initFirebase();
    
    if (!firestore) {
        console.log('📴 Firebase not available - Using IndexedDB only');
        firebaseSync.enabled = false;
        return;
    }
    
    console.log('🚀 Starting Firebase sync system...');
    
    // 1. Đồng bộ dữ liệu ban đầu
    try {
        await syncFromFirebase();
        console.log('✅ Initial Firebase sync completed');
    } catch (error) {
        console.log('📴 Initial sync failed:', error.message);
    }
    
    // 2. Thiết lập realtime listeners
    setupFirebaseRealtimeListeners();
    
    // 3. Khởi động đồng bộ định kỳ
    startPeriodicSync(30); // 30 phút/lần
    
}, 2000);
// Lắng nghe thay đổi realtime từ Firebase
function setupFirebaseRealtimeListeners() {
    const firestore = initFirebase();
    if (!firestore) {
        console.warn('⚠️ Cannot setup realtime listeners - Firebase not available');
        return;
    }
    
    console.log('👂 Setting up Firebase realtime listeners...');
    
    // Lắng nghe employees
    firestore.collection('employees')
        .onSnapshot((snapshot) => {
            console.log('🔄 Employees collection changed');
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    handleFirebaseChange('employees', change.doc.data());
                } else if (change.type === 'removed') {
                    handleFirebaseDelete('employees', change.doc.id);
                }
            });
        }, (error) => {
            console.error('❌ Employees listener error:', error);
        });
    
    // Lắng nghe inventory
    firestore.collection('inventory')
        .onSnapshot((snapshot) => {
            console.log('🔄 Inventory collection changed');
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    handleFirebaseChange('inventory', change.doc.data());
                } else if (change.type === 'removed') {
                    handleFirebaseDelete('inventory', change.doc.id);
                }
            });
        }, (error) => {
            console.error('❌ Inventory listener error:', error);
        });
    
    // Lắng nghe reports
    firestore.collection('reports')
        .onSnapshot((snapshot) => {
            console.log('🔄 Reports collection changed');
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    handleFirebaseChange('reports', change.doc.data());
                }
            });
        }, (error) => {
            console.error('❌ Reports listener error:', error);
        });
    
    console.log('✅ Firebase realtime listeners setup complete');
}

// Xử lý khi có thay đổi từ Firebase
async function handleFirebaseChange(storeName, data) {
    console.log(`🔥 Firebase change detected: ${storeName}`, data);
    
    try {
        // Xác định key
        let key;
        if (storeName === 'employees') key = data.employeeId;
        else if (storeName === 'inventory') key = data.productId;
        else if (storeName === 'reports') key = data.reportId;
        else return;
        
        // Kiểm tra tồn tại trong IndexedDB
        const existing = await dbGet(storeName, key);
        
        if (existing) {
            // Cập nhật IndexedDB
            await dbUpdate(storeName, key, {
                ...data,
                _synced: true,
                _lastSync: new Date().toISOString()
            });
            console.log(`✅ Updated ${storeName}/${key} from Firebase`);
        } else {
            // Thêm mới vào IndexedDB
            await dbAdd(storeName, {
                ...data,
                _synced: true,
                _lastSync: new Date().toISOString()
            });
            console.log(`✅ Added ${storeName}/${key} from Firebase`);
        }
        
        // Tự động cập nhật UI nếu đang ở tab tương ứng
        updateUIOnFirebaseChange(storeName, data);
        
    } catch (error) {
        console.error(`❌ Error handling Firebase change for ${storeName}:`, error);
    }
}

// Xử lý khi có xóa từ Firebase
async function handleFirebaseDelete(storeName, docId) {
    console.log(`🗑️ Firebase delete detected: ${storeName}/${docId}`);
    
    try {
        // Xóa khỏi IndexedDB
        await dbDelete(storeName, docId);
        console.log(`✅ Deleted ${storeName}/${docId} from IndexedDB`);
        
        // Cập nhật UI
        updateUIOnFirebaseDelete(storeName, docId);
        
    } catch (error) {
        console.error(`❌ Error handling Firebase delete for ${storeName}:`, error);
    }
}

// Tự động cập nhật UI
function updateUIOnFirebaseChange(storeName, data) {
    // Lấy tab đang active
    const activeTab = document.querySelector('.tab-btn.active');
    if (!activeTab) return;
    
    const activeTabId = activeTab.getAttribute('data-tab');
    
    // Kiểm tra xem có cần update UI không
    if (
        (storeName === 'employees' && activeTabId === 'employees') ||
        (storeName === 'inventory' && activeTabId === 'inventory') ||
        (storeName === 'reports' && activeTabId === 'reports')
    ) {
        console.log(`🔄 Auto-refreshing UI for ${storeName} tab`);
        
        // Reload dữ liệu cho tab hiện tại
        setTimeout(() => {
            loadTabContent(activeTabId);
        }, 500);
    }
}

function updateUIOnFirebaseDelete(storeName, docId) {
    const activeTab = document.querySelector('.tab-btn.active');
    if (!activeTab) return;
    
    const activeTabId = activeTab.getAttribute('data-tab');
    
    if (
        (storeName === 'employees' && activeTabId === 'employees') ||
        (storeName === 'inventory' && activeTabId === 'inventory')
    ) {
        console.log(`🔄 Removing item ${docId} from UI`);
        
        // Xóa element khỏi UI
        const itemElement = document.querySelector(`[data-id="${docId}"]`);
        if (itemElement) {
            itemElement.remove();
        }
    }
}
// Hàm kiểm tra và load dữ liệu mẫu
async function checkAndLoadSampleData() {
    try {
        // Kiểm tra xem có dữ liệu không
        const employees = await dbGetAll('employees');
        const inventory = await dbGetAll('inventory');
        
        if (employees.length === 0 && inventory.length === 0) {
            console.log('📦 Database empty, loading sample data...');
            await initializeSampleData();
        } else {
            console.log(`✅ Database has data: ${employees.length} employees, ${inventory.length} products`);
        }
    } catch (error) {
        console.warn('Error checking database:', error);
    }
}
async function syncCollection(firestore, firestoreCol, indexedDBStore, keyField) {
    try {
        const snapshot = await firestore.collection(firestoreCol).get();
        let count = 0;
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const item = { ...data, _synced: true };
            
            try {
                const existing = await dbGet(indexedDBStore, item[keyField]);
                if (existing) {
                    await dbUpdate(indexedDBStore, item[keyField], item);
                } else {
                    await dbAdd(indexedDBStore, item);
                }
                count++;
            } catch (err) {
                console.warn(`Không thể lưu ${firestoreCol}:`, err);
            }
        }
        
        if (count > 0) {
            console.log(`✅ Đồng bộ ${count} ${firestoreCol}`);
        }
    } catch (error) {
        console.error(`Lỗi đồng bộ ${firestoreCol}:`, error);
    }
}

// Đẩy dữ liệu lên Firebase
async function pushToFirebase(storeName, data) {
    if (!firebaseSync.enabled) return;
    
    const firestore = initFirebase();
    if (!firestore) {
        // Lưu vào hàng đợi để thử lại sau
        firebaseSync.pendingSyncs.push({ storeName, data, timestamp: new Date() });
        return;
    }
    
    try {
        // Xác định collection
        const collectionMap = {
            'employees': 'employees',
            'inventory': 'inventory', 
            'reports': 'reports',
            'attendance': 'attendance',
            'discipline_records': 'discipline_records'
        };
        
        const collectionName = collectionMap[storeName] || storeName;
        let docId = '';
        
        // Tìm ID
        if (data.employeeId) docId = data.employeeId;
        else if (data.productId) docId = data.productId;
        else if (data.reportId) docId = data.reportId;
        else if (data.attendanceId) docId = data.attendanceId.toString();
        else if (data.id) docId = data.id.toString();
        else docId = firestore.collection(collectionName).doc().id;
        
        // Đánh dấu đã đồng bộ
        const dataToSync = {
            ...data,
            _synced: true,
            _lastSync: new Date().toISOString(),
            _syncSource: 'indexeddb'
        };
        
        // Đẩy lên Firestore
        await firestore.collection(collectionName)
            .doc(docId)
            .set(dataToSync, { merge: true });
        
        console.log(`✅ Đã đẩy lên Firebase: ${storeName}/${docId}`);
        
        // Xử lý các sync đang chờ
        await processPendingSyncs();
        
    } catch (error) {
        console.error('❌ Lỗi đẩy lên Firebase:', error);
        // Lưu vào hàng đợi
        firebaseSync.pendingSyncs.push({ storeName, data, timestamp: new Date() });
    }
}

async function processPendingSyncs() {
    if (firebaseSync.isSyncing || firebaseSync.pendingSyncs.length === 0) return;
    
    const firestore = initFirebase();
    if (!firestore) return;
    
    firebaseSync.isSyncing = true;
    
    const failed = [];
    while (firebaseSync.pendingSyncs.length > 0) {
        const item = firebaseSync.pendingSyncs.shift();
        try {
            await pushToFirebase(item.storeName, item.data);
        } catch (error) {
            failed.push(item);
        }
    }
    
    // Thêm lại các item thất bại
    firebaseSync.pendingSyncs.push(...failed);
    firebaseSync.isSyncing = false;
}

// ==================== CÁC HÀM DATABASE VỚI SYNC TỰ ĐỘNG ====================

// Hàm dbAdd với tự động sync Firebase (SIMPLE VERSION)
async function dbAddWithSync(storeName, data) {
    console.log(`➕ dbAddWithSync: ${storeName}`);
    
    // 1. Lưu vào IndexedDB bằng hàm gốc
    const result = await dbAdd(storeName, data);
    
    // 2. Kiểm tra Firebase có sẵn không
    const firestore = initFirebase();
    if (!firestore || !firebaseSync.enabled) {
        console.log(`📴 Firebase not available - saved to IndexedDB only`);
        return result;
    }
    
    // 3. Lấy data đã lưu
    const savedData = await dbGet(storeName, result);
    if (!savedData) return result;
    
    // 4. Thêm metadata sync
    const dataWithSync = {
        ...savedData,
        _synced: false,
        _lastSync: null,
        _syncSource: 'indexeddb'
    };
    
    // 5. Đẩy lên Firebase
    console.log(`🚀 Syncing to Firebase: ${storeName}/${result}`);
    
    const collectionMap = {
        'employees': 'employees',
        'inventory': 'inventory',
        'reports': 'reports',
        'attendance': 'attendance',
        'discipline_records': 'discipline_records'
    };
    
    const collectionName = collectionMap[storeName] || storeName;
    let docId = result.toString();
    
    // Tìm ID field
    if (dataWithSync.employeeId) docId = dataWithSync.employeeId;
    else if (dataWithSync.productId) docId = dataWithSync.productId;
    else if (dataWithSync.reportId) docId = dataWithSync.reportId;
    
    try {
        await firestore.collection(collectionName)
            .doc(docId)
            .set(dataWithSync, { merge: true });
        
        console.log(`✅ Firebase sync success: ${collectionName}/${docId}`);
        
        // Cập nhật trạng thái
        await dbUpdate(storeName, result, {
            _synced: true,
            _lastSync: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(`❌ Firebase sync error:`, error);
        // Vẫn trả về result từ IndexedDB
    }
    
    return result;
}

// Hàm dbUpdate với tự động sync Firebase
async function dbUpdateWithSync(storeName, key, updates) {
    // Cập nhật IndexedDB - GỌI HÀM GỐC
    const result = await dbUpdate(storeName, key, updates);
    
    // Đánh dấu chưa đồng bộ
    await dbUpdate(storeName, key, {
        _synced: false,
        _lastSync: null
    });
    
    // Đẩy lên Firebase (ngầm)
    const updatedData = await dbGet(storeName, key);
    if (updatedData) {
        pushToFirebase(storeName, updatedData).catch(err => {
            console.warn('Lỗi sync Firebase (sẽ thử lại sau):', err);
        });
    }
    
    return result;
}

// Hàm dbDelete với tự động sync Firebase
async function dbDeleteWithSync(storeName, key) {
    // Lấy dữ liệu trước khi xóa
    const data = await dbGet(storeName, key);
    
    // Xóa khỏi IndexedDB - GỌI HÀM GỐC
    await dbDelete(storeName, key);
    
    // Đánh dấu xóa trên Firebase
    if (data && firebaseSync.enabled) {
        data._deleted = true;
        pushToFirebase(storeName, data).catch(err => {
            console.warn('Lỗi xóa trên Firebase:', err);
        });
    }
}

// ==================== QUẢN LÝ SYNC ====================

// Bật/tắt đồng bộ
function enableFirebaseSync(enable = true) {
    firebaseSync.enabled = enable;
    console.log(`🔄 Firebase sync: ${enable ? 'BẬT' : 'TẮT'}`);
}

// Khởi động đồng bộ định kỳ (SỬA LẠI)
function startPeriodicSync(intervalMinutes = 10) {
    // Kiểm tra Firebase có sẵn không
    const firestore = initFirebase();
    if (!firestore) {
        console.log('📴 Firebase không khả dụng - Chỉ dùng IndexedDB');
        firebaseSync.enabled = false;
        return;
    }
    
    console.log('🚀 Khởi động Firebase sync...');
    
    // Đồng bộ ngay lần đầu
    setTimeout(() => {
        syncFromFirebase().catch(err => {
            console.warn('Lỗi đồng bộ lần đầu:', err);
        });
    }, 3000);
    
    // Đồng bộ định kỳ
    setInterval(() => {
        if (firebaseSync.enabled) {
            syncFromFirebase().catch(err => {
                console.warn('Lỗi đồng bộ định kỳ:', err);
            });
        }
    }, intervalMinutes * 60 * 1000);
}

// Kiểm tra kết nối Firebase (ĐƠN GIẢN HÓA)
async function checkFirebaseConnection() {
    const firestore = initFirebase();
    if (!firestore) return false;
    
    try {
        // Thử một truy vấn đơn giản thay vì dùng .info/connected
        const testRef = firestore.collection('test').limit(1);
        await testRef.get();
        return true;
    } catch (error) {
        return false;
    }
}

// ==================== EXPOSE RA WINDOW ====================

if (typeof window !== 'undefined') {
    // Expose các hàm cũ - KHÔNG gán đè, giữ nguyên hàm gốc
    window.db = db;
    window.dbGetAll = dbGetAll;
    window.dbAdd = dbAdd;  // HÀM GỐC không có sync
    window.dbGet = dbGet;
    window.dbUpdate = dbUpdate;  // HÀM GỐC không có sync
    window.dbDelete = dbDelete;  // HÀM GỐC không có sync
    window.initializeDatabase = initializeDatabase;
    window.formatDate = formatDate;
    window.dbGetAllByRange = dbGetAllByRange;
    
    // Expose các hàm Firebase sync RIÊNG
    window.dbAddWithSync = dbAddWithSync;
    window.dbUpdateWithSync = dbUpdateWithSync;
    window.dbDeleteWithSync = dbDeleteWithSync;
    
    // Expose các hàm Firebase sync management
    window.firebaseSync = firebaseSync;
    window.syncFromFirebase = syncFromFirebase;
    window.enableFirebaseSync = enableFirebaseSync;
    window.startPeriodicSync = startPeriodicSync;
    window.checkFirebaseConnection = checkFirebaseConnection;
    
    console.log('✅ Database functions exposed to window');
    
    // Tự động khởi động sync sau khi DB sẵn sàng
    setTimeout(() => {
        // Kiểm tra Firebase có sẵn không
        const firestore = initFirebase();
        if (!firestore) {
            console.log('📴 Chế độ offline - Chỉ dùng IndexedDB');
            return;
        }
        
        // Có Firebase, khởi động sync
        console.log('🚀 Khởi động Firebase sync...');
        startPeriodicSync(10); // 10 phút đồng bộ 1 lần
        
        // Đồng bộ luôn (sẽ tự fail nếu không có mạng)
        setTimeout(() => {
            syncFromFirebase().catch(err => {
                console.log('📴 Không thể đồng bộ - Có thể đang offline');
            });
        }, 5000);
        
    }, 2000);
}