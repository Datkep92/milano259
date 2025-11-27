/**
 * OperationCostsTab - Xử lý tab chi phí vận hành và quản lý kho
 */

class OperationCostsTab {
    constructor() {
        this.currentFilter = '20N-19N+1';
        this.inventory = [];
        this.services = [];
        this.operationCosts = [];
        this.isLoading = false;
    }

    /**
     * Khởi tạo tab chi phí vận hành
     */
    async init() {
        await this.loadData();
        this.render();
        this.bindEvents();
    }

    /**
     * Load dữ liệu
     */
    async loadData() {
        this.showLoading();
        
        try {
            // Load inventory
            this.inventory = await dbManager.getAll('inventory');
            
            // Load services
            this.services = await dbManager.getAll('services');
            
            // Load operation costs
            this.operationCosts = await this.loadOperationCosts();
            
        } catch (error) {
            console.error('Lỗi load dữ liệu:', error);
            this.showError('Không thể tải dữ liệu: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Load chi phí vận hành theo bộ lọc
     */
    async loadOperationCosts() {
        const dateRange = this.getDateRange();
        const allCosts = [];
        
        // Load chi phí hàng hoá
        const inventoryCosts = await this.getInventoryCosts(dateRange);
        allCosts.push(...inventoryCosts);
        
        // Load chi phí dịch vụ
        const serviceCosts = await this.getServiceCosts(dateRange);
        allCosts.push(...serviceCosts);
        
        return allCosts.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * Lấy chi phí hàng hoá
     */
    async getInventoryCosts(dateRange) {
        // Trong thực tế, cần lấy từ bảng inventory_transactions
        // Ở đây giả lập dữ liệu
        return [
            {
                id: 'cost1',
                type: 'inventory',
                date: '2025-11-25',
                item_name: 'Sữa tươi',
                quantity: 2,
                unit_price: 10000,
                total_amount: 20000,
                category: 'Đồ uống'
            },
            {
                id: 'cost2',
                type: 'inventory',
                date: '2025-11-24',
                item_name: 'Đường',
                quantity: 1,
                unit_price: 5000,
                total_amount: 5000,
                category: 'Nguyên liệu'
            }
        ].filter(cost => dateUtils.isDateInRange(cost.date, dateRange.start, dateRange.end));
    }

    /**
     * Lấy chi phí dịch vụ
     */
    async getServiceCosts(dateRange) {
        // Trong thực tế, cần lấy từ bảng service_transactions
        return [
            {
                id: 'cost3',
                type: 'service',
                date: '2025-11-25',
                item_name: 'Giao hàng',
                quantity: 3,
                unit_price: 5000,
                total_amount: 15000,
                category: 'Vận chuyển'
            },
            {
                id: 'cost4',
                type: 'service',
                date: '2025-11-23',
                item_name: 'Vệ sinh',
                quantity: 2,
                unit_price: 25000,
                total_amount: 50000,
                category: 'Bảo trì'
            }
        ].filter(cost => dateUtils.isDateInRange(cost.date, dateRange.start, dateRange.end));
    }

    /**
     * Lấy khoảng ngày từ bộ lọc
     */
    getDateRange() {
        switch (this.currentFilter) {
            case '20N-19N+1':
                return dateUtils.get20N19NRange();
            case 'this_month':
                return {
                    start: dateUtils.getFirstDayOfMonth(),
                    end: dateUtils.getLastDayOfMonth()
                };
            case 'last_month':
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                return {
                    start: dateUtils.getFirstDayOfMonth(lastMonth),
                    end: dateUtils.getLastDayOfMonth(lastMonth)
                };
            default:
                return dateUtils.get20N19NRange();
        }
    }

    /**
     * Render giao diện
     */
    render() {
        const container = document.getElementById('operation-costs');
        container.innerHTML = this.getTemplate();
        
        this.renderSummary();
        this.renderInventory();
        this.renderServices();
        this.renderOperationCosts();
    }

    /**
     * Template chính
     */
    getTemplate() {
        return `
            <div class="operation-costs-container">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">🏪 Chi Phí Vận Hành & Kho</h2>
                        <div class="header-controls">
                            <select id="costs-filter" class="form-input">
                                <option value="20N-19N+1">20N-19N+1</option>
                                <option value="this_month">Tháng này</option>
                                <option value="last_month">Tháng trước</option>
                            </select>
                        </div>
                    </div>

                    <!-- Tổng quan -->
                    <div class="summary-grid" id="costs-summary">
                        <!-- Summary boxes will be rendered here -->
                    </div>
                </div>

                <!-- Hàng hoá & Dịch vụ -->
                <div class="row">
                    <div class="col-6">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">📦 Hàng Hoá</h3>
                                <button id="add-inventory-btn" class="btn btn-primary btn-sm">
                                    ➕ Thêm HH
                                </button>
                            </div>
                            <div class="card-body">
                                <div id="inventory-list">
                                    <!-- Inventory list will be rendered here -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-6">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">🔧 Dịch Vụ</h3>
                                <button id="add-service-btn" class="btn btn-primary btn-sm">
                                    ➕ Thêm DV
                                </button>
                            </div>
                            <div class="card-body">
                                <div id="services-list">
                                    <!-- Services list will be rendered here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chi phí vận hành -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">💰 Chi Phí Vận Hành</h3>
                    </div>
                    <div class="card-body">
                        <div id="operation-costs-list">
                            <!-- Operation costs will be rendered here -->
                        </div>
                    </div>
                </div>

                <!-- Modal thêm hàng hoá -->
                <div id="inventory-modal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="inventory-modal-title">Thêm Hàng Hoá</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="inventory-form">
                                <div class="form-group">
                                    <label class="form-label">Tên hàng hoá</label>
                                    <input type="text" id="inventory-name" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Số lượng tồn</label>
                                    <input type="number" id="inventory-stock" class="form-input" 
                                           min="0" value="0" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Đơn vị tính</label>
                                    <input type="text" id="inventory-unit" class="form-input" 
                                           placeholder="cái, hộp, kg..." required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Giá nhập (đơn vị)</label>
                                    <input type="text" id="inventory-price" class="form-input currency" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Danh mục</label>
                                    <input type="text" id="inventory-category" class="form-input" 
                                           placeholder="Đồ uống, nguyên liệu...">
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">Lưu</button>
                                    <button type="button" class="btn btn-outline modal-close">Hủy</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Modal thêm dịch vụ -->
                <div id="service-modal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="service-modal-title">Thêm Dịch Vụ</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="service-form">
                                <div class="form-group">
                                    <label class="form-label">Tên dịch vụ</label>
                                    <input type="text" id="service-name" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Đơn giá</label>
                                    <input type="text" id="service-price" class="form-input currency" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Đơn vị tính</label>
                                    <input type="text" id="service-unit" class="form-input" 
                                           placeholder="lần, giờ, ngày..." required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Danh mục</label>
                                    <input type="text" id="service-category" class="form-input" 
                                           placeholder="Vận chuyển, bảo trì...">
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">Lưu</button>
                                    <button type="button" class="btn btn-outline modal-close">Hủy</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Modal lịch sử hàng hoá -->
                <div id="inventory-history-modal" class="modal hidden">
                    <div class="modal-content modal-lg">
                        <div class="modal-header">
                            <h3 id="inventory-history-title">Lịch Sử Hàng Hoá</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="tabs">
                                <button class="tab-btn active" data-tab="import-history">Lịch Sử Nhập</button>
                                <button class="tab-btn" data-tab="export-history">Lịch Sử Xuất</button>
                            </div>
                            <div class="tab-content">
                                <div id="import-history" class="tab-pane active">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Ngày</th>
                                                <th>Số lượng</th>
                                                <th>Đơn giá</th>
                                                <th>Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody id="import-history-body">
                                            <!-- Import history will be rendered here -->
                                        </tbody>
                                    </table>
                                </div>
                                <div id="export-history" class="tab-pane">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>Ngày</th>
                                                <th>Số lượng</th>
                                                <th>Đơn giá</th>
                                                <th>Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody id="export-history-body">
                                            <!-- Export history will be rendered here -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal lịch sử dịch vụ -->
                <div id="service-history-modal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="service-history-title">Lịch Sử Dịch Vụ</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Ngày</th>
                                        <th>Số lượng</th>
                                        <th>Đơn giá</th>
                                        <th>Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody id="service-history-body">
                                    <!-- Service history will be rendered here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render tổng quan
     */
    renderSummary() {
        const container = document.getElementById('costs-summary');
        const totals = this.calculateTotals();
        
        container.innerHTML = `
            <div class="summary-box">
                <div class="summary-label">Tổng tiền HH</div>
                <div class="summary-value">${formatter.formatCurrency(totals.inventory)}</div>
            </div>
            <div class="summary-box">
                <div class="summary-label">Tổng tiền DV</div>
                <div class="summary-value">${formatter.formatCurrency(totals.services)}</div>
            </div>
            <div class="summary-box">
                <div class="summary-label">Lương NV (N-1)</div>
                <div class="summary-value">${formatter.formatCurrency(totals.salaries)}</div>
            </div>
            <div class="summary-box">
                <div class="summary-label">CP báo cáo</div>
                <div class="summary-value">${formatter.formatCurrency(totals.dailyExpenses)}</div>
            </div>
        `;
    }

    /**
     * Tính tổng các loại chi phí
     */
    calculateTotals() {
        const inventoryTotal = this.operationCosts
            .filter(cost => cost.type === 'inventory')
            .reduce((sum, cost) => sum + cost.total_amount, 0);
            
        const servicesTotal = this.operationCosts
            .filter(cost => cost.type === 'service')
            .reduce((sum, cost) => sum + cost.total_amount, 0);
        
        // TODO: Tính lương tháng trước và chi phí báo cáo
        return {
            inventory: inventoryTotal,
            services: servicesTotal,
            salaries: 0, // Sẽ tính sau
            dailyExpenses: 0 // Sẽ tính sau
        };
    }

    /**
     * Render danh sách hàng hoá
     */
    renderInventory() {
        const container = document.getElementById('inventory-list');
        
        if (this.inventory.length === 0) {
            container.innerHTML = '<p class="text-muted">Chưa có hàng hoá nào</p>';
            return;
        }
        
        container.innerHTML = this.inventory.map(item => `
            <div class="inventory-item" data-item-id="${item.id}">
                <div class="inventory-info">
                    <div class="inventory-name">${item.name}</div>
                    <div class="inventory-details">
                        <span class="inventory-stock">Tồn: ${item.current_stock} ${item.unit}</span>
                        <span class="inventory-price">${formatter.formatCurrency(item.unit_price)}/${item.unit}</span>
                    </div>
                </div>
                <div class="inventory-actions">
                    <button class="btn btn-sm btn-outline view-history" data-item-id="${item.id}">
                        📋 Lịch sử
                    </button>
                    <button class="btn btn-sm btn-outline edit-item" data-item-id="${item.id}">
                        ✏️ Sửa
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render danh sách dịch vụ
     */
    renderServices() {
        const container = document.getElementById('services-list');
        
        if (this.services.length === 0) {
            container.innerHTML = '<p class="text-muted">Chưa có dịch vụ nào</p>';
            return;
        }
        
        container.innerHTML = this.services.map(service => `
            <div class="service-item" data-service-id="${service.id}">
                <div class="service-info">
                    <div class="service-name">${service.name}</div>
                    <div class="service-details">
                        <span class="service-price">${formatter.formatCurrency(service.unit_price)}/${service.unit}</span>
                    </div>
                </div>
                <div class="service-actions">
                    <button class="btn btn-sm btn-outline view-service-history" data-service-id="${service.id}">
                        📋 Lịch sử
                    </button>
                    <button class="btn btn-sm btn-outline edit-service" data-service-id="${service.id}">
                        ✏️ Sửa
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render chi phí vận hành
     */
    renderOperationCosts() {
        const container = document.getElementById('operation-costs-list');
        
        if (this.operationCosts.length === 0) {
            container.innerHTML = '<p class="text-muted">Không có chi phí nào trong khoảng thời gian này</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Ngày</th>
                        <th>Loại</th>
                        <th>Tên</th>
                        <th>Số lượng</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                        <th>Danh mục</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.operationCosts.map(cost => `
                        <tr>
                            <td>${dateUtils.formatDisplayDate(cost.date)}</td>
                            <td>
                                <span class="badge ${cost.type === 'inventory' ? 'badge-info' : 'badge-warning'}">
                                    ${cost.type === 'inventory' ? 'HH' : 'DV'}
                                </span>
                            </td>
                            <td>${cost.item_name}</td>
                            <td>${cost.quantity} ${cost.type === 'inventory' ? 'cái' : 'lần'}</td>
                            <td>${formatter.formatCurrency(cost.unit_price)}</td>
                            <td>${formatter.formatCurrency(cost.total_amount)}</td>
                            <td>${cost.category || 'Khác'}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="5"><strong>Tổng cộng</strong></td>
                        <td colspan="2">
                            <strong>${formatter.formatCurrency(
                                this.operationCosts.reduce((sum, cost) => sum + cost.total_amount, 0)
                            )}</strong>
                        </td>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    /**
     * Bind events
     */
    bindEvents() {
        // Bộ lọc
        document.getElementById('costs-filter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.loadData();
        });

        // Thêm hàng hoá/dịch vụ
        document.getElementById('add-inventory-btn').addEventListener('click', () => this.showInventoryForm());
        document.getElementById('add-service-btn').addEventListener('click', () => this.showServiceForm());

        // Form
        document.getElementById('inventory-form').addEventListener('submit', (e) => this.saveInventory(e));
        document.getElementById('service-form').addEventListener('submit', (e) => this.saveService(e));

        // Đóng modal
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // Events delegation cho danh sách
        document.getElementById('inventory-list').addEventListener('click', (e) => {
            const item = e.target.closest('.inventory-item');
            if (!item) return;
            
            const itemId = item.dataset.itemId;
            const inventoryItem = this.inventory.find(item => item.id === itemId);
            
            if (e.target.classList.contains('view-history')) {
                this.showInventoryHistory(inventoryItem);
            } else if (e.target.classList.contains('edit-item')) {
                this.showInventoryForm(inventoryItem);
            }
        });

        document.getElementById('services-list').addEventListener('click', (e) => {
            const item = e.target.closest('.service-item');
            if (!item) return;
            
            const serviceId = item.dataset.serviceId;
            const service = this.services.find(s => s.id === serviceId);
            
            if (e.target.classList.contains('view-service-history')) {
                this.showServiceHistory(service);
            } else if (e.target.classList.contains('edit-service')) {
                this.showServiceForm(service);
            }
        });

        // Tabs trong modal lịch sử
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.switchTab(e.target);
            }
        });
    }

    /**
     * Hiển thị form hàng hoá
     */
    showInventoryForm(item = null) {
        const modal = document.getElementById('inventory-modal');
        const title = document.getElementById('inventory-modal-title');
        const form = document.getElementById('inventory-form');
        
        title.textContent = item ? 'Sửa Hàng Hoá' : 'Thêm Hàng Hoá';
        
        if (item) {
            document.getElementById('inventory-name').value = item.name;
            document.getElementById('inventory-stock').value = item.current_stock;
            document.getElementById('inventory-unit').value = item.unit;
            document.getElementById('inventory-price').value = formatter.formatCurrency(item.unit_price);
            document.getElementById('inventory-category').value = item.category || '';
        } else {
            form.reset();
        }
        
        this.showModal(modal);
    }

    /**
     * Hiển thị form dịch vụ
     */
    showServiceForm(service = null) {
        const modal = document.getElementById('service-modal');
        const title = document.getElementById('service-modal-title');
        const form = document.getElementById('service-form');
        
        title.textContent = service ? 'Sửa Dịch Vụ' : 'Thêm Dịch Vụ';
        
        if (service) {
            document.getElementById('service-name').value = service.name;
            document.getElementById('service-price').value = formatter.formatCurrency(service.unit_price);
            document.getElementById('service-unit').value = service.unit;
            document.getElementById('service-category').value = service.category || '';
        } else {
            form.reset();
        }
        
        this.showModal(modal);
    }

    /**
     * Lưu hàng hoá
     */
    async saveInventory(e) {
        e.preventDefault();
        
        const name = document.getElementById('inventory-name').value.trim();
        const stock = parseInt(document.getElementById('inventory-stock').value);
        const unit = document.getElementById('inventory-unit').value.trim();
        const price = formatter.parseCurrency(document.getElementById('inventory-price').value);
        const category = document.getElementById('inventory-category').value.trim();
        
        if (!name || !unit || price <= 0) {
            this.showError('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }
        
        const inventoryData = {
            name,
            current_stock: stock,
            unit,
            unit_price: price,
            category: category || null,
            updated_at: new Date().toISOString()
        };
        
        // Kiểm tra trùng tên
        const existingItem = this.inventory.find(item => 
            item.name.toLowerCase() === name.toLowerCase() && 
            (!this.editingItem || item.id !== this.editingItem.id)
        );
        
        if (existingItem) {
            if (!confirm(`Hàng hoá "${name}" đã tồn tại. Bạn có muốn cập nhật thông tin?`)) {
                return;
            }
            inventoryData.id = existingItem.id;
            inventoryData.created_at = existingItem.created_at;
        } else if (this.editingItem) {
            inventoryData.id = this.editingItem.id;
            inventoryData.created_at = this.editingItem.created_at;
        } else {
            inventoryData.id = formatter.generateId('inv');
            inventoryData.created_at = new Date().toISOString();
        }
        
        try {
            await dbManager.update('inventory', inventoryData);
            this.closeModal(document.getElementById('inventory-modal'));
            this.showSuccess(this.editingItem ? 'Cập nhật thành công' : 'Thêm hàng hoá thành công');
            await this.loadData();
        } catch (error) {
            this.showError('Lỗi lưu hàng hoá: ' + error.message);
        }
    }

    /**
     * Lưu dịch vụ
     */
    async saveService(e) {
        e.preventDefault();
        
        const name = document.getElementById('service-name').value.trim();
        const price = formatter.parseCurrency(document.getElementById('service-price').value);
        const unit = document.getElementById('service-unit').value.trim();
        const category = document.getElementById('service-category').value.trim();
        
        if (!name || !unit || price <= 0) {
            this.showError('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }
        
        const serviceData = {
            name,
            unit_price: price,
            unit,
            category: category || null,
            updated_at: new Date().toISOString()
        };
        
        // Kiểm tra trùng tên
        const existingService = this.services.find(service => 
            service.name.toLowerCase() === name.toLowerCase() && 
            (!this.editingService || service.id !== this.editingService.id)
        );
        
        if (existingService) {
            if (!confirm(`Dịch vụ "${name}" đã tồn tại. Bạn có muốn cập nhật thông tin?`)) {
                return;
            }
            serviceData.id = existingService.id;
            serviceData.created_at = existingService.created_at;
        } else if (this.editingService) {
            serviceData.id = this.editingService.id;
            serviceData.created_at = this.editingService.created_at;
        } else {
            serviceData.id = formatter.generateId('svc');
            serviceData.created_at = new Date().toISOString();
        }
        
        try {
            await dbManager.update('services', serviceData);
            this.closeModal(document.getElementById('service-modal'));
            this.showSuccess(this.editingService ? 'Cập nhật thành công' : 'Thêm dịch vụ thành công');
            await this.loadData();
        } catch (error) {
            this.showError('Lỗi lưu dịch vụ: ' + error.message);
        }
    }

    /**
     * Hiển thị lịch sử hàng hoá
     */
    showInventoryHistory(item) {
        const modal = document.getElementById('inventory-history-modal');
        const title = document.getElementById('inventory-history-title');
        
        title.textContent = `Lịch Sử - ${item.name}`;
        
        // Render dữ liệu mẫu
        document.getElementById('import-history-body').innerHTML = `
            <tr>
                <td>25/11/2025</td>
                <td>5</td>
                <td>${formatter.formatCurrency(10000)}</td>
                <td>${formatter.formatCurrency(50000)}</td>
            </tr>
            <tr>
                <td>18/11/2025</td>
                <td>10</td>
                <td>${formatter.formatCurrency(10000)}</td>
                <td>${formatter.formatCurrency(100000)}</td>
            </tr>
        `;
        
        document.getElementById('export-history-body').innerHTML = `
            <tr>
                <td>25/11/2025</td>
                <td>2</td>
                <td>${formatter.formatCurrency(10000)}</td>
                <td>${formatter.formatCurrency(20000)}</td>
            </tr>
            <tr>
                <td>23/11/2025</td>
                <td>3</td>
                <td>${formatter.formatCurrency(10000)}</td>
                <td>${formatter.formatCurrency(30000)}</td>
            </tr>
        `;
        
        this.showModal(modal);
    }

    /**
     * Hiển thị lịch sử dịch vụ
     */
    showServiceHistory(service) {
        const modal = document.getElementById('service-history-modal');
        const title = document.getElementById('service-history-title');
        
        title.textContent = `Lịch Sử - ${service.name}`;
        
        // Render dữ liệu mẫu
        document.getElementById('service-history-body').innerHTML = `
            <tr>
                <td>25/11/2025</td>
                <td>3</td>
                <td>${formatter.formatCurrency(5000)}</td>
                <td>${formatter.formatCurrency(15000)}</td>
            </tr>
            <tr>
                <td>23/11/2025</td>
                <td>2</td>
                <td>${formatter.formatCurrency(5000)}</td>
                <td>${formatter.formatCurrency(10000)}</td>
            </tr>
        `;
        
        this.showModal(modal);
    }

    /**
     * Chuyển tab
     */
    /**
 * Chuyển tab
 */
switchTab(tabBtn) {
    if (!tabBtn || !tabBtn.closest) return; // Thêm kiểm tra null
    
    const tabContent = tabBtn.closest('.modal-content');
    if (!tabContent) return; // Thêm kiểm tra tồn tại
    
    const tabName = tabBtn.dataset.tab;
    
    // Ẩn tất cả tab
    tabContent.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Bỏ active tất cả tab buttons
    tabBtn.parentElement.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Hiển thị tab được chọn
    const targetTab = tabContent.querySelector(`#${tabName}`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    tabBtn.classList.add('active');
}

    /**
     * Hiển thị modal
     */
    showModal(modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Đóng modal
     */
    closeModal(modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        this.editingItem = null;
        this.editingService = null;
    }

    /**
     * Hiển thị loading
     */
    showLoading() {
        this.isLoading = true;
        document.getElementById('loading-overlay').classList.add('show');
    }

    /**
     * Ẩn loading
     */
    hideLoading() {
        this.isLoading = false;
        document.getElementById('loading-overlay').classList.remove('show');
    }

    /**
     * Hiển thị thông báo lỗi
     */
    showError(message) {
        alert('Lỗi: ' + message);
    }

    /**
     * Hiển thị thông báo thành công
     */
    showSuccess(message) {
        alert('Thành công: ' + message);
    }
}

// Tạo instance toàn cục
const operationCostsTab = new OperationCostsTab();