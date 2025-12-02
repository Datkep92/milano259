const DB_NAME = 'CafeManagementDB';
const DB_VERSION = 6;

// Database instance - THÊM FLAG ĐÃ KHỞI TẠO
let db = null;
let dbInitialized = false; // THÊM: Flag để tránh khởi tạo nhiều lần
let storeInstance = null; // THÊM: Single instance của CafeStore

// Firebase sync config
let firebaseSync = {
    enabled: true,
    isSyncing: false,
    pendingSyncs: [],
    db: null,
    syncStarted: false // THÊM: Flag để tránh start sync nhiều lần
};

// ==================== CORE STORE (UPDATED - SINGLETON) ====================
class CafeStore {
    constructor() {
        // Chỉ khởi tạo 1 lần
        if (storeInstance) {
            return storeInstance;
        }
        
        this.events = new EventTarget();
        this.pendingActions = [];
        this.syncTimeout = null;
        this.deviceId = this.getDeviceId();
        this.initialized = false;
        
        console.log('✅ CafeStore initialized');
        storeInstance = this;
    }
    
    // THÊM: Hàm init để đảm bảo chỉ chạy 1 lần
    async init() {
        if (this.initialized) return;
        
        // Load sample data if empty
        await checkAndLoadSampleData();
        
        // Auto-start Firebase sync
        if (!firebaseSync.syncStarted) {
            setTimeout(() => {
                initFirebase();
                startPeriodicSync(10);
            }, 2000);
        }
        
        this.initialized = true;
    }
    
    async dispatch(action) {
        console.log('🔄 Store dispatch:', action.type);
        
        // Add metadata
        const actionWithMeta = {
            ...action,
            meta: {
                ...action.meta,
                timestamp: Date.now(),
                deviceId: this.deviceId,
                actionId: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            }
        };
        
        // Process for UI
        const result = await this.processAction(actionWithMeta);
        
        // Queue for sync
        if (action.meta?.needsSync !== false) {
            this.queueForSync(actionWithMeta);
        }
        
        return result;
    }
    
    async processAction(action) {
        const { type, payload } = action;
        
        try {
            let result;
            let storeName;
            
            switch (type) {
                case 'EMPLOYEE_ADD':
                    storeName = 'employees';
                    result = await this.addEmployee(payload);
                    break;
                case 'EMPLOYEE_UPDATE':
                    storeName = 'employees';
                    result = await this.updateEmployee(payload);
                    break;
                case 'EMPLOYEE_DELETE':
                    storeName = 'employees';
                    result = await this.deleteEmployee(payload);
                    break;
                case 'INVENTORY_ADD':
                    storeName = 'inventory';
                    result = await this.addInventory(payload);
                    break;
                case 'INVENTORY_UPDATE':
                    storeName = 'inventory';
                    result = await this.updateInventory(payload);
                    break;
                case 'ATTENDANCE_ADD':
                    storeName = 'attendance';
                    result = await this.addAttendance(payload);
                    break;
                case 'REPORT_ADD':
                    storeName = 'reports';
                    result = await this.addReport(payload);
                    break;
                case 'DISCIPLINE_ADD':
                    storeName = 'discipline_records';
                    result = await this.addDiscipline(payload);
                    break;
                default:
                    console.warn('Unknown action type:', type);
                    return null;
            }
            
            // Emit event for UI
            this.events.dispatchEvent(new CustomEvent('data-changed', {
                detail: { 
                    store: storeName,
                    action: type,
                    data: result,
                    payload: payload
                }
            }));
            
            return result;
            
        } catch (error) {
            console.error('❌ Error processing action:', error);
            throw error;
        }
    }
    
    // CRUD methods với metadata
    async addEmployee(data) {
        const employeeData = {
            ...data,
            employeeId: data.employeeId || 'emp_' + Date.now(),
            _version: 1,
            _createdAt: new Date().toISOString(),
            _updatedAt: new Date().toISOString(),
            _deviceId: this.deviceId,
            _synced: false
        };
        
        return await dbAddWithSync('employees', employeeData);
    }
    
    async updateEmployee(data) {
        const current = await dbGet('employees', data.employeeId);
        if (!current) throw new Error('Employee not found');
        
        const updateData = {
            ...data,
            _version: (current._version || 0) + 1,
            _updatedAt: new Date().toISOString(),
            _deviceId: this.deviceId,
            _synced: false
        };
        
        return await dbUpdateWithSync('employees', data.employeeId, updateData);
    }
    
