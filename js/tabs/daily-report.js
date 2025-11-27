/**
 * DailyReportTab - Xử lý tab báo cáo hàng ngày với UI mới
 */

class DailyReportTab {
    constructor() {
        this.currentDate = dateUtils.getToday();
        this.currentReport = null;
        this.expenseManager = expenseManager;
        this.inventoryManager = inventoryManager;
        this.isLoading = false;
        this.recentReports = [];
        
        // Biến lưu trữ dữ liệu hiện tại
        this.formData = {
            openingBalance: 0,
            revenue: 0,
            closingBalance: 0,
            actualProfit: 0,
            expenses: [],
            transfers: [],
            inventoryUsed: []
        };
        
        // Danh sách categories chi phí
        this.expenseCategories = [];
    }

    /**
     * Khởi tạo tab
     */
    async init() {
        try {
            console.log('=== DAILY REPORT TAB INIT ===');
            
            // Render template trước
            this.render();
            
            // Đợi DOM ready
            await this.waitForDOMReady();
            
            // Load dữ liệu
            await this.loadInitialData();
            
            // Bind events
            this.bindEvents();
            
            console.log('✅ Daily report tab initialized');
            
        } catch (error) {
            console.error('❌ Lỗi khởi tạo tab:', error);
            this.showError('Không thể khởi tạo tab: ' + error.message);
        }
    }

