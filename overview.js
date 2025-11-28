// Overview tab functionality
let currentOverviewPeriod = 'month'; // month, week, custom
let currentOverviewStart = formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
let currentOverviewEnd = formatDate();

// Initialize overview tab
function initializeOverviewTab() {
    loadOverviewTab();
    setupOverviewEventListeners();
}

// Load overview tab content
async function loadOverviewTab() {
    const container = document.getElementById('overview');
    if (!container) return;

    const overviewData = await calculateOverviewData();
    renderOverviewTab(container, overviewData);
}

// Setup event listeners for overview tab
function setupOverviewEventListeners() {
    document.addEventListener('click', function(e) {
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
        }
    });
}

// Calculate overview data
async function calculateOverviewData() {
    const reports = await dbGetAll('reports');
    const operations = await dbGetAll('operations');
    const employees = await dbGetAll('employees');
    
    // Filter data for current period
    const periodReports = reports.filter(report => 
        report.date >= currentOverviewStart && report.date <= currentOverviewEnd
    );
    
    const periodOperations = operations.filter(op => 
        op.date >= currentOverviewStart && op.date <= currentOverviewEnd
    );
    
    // Calculate totals
    const totalRevenue = periodReports.reduce((sum, report) => sum + report.revenue, 0);
    const totalExpenses = periodReports.reduce((sum, report) => 
        sum + report.expenses.reduce((expSum, exp) => expSum + exp.amount, 0), 0
    );
    const totalTransfers = periodReports.reduce((sum, report) => 
        sum + report.transfers.reduce((trfSum, trf) => trfSum + trf.amount, 0), 0
    );
    
    const materialCost = periodOperations
        .filter(op => op.type === 'material')
        .reduce((sum, op) => sum + op.amount, 0);
    
    const serviceCost = periodOperations
        .filter(op => op.type === 'service')
        .reduce((sum, op) => sum + op.amount, 0);
    
    const totalOperations = materialCost + serviceCost;
    
    // Calculate previous month salary (N-1)
    const previousMonth = getPreviousMonth(formatDate().substring(0, 7));
    let previousMonthSalary = 0;
    
    // For demo, we'll calculate based on base salaries
    // In real app, you would calculate actual salaries from attendance data
    previousMonthSalary = employees
        .filter(emp => emp.status === 'active')
        .reduce((sum, emp) => sum + emp.baseSalary, 0);
    
    // Calculate profits
    const currentProfit = totalRevenue - totalExpenses - totalOperations;
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

// Render overview tab
function renderOverviewTab(container, data) {
    const periodDisplay = getPeriodDisplay();
    
    container.innerHTML = `
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
                        <h3>Chi phí ›</h3>
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
                        <h3>Mua hàng hóa</h3>
                        <div class="amount">${formatCurrency(data.materialCost)}</div>
                    </div>
                    
                    <div class="summary-card clickable" data-action="show-services-history">
                        <h3>Dịch vụ</h3>
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
                        <span>Tổng mua hàng hóa:</span>
                        <span>- ${formatCurrency(data.materialCost)}</span>
                    </div>
                    <div class="calculation-row">
                        <span>Tổng dịch vụ:</span>
                        <span>- ${formatCurrency(data.serviceCost)}</span>
                    </div>
                    <div class="calculation-row total">
                        <span>💵 Lợi nhuận hiện tại:</span>
                        <span>${formatCurrency(data.currentProfit)}</span>
                    </div>
                    <div class="calculation-row">
                        <span>Lương nhân viên kỳ trước (N-1):</span>
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

// Get period display text
function getPeriodDisplay() {
    switch (currentOverviewPeriod) {
        case 'today':
            return 'Hôm nay';
        case 'yesterday':
            return 'Hôm qua';
        case 'month':
            return 'Tháng này';
        case 'custom':
            return 'Tùy chỉnh';
        default:
            return 'Tháng này';
    }
}

// Change overview period
function changeOverviewPeriod(period) {
    currentOverviewPeriod = period;
    
    const today = new Date();
    switch (period) {
        case 'today':
            currentOverviewStart = formatDate(today);
            currentOverviewEnd = formatDate(today);
            break;
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            currentOverviewStart = formatDate(yesterday);
            currentOverviewEnd = formatDate(yesterday);
            break;
        case 'month':
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            currentOverviewStart = formatDate(firstDay);
            currentOverviewEnd = formatDate(today);
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
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="apply-custom-dates"]')) {
            const startDate = document.getElementById('customStartDate').value;
            const endDate = document.getElementById('customEndDate').value;
            
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
            loadOverviewTab();
        }
    });
}

// Show expenses history popup
async function showExpensesHistoryPopup() {
    const reports = await dbGetAll('reports');
    const periodReports = reports.filter(report => 
        report.date >= currentOverviewStart && report.date <= currentOverviewEnd
    );
    
    // Collect all expenses
    const allExpenses = [];
    periodReports.forEach(report => {
        report.expenses.forEach(expense => {
            allExpenses.push({
                date: report.date,
                name: expense.name,
                amount: expense.amount,
                createdBy: report.createdBy
            });
        });
    });
    
    const popupHTML = `
        <div class="popup" style="max-width: 800px;">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>💰 Lịch sử Chi phí</h3>
            
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
                        ${allExpenses.map((expense, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${formatDateDisplay(expense.date)}</td>
                                <td>${expense.name}</td>
                                <td>${formatCurrency(expense.amount)}</td>
                                <td>${expense.createdBy}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div id="expensesGroupedView" class="popup-tab-content">
                ${renderGroupedExpenses(allExpenses)}
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
            </div>
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
    document.addEventListener('click', function(e) {
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
            document.getElementById(`expenses${tabName.charAt(0).toUpperCase() + tabName.slice(1)}View`).classList.add('active');
        }
    });
}

// Show transfers history popup
async function showTransfersHistoryPopup() {
    const reports = await dbGetAll('reports');
    const periodReports = reports.filter(report => 
        report.date >= currentOverviewStart && report.date <= currentOverviewEnd
    );
    
    // Collect all transfers
    const allTransfers = [];
    periodReports.forEach(report => {
        report.transfers.forEach(transfer => {
            allTransfers.push({
                date: report.date,
                content: transfer.content,
                amount: transfer.amount,
                createdBy: report.createdBy
            });
        });
    });
    
    const popupHTML = `
        <div class="popup" style="max-width: 800px;">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>🏦 Lịch sử Chuyển khoản</h3>
            
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
                    ${allTransfers.map((transfer, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${formatDateDisplay(transfer.date)}</td>
                            <td>${formatCurrency(transfer.amount)}</td>
                            <td>${transfer.createdBy}</td>
                            <td>${transfer.content || 'Không có nội dung'}</td>
                        </tr>
                    `).join('')}
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
    // This would load from warehouseExports store
    // For demo, we'll show placeholder data
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
                        <td>12/11/2025</td>
                        <td>Cà phê Arabica</td>
                        <td>3</td>
                        <td>NV001</td>
                        <td>Bán hàng</td>
                    </tr>
                    <tr>
                        <td>2</td>
                        <td>11/11/2025</td>
                        <td>Sữa tươi</td>
                        <td>5</td>
                        <td>NV002</td>
                        <td>Bán hàng</td>
                    </tr>
                </tbody>
            </table>
        `;
    }
}

// Load reports history
async function loadReportsHistory() {
    const reports = await dbGetAll('reports');
    const periodReports = reports.filter(report => 
        report.date >= currentOverviewStart && report.date <= currentOverviewEnd
    ).sort((a, b) => b.date.localeCompare(a.date));
    
    const content = document.getElementById('reportsHistory');
    if (content) {
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
                    ${periodReports.map((report, index) => {
                        const totalExpenses = report.expenses.reduce((sum, exp) => sum + exp.amount, 0);
                        const totalTransfers = report.transfers.reduce((sum, trf) => sum + trf.amount, 0);
                        const actualReceived = report.openingBalance + report.revenue - totalExpenses - totalTransfers - report.closingBalance;
                        
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
                    }).join('')}
                </tbody>
            </table>
        `;
    }
}