    async deleteEmployee(employeeId) {
        return await dbUpdateWithSync('employees', employeeId, {
            status: 'deleted',
            _deletedAt: new Date().toISOString(),
            _version: (await dbGet('employees', employeeId))._version + 1,
            _synced: false
        });
    }
    
    async addInventory(data) {
        const inventoryData = {
            ...data,
            productId: data.productId || 'prod_' + Date.now(),
            _version: 1,
            _createdAt: new Date().toISOString(),
            _updatedAt: new Date().toISOString(),
            _deviceId: this.deviceId,
            _synced: false
        };
        
        return await dbAddWithSync('inventory', inventoryData);
    }
    
    async updateInventory(data) {
        const current = await dbGet('inventory', data.productId);
        if (!current) throw new Error('Product not found');
        
        const updateData = {
            ...data,
            _version: (current._version || 0) + 1,
            _updatedAt: new Date().toISOString(),
            _deviceId: this.deviceId,
            _synced: false
        };
        
        return await dbUpdateWithSync('inventory', data.productId, updateData);
    }
    
    async addAttendance(data) {
        const attendanceData = {
            ...data,
            attendanceId: data.attendanceId || Date.now(),
            _version: 1,
            _createdAt: new Date().toISOString(),
            _deviceId: this.deviceId,
            _synced: false
        };
        
        return await dbAddWithSync('attendance', attendanceData);
    }
    
    async addReport(data) {
        const reportData = {
            ...data,
            reportId: data.reportId || 'rep_' + Date.now(),
            _version: 1,
            _createdAt: new Date().toISOString(),
            _deviceId: this.deviceId,
            _synced: false
        };
        
        return await dbAddWithSync('reports', reportData);
    }
    
    async addDiscipline(data) {
        const disciplineData = {
            ...data,
            id: data.id || Date.now(),
            _version: 1,
            _createdAt: new Date().toISOString(),
            _deviceId: this.deviceId,
            _synced: false
        };
        
        return await dbAddWithSync('discipline_records', disciplineData);
    }
    
    queueForSync(action) {
        this.pendingActions.push(action);
        
        clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => {
            this.processSyncQueue();
        }, 3000); // Debounce 3 giây
    }
    
    async processSyncQueue() {
        if (this.pendingActions.length === 0 || !firebaseSync.enabled) return;
        
        const actions = [...this.pendingActions];
        this.pendingActions = [];
        
        for (const action of actions) {
            try {
                await pushToFirebase(this.getStoreFromAction(action), action.payload);
            } catch (error) {
                console.error('Sync failed, re-queueing:', error);
                this.pendingActions.push(action);
            }
        }
    }
    
    getStoreFromAction(action) {
        if (action.type.includes('EMPLOYEE')) return 'employees';
        if (action.type.includes('INVENTORY')) return 'inventory';
        if (action.type.includes('ATTENDANCE')) return 'attendance';
        if (action.type.includes('REPORT')) return 'reports';
        if (action.type.includes('DISCIPLINE')) return 'discipline_records';
        return null;
    }
    
    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }
}

// Initialize database - THÊM CHECK TRÁNH GỌI NHIỀU LẦN
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        // Nếu đã khởi tạo, return instance hiện tại
        if (db && dbInitialized) {
            console.log('📌 Database already initialized, returning existing instance');
            resolve(db);
            return;
        }
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Database error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            dbInitialized = true;
            console.log('✅ Database opened successfully');
            
            // Initialize store (singleton)
            if (!storeInstance) {
                window.cafeStore = new CafeStore();
                
                // Gọi init store (chỉ 1 lần)
                setTimeout(() => {
                    window.cafeStore.init().catch(console.error);
                }, 500);
            }
            
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            createObjectStores(database);
        };
    });
}

