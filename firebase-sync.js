// firebase-sync.js - Firebase đồng bộ ngầm
// Lưu ý: firebase được load từ CDN trong login.html, đã có global firebase

class FirebaseSync {
    constructor() {
        this.db = firebase.firestore();
        this.syncEnabled = true;
        this.isSyncing = false;
        this.pendingSyncs = [];
    }

    // ==================== CÁC HÀM ĐỒNG BỘ ====================

    // Đồng bộ toàn bộ dữ liệu từ Firebase về IndexedDB
    async syncFromFirebase() {
        if (!this.syncEnabled || this.isSyncing) return;
        
        this.isSyncing = true;
        console.log('🔄 Bắt đầu đồng bộ từ Firebase...');
        
        try {
            // Đồng bộ từng collection
            await this._syncCollection('employees', 'employees', 'employeeId');
            await this._syncCollection('inventory', 'inventory', 'productId');
            await this._syncCollection('reports', 'reports', 'reportId');
            await this._syncCollection('attendance', 'attendance', 'attendanceId');
            await this._syncCollection('discipline_records', 'discipline_records', 'id');
            
            console.log('✅ Đồng bộ từ Firebase hoàn tất');
        } catch (error) {
            console.error('❌ Lỗi đồng bộ Firebase:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    // Đồng bộ một collection cụ thể
    async _syncCollection(firestoreCollection, indexedDBStore, keyField) {
        try {
            const snapshot = await this.db.collection(firestoreCollection).get();
            const batch = [];
            
            snapshot.forEach(doc => {
                const data = doc.data();
                batch.push({ ...data, _synced: true });
            });
            
            // Lưu vào IndexedDB
            for (const item of batch) {
                try {
                    // Kiểm tra tồn tại
                    const existing = await window.dbGet(indexedDBStore, item[keyField]);
                    if (existing) {
                        await window.dbUpdate(indexedDBStore, item[keyField], item);
                    } else {
                        await window.dbAdd(indexedDBStore, item);
                    }
                } catch (err) {
                    console.warn(`Không thể lưu ${firestoreCollection}:`, err);
                }
            }
            
            console.log(`✅ Đồng bộ ${batch.length} ${firestoreCollection}`);
        } catch (error) {
            console.error(`Lỗi đồng bộ ${firestoreCollection}:`, error);
        }
    }

    // Đẩy dữ liệu từ IndexedDB lên Firebase
    async syncToFirebase(storeName, data) {
        if (!this.syncEnabled) return;
        
        const pendingItem = {
            storeName,
            data,
            timestamp: new Date().toISOString()
        };
        
        this.pendingSyncs.push(pendingItem);
        await this._processPendingSyncs();
    }

    // Xử lý các sync đang chờ
    async _processPendingSyncs() {
        if (this.isSyncing || this.pendingSyncs.length === 0) return;
        
        this.isSyncing = true;
        
        while (this.pendingSyncs.length > 0) {
            const item = this.pendingSyncs.shift();
            try {
                await this._pushSingleItem(item.storeName, item.data);
                console.log(`✅ Đã đẩy lên Firebase: ${item.storeName}`);
            } catch (error) {
                console.error(`❌ Lỗi đẩy lên Firebase:`, error);
                // Thêm lại vào hàng đợi nếu lỗi
                this.pendingSyncs.unshift(item);
                break;
            }
        }
        
        this.isSyncing = false;
    }

    async _pushSingleItem(storeName, data) {
        // Xác định collection tương ứng
        let collectionName = storeName;
        let docId = '';
        
        // Ánh xạ storeName sang collection Firebase
        const mapping = {
            'employees': 'employees',
            'inventory': 'inventory',
            'reports': 'reports',
            'attendance': 'attendance',
            'discipline_records': 'discipline_records'
        };
        
        collectionName = mapping[storeName] || storeName;
        
        // Xác định ID tài liệu
        if (data.employeeId) docId = data.employeeId;
        else if (data.productId) docId = data.productId;
        else if (data.reportId) docId = data.reportId;
        else if (data.attendanceId) docId = data.attendanceId.toString();
        else if (data.id) docId = data.id.toString();
        
        if (!docId) {
            // Tạo ID mới
            docId = this.db.collection(collectionName).doc().id;
        }
        
        // Đánh dấu đã đồng bộ
        const dataToSync = {
            ...data,
            _synced: true,
            _lastSync: new Date().toISOString(),
            _syncSource: 'indexeddb'
        };
        
        // Đẩy lên Firestore
        await this.db.collection(collectionName)
            .doc(docId)
            .set(dataToSync, { merge: true });
    }

    // ==================== CÁC HÀM TIỆN ÍCH ====================

    // Bật/tắt đồng bộ
    enableSync(enable = true) {
        this.syncEnabled = enable;
        console.log(`🔄 Đồng bộ Firebase: ${enable ? 'BẬT' : 'TẮT'}`);
    }

    // Kiểm tra kết nối
    async checkConnection() {
        try {
            const connectedRef = this.db.collection('.info').doc('connected');
            return new Promise((resolve) => {
                connectedRef.onSnapshot((doc) => {
                    resolve(doc.data().connected);
                });
            });
        } catch (error) {
            return false;
        }
    }

    // Đồng bộ định kỳ
    startPeriodicSync(intervalMinutes = 5) {
        setInterval(() => {
            this.syncFromFirebase();
        }, intervalMinutes * 60 * 1000);
    }

    // Lắng nghe thay đổi realtime từ Firebase
    startRealtimeListeners() {
        // Lắng nghe các collection quan trọng
        ['employees', 'inventory', 'reports'].forEach(collection => {
            this.db.collection(collection)
                .onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'modified' || change.type === 'added') {
                            this._handleFirebaseChange(collection, change.doc.data());
                        }
                    });
                });
        });
    }

    async _handleFirebaseChange(collection, data) {
        const storeMap = {
            'employees': 'employees',
            'inventory': 'inventory',
            'reports': 'reports'
        };
        
        const storeName = storeMap[collection];
        if (!storeName) return;
        
        // Cập nhật IndexedDB
        const keyField = collection === 'employees' ? 'employeeId' : 
                        collection === 'inventory' ? 'productId' : 'reportId';
        
        try {
            await window.dbUpdate(storeName, data[keyField], data);
            console.log(`🔄 Cập nhật từ Firebase: ${storeName}`);
        } catch (error) {
            console.error(`Lỗi cập nhật từ Firebase:`, error);
        }
    }
}

// Tạo instance toàn cục
const firebaseSync = new FirebaseSync();

// Hàm khởi tạo đồng bộ
async function initializeFirebaseSync() {
    if (!firebase.apps.length) {
        console.warn('⚠️ Firebase chưa được khởi tạo');
        return;
    }
    
    // Chờ IndexedDB sẵn sàng
    setTimeout(() => {
        // Kiểm tra kết nối
        firebaseSync.checkConnection().then(connected => {
            if (connected) {
                console.log('🌐 Đã kết nối Firebase');
                // Bắt đầu đồng bộ
                firebaseSync.syncFromFirebase();
                firebaseSync.startRealtimeListeners();
                firebaseSync.startPeriodicSync(10); // 10 phút/lần
            } else {
                console.warn('⚠️ Không có kết nối Firebase, chế độ offline');
            }
        });
    }, 1000);
}

// Expose ra global để dùng từ các file khác
window.firebaseSync = firebaseSync;
window.initializeFirebaseSync = initializeFirebaseSync;

console.log('✅ Firebase Sync đã sẵn sàng');