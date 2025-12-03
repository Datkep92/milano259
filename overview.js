// overview.js - Đã sửa lỗi ReferenceError: Đổi tên hàm chính thành initializeOverviewTab() để khớp với app.js
// Biến toàn cục
let currentOverviewPeriod = 'month'; // month, week, custom
// Giả định formatDate() đã được định nghĩa trong database.js hoặc utils.js
let currentOverviewStart = formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
let currentOverviewEnd = formatDate();

// =========================================================
// 1. INITIALIZATION
// =========================================================

/**
 * @name initializeOverviewTab
 * @description Hàm khởi tạo chính cho tab Tổng quan.
 */
function initializeOverviewTab() { // ĐÃ SỬA TÊN HÀM TẠI ĐÂY
    console.log('👁 Initializing Overview Tab...');
    loadOverviewTab();
    setupOverviewEventListeners();
}

// Load overview tab content
async function loadOverviewTab() {
    // Giả định showLoading(true) và showLoading(false) là các hàm global
    if (typeof showLoading === 'function') showLoading(true); 

    const container = document.getElementById('overview');
    if (!container) return;

    try {
        const overviewData = await calculateOverviewData();
        renderOverviewTab(container, overviewData);
    } catch (error) {
        console.error('❌ Lỗi khi tải dữ liệu Tổng quan:', error);
        // Giả định showMessage là hàm global
        if (typeof showMessage === 'function') {
            showMessage('❌ Lỗi khi tải dữ liệu Tổng quan. Vui lòng kiểm tra Console log.', 'error');
        }
    } finally {
        if (typeof showLoading === 'function') showLoading(false);
    }
}

// Setup event listeners for overview tab
function setupOverviewEventListeners() {
    document.removeEventListener('click', handleOverviewClick);
    document.addEventListener('click', handleOverviewClick);
}

function handleOverviewClick(e) {
    if (e.target.matches('[data-action="show-expenses-history"]')) {
        showExpensesHistoryPopup();
    } else if (e.target.matches('[data-action="show-transfers-history"]')) {
        showTransfersHistoryPopup();
    } else if (e.target.matches('[data-action="toggle-exports-history"]')) {
        toggleExportsHistory();
    } else if (e.target.matches('[data-action="toggle-reports-history"]')) {
        toggleReportsHistory();
    } else if (e.target.matches('[data-action="change-period"]')) {
        changeOverviewPeriod(e.target.dataset.period);
    } else if (e.target.matches('[data-action="show-materials-history"]')) {
         showPeriodOperations('material');
    } else if (e.target.matches('[data-action="show-services-history"]')) {
        showPeriodOperations('service');
    }
}

// =========================================================
// 2. DATA PROCESSING & CALCULATION
// =========================================================