// Create object stores - GIỮ NGUYÊN CẤU TRÚC GỐC + THÊM INDEX
function createObjectStores(database) {
    // Employees store
    if (!database.objectStoreNames.contains('employees')) {
        const employeesStore = database.createObjectStore('employees', { 
            keyPath: 'employeeId',
            autoIncrement: false 
        });
        employeesStore.createIndex('phone', 'phone', { unique: true });
        employeesStore.createIndex('status', 'status', { unique: false });
        employeesStore.createIndex('_version', '_version', { unique: false });
        employeesStore.createIndex('_synced', '_synced', { unique: false });
    } else {
        // Upgrade existing store
        const tx = database.transaction(['employees'], 'readwrite');
        const store = tx.objectStore('employees');
        
        // Add indexes if not exist
        if (!store.indexNames.contains('_version')) {
            store.createIndex('_version', '_version', { unique: false });
        }
        if (!store.indexNames.contains('_synced')) {
            store.createIndex('_synced', '_synced', { unique: false });
        }
    }

    // Reports store
    if (!database.objectStoreNames.contains('reports')) {
        const reportsStore = database.createObjectStore('reports', { 
            keyPath: 'reportId' 
        });
        reportsStore.createIndex('date', 'date', { unique: true });
        reportsStore.createIndex('createdBy', 'createdBy', { unique: false });
        reportsStore.createIndex('_version', '_version', { unique: false });
        reportsStore.createIndex('_synced', '_synced', { unique: false });
    }

    // Inventory store
    if (!database.objectStoreNames.contains('inventory')) {
        const inventoryStore = database.createObjectStore('inventory', { 
            keyPath: 'productId' 
        });
        inventoryStore.createIndex('name', 'name', { unique: false });
        inventoryStore.createIndex('minStock', 'minStock', { unique: false });
        inventoryStore.createIndex('_version', '_version', { unique: false });
        inventoryStore.createIndex('_synced', '_synced', { unique: false });
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
        historyStore.createIndex('_synced', '_synced', { unique: false });
    }

    // Operations store
    if (!database.objectStoreNames.contains('operations')) {
        const operationsStore = database.createObjectStore('operations', { 
            keyPath: 'operationId',
            autoIncrement: true 
        });
        operationsStore.createIndex('date', 'date', { unique: false });
        operationsStore.createIndex('type', 'type', { unique: false });
        operationsStore.createIndex('_synced', '_synced', { unique: false });
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
        attendanceStore.createIndex('_synced', '_synced', { unique: false });
    }

    // ⭐ Discipline Records store (thưởng/phạt)
    if (!database.objectStoreNames.contains('discipline_records')) {
        const disciplineStore = database.createObjectStore('discipline_records', { 
            keyPath: 'id',
            autoIncrement: true 
        });
        disciplineStore.createIndex('employeeId', 'employeeId', { unique: false });
        disciplineStore.createIndex('month', 'month', { unique: false });
        disciplineStore.createIndex('type', 'type', { unique: false });
        disciplineStore.createIndex('_synced', '_synced', { unique: false });
    }

    // Settings store
    if (!database.objectStoreNames.contains('settings')) {
        const settingsStore = database.createObjectStore('settings', { 
            keyPath: 'key' 
        });
    }

    console.log('✅ Object stores created successfully');
}

// ==================== DATABASE OPERATIONS (GIỮ NGUYÊN GỐC) ====================
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

// ==================== FIREBASE SYNC (GIỮ NGUYÊN + CẢI TIẾN) ====================
// Khởi tạo Firebase
function initFirebase() {
    try {
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
            
            // Setup listeners
            setupFirebaseRealtimeListeners();
        }
        return firebaseSync.db;
    } catch (error) {
        console.warn('⚠️ Firebase không khả dụng:', error);
        return null;
    }
}

// Đồng bộ từ Firebase về IndexedDB (GIỮ NGUYÊN)
async function syncFromFirebase() {
    if (!firebaseSync.enabled || firebaseSync.isSyncing) return;
    
    const firestore = initFirebase();
    if (!firestore) return;
    
    firebaseSync.isSyncing = true;
    console.log('🔄 Đồng bộ từ Firebase...');
    
    try {
        await syncCollection(firestore, 'employees', 'employees', 'employeeId');
        await syncCollection(firestore, 'inventory', 'inventory', 'productId');
        await syncCollection(firestore, 'reports', 'reports', 'reportId');
        await syncCollection(firestore, 'attendance', 'attendance', 'attendanceId');
        await syncCollection(firestore, 'discipline_records', 'discipline_records', 'id');
        
        console.log('✅ Đồng bộ Firebase hoàn tất');
        
        // Trigger UI update
        if (window.cafeStore) {
            window.cafeStore.events.dispatchEvent(new CustomEvent('firebase-sync-complete'));
        }
        
    } catch (error) {
        console.error('❌ Lỗi đồng bộ Firebase:', error);
    } finally {
        firebaseSync.isSyncing = false;
    }
}