    /**
     * Đợi DOM ready
     */
    async waitForDOMReady(maxRetries = 10, delay = 100) {
        for (let i = 0; i < maxRetries; i++) {
            if (this.isDOMReady()) {
                console.log(`✅ DOM ready sau ${i + 1} lần thử`);
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        throw new Error('DOM không ready sau maximum retries');
    }

    /**
 * Kiểm tra DOM ready
 */
isDOMReady() {
    const requiredElements = [
        'report-date', 'opening-balance', 'revenue', 'closing-balance', 
        'actual-profit', 'expenses-btn', 'transfers-btn', 'save-report-btn'
    ];
    
    let allReady = true;
    
    requiredElements.forEach(id => {
        const element = document.getElementById(id);
        const isReady = !!element;
        
        if (!isReady) {
            console.warn(`❌ #${id} chưa ready`);
            allReady = false;
        } else {
            console.log(`✅ #${id} ready`);
        }
    });
    
    return allReady;
}

    /**
     * Load dữ liệu ban đầu
     */
    async loadInitialData() {
        this.showLoading();
        
        try {
            console.log('📥 Loading initial data...');
            
            // Load báo cáo hiện tại
            this.currentReport = await dbManager.getDailyReport(this.currentDate);
            console.log('Current report:', this.currentReport);
            
            // Load categories chi phí
            await this.loadExpenseCategories();
            
            // Khởi tạo form data
            this.initializeFormData();
            
            // Load dữ liệu phụ trợ
            await this.loadSupportingData();
            
            // Render dữ liệu
            this.renderFormData();
            
        } catch (error) {
            console.error('❌ Lỗi load dữ liệu:', error);
            this.showError('Lỗi tải dữ liệu: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
 * Load categories chi phí
 */
async loadExpenseCategories() {
    try {
        // Kiểm tra phương thức tồn tại
        if (this.expenseManager && typeof this.expenseManager.getCategories === 'function') {
            this.expenseCategories = await this.expenseManager.getCategories();
        } else if (this.expenseManager && this.expenseManager.categories) {
            // Fallback: truy cập trực tiếp property
            this.expenseCategories = this.expenseManager.categories;
        } else {
            // Categories mặc định
            this.expenseCategories = [
                { name: 'Tiền điện' },
                { name: 'Tiền nước' },
                { name: 'Tiền mạng' },
                { name: 'Tiền thuê mặt bằng' },
                { name: 'Lương nhân viên' },
                { name: 'Mua hàng hóa' },
                { name: 'Chi phí vận chuyển' },
                { name: 'Sửa chữa' },
                { name: 'Khác' }
            ];
        }
        console.log('✅ Expense categories loaded:', this.expenseCategories.length);
    } catch (error) {
        console.error('Lỗi load categories, sử dụng mặc định:', error);
        this.expenseCategories = [
            { name: 'Tiền điện' },
            { name: 'Tiền nước' },
            { name: 'Tiền mạng' },
            { name: 'Tiền thuê mặt bằng' },
            { name: 'Lương nhân viên' },
            { name: 'Mua hàng hóa' },
            { name: 'Chi phí vận chuyển' },
            { name: 'Sửa chữa' },
            { name: 'Khác' }
        ];
    }
}

    /**
     * Khởi tạo form data từ current report
     */
    initializeFormData() {
        if (this.currentReport) {
            // Có báo cáo: dùng dữ liệu từ database
            this.formData = {
                openingBalance: this.currentReport.opening_balance || 0,
                revenue: this.currentReport.revenue || 0,
                closingBalance: this.currentReport.closing_balance || 0,
                actualProfit: this.currentReport.actual_profit || 0,
                expenses: this.currentReport.expenses || [],
                transfers: this.currentReport.transfers || [],
                inventoryUsed: this.currentReport.inventory_used || []
            };
        } else {
            // Không có báo cáo: tạo mới với số dư đầu kỳ tự động
            this.loadAutoOpeningBalance();
        }
    }

    /**
     * Load số dư đầu kỳ tự động
     */
    async loadAutoOpeningBalance() {
        try {
            const previousDay = dateUtils.getPreviousDay(this.currentDate);
            const previousReport = await dbManager.getDailyReport(previousDay);
            
            if (previousReport && previousReport.closing_balance !== undefined) {
                this.formData.openingBalance = previousReport.closing_balance;
            }
        } catch (error) {
            console.error('Lỗi load số dư đầu kỳ:', error);
        }
    }

    /**
     * Load dữ liệu phụ trợ
     */
    async loadSupportingData() {
        try {
            await this.inventoryManager.loadInventory();
            await this.loadRecentReports();
        } catch (error) {
            console.error('Lỗi load dữ liệu phụ trợ:', error);
        }
    }

   

    /**
     * Render template chính
     */
    render() {
        const container = document.getElementById('daily-report');
        if (!container) {
            console.error('❌ Không tìm thấy container daily-report');
            return;
        }
        
        container.innerHTML = this.getTemplate();
        console.log('✅ Template rendered');
    }

/**
 * Template HTML
 */
getTemplate() {
    return `
        <div class="daily-report-container">
            <!-- Date Selector -->
            <div class="date-selector">
                <input type="date" id="report-date" value="${this.currentDate}" 
                       max="${dateUtils.getToday()}" class="date-input">
            </div>

            <!-- Money Buttons Grid -->
            <div class="money-grid">
                <!-- Row 1 -->
                <div class="money-btn-container">
                    <button type="button" id="opening-balance" class="money-btn">
                        <div class="money-icon">💰</div>
                        <div class="money-label">Số dư đầu</div>
                        <div class="money-amount">${formatter.formatCurrency(this.formData.openingBalance)}</div>
                    </button>
                </div>
                
                <div class="money-btn-container">
                    <button type="button" id="closing-balance" class="money-btn">
                        <div class="money-icon">💰</div>
                        <div class="money-label">Số dư cuối</div>
                        <div class="money-amount">${formatter.formatCurrency(this.formData.closingBalance)}</div>
                    </button>
                </div>

                <!-- Row 2 -->
                <div class="money-btn-container">
                    <button type="button" id="revenue" class="money-btn">
                        <div class="money-icon">📈</div>
                        <div class="money-label">Doanh thu</div>
                        <div class="money-amount">${formatter.formatCurrency(this.formData.revenue)}</div>
                    </button>
                </div>
                
                <div class="money-btn-container">
                    <div class="money-btn result-display">
                        <div class="money-icon">🎯</div>
                        <div class="money-label">Thực nhận</div>
                        <div class="money-amount" id="actual-profit">${formatter.formatCurrency(this.formData.actualProfit)}</div>
                    </div>
                </div>

                <!-- Row 3 -->
                <div class="money-btn-container">
                    <button type="button" id="expenses-btn" class="money-btn">
                        <div class="money-icon">💸</div>
                        <div class="money-label">Chi phí</div>
                        <div class="money-amount">${this.getExpensesTotal()}đ</div>
                    </button>
                </div>
                
                <div class="money-btn-container">
                    <button type="button" id="transfers-btn" class="money-btn">
                        <div class="money-icon">🏦</div>
                        <div class="money-label">Chuyển khoản</div>
                        <div class="money-amount">${this.getTransfersTotal()}đ</div>
                    </button>
                </div>
            </div>

            <!-- Inventory Section -->
            <div class="inventory-section">
                <div class="section-header">
                    <h3 class="section-title">📦 Hàng hóa xuất kho</h3>
                    <button type="button" id="toggle-inventory-btn" class="toggle-btn">
                        <span class="toggle-icon">👁️</span>
                        <span class="toggle-text">Hiển thị</span>
                    </button>
                </div>
                <div id="inventory-container" class="inventory-container hidden">
                    ${this.getInventoryHTML()}
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-grid">
                <button type="button" id="save-report-btn" class="action-btn primary">
                    <span class="action-icon">💾</span>
                    <span class="action-text">Lưu & Copy</span>
                </button>
                
                <button type="button" id="send-zalo-btn" class="action-btn success">
                    <span class="action-icon">📤</span>
                    <span class="action-text">Gửi Zalo</span>
                </button>
                
                <button type="button" id="new-report-btn" class="action-btn warning">
                    <span class="action-icon">🔄</span>
                    <span class="action-text">Làm mới</span>
                </button>
            </div>

            <!-- Recent Reports -->
            <div class="recent-section">
                <div class="section-header">
                    <h3 class="section-title">📋 7 ngày gần đây</h3>
                    <button type="button" id="toggle-recent-btn" class="toggle-btn">
                        <span class="toggle-icon">👁️</span>
                        <span class="toggle-text">Hiển thị</span>
                    </button>
                </div>
                <div id="recent-reports-container" class="recent-container hidden">
                    <div id="recent-reports-list" class="reports-list">
                        ${this.getRecentReportsHTML()}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * HTML cho hàng hóa
 */
getInventoryHTML() {
    if (!this.inventoryManager || !this.inventoryManager.inventory) {
        return '<div class="empty-state">Chưa có dữ liệu hàng hóa</div>';
    }
    
    const inventory = this.inventoryManager.inventory;
    if (inventory.length === 0) {
        return '<div class="empty-state">Không có hàng hóa trong kho</div>';
    }
    
    return `
        <div class="inventory-list">
            ${inventory.map(item => `
                <div class="inventory-item" data-product-id="${item.id}">
                    <div class="inventory-info">
                        <div class="inventory-name">${item.name}</div>
                        <div class="inventory-stock">Tồn: ${item.current_stock} ${item.unit}</div>
                    </div>
                    <div class="inventory-controls">
                        <button type="button" class="quantity-btn decrease" data-product-id="${item.id}">-</button>
                        <input type="number" 
                               class="usage-input" 
                               data-product-id="${item.id}"
                               min="0" 
                               max="${item.current_stock}"
                               placeholder="0"
                               value="${this.getInventoryUsage(item.id)}"
                               inputmode="numeric"
                               readonly>
                        <button type="button" class="quantity-btn increase" data-product-id="${item.id}">+</button>
                        <span class="inventory-unit">${item.unit}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Lấy số lượng xuất của sản phẩm
 */
getInventoryUsage(productId) {
    if (!this.formData.inventoryUsed || this.formData.inventoryUsed.length === 0) return 0;
    
    const usage = this.formData.inventoryUsed.find(item => item.product_id === productId);
    return usage ? usage.quantity : 0;
}

/**
 * Format giá trị nhập (bỏ 3 số 0)
 */
formatInputValue(amount) {
    if (amount === 0) return '0';
    // Chia cho 1000 để hiển thị số ngắn gọn
    return formatter.formatNumber(amount / 1000) + 'k';
}

/**
 * Parse giá trị nhập (nhân với 1000)
 */
parseInputValue(inputValue) {
    if (!inputValue) return 0;
    
    // Loại bỏ ký tự 'k' và khoảng trắng
    const cleanValue = inputValue.toString().replace(/[k\s]/g, '').replace(/\./g, '');
    const numberValue = parseFloat(cleanValue) || 0;
    
    // Nhân với 1000 để lấy giá trị thực
    return Math.round(numberValue * 1000);
}

/**
 * Load danh sách báo cáo gần đây (7 ngày)
 */
async loadRecentReports() {
    try {
        const allReports = await dbManager.getAll('daily_reports');
        
        // Lọc 7 ngày gần nhất
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        this.recentReports = allReports
            .filter(report => new Date(report.date) >= sevenDaysAgo)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 7); // Tối đa 7 báo cáo
            
        console.log('Recent reports loaded:', this.recentReports.length);
    } catch (error) {
        console.error('Lỗi load báo cáo gần đây:', error);
        this.recentReports = [];
    }
}



/**
 * Lấy số lượng xuất của sản phẩm
 */
getInventoryUsage(productId) {
    if (!this.formData.inventoryUsed || this.formData.inventoryUsed.length === 0) return 0;
    
    const usage = this.formData.inventoryUsed.find(item => item.product_id === productId);
    return usage ? usage.quantity : 0;
}

    /**
     * Lấy tổng chi phí
     */
    getExpensesTotal() {
        const total = this.formData.expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        return formatter.formatNumber(total);
    }

    /**
     * Lấy tổng chuyển khoản
     */
    getTransfersTotal() {
        const total = this.formData.transfers.reduce((sum, tf) => sum + (tf.amount || 0), 0);
        return formatter.formatNumber(total);
    }

    /**
     * HTML cho báo cáo gần đây
     */
    getRecentReportsHTML() {
        if (this.recentReports.length === 0) {
            return '<div class="empty-state">Chưa có báo cáo nào</div>';
        }
        
        return this.recentReports.map(report => `
            <div class="report-item ${report.date === this.currentDate ? 'current' : ''}" data-date="${report.date}">
                <div class="report-info">
                    <div class="report-date">${dateUtils.formatDisplayDate(report.date)}</div>
                    <div class="report-amounts">
                        <span class="revenue">${formatter.formatCurrency(report.revenue || 0)}</span>
                        <span class="profit">${formatter.formatCurrency(report.actual_profit || 0)}</span>
                    </div>
                </div>
                ${this.canEditReport(report.date) ? `
                    <button class="edit-report-btn" data-date="${report.date}">
                        <span class="edit-icon">✏️</span>
                    </button>
                ` : ''}
            </div>
        `).join('');
    }

    /**
     * Kiểm tra có thể sửa báo cáo không (chỉ được sửa báo cáo gần nhất)
     */
    canEditReport(reportDate) {
        if (this.recentReports.length === 0) return false;
        
        // Chỉ cho phép sửa báo cáo gần nhất
        const latestReport = this.recentReports[0];
        return reportDate === latestReport.date;
    }

    /**
 * Render dữ liệu lên form
 */
renderFormData() {
    // Cập nhật money buttons
    this.updateMoneyButton('opening-balance', this.formData.openingBalance);
    this.updateMoneyButton('revenue', this.formData.revenue);
    this.updateMoneyButton('closing-balance', this.formData.closingBalance);
    this.updateMoneyButton('expenses-btn', this.getExpensesTotal(), 'đ');
    this.updateMoneyButton('transfers-btn', this.getTransfersTotal(), 'đ');
    
    // Cập nhật thực lãnh
    this.updateActualProfitDisplay();
    
    // Cập nhật recent reports
    this.renderRecentReports();
    
    console.log('✅ Form data rendered');
}

/**
 * Cập nhật money button
 */
updateMoneyButton(buttonId, amount, suffix = '') {
    const button = document.getElementById(buttonId);
    if (button) {
        const amountElement = button.querySelector('.money-amount');
        if (amountElement) {
            if (suffix === 'đ') {
                amountElement.textContent = formatter.formatNumber(amount) + suffix;
            } else {
                amountElement.textContent = formatter.formatCurrency(amount);
            }
        }
    }
}

    /**
     * Cập nhật money button
     */
    updateMoneyButton(buttonId, amount, suffix = '') {
        const button = document.getElementById(buttonId);
        if (button) {
            const amountElement = button.querySelector('.money-amount');
            if (amountElement) {
                amountElement.textContent = amount + suffix;
            }
        }
    }

    /**
     * Cập nhật hiển thị thực lãnh
     */
    updateActualProfitDisplay() {
        const element = document.getElementById('actual-profit');
        if (element) {
            element.textContent = formatter.formatCurrency(this.formData.actualProfit);
        }
    }
/**
 * Debug inventory events
 */
debugInventoryEvents() {
    console.log('🐛 Debug inventory events...');
    
    // Kiểm tra inventory items
    const inventoryItems = document.querySelectorAll('.inventory-item');
    console.log(`📦 Inventory items found: ${inventoryItems.length}`);
    
    inventoryItems.forEach((item, index) => {
        const productId = item.dataset.productId;
        const input = item.querySelector('.usage-input');
        const decreaseBtn = item.querySelector('.decrease');
        const increaseBtn = item.querySelector('.increase');
        
        console.log(`Item ${index + 1}:`, {
            productId,
            hasInput: !!input,
            hasDecreaseBtn: !!decreaseBtn,
            hasIncreaseBtn: !!increaseBtn,
            inputValue: input?.value,
            inputReadonly: input?.readOnly
        });
    });
    
    // Kiểm tra event listeners
    console.log('🎯 Event listeners check completed');
}
    /**
 * Bind events
 */
bindEvents() {
    console.log('🔄 Binding events...');
    
    // Date change - tự động load khi chọn ngày
    const dateInput = document.getElementById('report-date');
    if (dateInput) {
        dateInput.addEventListener('change', () => this.loadReportByDate());
    }
    
    // Money buttons
    this.bindMoneyButtonEvents();
    
    // Action buttons
    this.bindActionButtons();
    
    // Toggle buttons
    this.bindToggleButtons();
    
    // Inventory usage changes - QUAN TRỌNG: THÊM DÒNG NÀY
    this.bindInventoryEvents();
    
    // Recent reports
    this.bindRecentReportsEvents();
    
    console.log('✅ Events bound successfully');
}

/**
 * Bind events cho money buttons
 */
bindMoneyButtonEvents() {
    console.log('🔄 Binding money buttons...');
    
    // Các nút số tiền
    const moneyButtons = ['opening-balance', 'revenue', 'closing-balance'];
    moneyButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => this.showMoneyInputDialog(buttonId));
            console.log(`✅ Bound ${buttonId}`);
        } else {
            console.warn(`❌ #${buttonId} not found`);
        }
    });
    
    // Nút chi phí và chuyển khoản
    const expensesBtn = document.getElementById('expenses-btn');
    if (expensesBtn) {
        expensesBtn.addEventListener('click', () => this.showExpensesManager());
        console.log('✅ Bound expenses-btn');
    } else {
        console.warn('❌ #expenses-btn not found');
    }
    
    const transfersBtn = document.getElementById('transfers-btn');
    if (transfersBtn) {
        transfersBtn.addEventListener('click', () => this.showTransfersManager());
        console.log('✅ Bound transfers-btn');
    } else {
        console.warn('❌ #transfers-btn not found');
    }
}

/**
 * Bind events cho action buttons
 */
bindActionButtons() {
    console.log('🔄 Binding action buttons...');
    
    const saveBtn = document.getElementById('save-report-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveReport());
        console.log('✅ Bound save-report-btn');
    } else {
        console.warn('❌ #save-report-btn not found');
    }
    
    const zaloBtn = document.getElementById('send-zalo-btn');
    if (zaloBtn) {
        zaloBtn.addEventListener('click', () => this.sendToZalo());
        console.log('✅ Bound send-zalo-btn');
    } else {
        console.warn('❌ #send-zalo-btn not found');
    }
    
    const newBtn = document.getElementById('new-report-btn');
    if (newBtn) {
        newBtn.addEventListener('click', () => this.createNewReport());
        console.log('✅ Bound new-report-btn');
    } else {
        console.warn('❌ #new-report-btn not found');
    }
}

/**
 * Bind events cho toggle buttons
 */
bindToggleButtons() {
    console.log('🔄 Binding toggle buttons...');
    
    const inventoryToggle = document.getElementById('toggle-inventory-btn');
    if (inventoryToggle) {
        inventoryToggle.addEventListener('click', () => this.toggleInventory());
        console.log('✅ Bound toggle-inventory-btn');
    } else {
        console.warn('❌ #toggle-inventory-btn not found');
    }
    
    const recentToggle = document.getElementById('toggle-recent-btn');
    if (recentToggle) {
        recentToggle.addEventListener('click', () => this.toggleRecentReports());
        console.log('✅ Bound toggle-recent-btn');
    } else {
        console.warn('❌ #toggle-recent-btn not found');
    }
}

/**
 * Toggle hiển thị recent reports
 */
toggleRecentReports() {
    const container = document.getElementById('recent-reports-container');
    const button = document.getElementById('toggle-recent-btn');
    const icon = button.querySelector('.toggle-icon');
    const text = button.querySelector('.toggle-text');
    
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        icon.textContent = '🙈';
        text.textContent = 'Ẩn';
    } else {
        container.classList.add('hidden');
        icon.textContent = '👁️';
        text.textContent = 'Hiển thị';
    }
}

/**
 * Toggle hiển thị inventory
 */
toggleInventory() {
    const container = document.getElementById('inventory-container');
    const button = document.getElementById('toggle-inventory-btn');
    const icon = button.querySelector('.toggle-icon');
    const text = button.querySelector('.toggle-text');
    
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        icon.textContent = '🙈';
        text.textContent = 'Ẩn';
    } else {
        container.classList.add('hidden');
        icon.textContent = '👁️';
        text.textContent = 'Hiển thị';
    }
}

/**
 * HTML cho hàng hóa
 */
getInventoryHTML() {
    if (!this.inventoryManager || !this.inventoryManager.inventory) {
        return '<div class="empty-state">Chưa có dữ liệu hàng hóa</div>';
    }
    
    const inventory = this.inventoryManager.inventory;
    if (inventory.length === 0) {
        return '<div class="empty-state">Không có hàng hóa trong kho</div>';
    }
    
    return `
        <div class="inventory-list">
            ${inventory.map(item => `
                <div class="inventory-item" data-product-id="${item.id}">
                    <div class="inventory-info">
                        <div class="inventory-name">${item.name}</div>
                        <div class="inventory-stock">Tồn: ${item.current_stock} ${item.unit}</div>
                    </div>
                    <div class="inventory-controls">
                        <button type="button" class="quantity-btn decrease" data-product-id="${item.id}">-</button>
                        <input type="number" 
                               class="usage-input" 
                               data-product-id="${item.id}"
                               min="0" 
                               max="${item.current_stock}"
                               placeholder="0"
                               value="${this.getInventoryUsage(item.id)}"
                               inputmode="numeric"
                               readonly>
                        <button type="button" class="quantity-btn increase" data-product-id="${item.id}">+</button>
                        <span class="inventory-unit">${item.unit}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Bind events cho inventory - FIX DUPLICATE
 */
bindInventoryEvents() {
    console.log('🔄 Binding inventory events...');
    
    // Remove existing listeners trước để tránh duplicate
    this.removeInventoryEvents();
    
    // Sử dụng event delegation với once hoặc flag
    this.inventoryClickHandler = (e) => {
        // Xử lý click vào hàng hóa để focus input
        if (e.target.closest('.inventory-item') && 
            !e.target.classList.contains('quantity-btn') && 
            !e.target.classList.contains('usage-input')) {
            const item = e.target.closest('.inventory-item');
            this.focusInventoryInput(item);
        }
        
        // Xử lý nút tăng/giảm
        if (e.target.classList.contains('quantity-btn')) {
            e.stopPropagation(); // Ngăn event bubbling
            this.handleQuantityChange(e.target);
        }
    };
    
    this.inventoryInputHandler = (e) => {
        if (e.target.classList.contains('usage-input')) {
            this.handleInventoryInputChange(e.target);
        }
    };
    
    // Add event listeners
    document.addEventListener('click', this.inventoryClickHandler);
    document.addEventListener('input', this.inventoryInputHandler);
    
    console.log('✅ Inventory events bound (no duplicate)');
}

/**
 * Remove existing inventory events
 */
removeInventoryEvents() {
    if (this.inventoryClickHandler) {
        document.removeEventListener('click', this.inventoryClickHandler);
    }
    if (this.inventoryInputHandler) {
        document.removeEventListener('input', this.inventoryInputHandler);
    }
    console.log('🧹 Removed existing inventory events');
}

/**
 * Xử lý thay đổi số lượng bằng nút - FIX DUPLICATE
 */
handleQuantityChange(button) {
    // Thêm debounce để tránh multiple clicks
    if (this.quantityChangeTimeout) {
        clearTimeout(this.quantityChangeTimeout);
    }
    
    this.quantityChangeTimeout = setTimeout(() => {
        const productId = button.dataset.productId;
        const input = document.querySelector(`.usage-input[data-product-id="${productId}"]`);
        
        if (!input) {
            console.warn('❌ Không tìm thấy input cho product:', productId);
            return;
        }
        
        const isIncrease = button.classList.contains('increase');
        const currentValue = parseInt(input.value) || 0;
        const maxStock = parseInt(input.max) || 0;
        
        // Thay đổi 1 đơn vị
        let newValue = isIncrease ? currentValue + 1 : currentValue - 1;
        newValue = Math.max(0, Math.min(maxStock, newValue));
        
        // Chỉ update nếu giá trị thay đổi
        if (newValue !== currentValue) {
            input.value = newValue;
            this.updateInventoryUsage(productId, newValue);
            console.log(`📦 Updated ${productId}: ${currentValue} → ${newValue}`);
        }
    }, 50); // Debounce 50ms
}

/**
 * Focus vào input khi click hàng hóa
 */
focusInventoryInput(item) {
    const input = item.querySelector('.usage-input');
    if (input) {
        input.removeAttribute('readonly');
        input.focus();
        input.select();
        
        // Thêm readonly lại khi blur
        const handleBlur = () => {
            input.setAttribute('readonly', 'true');
            input.removeEventListener('blur', handleBlur);
        };
        input.addEventListener('blur', handleBlur, { once: true });
    }
}



/**
 * Xử lý thay đổi số lượng bằng input
 */
handleInventoryInputChange(input) {
    const productId = input.dataset.productId;
    const quantity = parseInt(input.value) || 0;
    const maxStock = parseInt(input.max) || 0;
    
    if (quantity > maxStock) {
        input.value = maxStock;
        this.showError(`Số lượng xuất không được vượt quá tồn kho (${maxStock})`);
        this.updateInventoryUsage(productId, maxStock);
    } else if (quantity < 0) {
        input.value = 0;
        this.updateInventoryUsage(productId, 0);
    } else {
        this.updateInventoryUsage(productId, quantity);
    }
}

/**
 * Xử lý thay đổi số lượng xuất kho
 */
handleInventoryUsageChange(input) {
    const productId = input.dataset.productId;
    const quantity = parseInt(input.value) || 0;
    const maxStock = parseInt(input.max) || 0;
    
    if (quantity > maxStock) {
        input.value = maxStock;
        this.showError(`Số lượng xuất không được vượt quá tồn kho (${maxStock})`);
        return;
    }
    
    // Cập nhật formData
    this.updateInventoryUsage(productId, quantity);
}

/**
 * Cập nhật số lượng xuất kho trong formData - FIX DUPLICATE
 */
updateInventoryUsage(productId, quantity) {
    if (!this.formData.inventoryUsed) {
        this.formData.inventoryUsed = [];
    }
    
    const existingIndex = this.formData.inventoryUsed.findIndex(item => item.product_id === productId);
    
    if (quantity > 0) {
        const product = this.inventoryManager.inventory.find(item => item.id === productId);
        if (product) {
            if (existingIndex >= 0) {
                // Update existing entry
                this.formData.inventoryUsed[existingIndex].quantity = quantity;
            } else {
                // Add new entry
                this.formData.inventoryUsed.push({
                    product_id: productId,
                    product_name: product.name,
                    quantity: quantity
                });
            }
        }
    } else if (existingIndex >= 0) {
        // Remove entry if quantity is 0
        this.formData.inventoryUsed.splice(existingIndex, 1);
    }
    
    console.log('📦 Inventory usage updated:', this.formData.inventoryUsed);
}



    /**
     * Bind events cho recent reports
     */
    bindRecentReportsEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-report-btn')) {
                const date = e.target.closest('.edit-report-btn').dataset.date;
                document.getElementById('report-date').value = date;
                this.loadReportByDate();
            }
        });
    }

    /**
 * Hiển thị dialog nhập số tiền
 */