// Calculate overview data
async function calculateOverviewData() {
    // Giả định dbGetAll, getPreviousMonth là các hàm global
    const reports = await dbGetAll('reports');
    const operations = await dbGetAll('operations');
    const employees = await dbGetAll('employees');
    
    // Filter data for current period (sử dụng ngày YYYY-MM-DD)
    const periodReports = reports.filter(report => 
        report.date >= currentOverviewStart && report.date <= currentOverviewEnd
    );
    
    // Lưu ý: Operation có dateKey (YYYY-MM-DD)
    const periodOperations = operations.filter(op => 
        op.dateKey >= currentOverviewStart && op.dateKey <= currentOverviewEnd
    );
    
    // Calculate totals
    const totalRevenue = periodReports.reduce((sum, report) => sum + (Number(report.revenue) || 0), 0);
    const totalExpenses = periodReports.reduce((sum, report) => 
        sum + (report.expenses || []).reduce((expSum, exp) => expSum + (Number(exp.amount) || 0), 0), 0
    );
    const totalTransfers = periodReports.reduce((sum, report) => 
        sum + (report.transfers || []).reduce((trfSum, trf) => trfSum + (Number(trf.amount) || 0), 0), 0
    );
    
    const materialCost = periodOperations
        .filter(op => op.type === 'material')
        .reduce((sum, op) => sum + (Number(op.amount) || 0), 0);
    
    const serviceCost = periodOperations
        .filter(op => op.type === 'service')
        .reduce((sum, op) => sum + (Number(op.amount) || 0), 0);
    
    const totalOperations = materialCost + serviceCost;
    
    // Calculate previous month salary (N-1)
    let previousMonthSalary = 0;
    
    // Ước tính lương bằng tổng lương cơ bản của nhân viên đang hoạt động
    previousMonthSalary = employees
        .filter(emp => emp.status === 'active')
        .reduce((sum, emp) => sum + (Number(emp.baseSalary) || 0), 0);
    
    // Calculate profits
    // Lợi nhuận hiện tại = Doanh thu - Chi phí Báo cáo ngày - Chi phí Vận hành (Nguyên vật liệu/Dịch vụ)
    const currentProfit = totalRevenue - totalExpenses - totalOperations;
    // Lợi nhuận ròng = Lợi nhuận hiện tại - Lương kỳ trước (Ước tính)
    const netProfit = currentProfit - previousMonthSalary;
    
    return {
        totalRevenue,
        totalExpenses,
        totalTransfers,
        materialCost,
        serviceCost,
        totalOperations,
        previousMonthSalary,
        currentProfit,
        netProfit,
        periodReports,
        periodOperations
    };
}

// =========================================================
// 3. RENDER UI
// =========================================================