async function syncCollection(firestore, firestoreCol, indexedDBStore, keyField) {
    try {
        const snapshot = await firestore.collection(firestoreCol).get();
        let count = 0;
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            
            // Skip if data is from current device (prevent loop)
            if (data._deviceId === window.cafeStore?.deviceId && data._synced) {
                continue;
            }
            
            const item = { 
                ...data, 
                _synced: true,
                _lastSync: new Date().toISOString()
            };
            
            try {
                const existing = await dbGet(indexedDBStore, item[keyField]);
                if (existing) {
                    // Smart merge: only update if Firebase data is newer
                    const existingTime = new Date(existing._updatedAt || 0).getTime();
                    const newTime = new Date(item._updatedAt || 0).getTime();
                    
                    if (newTime > existingTime) {
                        await dbUpdate(indexedDBStore, item[keyField], item);
                        count++;
                    }
                } else {
                    await dbAdd(indexedDBStore, item);
                    count++;
                }
            } catch (err) {
                console.warn(`Không thể lưu ${firestoreCol}:`, err);
            }
        }
        
        if (count > 0) {
            console.log(`✅ Đồng bộ ${count} ${firestoreCol}`);
            
            // Notify UI
            if (window.cafeStore) {
                window.cafeStore.events.dispatchEvent(new CustomEvent('data-changed', {
                    detail: { store: indexedDBStore, action: 'firebase-sync' }
                }));
            }
        }
    } catch (error) {
        console.error(`Lỗi đồng bộ ${firestoreCol}:`, error);
    }
}

// ==================== EVENT LISTENERS FIX ====================
function setupFirebaseRealtimeListeners() {
    const firestore = initFirebase();
    if (!firestore) return;
    
    console.log('👂 Setting up Firebase realtime listeners...');
    
    // ĐẢM BẢO CHỈ SETUP 1 LẦN
    if (window.firebaseListenersSetup) {
        console.log('📌 Firebase listeners already setup');
        return;
    }
    
    // Lắng nghe employees với debounce
    let employeeDebounce;
    const employeesUnsubscribe = firestore.collection('employees')
        .onSnapshot((snapshot) => {
            clearTimeout(employeeDebounce);
            employeeDebounce = setTimeout(() => {
                console.log('🔄 Employees collection changed');
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added' || change.type === 'modified') {
                        handleFirebaseChange('employees', change.doc.data());
                    } else if (change.type === 'removed') {
                        handleFirebaseDelete('employees', change.doc.id);
                    }
                });
            }, 1000); // Debounce 1 giây
        }, (error) => {
            console.error('❌ Employees listener error:', error);
        });
    
    // Tương tự cho các collection khác...
    
    window.firebaseListenersSetup = true;
    console.log('✅ Firebase realtime listeners setup complete');
}

// Xử lý khi có thay đổi từ Firebase
async function handleFirebaseChange(storeName, data) {
    // Skip if data is from current device
    if (data._deviceId === window.cafeStore?.deviceId) {
        return;
    }
    
    try {
        let key;
        if (storeName === 'employees') key = data.employeeId;
        else if (storeName === 'inventory') key = data.productId;
        else if (storeName === 'reports') key = data.reportId;
        else return;
        
        const existing = await dbGet(storeName, key);
        
        if (existing) {
            // Only update if Firebase data is newer
            const existingTime = new Date(existing._updatedAt || 0).getTime();
            const newTime = new Date(data._updatedAt || 0).getTime();
            
            if (newTime > existingTime) {
                await dbUpdate(storeName, key, {
                    ...data,
                    _synced: true,
                    _lastSync: new Date().toISOString()
                });
                console.log(`✅ Updated ${storeName}/${key} from Firebase`);
                
                // Update UI
                updateUIOnFirebaseChange(storeName, data);
            }
        } else {
            await dbAdd(storeName, {
                ...data,
                _synced: true,
                _lastSync: new Date().toISOString()
            });
            console.log(`✅ Added ${storeName}/${key} from Firebase`);
            
            updateUIOnFirebaseChange(storeName, data);
        }
        
    } catch (error) {
        console.error(`❌ Error handling Firebase change for ${storeName}:`, error);
    }
}

// Xử lý khi có xóa từ Firebase
async function handleFirebaseDelete(storeName, docId) {
    try {
        await dbDelete(storeName, docId);
        console.log(`✅ Deleted ${storeName}/${docId} from IndexedDB`);
        
        updateUIOnFirebaseDelete(storeName, docId);
        
    } catch (error) {
        console.error(`❌ Error handling Firebase delete for ${storeName}:`, error);
    }
}

