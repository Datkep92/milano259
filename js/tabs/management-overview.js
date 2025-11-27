/**
 * ManagementOverviewTab - Xử lý tab quản lý tổng quan và báo cáo
 */

class ManagementOverviewTab {
    constructor() {
        this.currentFilter = 'today';
        this.reports = [];
        this.financialData = {};
        this.isLoading = false;
    }

    /**
     * Khởi tạo tab quản lý tổng quan
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
            // Load báo cáo hàng ngày
            this.reports = await dbManager.getAll('daily_reports');
            
            // Load dữ liệu tài chính
            await this.loadFinancialData();
            
            // Load dữ liệu kho
            await this.loadInventoryData();
            
        } catch (error) {
            console.error('Lỗi load dữ liệu:', error);
            this.showError('Không thể tải dữ liệu: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Load dữ liệu tài chính
     */
    async loadFinancialData() {
        const dateRange = this.getDateRange();
        const filteredReports = this.reports.filter(report => 
            dateUtils.isDateInRange(report.date, dateRange.start, dateRange.end)
        );
        
        // Tính toán các chỉ số
        this.financialData = {
            totalRevenue: calculator.calculateTotalRevenue(filteredReports, dateRange.start, dateRange.end),
            totalDailyExpenses: calculator.calculateTotalDailyExpenses(filteredReports, dateRange.start, dateRange.end),
            totalTransfers: calculator.calculateTotalTransfersPeriod(filteredReports, dateRange.start, dateRange.end),
            totalActualProfit: filteredReports.reduce((sum, report) => sum + (report.actual_profit || 0), 0),
            reports: filteredReports
        };
        
        // TODO: Load thêm dữ liệu chi phí vận hành và lương
        this.financialData.totalOperationCosts = 0; // Sẽ tính từ operation costs
        this.financialData.totalSalaries = 0; // Sẽ tính từ employee management
    }

    /**
     * Load dữ liệu kho
     */
    async loadInventoryData() {
        // TODO: Load dữ liệu tồn kho và xuất kho
        this.inventoryData = {
            totalProducts: 0,
            lowStockItems: [],
            recentExports: []
        };
    }

    /**
     * Lấy khoảng ngày từ bộ lọc
     */
    getDateRange() {
        const today = new Date();
        
        switch (this.currentFilter) {
            case 'today':
                return {
                    start: dateUtils.getToday(),
                    end: dateUtils.getToday()
                };
            case 'yesterday':
                return {
                    start: dateUtils.getYesterday(),
                    end: dateUtils.getYesterday()
                };
            case 'this_week':
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                return {
                    start: dateUtils.formatDate(startOfWeek),
                    end: dateUtils.getToday()
                };
            case 'this_month':
                return {
                    start: dateUtils.getFirstDayOfMonth(),
                    end: dateUtils.getLastDayOfMonth()
                };
            case '20N-19N+1':
                return dateUtils.get20N19NRange();
            default:
                return {
                    start: dateUtils.getToday(),
                    end: dateUtils.getToday()
                };
        }
    }

    /**
     * Render giao diện
     */
    render() {
        const container = document.getElementById('management-overview');
        container.innerHTML = this.getTemplate();
        
        this.renderOverview();
        this.renderReports();
        this.renderBusinessResults();
    }