// Render overview tab
function renderOverviewTab(container, data) {
    // Giả định formatCurrency, getPeriodDisplay là các hàm global
    const periodDisplay = getPeriodDisplay();
    
    container.innerHTML = `
        <style>
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            .summary-card {
                background: #fff;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                border-left: 5px solid #3498db;
                transition: background 0.2s;
            }
            .summary-card.clickable:hover {
                background: #f8f9fa;
                cursor: pointer;
            }
            .summary-card h3 {
                margin: 0 0 10px 0;
                font-size: 14px;
                color: #555;
            }
            .summary-card .amount {
                font-size: 20px;
                font-weight: bold;
                color: #2c3e50;
            }
            .profit-calculation {
                margin-top: 15px;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background: #f9f9f9;
            }
            .calculation-row {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px dashed #eee;
                font-size: 14px;
            }
            .calculation-row:last-child {
                border-bottom: none;
            }
            .calculation-row.total, .calculation-row.net-profit {
                font-weight: bold;
                font-size: 16px;
                border-top: 2px solid #ccc;
                margin-top: 10px;
                padding-top: 10px;
            }
            .calculation-row.net-profit span:last-child {
                color: ${data.netProfit >= 0 ? '#27ae60' : '#e74c3c'};
            }
            .period-selector {
                margin-bottom: 20px;
            }
            .period-selector .btn {
                margin-right: 5px;
            }
            .history-section {
                margin-top: 15px;
                border: 1px solid #eee;
                border-radius: 6px;
                overflow: hidden;
            }
            .history-toggle {
                width: 100%;
                background: #ecf0f1;
                border: none;
                padding: 10px 15px;
                text-align: left;
                font-weight: bold;
                cursor: pointer;
                transition: background 0.2s;
            }
            .history-toggle:hover {
                background: #e0e6e8;
            }
            .history-content {
                padding: 15px;
                background: #fff;
            }
        </style>

        <div class="section">
            <h2>📊 Tổng quan - ${periodDisplay}</h2>
            
            <div class="period-selector">
                <button class="btn ${currentOverviewPeriod === 'today' ? 'btn-primary' : 'btn-secondary'}" 
                        data-action="change-period" data-period="today">Hôm nay</button>
                <button class="btn ${currentOverviewPeriod === 'yesterday' ? 'btn-primary' : 'btn-secondary'}" 
                        data-action="change-period" data-period="yesterday">Hôm qua</button>
                <button class="btn ${currentOverviewPeriod === 'month' ? 'btn-primary' : 'btn-secondary'}" 
                        data-action="change-period" data-period="month">Tháng này</button>
                <button class="btn ${currentOverviewPeriod === 'custom' ? 'btn-primary' : 'btn-secondary'}" 
                        data-action="change-period" data-period="custom">Tùy chỉnh</button>
            </div>

            <div class="section">
                <h3>📊 Tổng hợp Báo cáo Nhân viên</h3>
                <div class="summary-grid">
                    <div class="summary-card">
                        <h3>Doanh thu (kỳ)</h3>
                        <div class="amount">${formatCurrency(data.totalRevenue)}</div>
                    </div>
                    
                    <div class="summary-card clickable" data-action="show-expenses-history">
                        <h3>Chi phí báo cáo ›</h3>
                        <div class="amount">${formatCurrency(data.totalExpenses)}</div>
                    </div>
                    
                    <div class="summary-card clickable" data-action="show-transfers-history">
                        <h3>CK/Chuyển khoản ›</h3>
                        <div class="amount">${formatCurrency(data.totalTransfers)}</div>
                    </div>
                    
                    <div class="summary-card">
                        <h3>Thực nhận (kỳ)</h3>
                        <div class="amount">${formatCurrency(data.totalRevenue - data.totalExpenses - data.totalTransfers)}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>🔧 Báo cáo Vận hành</h3>
                <div class="summary-grid">
                    <div class="summary-card clickable" data-action="show-materials-history">
                        <h3>Chi phí Nguyên liệu ›</h3>
                        <div class="amount">${formatCurrency(data.materialCost)}</div>
                    </div>
                    
                    <div class="summary-card clickable" data-action="show-services-history">
                        <h3>Chi phí Dịch vụ ›</h3>
                        <div class="amount">${formatCurrency(data.serviceCost)}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>💰 Tính Lợi nhuận</h3>
                <div class="profit-calculation">
                    <div class="calculation-row">
                        <span>Tổng doanh thu:</span>
                        <span>${formatCurrency(data.totalRevenue)}</span>
                    </div>
                    <div class="calculation-row">
                        <span>Tổng chi phí báo cáo ngày:</span>
                        <span>- ${formatCurrency(data.totalExpenses)}</span>
                    </div>
                    <div class="calculation-row">
                        <span>Tổng mua hàng hóa (Vận hành):</span>
                        <span>- ${formatCurrency(data.materialCost)}</span>
                    </div>
                    <div class="calculation-row">
                        <span>Tổng dịch vụ (Vận hành):</span>
                        <span>- ${formatCurrency(data.serviceCost)}</span>
                    </div>
                    <div class="calculation-row total">
                        <span>💵 Lợi nhuận gộp (DT - CP ngày - CP Vận hành):</span>
                        <span>${formatCurrency(data.currentProfit)}</span>
                    </div>
                    <div class="calculation-row">
                        <span>Ước tính Lương nhân viên kỳ trước (N-1):</span>
                        <span>- ${formatCurrency(data.previousMonthSalary)}</span>
                    </div>
                    <div class="calculation-row net-profit">
                        <span>🟩 Lợi nhuận ròng (cuối kỳ):</span>
                        <span>${formatCurrency(data.netProfit)}</span>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>📜 Lịch sử (Ẩn/Hiện)</h3>
                
                <div class="history-section">
                    <button class="history-toggle" data-action="toggle-exports-history">
                        ▼ Lịch sử xuất hàng
                    </button>
                    <div id="exportsHistory" class="history-content" style="display: none;">
                        <p>Đang tải lịch sử xuất hàng...</p>
                    </div>
                </div>
                
                <div class="history-section">
                    <button class="history-toggle" data-action="toggle-reports-history">
                        ▼ Lịch sử báo cáo hàng ngày
                    </button>
                    <div id="reportsHistory" class="history-content" style="display: none;">
                        <p>Đang tải lịch sử báo cáo...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =========================================================
// 4. PERIOD SELECTION
// =========================================================

// Get period display text
function getPeriodDisplay() {
    // Giả định formatDateDisplay() đã được định nghĩa
    if (currentOverviewPeriod === 'custom') {
        return `${formatDateDisplay(currentOverviewStart)} - ${formatDateDisplay(currentOverviewEnd)}`;
    }
    
    switch (currentOverviewPeriod) {
        case 'today':
            return 'Hôm nay';
        case 'yesterday':
            return 'Hôm qua';
        case 'month':
            return `Tháng này (${formatDateDisplay(currentOverviewStart)} - ${formatDateDisplay(currentOverviewEnd)})`;
        default:
            return 'Tháng này';
    }
}

// Change overview period
function changeOverviewPeriod(period) {
    currentOverviewPeriod = period;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Đặt về 0h để chuẩn hóa ngày
    
    // Giả định formatDate(date) trả về YYYY-MM-DD
    const formatDateOnly = (date) => date.toISOString().substring(0, 10);

    switch (period) {
        case 'today':
            currentOverviewStart = formatDateOnly(today);
            currentOverviewEnd = formatDateOnly(today);
            break;
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            currentOverviewStart = formatDateOnly(yesterday);
            currentOverviewEnd = formatDateOnly(yesterday);
            break;
        case 'month':
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            currentOverviewStart = formatDateOnly(firstDay);
            currentOverviewEnd = formatDateOnly(today);
            break;
        case 'custom':
            // In real app, show date picker
            showCustomDatePopup();
            return;
    }
    
    loadOverviewTab();
}

// Show custom date popup
function showCustomDatePopup() {
    // Giả định showPopup() là hàm global
    if (typeof showPopup !== 'function') {
         console.error('❌ Missing global function: showPopup');
         return;
    }

    const popupHTML = `
        <div class="popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>📅 Chọn khoảng thời gian</h3>
            
            <div class="form-group">
                <label for="customStartDate">Từ ngày:</label>
                <input type="date" id="customStartDate" value="${currentOverviewStart}">
            </div>
            
            <div class="form-group">
                <label for="customEndDate">Đến ngày:</label>
                <input type="date" id="customEndDate" value="${currentOverviewEnd}">
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-primary" data-action="apply-custom-dates">Áp dụng</button>
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
    setupCustomDateEventListeners();
}