showMoneyInputDialog(fieldId) {
    const currentValue = this.formData[this.getFieldName(fieldId)];
    
    const dialogHTML = `
        <div class="dialog-overlay show" id="money-dialog">
            <div class="dialog">
                <div class="dialog-header">
                    <h3 class="dialog-title">${this.getFieldLabel(fieldId)}</h3>
                    <button class="dialog-close">&times;</button>
                </div>
                <div class="dialog-body">
                    <div class="input-hint">Nhập số (ví dụ: 18 = 18,000đ)</div>
                    <input type="text" 
                           class="amount-input-large" 
                           id="money-input"
                           value="${currentValue === 0 ? '' : this.formatInputValue(currentValue)}"
                           placeholder="Nhập số..."
                           inputmode="numeric">
                    <div class="input-preview">
                        <span>Giá trị thực: </span>
                        <span id="value-preview">${formatter.formatCurrency(currentValue)}</span>
                    </div>
                    <div class="dialog-actions">
                        <button class="btn btn-primary" id="save-money-btn">💾 Lưu</button>
                        <button class="btn btn-outline" id="cancel-money-btn">❌ Hủy</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
    this.bindMoneyDialogEvents(fieldId);
    
    // Focus và select all text
    const input = document.getElementById('money-input');
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
}

/**
 * Bind events cho money dialog
 */
bindMoneyDialogEvents(fieldId) {
    const dialog = document.getElementById('money-dialog');
    const saveBtn = document.getElementById('save-money-btn');
    const cancelBtn = document.getElementById('cancel-money-btn');
    const closeBtn = dialog.querySelector('.dialog-close');
    const input = document.getElementById('money-input');
    const preview = document.getElementById('value-preview');
    
    const closeDialog = () => dialog.remove();
    
    const updatePreview = () => {
        const parsedValue = this.parseInputValue(input.value);
        preview.textContent = formatter.formatCurrency(parsedValue);
    };
    
    const saveValue = () => {
        const newValue = this.parseInputValue(input.value);
        this.updateMoneyField(fieldId, newValue);
        closeDialog();
    };
    
    // Real-time preview
    input.addEventListener('input', updatePreview);
    
    saveBtn.addEventListener('click', saveValue);
    cancelBtn.addEventListener('click', closeDialog);
    closeBtn.addEventListener('click', closeDialog);
    
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) closeDialog();
    });
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveValue();
    });
    
    // Ngăn zoom trên mobile
    input.addEventListener('touchstart', (e) => {
        e.preventDefault();
    }, { passive: false });
    
    // Initial preview
    updatePreview();
}

    /**
     * Cập nhật trường số tiền
     */
    updateMoneyField(fieldId, newValue) {
        const fieldName = this.getFieldName(fieldId);
        this.formData[fieldName] = newValue;
        
        // Cập nhật hiển thị
        this.updateMoneyButton(fieldId, formatter.formatCurrency(newValue));
        
        // Tính toán lại thực lãnh
        this.calculateActualProfit();
        
        console.log(`✅ Updated ${fieldName}:`, newValue);
    }

    /**
     * Map fieldId sang field name
     */
    getFieldName(fieldId) {
        const fieldMap = {
            'opening-balance': 'openingBalance',
            'revenue': 'revenue',
            'closing-balance': 'closingBalance'
        };
        return fieldMap[fieldId] || fieldId;
    }

    /**
     * Get field label
     */
    getFieldLabel(fieldId) {
        const labelMap = {
            'opening-balance': 'Số dư đầu kỳ',
            'revenue': 'Doanh thu',
            'closing-balance': 'Số dư cuối kỳ'
        };
        return labelMap[fieldId] || fieldId;
    }

    /**
     * Tính toán thực lãnh
     */
    calculateActualProfit() {
        const { openingBalance, revenue, closingBalance, expenses, transfers } = this.formData;
        
        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const totalTransfers = transfers.reduce((sum, tf) => sum + (tf.amount || 0), 0);
        
        this.formData.actualProfit = openingBalance + revenue - totalExpenses - totalTransfers - closingBalance;
        
        // Cập nhật hiển thị
        this.updateActualProfitDisplay();
        
        console.log('🔄 Calculated actual profit:', this.formData.actualProfit);
    }

    /**
     * Hiển thị dialog quản lý chi phí
     */
    showExpensesManager() {
        this.showItemsManager('expenses', '💸 Quản lý Chi phí', this.formData.expenses, true);
    }

    /**
     * Hiển thị dialog quản lý chuyển khoản
     */
    showTransfersManager() {
        this.showItemsManager('transfers', '🏦 Quản lý Chuyển khoản', this.formData.transfers, false);
    }

    /**
     * Hiển thị dialog quản lý items
     */
    showItemsManager(type, title, items, showCategories = false) {
        const dialogHTML = `
            <div class="dialog-overlay show" id="${type}-dialog">
                <div class="dialog">
                    <div class="dialog-header">
                        <h3 class="dialog-title">${title}</h3>
                        <button class="dialog-close">&times;</button>
                    </div>
                    <div class="dialog-body">
                        <!-- Summary -->
                        <div class="summary-cards">
                            <div class="summary-card ${type}">
                                <span class="summary-label">Tổng ${type === 'expenses' ? 'chi phí' : 'chuyển khoản'}</span>
                                <div class="summary-amount" id="${type}-total">0đ</div>
                            </div>
                            <div class="summary-card">
                                <span class="summary-label">Số mục</span>
                                <div class="summary-amount" id="${type}-count">0</div>
                            </div>
                        </div>
                        
                        <!-- Items List -->
                        <div class="items-list" id="${type}-list">
                            ${items.map((item, index) => this.getItemHTML(type, item, index, showCategories)).join('')}
                        </div>
                        
                        <!-- Quick Actions -->
                        <div class="quick-actions">
                            <button class="quick-action-btn" id="add-${type}-item">
                                <span class="quick-action-icon">➕</span>
                                <span class="quick-action-text">Thêm mục</span>
                            </button>
                            <button class="quick-action-btn" id="save-${type}">
                                <span class="quick-action-icon">💾</span>
                                <span class="quick-action-text">Lưu & Đóng</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        this.bindItemsManagerEvents(type, items, showCategories);
        this.updateItemsManagerSummary(type, items);
    }

    /**
     * HTML cho một item trong dialog
     */
    getItemHTML(type, item, index, showCategories = false) {
        return `
            <div class="item-card" data-index="${index}">
                <div class="item-card-header">
                    <div class="item-content">
                        ${showCategories ? `
                            <select class="item-content-select" data-field="content">
                                <option value="">Chọn hoặc nhập...</option>
                                ${this.expenseCategories.map(cat => `
                                    <option value="${cat.name}" ${item.content === cat.name ? 'selected' : ''}>${cat.name}</option>
                                `).join('')}
                            </select>
                            <input type="text" 
                                   class="item-content-input" 
                                   placeholder="Hoặc nhập nội dung khác..."
                                   value="${item.content && !this.expenseCategories.find(c => c.name === item.content) ? item.content : ''}"
                                   data-field="content-custom">
                        ` : `
                            <input type="text" 
                                   class="item-content-input" 
                                   placeholder="${type === 'expenses' ? 'Nội dung chi phí...' : 'Nội dung chuyển khoản...'}"
                                   value="${item.content || ''}"
                                   data-field="content">
                        `}
                    </div>
                    <div class="item-amount">
                        <span class="currency-symbol">đ</span>
                        <input type="text" 
                               class="amount-input" 
                               placeholder="0"
                               value="${item.amount ? formatter.formatCurrency(item.amount) : ''}"
                               data-field="amount"
                               inputmode="numeric">
                    </div>
                </div>
                <div class="item-actions">
                    <button type="button" class="btn-remove remove-item">
                        🗑️ Xóa
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Bind events cho items manager
     */
    bindItemsManagerEvents(type, items, showCategories) {
        const dialog = document.getElementById(`${type}-dialog`);
        if (!dialog) return;
        
        // Đóng dialog
        dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.remove());
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.remove();
        });
        
        // Thêm item mới
        dialog.querySelector(`#add-${type}-item`).addEventListener('click', () => {
            items.push({ content: '', amount: 0 });
            this.refreshItemsList(type, items, showCategories);
        });
        
        // Lưu và đóng
        dialog.querySelector(`#save-${type}`).addEventListener('click', () => {
            this.formData[type] = this.getValidItemsFromDialog(type, showCategories);
            this.calculateActualProfit();
            this.renderFormData();
            dialog.remove();
        });
        
        // Xóa item
        dialog.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item')) {
                const card = e.target.closest('.item-card');
                const index = parseInt(card.dataset.index);
                items.splice(index, 1);
                this.refreshItemsList(type, items, showCategories);
            }
        });
        
        // Real-time calculation
        dialog.addEventListener('input', () => {
            this.updateItemsFromDialog(type, items, showCategories);
            this.updateItemsManagerSummary(type, items);
        });
        
        // Ngăn zoom trên mobile
        dialog.querySelectorAll('input').forEach(input => {
            input.addEventListener('touchstart', (e) => {
                e.preventDefault();
            }, { passive: false });
        });
    }

    /**
     * Làm mới danh sách items
     */
    refreshItemsList(type, items, showCategories) {
        const dialog = document.getElementById(`${type}-dialog`);
        if (!dialog) return;
        
        const list = dialog.querySelector(`#${type}-list`);
        list.innerHTML = items.map((item, index) => this.getItemHTML(type, item, index, showCategories)).join('');
        this.updateItemsManagerSummary(type, items);
    }

    /**
     * Cập nhật items từ dialog
     */
    updateItemsFromDialog(type, items, showCategories) {
        const dialog = document.getElementById(`${type}-dialog`);
        if (!dialog) return;
        
        dialog.querySelectorAll('.item-card').forEach(card => {
            const index = parseInt(card.dataset.index);
            
            let content = '';
            if (showCategories) {
                const select = card.querySelector('.item-content-select');
                const input = card.querySelector('.item-content-input');
                content = select.value || input.value;
            } else {
                const input = card.querySelector('[data-field="content"]');
                content = input.value;
            }
            
            const amountInput = card.querySelector('[data-field="amount"]');
            const amount = formatter.parseCurrency(amountInput.value);
            
            if (items[index]) {
                items[index].content = content;
                items[index].amount = amount;
            }
        });
    }

    /**
     * Lấy items hợp lệ từ dialog
     */
    getValidItemsFromDialog(type, showCategories) {
        const dialog = document.getElementById(`${type}-dialog`);
        const items = [];
        
        if (dialog) {
            dialog.querySelectorAll('.item-card').forEach(card => {
                let content = '';
                if (showCategories) {
                    const select = card.querySelector('.item-content-select');
                    const input = card.querySelector('.item-content-input');
                    content = select.value || input.value;
                } else {
                    const input = card.querySelector('[data-field="content"]');
                    content = input.value;
                }
                
                const amountInput = card.querySelector('[data-field="amount"]');
                const amount = formatter.parseCurrency(amountInput.value);
                
                if (content.trim() || amount > 0) {
                    items.push({ 
                        content: content.trim(), 
                        amount 
                    });
                }
            });
        }
        
        return items;
    }

    /**
     * Cập nhật summary trong dialog
     */
    updateItemsManagerSummary(type, items) {
        const dialog = document.getElementById(`${type}-dialog`);
        if (!dialog) return;
        
        const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);
        const count = items.filter(item => item.content || item.amount > 0).length;
        
        dialog.querySelector(`#${type}-total`).textContent = formatter.formatCurrency(total) + 'đ';
        dialog.querySelector(`#${type}-count`).textContent = count;
    }

    /**
     * Load báo cáo theo ngày
     */
    async loadReportByDate() {
        try {
            const dateInput = document.getElementById('report-date');
            const selectedDate = dateInput.value;
            
            if (!dateUtils.isValidReportDate(selectedDate)) {
                this.showError('Ngày không hợp lệ');
                return;
            }
            
            this.currentDate = selectedDate;
            await this.loadInitialData();
            
        } catch (error) {
            console.error('Lỗi load báo cáo:', error);
            this.showError('Lỗi tải báo cáo: ' + error.message);
        }
    }

    /**
 * Lưu báo cáo
 */
