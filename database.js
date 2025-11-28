// Database configuration and utilities
const DB_NAME = 'CafeManagementDB';
const DB_VERSION = 3;

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