// Setup custom date event listeners
function setupCustomDateEventListeners() {
    // Sử dụng event listener cục bộ để tránh xung đột với setupOverviewEventListeners
    const handler = function(e) {
        if (e.target.matches('[data-action="apply-custom-dates"]')) {
            const startDate = document.getElementById('customStartDate').value;
            const endDate = document.getElementById('customEndDate').value;
            
            // Giả định showMessage và closePopup là hàm global
            if (typeof showMessage !== 'function' || typeof closePopup !== 'function') return;

            if (!startDate || !endDate) {
                showMessage('Vui lòng chọn đầy đủ ngày', 'error');
                return;
            }
            
            if (startDate > endDate) {
                showMessage('Ngày bắt đầu phải nhỏ hơn ngày kết thúc', 'error');
                return;
            }
            
            currentOverviewStart = startDate;
            currentOverviewEnd = endDate;
            currentOverviewPeriod = 'custom';
            
            closePopup();
            document.removeEventListener('click', handler); // Xóa listener sau khi áp dụng
            loadOverviewTab();
        } else if (e.target.matches('[data-action="close-popup"]')) {
            document.removeEventListener('click', handler); // Xóa listener khi đóng popup
        }
    };
    
    // Gắn listener cho các tương tác trong popup
    document.addEventListener('click', handler);
}

// =========================================================
// 5. HISTORY POPUPS & TOGGLES
// =========================================================

