/**
 * Database Migrations - Quản lý phiên bản database
 */

class DatabaseMigrations {
    constructor() {
        this.currentVersion = 2; // Tăng version lên 2
    }

    /**
     * Chạy tất cả migrations
     */
    async runMigrations(db) {
        console.log('Running database migrations...');
        
        // Migration cho version 1 (khởi tạo ban đầu)
        await this.migrationV1(db);
        
        // Migration cho version 2 (thêm users store)
        await this.migrationV2(db);
        
        console.log('Database migrations completed');
    }

    /**
     * Migration version 1 - Khởi tạo cấu trúc cơ bản
     */
    async migrationV1(db) {
        // Tạo các object stores nếu chưa tồn tại
        const stores = [
            {
                name: 'daily_reports',
                keyPath: 'id',
                indexes: [
                    { name: 'date', keyPath: 'date', options: { unique: true } },
                    { name: 'created_at', keyPath: 'created_at' }
                ]
            },
            {
                name: 'employees',
                keyPath: 'id',
                indexes: [
                    { name: 'name', keyPath: 'name' },
                    { name: 'created_at', keyPath: 'created_at' }
                ]
            },
            {
                name: 'inventory',
                keyPath: 'id',
                indexes: [
                    { name: 'name', keyPath: 'name', options: { unique: true } },
                    { name: 'category', keyPath: 'category' }
                ]
            },
            {
                name: 'services',
                keyPath: 'id',
                indexes: [
                    { name: 'name', keyPath: 'name', options: { unique: true } }
                ]
            },
            {
                name: 'expense_categories',
                keyPath: 'id',
                indexes: [
                    { name: 'name', keyPath: 'name', options: { unique: true } },
                    { name: 'usage_count', keyPath: 'usage_count' }
                ]
            },
            {
                name: 'salary_records',
                keyPath: 'id',
                indexes: [
                    { name: 'employee_id', keyPath: 'employee_id' },
                    { name: 'month', keyPath: 'month' }
                ]
            }
        ];

        // Tạo các stores
        for (const storeConfig of stores) {
            if (!db.objectStoreNames.contains(storeConfig.name)) {
                const store = db.createObjectStore(storeConfig.name, { 
                    keyPath: storeConfig.keyPath 
                });
                
                // Tạo indexes
                if (storeConfig.indexes) {
                    storeConfig.indexes.forEach(indexConfig => {
                        store.createIndex(
                            indexConfig.name, 
                            indexConfig.keyPath, 
                            indexConfig.options || {}
                        );
                    });
                }
            }
        }
    }

    /**
     * Migration version 2 - Thêm store users
     */
    async migrationV2(db) {
        // Thêm store users nếu chưa tồn tại
        if (!db.objectStoreNames.contains('users')) {
            console.log('Creating users store...');
            const store = db.createObjectStore('users', { 
                keyPath: 'id' 
            });
            
            // Tạo indexes cho users
            store.createIndex('phone', 'phone', { unique: true });
            store.createIndex('role', 'role');
            store.createIndex('created_at', 'created_at');
            
            console.log('Users store created successfully');
        } else {
            console.log('Users store already exists');
        }
    }
}

const databaseMigrations = new DatabaseMigrations();