// Đẩy dữ liệu lên Firebase (UPDATED for arrow pattern)
async function pushToFirebase(storeName, data) {
    if (!firebaseSync.enabled) return;
    
    const firestore = initFirebase();
    if (!firestore) {
        // Lưu vào hàng đợi
        firebaseSync.pendingSyncs.push({ storeName, data, timestamp: new Date() });
        return;
    }
    
    try {
        const collectionMap = {
            'employees': 'employees',
            'inventory': 'inventory', 
            'reports': 'reports',
            'attendance': 'attendance',
            'discipline_records': 'discipline_records'
        };
        
        const collectionName = collectionMap[storeName] || storeName;
        let docId = '';
        
        if (data.employeeId) docId = data.employeeId;
        else if (data.productId) docId = data.productId;
        else if (data.reportId) docId = data.reportId;
        else if (data.attendanceId) docId = data.attendanceId.toString();
        else if (data.id) docId = data.id.toString();
        else docId = firestore.collection(collectionName).doc().id;
        
        // Mark as synced and add device info
        const dataToSync = {
            ...data,
            _synced: true,
            _lastSync: new Date().toISOString(),
            _deviceId: window.cafeStore?.deviceId || 'unknown',
            _syncSource: 'local'
        };
        
        await firestore.collection(collectionName)
            .doc(docId)
            .set(dataToSync, { merge: true });
        
        console.log(`✅ Đã đẩy lên Firebase: ${storeName}/${docId}`);
        
        // Update local record
        if (docId && storeName) {
            await dbUpdate(storeName, docId, {
                _synced: true,
                _lastSync: new Date().toISOString()
            });
        }
        
        // Process pending syncs
        await processPendingSyncs();
        
    } catch (error) {
        console.error('❌ Lỗi đẩy lên Firebase:', error);
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
    
    firebaseSync.pendingSyncs.push(...failed);
    firebaseSync.isSyncing = false;
}

// ==================== CÁC HÀM DATABASE VỚI SYNC TỰ ĐỘNG (UPDATED) ====================
async function dbAddWithSync(storeName, data) {
    // 1. Lưu vào IndexedDB
    const result = await dbAdd(storeName, data);
    
    // 2. Tự động sync lên Firebase (background)
    if (firebaseSync.enabled) {
        setTimeout(() => {
            pushToFirebase(storeName, data).catch(err => {
                console.warn('Background sync failed:', err);
            });
        }, 100);
    }
    
    return result;
}

async function dbUpdateWithSync(storeName, key, updates) {
    // 1. Cập nhật IndexedDB
    const result = await dbUpdate(storeName, key, updates);
    
    // 2. Lấy dữ liệu đã cập nhật
    const updatedData = await dbGet(storeName, key);
    
    // 3. Sync lên Firebase (background)
    if (updatedData && firebaseSync.enabled) {
        setTimeout(() => {
            pushToFirebase(storeName, updatedData).catch(err => {
                console.warn('Background sync failed:', err);
            });
        }, 100);
    }
    
    return result;
}

async function dbDeleteWithSync(storeName, key) {
    // 1. Lấy dữ liệu trước khi xóa
    const data = await dbGet(storeName, key);
    
    // 2. Xóa khỏi IndexedDB
    await dbDelete(storeName, key);
    
    // 3. Đánh dấu xóa trên Firebase
    if (data && firebaseSync.enabled) {
        data._deleted = true;
        setTimeout(() => {
            pushToFirebase(storeName, data).catch(err => {
                console.warn('Delete sync failed:', err);
            });
        }, 100);
    }
}

// ==================== UI UPDATE FUNCTIONS (GIỮ NGUYÊN) ====================
function updateUIOnFirebaseChange(storeName, data) {
    const activeTab = document.querySelector('.tab-btn.active');
    if (!activeTab) return;
    
    const activeTabId = activeTab.getAttribute('data-tab');
    
    if (
        (storeName === 'employees' && activeTabId === 'employees') ||
        (storeName === 'inventory' && activeTabId === 'inventory') ||
        (storeName === 'reports' && activeTabId === 'reports')
    ) {
        setTimeout(() => {
            if (typeof loadTabContent === 'function') {
                loadTabContent(activeTabId);
            }
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
        const itemElement = document.querySelector(`[data-id="${docId}"]`);
        if (itemElement) {
            itemElement.remove();
        }
    }
}

// ==================== UTILITY FUNCTIONS (GIỮ NGUYÊN) ====================
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

// Hàm kiểm tra và load dữ liệu mẫu
async function checkAndLoadSampleData() {
    try {
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

// ==================== QUẢN LÝ SYNC (GIỮ NGUYÊN) ====================
function enableFirebaseSync(enable = true) {
    firebaseSync.enabled = enable;
    console.log(`🔄 Firebase sync: ${enable ? 'BẬT' : 'TẮT'}`);
}

// ==================== FIREBASE SYNC (FIXED) ====================
function startPeriodicSync(intervalMinutes = 10) {
    // CHỈ start 1 lần
    if (firebaseSync.syncStarted) {
        console.log('📌 Firebase sync already started');
        return;
    }
    
    const firestore = initFirebase();
    
    if (!firestore) {
        console.log('📴 Firebase không khả dụng - Chỉ dùng IndexedDB');
        firebaseSync.enabled = false;
        return;
    }
    
    console.log('🚀 Starting Firebase sync system...');
    firebaseSync.syncStarted = true;
    
    // Initial sync sau 3 giây
    setTimeout(() => {
        syncFromFirebase().catch(err => {
            console.log('📴 Initial sync failed:', err.message);
        });
    }, 3000);
    
    // Periodic sync
    setInterval(() => {
        if (firebaseSync.enabled && !firebaseSync.isSyncing) {
            syncFromFirebase().catch(err => {
                console.warn('Lỗi đồng bộ định kỳ:', err);
            });
        }
    }, intervalMinutes * 60 * 1000);
}
// THÊM: Debounce cho sync function
let syncDebounceTimer = null;
async function debouncedSyncFromFirebase() {
    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
    }
    
    syncDebounceTimer = setTimeout(() => {
        if (!firebaseSync.isSyncing) {
            syncFromFirebase().catch(console.error);
        }
    }, 5000); // Debounce 5 giây
}
async function checkFirebaseConnection() {
    const firestore = initFirebase();
    if (!firestore) return false;
    
    try {
        const testRef = firestore.collection('test').limit(1);
        await testRef.get();
        return true;
    } catch (error) {
        return false;
    }
}

// ==================== EXPOSE TO WINDOW (UPDATED) ====================
// ==================== EXPOSE TO WINDOW (FIXED) ====================
if (typeof window !== 'undefined') {
    // Khởi tạo database ngay khi load (chỉ 1 lần)
    let dbInitStarted = false;
    
    window.initializeApp = async () => {
        if (dbInitStarted) {
            console.log('📌 App initialization already started');
            return;
        }
        
        dbInitStarted = true;
        console.log('🚀 Starting app initialization...');
        
        try {
            await initializeDatabase();
            console.log('✅ App initialization complete');
        } catch (error) {
            console.error('❌ App initialization failed:', error);
        }
    };
    
    // Auto-initialize với delay
    setTimeout(() => {
        window.initializeApp().catch(console.error);
    }, 100);
    // Giữ nguyên tất cả hàm cũ
    window.db = db;
    window.dbGetAll = dbGetAll;
    window.dbAdd = dbAdd;
    window.dbGet = dbGet;
    window.dbUpdate = dbUpdate;
    window.dbDelete = dbDelete;
    window.initializeDatabase = initializeDatabase;
    window.formatDate = formatDate;
    window.dbGetAllByRange = dbGetAllByRange;
    
    // Hàm Firebase sync
    window.dbAddWithSync = dbAddWithSync;
    window.dbUpdateWithSync = dbUpdateWithSync;
    window.dbDeleteWithSync = dbDeleteWithSync;
    
    // Firebase management
    window.firebaseSync = firebaseSync;
    window.syncFromFirebase = syncFromFirebase;
    window.enableFirebaseSync = enableFirebaseSync;
    window.startPeriodicSync = startPeriodicSync;
    window.checkFirebaseConnection = checkFirebaseConnection;
    
    // New store system
    window.cafeStore = null; // Will be initialized
    window.dispatchAction = async (action) => {
        if (window.cafeStore) {
            return await window.cafeStore.dispatch(action);
        } else {
            console.error('Store not initialized');
            return null;
        }
    };
    
    // Helper để UI subscribe
    window.subscribeToStore = (storeName, callback) => {
        if (!window.cafeStore) return () => {};
        
        const handler = (event) => {
            if (event.detail.store === storeName) {
                callback(event.detail.data, event.detail.action);
            }
        };
        
        window.cafeStore.events.addEventListener('data-changed', handler);
        return () => window.cafeStore.events.removeEventListener('data-changed', handler);
    };
    
    console.log('✅ Database system ready with Arrow Sync Pattern');
    
    // Auto-initialize
    setTimeout(() => {
        initializeDatabase().catch(console.error);
    }, 100);
}