// Show expenses history popup
async function showExpensesHistoryPopup() {
    // Giả định dbGetAll, showPopup, formatDateDisplay, formatCurrency là hàm global
    const reports = await dbGetAll('reports');
    const periodReports = reports.filter(report => 
        report.date >= currentOverviewStart && report.date <= currentOverviewEnd
    );
    
    // Collect all expenses
    const allExpenses = [];
    periodReports.forEach(report => {
        (report.expenses || []).forEach(expense => {
            allExpenses.push({
                date: report.date,
                name: expense.name,
                amount: Number(expense.amount) || 0,
                createdBy: report.createdBy
            });
        });
    });
    
    const popupHTML = `
        <div class="popup" style="max-width: 800px;">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>💰 Lịch sử Chi phí (Trong báo cáo)</h3>
            
            <div class="popup-tabs">
                <button class="popup-tab-btn active" data-tab="daily">Theo ngày</button>
                <button class="popup-tab-btn" data-tab="grouped">Gộp theo loại</button>
            </div>
            
            <div id="expensesDailyView" class="popup-tab-content active">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Ngày</th>
                            <th>Loại CP</th>
                            <th>Số tiền</th>
                            <th>Người nhập</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allExpenses.length > 0 ? allExpenses.map((expense, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${formatDateDisplay(expense.date)}</td>
                                <td>${expense.name}</td>
                                <td>${formatCurrency(expense.amount)}</td>
                                <td>${expense.createdBy}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="5" class="empty-state">Không có chi phí trong kỳ này.</td></tr>'}
                    </tbody>
                </table>
            </div>
            
            <div id="expensesGroupedView" class="popup-tab-content">
                ${renderGroupedExpenses(allExpenses)}
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
            </div>
            <style>
                .popup-tabs {
                    display: flex;
                    margin-bottom: 10px;
                }
                .popup-tab-btn {
                    padding: 8px 15px;
                    border: 1px solid #ccc;
                    border-bottom: none;
                    background: #f1f1f1;
                    cursor: pointer;
                    margin-right: -1px;
                }
                .popup-tab-btn.active {
                    background: #fff;
                    border-bottom: 1px solid #fff;
                    font-weight: bold;
                }
                .popup-tab-content {
                    border: 1px solid #ccc;
                    padding: 15px;
                    display: none;
                }
                .popup-tab-content.active {
                    display: block;
                }
                .empty-state {
                    text-align: center;
                    padding: 20px;
                    color: #999;
                }
            </style>
        </div>
    `;
    
    showPopup(popupHTML);
    setupExpensesHistoryTabs();
}

// Render grouped expenses
function renderGroupedExpenses(expenses) {
    // Group expenses by name
    const grouped = {};
    expenses.forEach(expense => {
        if (!grouped[expense.name]) {
            grouped[expense.name] = 0;
        }
        grouped[expense.name] += expense.amount;
    });
    
    // Convert to array and sort by amount
    const groupedArray = Object.entries(grouped)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);
        
    if (groupedArray.length === 0) {
        return '<p class="empty-state">Không có chi phí trong kỳ này.</p>';
    }
    
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Loại chi phí</th>
                    <th>Tổng số tiền</th>
                </tr>
            </thead>
            <tbody>
                ${groupedArray.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.name}</td>
                        <td>${formatCurrency(item.amount)}</td>
                        </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Setup expenses history tabs