    /**
     * Template chính
     */
    getTemplate() {
        return `
            <div class="management-overview-container">
                <!-- Header với bộ lọc -->
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">📈 Quản Lý Tổng Quan</h2>
                        <div class="header-controls">
                            <select id="overview-filter" class="form-input">
                                <option value="today">Hôm nay</option>
                                <option value="yesterday">Hôm qua</option>
                                <option value="this_week">Tuần này</option>
                                <option value="this_month">Tháng này</option>
                                <option value="20N-19N+1">20N-19N+1</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Tổng quan nhanh -->
                <div class="summary-grid" id="overview-summary">
                    <!-- Overview summary will be rendered here -->
                </div>

                <!-- Kết quả kinh doanh chi tiết -->
                <div class="row">
                    <div class="col-8">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">💰 Kết Quả Kinh Doanh</h3>
                            </div>
                            <div class="card-body">
                                <div id="business-results">
                                    <!-- Business results will be rendered here -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-4">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">📦 Tình Hình Kho</h3>
                            </div>
                            <div class="card-body">
                                <div id="inventory-status">
                                    <!-- Inventory status will be rendered here -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Lịch sử báo cáo -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">📋 Lịch Sử Báo Cáo</h3>
                    </div>
                    <div class="card-body">
                        <div id="reports-history">
                            <!-- Reports history will be rendered here -->
                        </div>
                    </div>
                </div>

                <!-- Modal chi tiết báo cáo -->
                <div id="report-detail-modal" class="modal hidden">
                    <div class="modal-content modal-lg">
                        <div class="modal-header">
                            <h3 id="report-detail-title">Chi Tiết Báo Cáo</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="report-detail-content">
                                <!-- Report detail content will be rendered here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal danh sách chi tiết -->
                <div id="details-list-modal" class="modal hidden">
                    <div class="modal-content modal-lg">
                        <div class="modal-header">
                            <h3 id="details-list-title">Danh Sách Chi Tiết</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="details-list-content">
                                <!-- Details list content will be rendered here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render tổng quan nhanh
     */
    renderOverview() {
        const container = document.getElementById('overview-summary');
        const { totalRevenue, totalDailyExpenses, totalTransfers, totalActualProfit } = this.financialData;
        
        container.innerHTML = `
            <div class="summary-box clickable" data-type="revenue">
                <div class="summary-label">📈 Doanh thu</div>
                <div class="summary-value">${formatter.formatCurrency(totalRevenue)}</div>
                <div class="summary-action">[📋 Chi tiết]</div>
            </div>
            <div class="summary-box clickable" data-type="expenses">
                <div class="summary-label">💸 Chi phí</div>
                <div class="summary-value">${formatter.formatCurrency(totalDailyExpenses)}</div>
                <div class="summary-action">[📋 Chi tiết]</div>
            </div>
            <div class="summary-box clickable" data-type="transfers">
                <div class="summary-label">🏦 Chuyển khoản</div>
                <div class="summary-value">${formatter.formatCurrency(totalTransfers)}</div>
                <div class="summary-action">[📋 Chi tiết]</div>
            </div>
            <div class="summary-box">
                <div class="summary-label">🎯 Thực lãnh</div>
                <div class="summary-value ${totalActualProfit >= 0 ? 'text-success' : 'text-danger'}">
                    ${formatter.formatCurrency(totalActualProfit)}
                </div>
            </div>
        `;
    }

    /**
     * Render kết quả kinh doanh
     */
    renderBusinessResults() {
        const container = document.getElementById('business-results');
        const netProfit = this.calculateNetProfit();
        
        container.innerHTML = `
            <div class="business-results">
                <div class="result-section">
                    <h4>A. TỔNG DOANH THU</h4>
                    <div class="result-row">
                        <span class="result-label">Doanh thu báo cáo:</span>
                        <span class="result-value">${formatter.formatCurrency(this.financialData.totalRevenue)}</span>
                        <button class="btn btn-sm btn-outline view-details" data-type="revenue-details">
                            Xem chi tiết
                        </button>
                    </div>
                </div>
                
                <div class="result-section">
                    <h4>B. TỔNG CHI PHÍ</h4>
                    <div class="result-row">
                        <span class="result-label">Chi phí báo cáo ngày:</span>
                        <span class="result-value">${formatter.formatCurrency(this.financialData.totalDailyExpenses)}</span>
                        <button class="btn btn-sm btn-outline view-details" data-type="expenses-details">
                            Xem chi tiết
                        </button>
                    </div>
                    <div class="result-row">
                        <span class="result-label">Chi phí vận hành (HH/DV):</span>
                        <span class="result-value">${formatter.formatCurrency(this.financialData.totalOperationCosts)}</span>
                        <button class="btn btn-sm btn-outline view-details" data-type="operation-costs-details">
                            Xem chi tiết
                        </button>
                    </div>
                    <div class="result-row">
                        <span class="result-label">Chi phí lương nhân viên (N-1):</span>
                        <span class="result-value">${formatter.formatCurrency(this.financialData.totalSalaries)}</span>
                        <button class="btn btn-sm btn-outline view-details" data-type="salaries-details">
                            Xem chi tiết
                        </button>
                    </div>
                    <div class="result-row total">
                        <span class="result-label">Tổng chi phí:</span>
                        <span class="result-value">${formatter.formatCurrency(
                            this.financialData.totalDailyExpenses + 
                            this.financialData.totalOperationCosts + 
                            this.financialData.totalSalaries
                        )}</span>
                    </div>
                </div>
                
                <div class="result-section">
                    <h4>C. LỢI NHUẬN RÒNG</h4>
                    <div class="result-row">
                        <span class="result-label">Tổng doanh thu:</span>
                        <span class="result-value">${formatter.formatCurrency(this.financialData.totalRevenue)}</span>
                    </div>
                    <div class="result-row">
                        <span class="result-label">Tổng chi phí:</span>
                        <span class="result-value">${formatter.formatCurrency(
                            this.financialData.totalDailyExpenses + 
                            this.financialData.totalOperationCosts + 
                            this.financialData.totalSalaries
                        )}</span>
                    </div>
                    <div class="result-row net-profit ${netProfit >= 0 ? 'positive' : 'negative'}">
                        <span class="result-label">Lợi nhuận ròng:</span>
                        <span class="result-value">${formatter.formatCurrency(netProfit)}</span>
                    </div>
                    <div class="result-row">
                        <span class="result-label">Tỷ suất lợi nhuận:</span>
                        <span class="result-value">${formatter.formatPercent(
                            calculator.calculateProfitMargin(netProfit, this.financialData.totalRevenue)
                        )}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render tình hình kho
     */
    renderInventoryStatus() {
        const container = document.getElementById('inventory-status');
        
        // TODO: Render dữ liệu tồn kho thực tế
        container.innerHTML = `
            <div class="inventory-status">
                <div class="status-item">
                    <div class="status-label">Tổng mặt hàng:</div>
                    <div class="status-value">${this.inventoryData.totalProducts}</div>
                </div>
                <div class="status-item">
                    <div class="status-label">Hàng sắp hết:</div>
                    <div class="status-value text-warning">${this.inventoryData.lowStockItems.length}</div>
                </div>
                <div class="recent-exports">
                    <h5>Xuất kho gần đây:</h5>
                    ${this.inventoryData.recentExports.length > 0 ? 
                        this.inventoryData.recentExports.map(exportItem => `
                            <div class="export-item">
                                <span class="export-name">${exportItem.product_name}</span>
                                <span class="export-quantity">${exportItem.quantity} cái</span>
                            </div>
                        `).join('') :
                        '<p class="text-muted">Không có xuất kho gần đây</p>'
                    }
                </div>
            </div>
        `;
    }

    /**
     * Render lịch sử báo cáo
     */
    renderReports() {
        const container = document.getElementById('reports-history');
        const { reports } = this.financialData;
        
        if (reports.length === 0) {
            container.innerHTML = '<p class="text-muted">Không có báo cáo nào trong khoảng thời gian này</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Ngày</th>
                        <th>Doanh thu</th>
                        <th>Chi phí</th>
                        <th>Chuyển khoản</th>
                        <th>Thực lãnh</th>
                        <th>Nhân viên</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${reports.map(report => `
                        <tr>
                            <td>${dateUtils.formatDisplayDate(report.date)}</td>
                            <td>${formatter.formatCurrency(report.revenue)}</td>
                            <td>${formatter.formatCurrency(
                                calculator.calculateTotalExpenses(report.expenses)
                            )}</td>
                            <td>${formatter.formatCurrency(
                                calculator.calculateTotalTransfers(report.transfers)
                            )}</td>
                            <td class="${report.actual_profit >= 0 ? 'text-success' : 'text-danger'}">
                                ${formatter.formatCurrency(report.actual_profit)}
                            </td>
                            <td>${report.created_by || 'Nhân viên'}</td>
                            <td>
                                <div class="action-buttons">
                                    <button class="btn btn-sm btn-outline view-report" 
                                            data-report-id="${report.id}">
                                        👁️ Xem
                                    </button>
                                    <button class="btn btn-sm btn-outline edit-report" 
                                            data-report-id="${report.id}">
                                        ✏️ Sửa
                                    </button>
                                    <button class="btn btn-sm btn-danger delete-report" 
                                            data-report-id="${report.id}">
                                        🗑️ Xóa
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Tính lợi nhuận ròng
     */
    calculateNetProfit() {
        return this.financialData.totalRevenue - 
               this.financialData.totalDailyExpenses - 
               this.financialData.totalOperationCosts - 
               this.financialData.totalSalaries;
    }

    /**
     * Bind events
     */
    bindEvents() {
        // Bộ lọc
        document.getElementById('overview-filter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.loadData();
        });

        // Click vào summary boxes
        document.getElementById('overview-summary').addEventListener('click', (e) => {
            const summaryBox = e.target.closest('.clickable');
            if (summaryBox) {
                const type = summaryBox.dataset.type;
                this.showDetailsList(type);
            }
        });

        // Xem chi tiết kết quả kinh doanh
        document.getElementById('business-results').addEventListener('click', (e) => {
            if (e.target.classList.contains('view-details')) {
                const type = e.target.dataset.type;
                this.showDetailsList(type.replace('-details', ''));
            }
        });

        // Thao tác với báo cáo
        document.getElementById('reports-history').addEventListener('click', (e) => {
            const reportId = e.target.dataset.reportId;
            if (!reportId) return;
            
            const report = this.reports.find(r => r.id === reportId);
            if (!report) return;
            
            if (e.target.classList.contains('view-report')) {
                this.showReportDetail(report);
            } else if (e.target.classList.contains('edit-report')) {
                this.editReport(report);
            } else if (e.target.classList.contains('delete-report')) {
                this.deleteReport(report);
            }
        });

        // Đóng modal
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });
    }

    /**
     * Hiển thị danh sách chi tiết
     */
    showDetailsList(type) {
        const modal = document.getElementById('details-list-modal');
        const title = document.getElementById('details-list-title');
        const content = document.getElementById('details-list-content');
        
        let detailsData = [];
        let listTitle = '';
        
        switch (type) {
            case 'revenue':
                listTitle = 'Chi Tiết Doanh Thu';
                detailsData = this.getRevenueDetails();
                break;
            case 'expenses':
                listTitle = 'Chi Tiết Chi Phí';
                detailsData = this.getExpensesDetails();
                break;
            case 'transfers':
                listTitle = 'Chi Tiết Chuyển Khoản';
                detailsData = this.getTransfersDetails();
                break;
            case 'operation-costs':
                listTitle = 'Chi Tiết Chi Phí Vận Hành';
                detailsData = this.getOperationCostsDetails();
                break;
            case 'salaries':
                listTitle = 'Chi Tiết Lương Nhân Viên';
                detailsData = this.getSalariesDetails();
                break;
        }
        
        title.textContent = listTitle;
        content.innerHTML = this.renderDetailsList(detailsData, type);
        
        this.showModal(modal);
    }

    /**
     * Lấy chi tiết doanh thu
     */
    getRevenueDetails() {
        return this.financialData.reports.map(report => ({
            date: report.date,
            amount: report.revenue,
            description: `Báo cáo ngày ${dateUtils.formatDisplayDate(report.date)}`,
            type: 'revenue'
        }));
    }

    /**
     * Lấy chi tiết chi phí
     */
    getExpensesDetails() {
        const details = [];
        
        this.financialData.reports.forEach(report => {
            if (report.expenses && Array.isArray(report.expenses)) {
                report.expenses.forEach(expense => {
                    details.push({
                        date: report.date,
                        amount: -expense.amount, // Hiển thị số âm
                        description: expense.content,
                        type: 'expense'
                    });
                });
            }
        });
        
        return details;
    }

    /**
     * Lấy chi tiết chuyển khoản
     */
    getTransfersDetails() {
        const details = [];
        
        this.financialData.reports.forEach(report => {
            if (report.transfers && Array.isArray(report.transfers)) {
                report.transfers.forEach(transfer => {
                    details.push({
                        date: report.date,
                        amount: transfer.amount,
                        description: transfer.content,
                        type: 'transfer'
                    });
                });
            }
        });
        
        return details;
    }

    /**
     * Lấy chi tiết chi phí vận hành
     */
    getOperationCostsDetails() {
        // TODO: Lấy từ operation costs tab
        return [];
    }

    /**
     * Lấy chi tiết lương nhân viên
     */
    getSalariesDetails() {
        // TODO: Lấy từ employee management tab
        return [];
    }

    /**
     * Render danh sách chi tiết
     */
    renderDetailsList(details, type) {
        if (details.length === 0) {
            return '<p class="text-muted">Không có dữ liệu</p>';
        }
        
        const total = details.reduce((sum, item) => sum + Math.abs(item.amount), 0);
        
        return `
            <div class="details-list">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Ngày</th>
                            <th>Mô tả</th>
                            <th>Số tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${details.map(item => `
                            <tr>
                                <td>${dateUtils.formatDisplayDate(item.date)}</td>
                                <td>${item.description}</td>
                                <td class="${item.amount >= 0 ? 'text-success' : 'text-danger'}">
                                    ${formatter.formatCurrency(item.amount)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2"><strong>Tổng cộng</strong></td>
                            <td><strong>${formatter.formatCurrency(total)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }

    /**
     * Hiển thị chi tiết báo cáo
     */
    showReportDetail(report) {
        const modal = document.getElementById('report-detail-modal');
        const title = document.getElementById('report-detail-title');
        const content = document.getElementById('report-detail-content');
        
        title.textContent = `Báo Cáo Ngày ${dateUtils.formatDisplayDate(report.date)}`;
        content.innerHTML = this.renderReportDetail(report);
        
        this.showModal(modal);
    }

    /**
     * Render chi tiết báo cáo
     */
    renderReportDetail(report) {
        const totalExpenses = calculator.calculateTotalExpenses(report.expenses);
        const totalTransfers = calculator.calculateTotalTransfers(report.transfers);
        
        return `
            <div class="report-detail">
                <div class="detail-section">
                    <h4>Thông tin tài chính</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Số dư đầu kỳ:</span>
                            <span class="detail-value">${formatter.formatCurrency(report.opening_balance)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Doanh thu:</span>
                            <span class="detail-value">${formatter.formatCurrency(report.revenue)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Tổng chi phí:</span>
                            <span class="detail-value">${formatter.formatCurrency(totalExpenses)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Tổng chuyển khoản:</span>
                            <span class="detail-value">${formatter.formatCurrency(totalTransfers)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Số dư cuối kỳ:</span>
                            <span class="detail-value">${formatter.formatCurrency(report.closing_balance)}</span>
                        </div>
                        <div class="detail-item total">
                            <span class="detail-label">Thực lãnh:</span>
                            <span class="detail-value ${report.actual_profit >= 0 ? 'text-success' : 'text-danger'}">
                                ${formatter.formatCurrency(report.actual_profit)}
                            </span>
                        </div>
                    </div>
                </div>
                
                ${report.expenses && report.expenses.length > 0 ? `
                    <div class="detail-section">
                        <h4>Chi tiết chi phí</h4>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Nội dung</th>
                                    <th>Số tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.expenses.map(expense => `
                                    <tr>
                                        <td>${expense.content}</td>
                                        <td>${formatter.formatCurrency(expense.amount)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
                
                ${report.transfers && report.transfers.length > 0 ? `
                    <div class="detail-section">
                        <h4>Chi tiết chuyển khoản</h4>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Nội dung</th>
                                    <th>Số tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.transfers.map(transfer => `
                                    <tr>
                                        <td>${transfer.content}</td>
                                        <td>${formatter.formatCurrency(transfer.amount)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
                
                ${report.inventory_used && report.inventory_used.length > 0 ? `
                    <div class="detail-section">
                        <h4>Hàng hoá xuất kho</h4>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Tên hàng hoá</th>
                                    <th>Số lượng</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${report.inventory_used.map(item => `
                                    <tr>
                                        <td>${item.product_name}</td>
                                        <td>${item.quantity}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
                
                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="zaloIntegration.sendToZalo(${JSON.stringify(report).replace(/"/g, '&quot;')})">
                        📤 Gửi Zalo
                    </button>
                    <button class="btn btn-outline modal-close">Đóng</button>
                </div>
            </div>
        `;
    }

    /**
     * Sửa báo cáo
     */
    editReport(report) {
        // Chuyển sang tab báo cáo và load báo cáo đó
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            if (btn.dataset.tab === 'daily-report') {
                btn.click();
            }
        });
        
        // Set ngày và load báo cáo
        setTimeout(() => {
            document.getElementById('report-date').value = report.date;
            dailyReportTab.loadReportByDate();
        }, 100);
    }

    /**
     * Xóa báo cáo
     */
    async deleteReport(report) {
        if (!confirm(`Bạn có chắc muốn xóa báo cáo ngày ${dateUtils.formatDisplayDate(report.date)}?`)) {
            return;
        }
        
        try {
            await dbManager.delete('daily_reports', report.id);
            this.showSuccess('Đã xóa báo cáo thành công');
            await this.loadData();
        } catch (error) {
            this.showError('Lỗi xóa báo cáo: ' + error.message);
        }
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
const managementOverviewTab = new ManagementOverviewTab();