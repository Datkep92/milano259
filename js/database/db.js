class DatabaseManager {
    constructor() {
        this.dbName = 'SalesManagementDB';
        this.version = 2; // Tăng version lên 2
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('Database upgrade needed, running migrations...');
                databaseMigrations.runMigrations(db);
            };
        });
    }

    createStores(db) {
        // Daily Reports
        if (!db.objectStoreNames.contains('daily_reports')) {
            const store = db.createObjectStore('daily_reports', { keyPath: 'id' });
            store.createIndex('date', 'date', { unique: true });
            store.createIndex('created_at', 'created_at');
        }

        // Employees
        if (!db.objectStoreNames.contains('employees')) {
            const store = db.createObjectStore('employees', { keyPath: 'id' });
            store.createIndex('name', 'name');
            store.createIndex('created_at', 'created_at');
        }

        // Inventory
        if (!db.objectStoreNames.contains('inventory')) {
            const store = db.createObjectStore('inventory', { keyPath: 'id' });
            store.createIndex('name', 'name', { unique: true });
            store.createIndex('category', 'category');
        }

        // Services
        if (!db.objectStoreNames.contains('services')) {
            const store = db.createObjectStore('services', { keyPath: 'id' });
            store.createIndex('name', 'name', { unique: true });
        }

        // Expense Categories
        if (!db.objectStoreNames.contains('expense_categories')) {
            const store = db.createObjectStore('expense_categories', { keyPath: 'id' });
            store.createIndex('name', 'name', { unique: true });
            store.createIndex('usage_count', 'usage_count');
        }

        // Salary Records
        if (!db.objectStoreNames.contains('salary_records')) {
            const store = db.createObjectStore('salary_records', { keyPath: 'id' });
            store.createIndex('employee_id', 'employee_id');
            store.createIndex('month', 'month');
        }
    }

    // Generic CRUD operations
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName, indexName = null, range = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const target = indexName ? store.index(indexName) : store;
            const request = range ? target.getAll(range) : target.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
 * Lấy báo cáo theo ngày
 */
async getDailyReport(date) {
    try {
        const allReports = await this.getAll('daily_reports');
        const report = allReports.find(report => report.date === date);
        console.log(`Tìm báo cáo ngày ${date}:`, report);
        return report || null;
    } catch (error) {
        console.error('Lỗi getDailyReport:', error);
        return null;
    }
}

    async getReportsByDateRange(startDate, endDate) {
        const allReports = await this.getAll('daily_reports');
        return allReports.filter(report => {
            const reportDate = new Date(report.date);
            return reportDate >= new Date(startDate) && reportDate <= new Date(endDate);
        });
    }

    // Backup and restore methods for future cloud integration
    async exportData() {
        const stores = ['daily_reports', 'employees', 'inventory', 'services', 'expense_categories', 'salary_records'];
        const data = {};

        for (const storeName of stores) {
            data[storeName] = await this.getAll(storeName);
        }

        return data;
    }

    async importData(data) {
        const transaction = this.db.transaction(
            ['daily_reports', 'employees', 'inventory', 'services', 'expense_categories', 'salary_records'],
            'readwrite'
        );

        for (const [storeName, items] of Object.entries(data)) {
            const store = transaction.objectStore(storeName);
            for (const item of items) {
                store.put(item);
            }
        }

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// Create global instance
const dbManager = new DatabaseManager();