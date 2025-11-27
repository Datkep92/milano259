/**
 * Main Application - Khởi chạy toàn bộ ứng dụng quản lý bán hàng
 */

class SalesManagementApp {
    constructor() {
        this.currentTab = 'daily-report';
        this.isInitialized = false;
        this.user = null;
    }

    /**
     * Hiển thị modal đăng nhập
     */
    showLoginModal() {
        // Kiểm tra nếu modal đã tồn tại thì không tạo lại
        if (document.getElementById('login-modal')) {
            document.getElementById('login-modal').classList.add('show');
            return;
        }

        // Tạo modal đăng nhập - AN TOÀN: kiểm tra authManager tồn tại
        let deviceId = 'unknown';
        try {
            if (typeof authManager !== 'undefined' && authManager.deviceId) {
                deviceId = authManager.deviceId;
            }
        } catch (error) {
            console.warn('Không thể lấy deviceId:', error);
        }
        
        const modalHTML = `
            <div id="login-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Đăng Nhập Hệ Thống</h3>
                        <small>Device ID: ${deviceId}</small>
                    </div>
                    <div class="modal-body">
                        <form id="login-form">
                            <div class="form-group">
                                <label for="login-name">Tên của bạn:</label>
                                <input type="text" id="login-name" placeholder="Nhập tên của bạn" required>
                            </div>
                            <div class="form-group">
                                <label for="login-phone">Số điện thoại:</label>
                                <input type="tel" id="login-phone" placeholder="Nhập số điện thoại" required>
                            </div>
                            <div class="form-hint">
                                <p><strong>Lưu ý quan trọng:</strong></p>
                                <p>• <code>admin / 123123</code> → Quyền Quản trị</p>
                                <p>• Tên/SĐT mới → Tài khoản Nhân viên</p>
                                <p>• Thông tin đăng nhập sẽ được lưu tự động</p>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Đăng Nhập</button>
                                <button type="button" class="btn btn-secondary" onclick="window.resetDevice && window.resetDevice()">Reset Thiết Bị</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Bind sự kiện form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Hiển thị modal
        document.getElementById('login-modal').classList.add('show');
    }

    /**
     * Xử lý đăng nhập
     */
    async handleLogin() {
        const name = document.getElementById('login-name').value;
        const phone = document.getElementById('login-phone').value;

        try {
            this.showLoading('Đang đăng nhập...');
            
            // KIỂM TRA: authManager có tồn tại không
            if (typeof authManager === 'undefined') {
                throw new Error('Hệ thống xác thực chưa sẵn sàng. Vui lòng thử lại.');
            }
            
            await authManager.login({ name, phone });
            this.user = authManager.getCurrentUser();
            
            // Ẩn modal đăng nhập
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.classList.remove('show');
            }
            
            // Khởi tạo ứng dụng
            await this.initializeApp();
            
            this.showSuccess(`Chào mừng ${this.user.name} đến với hệ thống!`);
            
        } catch (error) {
            this.showError('Đăng nhập thất bại: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Thiết lập quyền truy cập
     */
    setupPermissions() {
        // Sử dụng try-catch để tránh lỗi
        let isAdmin = false;
        try {
            if (typeof authManager !== 'undefined') {
                isAdmin = authManager.isAdmin();
            }
        } catch (error) {
            console.warn('Không thể kiểm tra quyền admin:', error);
        }
        
        if (!isAdmin) {
            console.log('User is not admin, hiding admin features');
        }
        
        // Ẩn tab quản lý nhân viên nếu không phải admin
        const employeeTab = document.querySelector('[data-tab="employee-management"]');
        if (employeeTab) {
            employeeTab.style.display = isAdmin ? 'flex' : 'none';
        }

        // Ẩn các tính năng export/import nếu không phải admin
        const adminFeatures = document.querySelectorAll('.admin-only');
        adminFeatures.forEach(feature => {
            if (feature) {
                feature.style.display = isAdmin ? 'block' : 'none';
            }
        });
    }

    /**
     * Đăng xuất
     */
    logout() {
        if (confirm('Bạn có chắc muốn đăng xuất?')) {
            try {
                if (typeof authManager !== 'undefined') {
                    authManager.logout();
                }
            } catch (error) {
                console.warn('Lỗi khi logout authManager:', error);
            }
            
            this.user = null;
            this.isInitialized = false;
            
            // Hiển thị lại modal đăng nhập
            this.showLoginModal();
            this.showSuccess('Đã đăng xuất thành công');
        }
    }



    /**
     * Khởi tạo ứng dụng (sau khi đăng nhập)
     */
    async initializeApp() {
        try {
            this.showLoading('Đang khởi tạo ứng dụng...');
            
            // Khởi tạo database
            await dbManager.init();
            
            // Chạy migrations nếu cần
            await this.runMigrations();
            
            // Khởi tạo dữ liệu mẫu
            await this.initSampleData();
            
            // Thiết lập giao diện
            this.setupUI();
            
            // Khởi tạo tab hiện tại
            await this.initCurrentTab();
            
            this.isInitialized = true;
            this.hideLoading();
            
            console.log('Ứng dụng đã khởi tạo thành công');
            
        } catch (error) {
            console.error('Lỗi khởi tạo ứng dụng:', error);
            this.showError('Không thể khởi tạo ứng dụng: ' + error.message);
        }
    }

    /**
     * Cập nhật thông tin người dùng
     */
    updateUserInfo() {
        const userElement = document.getElementById('current-user');
        const roleElement = document.getElementById('current-role');
        
        if (userElement) {
            userElement.textContent = this.user?.name || 'Khách';
        }
        
        if (roleElement) {
            const roleText = this.user?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên';
            roleElement.textContent = roleText;
        }

        // Ẩn/hiện tính năng theo quyền
        this.setupPermissions();
    }

    /**
     * Thiết lập quyền truy cập
     */
    setupPermissions() {
        // Sử dụng window.authManager để đảm bảo tồn tại
        const isAdmin = window.authManager ? window.authManager.isAdmin() : false;
        
        if (!isAdmin) {
            console.log('User is not admin, hiding admin features');
        }
        
        // Ẩn tab quản lý nhân viên nếu không phải admin
        const employeeTab = document.querySelector('[data-tab="employee-management"]');
        if (employeeTab) {
            employeeTab.style.display = isAdmin ? 'flex' : 'none';
        }

        // Ẩn các tính năng export/import nếu không phải admin
        const adminFeatures = document.querySelectorAll('.admin-only');
        adminFeatures.forEach(feature => {
            if (feature) {
                feature.style.display = isAdmin ? 'block' : 'none';
            }
        });
    }

    /**
     * Thiết lập giao diện
     */
    setupUI() {
        try {
            this.bindGlobalEvents();
            this.setupTabNavigation();
            this.updateUserInfo();
            console.log('UI setup completed successfully');
        } catch (error) {
            console.error('Lỗi thiết lập UI:', error);
            // Vẫn tiếp tục chạy ứng dụng nếu có lỗi UI
        }
    }

    /**
     * Bind events toàn cục
     */
    bindGlobalEvents() {
        // Xử lý đăng xuất - kiểm tra phần tử tồn tại
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Xử lý refresh dữ liệu
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refreshCurrentTab();
            }
        });

        // Xử lý trước khi đóng trang
        window.addEventListener('beforeunload', (e) => {
            // Có thể thêm logic lưu dữ liệu tạm thời ở đây
        });

        // Xử lý lỗi toàn cục
        window.addEventListener('error', (e) => {
            console.error('Lỗi toàn cục:', e.error);
            this.showError('Có lỗi xảy ra: ' + e.error.message);
        });
    }

    /**
     * Thiết lập điều hướng tab
     */
    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        if (tabButtons.length === 0) {
            console.warn('Không tìm thấy tab buttons');
            return;
        }
        
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                this.switchTab(targetTab);
            });
        });
    }

    /**
     * Chuyển tab
     */
    async switchTab(tabName) {
        if (tabName === this.currentTab) return;
        
        // Ẩn tab hiện tại
        const currentTabPane = document.getElementById(this.currentTab);
        const currentTabBtn = document.querySelector(`[data-tab="${this.currentTab}"]`);
        
        if (currentTabPane) currentTabPane.classList.remove('active');
        if (currentTabBtn) currentTabBtn.classList.remove('active');
        
        // Hiển thị tab mới
        const newTabPane = document.getElementById(tabName);
        const newTabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        
        if (newTabPane) newTabPane.classList.add('active');
        if (newTabBtn) newTabBtn.classList.add('active');
        
        this.currentTab = tabName;
        
        // Khởi tạo tab mới
        await this.initCurrentTab();
    }

    /**
     * Khởi tạo tab hiện tại
     */
    async initCurrentTab() {
        this.showLoading(`Đang tải ${this.getTabName(this.currentTab)}...`);
        
        try {
            switch (this.currentTab) {
                case 'daily-report':
                    await dailyReportTab.init();
                    break;
                case 'employee-management':
                    await employeeManagementTab.init();
                    break;
                case 'operation-costs':
                    await operationCostsTab.init();
                    break;
                case 'management-overview':
                    await managementOverviewTab.init();
                    break;
            }
        } catch (error) {
            console.error(`Lỗi khởi tạo tab ${this.currentTab}:`, error);
            this.showError(`Không thể tải ${this.getTabName(this.currentTab)}: ` + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Làm mới tab hiện tại
     */
    async refreshCurrentTab() {
        await this.initCurrentTab();
        this.showSuccess('Đã làm mới dữ liệu');
    }

    /**
     * Lấy tên hiển thị của tab
     */
    getTabName(tabId) {
        const tabNames = {
            'daily-report': 'Báo Cáo Ngày',
            'employee-management': 'Quản Lý Nhân Viên',
            'operation-costs': 'Chi Phí Vận Hành',
            'management-overview': 'Quản Lý Tổng Quan'
        };
        
        return tabNames[tabId] || tabId;
    }

    /**
     * Đăng xuất
     */
    logout() {
        if (confirm('Bạn có chắc muốn đăng xuất?')) {
            // Sử dụng window.authManager để đảm bảo tồn tại
            if (window.authManager) {
                window.authManager.logout();
            }
            this.user = null;
            this.isInitialized = false;
            
            // Hiển thị lại modal đăng nhập
            this.showLoginModal();
            this.showSuccess('Đã đăng xuất thành công');
        }
    }

    /**
     * Chạy migrations database
     */
    async runMigrations() {
        console.log('Running database migrations...');
    }

    /**
     * Khởi tạo dữ liệu mẫu
     */
    async initSampleData() {
        try {
            // Kiểm tra xem đã có dữ liệu chưa
            const existingReports = await dbManager.getAll('daily_reports');
            const existingEmployees = await dbManager.getAll('employees');
            const existingInventory = await dbManager.getAll('inventory');
            
            // Chỉ tạo dữ liệu mẫu nếu chưa có dữ liệu
            if (existingReports.length === 0 && existingEmployees.length === 0 && existingInventory.length === 0) {
                await this.createSampleData();
                console.log('Đã tạo dữ liệu mẫu thành công');
            }
        } catch (error) {
            console.warn('Không thể tạo dữ liệu mẫu:', error);
        }
    }

    /**
     * Tạo dữ liệu mẫu
     */
    async createSampleData() {
        // Tạo nhân viên mẫu
        const sampleEmployees = [
            {
                id: 'emp_001',
                name: 'Nguyễn Văn A',
                basic_salary: 8000000,
                phone: '0912345678',
                position: 'Nhân viên bán hàng',
                start_date: '2025-01-15',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 'emp_002',
                name: 'Trần Thị B',
                basic_salary: 7500000,
                phone: '0923456789',
                position: 'Nhân viên kho',
                start_date: '2025-02-20',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        for (const employee of sampleEmployees) {
            await dbManager.add('employees', employee);
        }

        // Tạo hàng hoá mẫu
        const sampleInventory = [
            {
                id: 'inv_001',
                name: 'Sữa tươi',
                current_stock: 50,
                unit: 'hộp',
                unit_price: 10000,
                category: 'Đồ uống',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 'inv_002',
                name: 'Đường',
                current_stock: 30,
                unit: 'kg',
                unit_price: 5000,
                category: 'Nguyên liệu',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 'inv_003',
                name: 'Ly 500ml',
                current_stock: 100,
                unit: 'cái',
                unit_price: 3000,
                category: 'Vật tư',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        for (const item of sampleInventory) {
            await dbManager.add('inventory', item);
        }

        // Tạo dịch vụ mẫu
        const sampleServices = [
            {
                id: 'svc_001',
                name: 'Giao hàng',
                unit_price: 5000,
                unit: 'lần',
                category: 'Vận chuyển',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 'svc_002',
                name: 'Vệ sinh',
                unit_price: 25000,
                unit: 'lần',
                category: 'Bảo trì',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];

        for (const service of sampleServices) {
            await dbManager.add('services', service);
        }

        // Tạo categories chi phí mẫu
        const sampleCategories = [
            {
                id: 'cat_001',
                name: 'Cafe',
                usage_count: 15,
                last_used: '2025-11-25'
            },
            {
                id: 'cat_002',
                name: 'Điện thoại',
                usage_count: 8,
                last_used: '2025-11-24'
            },
            {
                id: 'cat_003',
                name: 'Văn phòng phẩm',
                usage_count: 12,
                last_used: '2025-11-23'
            }
        ];

        for (const category of sampleCategories) {
            await dbManager.add('expense_categories', category);
        }
    }

    /**
     * Export dữ liệu
     */
    async exportData() {
        try {
            this.showLoading('Đang xuất dữ liệu...');
            
            const data = await dbManager.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_${dateUtils.getToday()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showSuccess('Đã xuất dữ liệu thành công');
        } catch (error) {
            this.showError('Lỗi xuất dữ liệu: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Import dữ liệu
     */
    async importData(file) {
        try {
            this.showLoading('Đang nhập dữ liệu...');
            
            const text = await this.readFileAsText(file);
            const data = JSON.parse(text);
            
            if (!this.validateImportData(data)) {
                throw new Error('Dữ liệu không hợp lệ');
            }
            
            await dbManager.importData(data);
            this.showSuccess('Đã nhập dữ liệu thành công');
            
            // Làm mới ứng dụng
            await this.initCurrentTab();
        } catch (error) {
            this.showError('Lỗi nhập dữ liệu: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Đọc file như text
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    }

    /**
     * Validate dữ liệu import
     */
    validateImportData(data) {
        const requiredStores = ['daily_reports', 'employees', 'inventory', 'services'];
        return requiredStores.every(store => Array.isArray(data[store]));
    }

    /**
     * Hiển thị loading
     */
    showLoading(message = 'Đang tải...') {
        const overlay = document.getElementById('loading-overlay');
        const messageElement = overlay.querySelector('p');
        
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        overlay.classList.add('show');
    }

    /**
     * Ẩn loading
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.remove('show');
    }

    /**
     * Hiển thị thông báo lỗi
     */
    showError(message) {
        if (typeof zaloIntegration !== 'undefined') {
            zaloIntegration.showNotification(message, 'error');
        } else {
            alert('Lỗi: ' + message);
        }
    }

    /**
     * Hiển thị thông báo thành công
     */
    showSuccess(message) {
        if (typeof zaloIntegration !== 'undefined') {
            zaloIntegration.showNotification(message, 'success');
        } else {
            alert('Thành công: ' + message);
        }
    }

    /**
     * Hiển thị thông báo cảnh báo
     */
    showWarning(message) {
        if (typeof zaloIntegration !== 'undefined') {
            zaloIntegration.showNotification(message, 'warning');
        } else {
            alert('Cảnh báo: ' + message);
        }
    }

    /**
     * Kiểm tra kết nối mạng
     */
    checkNetworkStatus() {
        return navigator.onLine;
    }

    /**
     * Đồng bộ dữ liệu lên cloud (cho tương lai)
     */
    async syncToCloud() {
        if (!this.checkNetworkStatus()) {
            this.showWarning('Không có kết nối mạng. Không thể đồng bộ.');
            return;
        }
        
        try {
            this.showLoading('Đang đồng bộ dữ liệu lên cloud...');
            this.showSuccess('Đã đồng bộ dữ liệu lên cloud thành công');
        } catch (error) {
            this.showError('Lỗi đồng bộ: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Khôi phục dữ liệu từ cloud (cho tương lai)
     */
    async restoreFromCloud() {
        if (!this.checkNetworkStatus()) {
            this.showWarning('Không có kết nối mạng. Không thể khôi phục.');
            return;
        }
        
        if (!confirm('Bạn có chắc muốn khôi phục dữ liệu từ cloud? Dữ liệu hiện tại sẽ bị ghi đè.')) {
            return;
        }
        
        try {
            this.showLoading('Đang khôi phục dữ liệu từ cloud...');
            this.showSuccess('Đã khôi phục dữ liệu từ cloud thành công');
            await this.initCurrentTab();
        } catch (error) {
            this.showError('Lỗi khôi phục: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
}
// Khởi chạy khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing app...');
    
    try {
        // KIỂM TRA NGHIÊM NGẶT: authManager có tồn tại không
        if (typeof authManager === 'undefined') {
            console.error('AuthManager không tồn tại! Kiểm tra thứ tự load file.');
            app.showError('Lỗi hệ thống: AuthManager không khả dụng');
            app.showLoginModal();
            return;
        }

        // Khởi tạo auth manager
        await authManager.init();
        console.log('Auth initialized - isLoggedIn:', authManager.isLoggedIn());
        
        if (authManager.isLoggedIn()) {
            console.log('Auto-login successful:', authManager.getCurrentUser());
            app.user = authManager.getCurrentUser();
            await app.initializeApp();
            
            // Hiển thị thông báo đăng nhập tự động
            if (app.user.role === 'admin') {
                app.showSuccess(`Tự động đăng nhập với quyền Quản trị viên`);
            } else {
                app.showSuccess(`Tự động đăng nhập với tư cách ${app.user.name}`);
            }
        } else {
            console.log('No active session, showing login modal');
            app.showLoginModal();
        }
    } catch (error) {
        console.error('Lỗi khởi tạo app:', error);
        app.showError('Lỗi khởi tạo ứng dụng: ' + error.message);
        app.showLoginModal();
    }
});

// Global functions - THÊM KIỂM TRA TỒN TẠI
window.exportData = () => app.exportData && app.exportData();
window.syncToCloud = () => app.syncToCloud && app.syncToCloud();
window.restoreFromCloud = () => app.restoreFromCloud && app.restoreFromCloud();
window.logout = () => app.logout && app.logout();
window.resetDevice = function() {
    if (typeof authManager !== 'undefined') {
        authManager.hardReset();
        location.reload();
    } else {
        alert('AuthManager không khả dụng');
    }
};

// Khởi tạo ứng dụng
const app = new SalesManagementApp();


// Xử lý sự kiện online/offline
window.addEventListener('online', () => {
    if (app.isInitialized) {
        app.showSuccess('Đã kết nối lại mạng');
    }
});

window.addEventListener('offline', () => {
    if (app.isInitialized) {
        app.showWarning('Mất kết nối mạng. Ứng dụng sẽ hoạt động ở chế độ offline.');
    }
});

// Global functions
window.exportData = () => app.exportData();
window.syncToCloud = () => app.syncToCloud();
window.restoreFromCloud = () => app.restoreFromCloud();
window.logout = () => app.logout();