async saveReport() {
    if (!this.validateForm()) return;
    
    this.showLoading();
    
    try {
        // Lấy dữ liệu inventory từ form
        this.updateInventoryFromForm();
        
        const reportData = {
            id: this.currentReport?.id || formatter.generateId('report'),
            date: this.currentDate,
            opening_balance: this.formData.openingBalance,
            revenue: this.formData.revenue,
            expenses: this.formData.expenses,
            transfers: this.formData.transfers,
            closing_balance: this.formData.closingBalance,
            actual_profit: this.formData.actualProfit,
            inventory_used: this.formData.inventoryUsed,
            created_by: 'user_id',
            created_at: this.currentReport?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        await dbManager.update('daily_reports', reportData);
        this.currentReport = reportData;
        
        // Copy nội dung báo cáo
        await this.copyReportToClipboard(reportData);
        
        // Cập nhật tồn kho
        await this.updateInventoryStock();
        
        // Load lại recent reports
        await this.loadRecentReports();
        this.renderRecentReports();
        
        this.showSuccess('Đã lưu và copy báo cáo!');
        
    } catch (error) {
        console.error('Lỗi lưu báo cáo:', error);
        this.showError('Lỗi lưu báo cáo: ' + error.message);
    } finally {
        this.hideLoading();
    }
}

/**
 * Cập nhật inventory từ form
 */
updateInventoryFromForm() {
    const inputs = document.querySelectorAll('.usage-input');
    this.formData.inventoryUsed = [];
    
    inputs.forEach(input => {
        const quantity = parseInt(input.value) || 0;
        if (quantity > 0) {
            const productId = input.dataset.productId;
            const product = this.inventoryManager.inventory.find(item => item.id === productId);
            if (product) {
                this.formData.inventoryUsed.push({
                    product_id: productId,
                    product_name: product.name,
                    quantity: quantity
                });
            }
        }
    });
}

    /**
     * Copy báo cáo vào clipboard
     */
    async copyReportToClipboard(reportData) {
        try {
            const reportText = this.formatReportForCopy(reportData);
            await navigator.clipboard.writeText(reportText);
            console.log('✅ Report copied to clipboard');
        } catch (error) {
            console.error('Lỗi copy clipboard:', error);
        }
    }

    /**
 * Format báo cáo để copy
 */
formatReportForCopy(reportData) {
    const { date, opening_balance, revenue, expenses, transfers, closing_balance, actual_profit, inventory_used } = reportData;
    
    let text = `📊 BÁO CÁO NGÀY ${dateUtils.formatDisplayDate(date)}\n\n`;
    text += `💰 Số dư đầu: ${formatter.formatCurrency(opening_balance)}\n`;
    text += `📈 Doanh thu: ${formatter.formatCurrency(revenue)}\n`;
    
    if (expenses.length > 0) {
        text += `💸 Chi phí:\n`;
        expenses.forEach(exp => {
            text += `  - ${exp.content}: ${formatter.formatCurrency(exp.amount)}\n`;
        });
        text += `  Tổng: ${formatter.formatCurrency(expenses.reduce((sum, exp) => sum + exp.amount, 0))}\n`;
    }
    
    if (transfers.length > 0) {
        text += `🏦 Chuyển khoản:\n`;
        transfers.forEach(tf => {
            text += `  - ${tf.content}: ${formatter.formatCurrency(tf.amount)}\n`;
        });
        text += `  Tổng: ${formatter.formatCurrency(transfers.reduce((sum, tf) => sum + tf.amount, 0))}\n`;
    }
    
    if (inventory_used && inventory_used.length > 0) {
        text += `📦 Hàng hóa xuất kho:\n`;
        inventory_used.forEach(item => {
            text += `  - ${item.product_name}: ${item.quantity}\n`;
        });
    }
    
    text += `💰 Số dư cuối: ${formatter.formatCurrency(closing_balance)}\n`;
    text += `🎯 Thực lãnh: ${formatter.formatCurrency(actual_profit)}\n`;
    
    return text;
}

    /**
     * Tạo báo cáo mới
     */
    async createNewReport() {
        if (confirm('Tạo báo cáo mới? Dữ liệu chưa lưu sẽ bị mất.')) {
            this.currentReport = null;
            this.currentDate = dateUtils.getToday();
            
            // Reset form data
            this.formData = {
                openingBalance: 0,
                revenue: 0,
                closingBalance: 0,
                actualProfit: 0,
                expenses: [],
                transfers: [],
                inventoryUsed: []
            };
            
            // Load số dư đầu kỳ tự động
            await this.loadAutoOpeningBalance();
            
            // Render lại
            this.renderFormData();
            
            console.log('✅ New report created');
        }
    }

    /**
     * Gửi Zalo
     */
    async sendToZalo() {
        if (!this.validateForm()) return;
        
        const reportData = this.getFormDataForZalo();
        const success = await zaloIntegration.sendToZalo(reportData, this.formData.inventoryUsed);
        
        if (success) {
            // Copy vào clipboard
            await this.copyReportToClipboard(reportData);
            this.showSuccess('Đã gửi Zalo và copy báo cáo!');
        }
    }

    /**
     * Lấy dữ liệu cho Zalo
     */
    getFormDataForZalo() {
        return {
            date: this.currentDate,
            opening_balance: this.formData.openingBalance,
            revenue: this.formData.revenue,
            expenses: this.formData.expenses,
            transfers: this.formData.transfers,
            closing_balance: this.formData.closingBalance,
            actual_profit: this.formData.actualProfit
        };
    }

    /**
     * Validate form
     */
    validateForm() {
        if (this.formData.revenue < 0) {
            this.showError('Doanh thu không được âm');
            return false;
        }
        
        if (this.formData.closingBalance < 0) {
            this.showError('Số dư cuối kỳ không được âm');
            return false;
        }
        
        return true;
    }

    /**
     * Cập nhật tồn kho
     */
    async updateInventoryStock() {
        for (const usage of this.formData.inventoryUsed) {
            await this.inventoryManager.updateStock(usage.product_id, -usage.quantity);
        }
    }

    /**
     * Render recent reports
     */
    renderRecentReports() {
        const container = document.getElementById('recent-reports-list');
        if (container) {
            container.innerHTML = this.getRecentReportsHTML();
        }
    }

    /**
     * Hiển thị loading
     */
    showLoading() {
        document.getElementById('loading-overlay').classList.add('show');
    }

    /**
     * Ẩn loading
     */
    hideLoading() {
        document.getElementById('loading-overlay').classList.remove('show');
    }

    /**
     * Hiển thị lỗi
     */
    showError(message) {
        alert('❌ ' + message);
    }

    /**
     * Hiển thị thành công
     */
    showSuccess(message) {
        alert('✅ ' + message);
    }
}

// Tạo instance toàn cục
const dailyReportTab = new DailyReportTab();