function setupExpensesHistoryTabs() {
    // Sử dụng event listener cục bộ để tránh xung đột với setupOverviewEventListeners
    const handler = function(e) {
        if (e.target.matches('.popup-tab-btn')) {
            const tabName = e.target.dataset.tab;
            
            // Update active tab
            document.querySelectorAll('.popup-tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.popup-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const contentId = `expenses${tabName.charAt(0).toUpperCase() + tabName.slice(1)}View`;
            const contentElement = document.getElementById(contentId);
            if (contentElement) contentElement.classList.add('active');
        } else if (e.target.matches('[data-action="close-popup"]')) {
            document.removeEventListener('click', handler); // Xóa listener khi đóng popup
        }
    };
    
    // Gắn listener cho các tương tác trong popup (chỉ cần gắn 1 lần)
    document.addEventListener('click', handler);
}

// Show transfers history popup
async function showTransfersHistoryPopup() {
    // Giả định dbGetAll, showPopup, formatDateDisplay, formatCurrency là hàm global
    const reports = await dbGetAll('reports');
    const periodReports = reports.filter(report => 
        report.date >= currentOverviewStart && report.date <= currentOverviewEnd
    );
    
    // Collect all transfers
    const allTransfers = [];
    periodReports.forEach(report => {
        (report.transfers || []).forEach(transfer => {
            allTransfers.push({
                date: report.date,
                content: transfer.content,
                amount: Number(transfer.amount) || 0,
                createdBy: report.createdBy
            });
        });
    });
    
    const popupHTML = `
        <div class="popup" style="max-width: 800px;">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>🏦 Lịch sử Chuyển khoản (Trong báo cáo)</h3>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Ngày</th>
                        <th>Số tiền</th>
                        <th>NV</th>
                        <th>Nội dung</th>
                    </tr>
                </thead>
                <tbody>
                    ${allTransfers.length > 0 ? allTransfers.map((transfer, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${formatDateDisplay(transfer.date)}</td>
                            <td>${formatCurrency(transfer.amount)}</td>
                            <td>${transfer.createdBy}</td>
                            <td>${transfer.content || 'Không có nội dung'}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="5" class="empty-state">Không có chuyển khoản trong kỳ này.</td></tr>'}
                </tbody>
            </table>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
}

// Show operations history popup (material/service)
async function showPeriodOperations(type) {
    // Giả định dbGetAll, showPopup, formatDateDisplay, formatCurrency là hàm global
    const operations = await dbGetAll('operations');
    const periodOperations = operations.filter(op => 
        op.type === type && op.dateKey >= currentOverviewStart && op.dateKey <= currentOverviewEnd
    ).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    
    const title = type === 'material' ? '📦 Lịch sử Chi phí Nguyên liệu' : '🛠️ Lịch sử Chi phí Dịch vụ';
    
    const popupHTML = `
        <div class="popup" style="max-width: 800px;">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>${title}</h3>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Ngày</th>
                        <th>Nội dung</th>
                        <th>Số tiền</th>
                        <th>Ghi chú</th>
                    </tr>
                </thead>
                <tbody>
                    ${periodOperations.length > 0 ? periodOperations.map((op, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${formatDateDisplay(op.dateKey)}</td>
                            <td>${op.content}</td>
                            <td>${formatCurrency(op.amount)}</td>
                            <td>${op.note || ''}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="5" class="empty-state">Không có chi phí Vận hành trong kỳ này.</td></tr>'}
                </tbody>
            </table>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
}


// Toggle exports history
function toggleExportsHistory() {
    const content = document.getElementById('exportsHistory');
    const toggle = document.querySelector('[data-action="toggle-exports-history"]');
    
    if (!content || !toggle) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.innerHTML = '▲ Lịch sử xuất hàng';
        loadExportsHistory();
    } else {
        content.style.display = 'none';
        toggle.innerHTML = '▼ Lịch sử xuất hàng';
    }
}

// Toggle reports history
function toggleReportsHistory() {
    const content = document.getElementById('reportsHistory');
    const toggle = document.querySelector('[data-action="toggle-reports-history"]');
    
    if (!content || !toggle) return;

    if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.innerHTML = '▲ Lịch sử báo cáo hàng ngày';
        loadReportsHistory();
    } else {
        content.style.display = 'none';
        toggle.innerHTML = '▼ Lịch sử báo cáo hàng ngày';
    }
}

// Load exports history
async function loadExportsHistory() {
    // Tạm thời hiển thị dữ liệu giả định vì store 'warehouseExports' chưa được định nghĩa
    const content = document.getElementById('exportsHistory');
    if (content) {
        content.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Ngày</th>
                        <th>SP</th>
                        <th>SL</th>
                        <th>Người xuất</th>
                        <th>Ghi chú</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td>${formatDateDisplay('2025-11-20')}</td>
                        <td>Cà phê Arabica</td>
                        <td>3</td>
                        <td>NV001</td>
                        <td>Bán hàng</td>
                    </tr>
                    <tr>
                        <td>2</td>
                        <td>${formatDateDisplay('2025-11-22')}</td>
                        <td>Sữa tươi</td>
                        <td>5</td>
                        <td>NV002</td>
                        <td>Bán hàng</td>
                    </tr>
                    <tr><td colspan="6" class="empty-state">Dữ liệu giả định. Cần kết nối với store warehouseExports thực tế.</td></tr>
                </tbody>
            </table>
        `;
    }
}

// Load reports history
async function loadReportsHistory() {
    // Giả định dbGetAll, formatDateDisplay, formatCurrency là hàm global
    const reports = await dbGetAll('reports');
    // Lọc theo khoảng thời gian hiện tại
    const periodReports = reports.filter(report => 
        report.date >= currentOverviewStart && report.date <= currentOverviewEnd
    ).sort((a, b) => b.date.localeCompare(a.date)); // Sắp xếp giảm dần theo ngày
    
    const content = document.getElementById('reportsHistory');
    if (content) {
        const reportRows = periodReports.map((report, index) => {
            const totalExpenses = (report.expenses || []).reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
            const totalTransfers = (report.transfers || []).reduce((sum, trf) => sum + (Number(trf.amount) || 0), 0);
            // Tạm tính là Doanh thu - Chi phí - Chuyển khoản
            const actualReceived = (Number(report.revenue) || 0) - totalExpenses - totalTransfers;
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${formatDateDisplay(report.date)}</td>
                    <td>${report.createdBy}</td>
                    <td>${formatCurrency(report.revenue)}</td>
                    <td>${formatCurrency(totalExpenses)}</td>
                    <td>${formatCurrency(totalTransfers)}</td>
                    <td>${formatCurrency(actualReceived)}</td>
                </tr>
            `;
        }).join('');

        content.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Ngày</th>
                        <th>NV</th>
                        <th>Doanh thu</th>
                        <th>Chi phí</th>
                        <th>CK</th>
                        <th>Thực nhận</th>
                    </tr>
                </thead>
                <tbody>
                    ${periodReports.length > 0 ? reportRows : '<tr><td colspan="7" class="empty-state">Không có báo cáo trong kỳ này.</td></tr>'}
                </tbody>
            </table>
        `;
    }
}

// =========================================================
// 6. GLOBAL EXPORTS
// =========================================================
// Phần này đảm bảo module Overview có thể được gọi từ main app
if (typeof window !== 'undefined') {
    // Export hàm chính để tab Overview có thể được gọi từ main app
    window.loadOverview = function() {
        console.log('👁 Loading overview...');
        // Gọi hàm chính đã được đổi tên/đồng bộ hóa
        if (typeof initializeOverviewTab === 'function') initializeOverviewTab(); // ĐÃ SỬA LỜI GỌI
    };
    
    // Export các hàm quan trọng cho việc truy cập và debug
    window.initializeOverviewTab = initializeOverviewTab; // ĐÃ SỬA LỜI GỌI
    window.loadOverviewTab = loadOverviewTab;
    window.changeOverviewPeriod = changeOverviewPeriod;
    window.showExpensesHistoryPopup = showExpensesHistoryPopup;
    window.showTransfersHistoryPopup = showTransfersHistoryPopup;
    window.showPeriodOperations = showPeriodOperations;
}