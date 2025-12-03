// =========================================================
// DATABASE SYSTEM - CORE CONFIGURATION
// =========================================================

const DB_NAME = 'CafeManagementDB';
const DB_VERSION = 10; // ⚠️ FIX: Tăng version lên 10 để buộc IndexedDB tạo store work_logs

// Database instance
let db = null;
let dbInitialized = false;

// Firebase sync state
let firebaseSync = {
    enabled: true,
    isSyncing: false,
    pendingSyncs: [],
    db: null,
    syncStarted: false
};

// =========================================================
// 1. INITIALIZATION & STRUCTURE
// =========================================================

function initializeDatabase() {
    return new Promise((resolve, reject) => {
        if (db && dbInitialized) {
            console.log('📌 Database already initialized');
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('❌ Database error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            dbInitialized = true;
            console.log('✅ Database opened successfully');
            
            // Initialize and start Firebase sync system
            initializeFirebase();
            startSyncSystem();
            
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            createObjectStores(database);
        };
    });
}

function createObjectStores(database) {
    // Định nghĩa các store và keyPath
    const stores = [
        { name: 'employees', keyPath: 'employeeId', indexes: ['phone', 'status', 'role', '_synced'] },
        { name: 'reports', keyPath: 'reportId', indexes: ['date', 'createdBy', '_synced'] },
        { name: 'operations', keyPath: 'operationId', indexes: ['date', 'type', 'dateKey', '_synced'] }, 
        { name: 'inventory', keyPath: 'productId', indexes: ['name', 'category', '_synced'] },
        { name: 'inventoryHistory', keyPath: 'historyId', indexes: ['productId', 'date', 'type', '_synced'] }, 
        { name: 'attendance', keyPath: 'attendanceId', indexes: ['employeeId', 'date', 'month', '_synced'] },
        // THÊM STORE CHO CHẾ TÀI NHÂN VIÊN
        { name: 'discipline_records', keyPath: 'recordId', indexes: ['employeeId', 'month', 'type', '_synced'] },
        // THÊM STORE CHO LỊCH SỬ LÀM VIỆC (WORK LOGS) - ĐÃ CÓ VÀ ĐANG THIẾU
        { name: 'work_logs', keyPath: 'logId', indexes: ['employeeId', 'date', '_synced'] },
        { name: 'settings', keyPath: 'key', indexes: [] }
    ];

    stores.forEach(storeConfig => {
        if (!database.objectStoreNames.contains(storeConfig.name)) {
            const store = database.createObjectStore(storeConfig.name, { keyPath: storeConfig.keyPath });
            storeConfig.indexes.forEach(index => {
                store.createIndex(index, index, { unique: index === 'phone' });
            });
        }
    });

    console.log('✅ Object stores created/checked');
}

// =========================================================
// 3. CRUD OPERATIONS
// =========================================================

/**
 * @name dbTransaction
 * @description Thực hiện một giao dịch IndexedDB.
 */
function dbTransaction(storeName, mode, callback) {
    return new Promise((resolve, reject) => {
        if (!db) {
            console.error('❌ Database not initialized.');
            reject(new Error('Database not initialized.'));
            return;
        }
        
        // Dòng 103: Nơi lỗi NotFoundError xảy ra nếu storeName không tồn tại
        const transaction = db.transaction(storeName, mode); 
        const store = transaction.objectStore(storeName);

        // Xử lý sự kiện hoàn tất giao dịch
        transaction.oncomplete = () => {
            // resolve(result); // Không cần resolve ở đây nếu đã resolve trong callback
        };

        // Xử lý lỗi giao dịch
        transaction.onerror = (event) => {
            console.error('❌ Transaction error:', event.target.error);
            reject(event.target.error);
        };

        // Chạy callback để thực hiện thao tác CRUD
        callback(store, resolve, reject);
    });
}


/**
 * @name dbAdd
 * @description Thêm một bản ghi mới vào Object Store.
 */
function dbAdd(storeName, data) {
    return dbTransaction(storeName, 'readwrite', (store, resolve, reject) => {
        // Đảm bảo data là object chứa keyPath (ví dụ: employeeId)
        const request = store.add(data); 
        
        request.onsuccess = (event) => {
            // Đánh dấu cần đồng bộ Firebase (Giả định firebaseSync tồn tại)
            if (typeof firebaseSync !== 'undefined') {
                firebaseSync.pendingSyncs.push({ storeName, type: 'add', data });
            }
            // Resolve với key mới được tạo
            resolve(event.target.result); 
        };
        
        request.onerror = (event) => {
            console.error(`❌ DB Add Error for store ${storeName}:`, event.target.error);
            // Reject với lỗi của IndexedDB để hàm gọi catch được
            reject(event.target.error); 
        };
    });
}

function dbGet(storeName, key) {
    return dbTransaction(storeName, 'readonly', (store, resolve, reject) => {
        // ⚠️ FIX: Kiểm tra key trước khi gọi store.get
        if (key === undefined || key === null || key === '') {
            console.warn(`❌ dbGet called without a valid key for store: ${storeName}`);
            resolve(null); // Trả về null thay vì gây lỗi
            return;
        }

        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbUpdate(storeName, key, updates) {
    return dbTransaction(storeName, 'readwrite', (store, resolve, reject) => {
        const getRequest = store.get(key);

        getRequest.onsuccess = () => {
            const existing = getRequest.result;

            // Nếu không tồn tại, tạo đối tượng mới để put
            const updated = existing ? { ...existing, ...updates } : { [store.keyPath]: key, ...updates };

            const putRequest = store.put(updated);

            putRequest.onsuccess = () => {
                // Đã loại bỏ log debug Index ở đây
                resolve(updated);
            };
            putRequest.onerror = () => reject(putRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
}

function dbDelete(storeName, key) {
    return dbTransaction(storeName, 'readwrite', (store, resolve, reject) => {
        // ⚠️ FIX: Kiểm tra key trước khi gọi store.delete để tránh DataError
        // Cảnh báo này (database.js:206) là đúng và không gây lỗi crash app.
        if (key === undefined || key === null || key === '') {
            console.warn(`❌ dbDelete called without a valid key for store: ${storeName}. Skipping delete.`);
            resolve(); // Resolve thành công vì không có gì để xóa
            return;
        }

        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function dbGetAll(storeName, indexName = null, range = null) {
    return dbTransaction(storeName, 'readonly', (store, resolve, reject) => {
        let request;
        if (indexName) {
            const index = store.index(indexName);
            request = index.getAll(range);
        } else {
            request = store.getAll();
        }

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function dbClear(storeName) {
    return dbTransaction(storeName, 'readwrite', (store, resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// =========================================================
// 3. BUSINESS LOGIC & DATA MODELING (CRUD)
// =========================================================

// EMPLOYEE FUNCTIONS
async function addEmployee(employeeData) {
    const employee = {
        employeeId: 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        ...employeeData, 
        updatedAt: new Date().toISOString(),
        _synced: false
    };
    await dbAdd('employees', employee);
    if (firebaseSync.enabled) await syncToFirebase('employees', employee);
    return employee;
}

async function updateEmployee(employeeId, updates) {
    const updated = await dbUpdate('employees', employeeId, {
        ...updates,
        updatedAt: new Date().toISOString(),
        _synced: false
    });
    if (firebaseSync.enabled) await syncToFirebase('employees', updated);
    return updated;
}

// REPORT FUNCTIONS
async function addReport(reportData) {
    const report = {
        reportId: reportData.date.replace(/-/g, ''), 
        ...reportData, 
        createdAt: new Date().toISOString(),
        _synced: false
    };
    await dbAdd('reports', report);
    if (firebaseSync.enabled) await syncToFirebase('reports', report);
    return report;
}

// INVENTORY FUNCTIONS
async function addInventory(productData) {
    const product = {
        productId: 'prod_' + Date.now(),
        ...productData, 
        lastUpdated: new Date().toISOString(),
        _synced: false
    };
    await dbAdd('inventory', product);
    if (firebaseSync.enabled) await syncToFirebase('inventory', product);
    return product;
}

async function updateInventory(productId, updates) {
    const updated = await dbUpdate('inventory', productId, {
        ...updates,
        lastUpdated: new Date().toISOString(),
        _synced: false
    });
    if (firebaseSync.enabled) await syncToFirebase('inventory', updated);
    return updated;
}

// =========================================================
// 4. FIREBASE SYNC SYSTEM (LOGIC CHUẨN XÁC)
// =========================================================

function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
            console.log('⚠️ Firebase not available - offline mode');
            firebaseSync.enabled = false;
            return null;
        }
        if (!firebaseSync.db) {
            firebaseSync.db = firebase.firestore();
            console.log('✅ Firebase Firestore initialized');
        }
        return firebaseSync.db;
    } catch (error) {
        console.warn('⚠️ Firebase init error:', error);
        firebaseSync.enabled = false;
        return null;
    }
}

async function syncToFirebase(storeName, data) {
    if (!firebaseSync.enabled || !firebaseSync.db) {
        if (data) { 
            firebaseSync.pendingSyncs.push({ storeName, data, timestamp: new Date() });
        }
        return false;
    }
    
    if (!data) { 
        console.error('❌ syncToFirebase called without data argument.');
        return false;
    }

    try {
        let docId;
        if (data.employeeId) docId = data.employeeId;
        else if (data.reportId) docId = data.reportId;
        else if (data.operationId) docId = data.operationId; 
        else if (data.productId) docId = data.productId;
        else if (data.attendanceId) docId = data.attendanceId;
        else if (data.historyId) docId = data.historyId; 
        else if (data.recordId) docId = data.recordId; 
        else if (data.logId) docId = data.logId; // Work Logs
        else docId = firebaseSync.db.collection(storeName).doc().id;
        
        const syncData = {
            ...data,
            _synced: true,
            _lastSync: new Date().toISOString(),
            _deviceId: localStorage.getItem('device_id') || 'unknown'
        };
        
        await firebaseSync.db.collection(storeName)
            .doc(docId)
            .set(syncData, { merge: true });
        
        console.log(`✅ Synced to Firebase: ${storeName}/${docId}`);
        
        try {
            await dbUpdate(storeName, docId, { _synced: true, _lastSync: new Date().toISOString() });
        } catch (error) {
            // Bỏ qua nếu không thể cập nhật local 
        }
        
        return true;
    } catch (error) {
        console.error('❌ Sync error:', error);
        firebaseSync.pendingSyncs.push({ storeName, data, timestamp: new Date() });
        return false;
    }
}

async function syncFromFirebase() {
    if (!firebaseSync.enabled || !firebaseSync.db || firebaseSync.isSyncing) {
        return;
    }
    
    firebaseSync.isSyncing = true;
    console.log('🔄 Syncing from Firebase...');
    
    try {
        await syncCollectionFromFirebase('inventory', 'productId');
        await syncCollectionFromFirebase('employees', 'employeeId');
        await syncCollectionFromFirebase('reports', 'reportId');
        await syncCollectionFromFirebase('inventoryHistory', 'historyId'); 
        await syncCollectionFromFirebase('attendance', 'attendanceId');
        await syncCollectionFromFirebase('operations', 'operationId'); 
        await syncCollectionFromFirebase('discipline_records', 'recordId'); 
        await syncCollectionFromFirebase('work_logs', 'logId'); // Work Logs
        
        console.log('✅ Firebase sync complete');
        
        document.dispatchEvent(new CustomEvent('firebase-sync-complete'));
        
    } catch (error) {
        console.error('❌ Firebase sync error:', error);
    } finally {
        firebaseSync.isSyncing = false;
    }
}

/**
 * @name syncCollectionFromFirebase
 */
async function syncCollectionFromFirebase(collectionName, idField) {
    if (!firebaseSync.db) return;
    
    try {
        const snapshot = await firebaseSync.db.collection(collectionName).get();
        const firebaseIds = new Set();
        let updatedCount = 0;
        let deletedCount = 0;
        
        // --- BƯỚC 1: CẬP NHẬT/THÊM DỮ LIỆU TỪ FIREBASE ---
        for (const doc of snapshot.docs) {
            const firebaseData = doc.data();
            const itemId = firebaseData[idField];
            firebaseIds.add(itemId); 
            
            delete firebaseData._deviceId; 
            delete firebaseData._lastSync;
            
            try {
                // Sử dụng dbUpdate, nó sẽ tự động thêm nếu chưa tồn tại
                await dbUpdate(collectionName, itemId, {
                    ...firebaseData,
                    _synced: true, 
                });
                updatedCount++;
                
            } catch (error) {
                console.warn(`Error updating/adding ${collectionName}/${itemId}:`, error);
            }
        }
        
        // --- BƯỚC 2: XỬ LÝ XÓA DỮ LIỆU CỤC BỘ ---
        const localRecords = await dbGetAll(collectionName);
        
        for (const record of localRecords) {
            // Kiểm tra record[idField] để tránh lỗi nếu dữ liệu cục bộ bị hỏng
            if (record[idField] && !firebaseIds.has(record[idField])) {
                await dbDelete(collectionName, record[idField]);
                deletedCount++;
            }
        }
        
        if (updatedCount > 0 || deletedCount > 0) {
            console.log(`✅ Synced ${collectionName} from Firebase: ${updatedCount} updated/added, ${deletedCount} deleted.`);
            
            document.dispatchEvent(new CustomEvent('data-updated', {
                detail: { collection: collectionName, count: updatedCount + deletedCount }
            }));
        }
        
    } catch (error) {
        // Dòng 459: Nơi lỗi NotFoundError xảy ra khi dbGetAll gọi dbTransaction
        console.error(`Error syncing ${collectionName}:`, error);
    }
}

function startSyncSystem() {
    if (firebaseSync.syncStarted) return;
    
    console.log('🚀 Starting sync system...');
    firebaseSync.syncStarted = true;
    
    setTimeout(() => {
        if (firebaseSync.enabled) {
            syncFromFirebase().catch(console.error);
        }
    }, 3000);
    
    // Đồng bộ định kỳ 5 phút 
    setInterval(() => {
        if (firebaseSync.enabled && !firebaseSync.isSyncing) {
            syncFromFirebase().catch(console.error);
        }
    }, 5 * 60 * 1000);
    
    // Xử lý các sync đang chờ (pending) định kỳ 1 phút
    setInterval(async () => {
        if (firebaseSync.enabled && firebaseSync.pendingSyncs.length > 0) {
            const pending = firebaseSync.pendingSyncs.shift(); // Lấy bản ghi đầu tiên
            console.log(`🔄 Retrying pending sync for ${pending.storeName}...`);
            await syncToFirebase(pending.storeName, pending.data);
        }
    }, 60 * 1000);
}

// =========================================================
// 5. EXPOSE TO WINDOW & UTILITIES
// =========================================================

// ... (Giữ nguyên các hàm tiện ích và initializeSampleData)

// ==================== EXPOSE TO WINDOW ====================
if (typeof window !== 'undefined') {
    window.initializeDatabase = initializeDatabase;
    
    // Basic CRUD operations
    window.dbAdd = dbAdd;
    window.dbGet = dbGet;
    window.dbUpdate = dbUpdate;
    window.dbDelete = dbDelete;
    window.dbGetAll = dbGetAll;
    window.dbClear = dbClear; 
    
    // Business functions
    window.getAllEmployees = async () => dbGetAll('employees');
    window.updateEmployee = updateEmployee;
    window.addReport = addReport;
    window.updateInventory = updateInventory;
    window.getAllInventory = async () => dbGetAll('inventory');
    
    // Sync functions
    window.syncFromFirebase = syncFromFirebase;
    window.syncToFirebase = syncToFirebase;
    
    window.firebaseSync = firebaseSync;
    
    console.log('✅ Database system loaded successfully');
    
    setTimeout(() => {
        initializeDatabase().then(() => {
            console.log('🚀 Database auto-initialized');
        }).catch(console.error);
    }, 100);
}