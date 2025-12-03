// statistics.js - Báo cáo thống kê tổng quan
let currentStatPeriod = getCurrentPeriod();
let currentStatView = 'report'; // 'report' hoặc 'operations'
let showStatMaterial = true;
let showStatService = true;
let showStatDetails = false;

// Hàm khởi tạo tab thống kê
function initializeStatisticsTab() {
    loadStatisticsTab();
    setupStatisticsEventListeners();
}

// Hàm tải tab thống kê
async function loadStatisticsTab() {
    const container = document.getElementById('statistics');
    if (!container) return;

    try {
        showLoading(true);
        renderStatisticsTab(container);
        showLoading(false);
    } catch (error) {
        console.error('Error loading statistics tab:', error);
        showMessage('Lỗi tải dữ liệu thống kê', 'error');
        showLoading(false);
    }
}

// Hàm render tab thống kê
async function renderStatisticsTab(container) {
    const periodData = await getPeriodStatistics();
    const reportsSummary = periodData.reportsSummary;
    const operationsSummary = periodData.operationsSummary;
    
    container.innerHTML = `
        <div class="statistics-content">
            <!-- HEADER -->
            <div class="stats-header">
                <h2>📊 Báo cáo Thống kê</h2>
                <p class="stats-subtitle">Tổng quan dữ liệu theo kỳ</p>
            </div>
            
            <!-- BỘ LỌC KỲ -->
            <div class="stats-period-filter">
                <div class="period-navigation">
                    <button class="btn btn-outline" onclick="changeStatPeriodBy(-1)">
                        ◀ Kỳ trước
                    </button>
                    <div class="period-display">
                        <h3>${formatPeriodDisplay(currentStatPeriod)}</h3>
                        <small>${formatDateDisplay(currentStatPeriod.startDate)} - ${formatDateDisplay(currentStatPeriod.endDate)}</small>
                    </div>
                    <button class="btn btn-outline" onclick="changeStatPeriodBy(1)">
                        Kỳ sau ▶
                    </button>
                </div>
                <button class="btn btn-primary" onclick="goToCurrentStatPeriod()">
                    Kỳ hiện tại
                </button>
            </div>
            
            <!-- SWITCH BÁO CÁO/VẬN HÀNH -->
            <div class="stats-view-toggle">
                <button class="btn ${currentStatView === 'report' ? 'btn-primary' : 'btn-outline'}" 
                        onclick="changeStatView('report')">
                    📋 Báo cáo hàng ngày
                </button>
                <button class="btn ${currentStatView === 'operations' ? 'btn-primary' : 'btn-outline'}" 
                        onclick="changeStatView('operations')">
                    🔧 Mua sắm vận hành
                </button>
            </div>
            
            <!-- TỔNG QUAN KỲ -->
            <div class="stats-overview">
                <h3>📈 Tổng quan Kỳ ${formatPeriodDisplay(currentStatPeriod)}</h3>
                <div class="overview-grid">
                    <div class="overview-card total">
                        <h4>Tổng Doanh thu</h4>
                        <div class="amount">${formatCurrency(reportsSummary.totalRevenue)}</div>
                        <small>${reportsSummary.totalDays} ngày</small>
                    </div>
                    <div class="overview-card expenses">
                        <h4>Tổng Chi phí</h4>
                        <div class="amount">${formatCurrency(reportsSummary.totalExpenses)}</div>
                        <small>${reportsSummary.expenseCount} chi phí</small>
                    </div>
                    <div class="overview-card received">
                        <h4>Tổng Thực nhận</h4>
                        <div class="amount">${formatCurrency(reportsSummary.totalReceived)}</div>
                        <small>Trung bình: ${formatCurrency(reportsSummary.avgReceived)}/ngày</small>
                    </div>
                    <div class="overview-card operations">
                        <h4>Tổng Mua sắm</h4>
                        <div class="amount">${formatCurrency(operationsSummary.totalAmount)}</div>
                        <small>${operationsSummary.totalTransactions} giao dịch</small>
                    </div>
                </div>
            </div>
            
            <!-- BÁO CÁO HÀNG NGÀY -->
            ${currentStatView === 'report' ? await renderReportsSection(periodData) : ''}
            
            <!-- VẬN HÀNH -->
            ${currentStatView === 'operations' ? await renderOperationsSection(periodData) : ''}
            
            <!-- CHI TIẾT -->
            ${showStatDetails ? await renderDetailsSection(periodData) : ''}
            
            <!-- NÚT XEM CHI TIẾT -->
            <div class="stats-actions">
                <button class="btn btn-info" onclick="toggleStatDetails()">
                    ${showStatDetails ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                </button>
                <button class="btn btn-success" onclick="exportStatistics()">
                    📥 Xuất báo cáo
                </button>
            </div>
        </div>
    `;
}

// Hàm render phần Báo cáo hàng ngày
async function renderReportsSection(periodData) {
    const { reports, reportsSummary } = periodData;
    
    return `
        <div class="stats-section reports-section">
            <div class="section-header">
                <h3>📋 Báo cáo Hàng ngày</h3>
                <div class="section-stats">
                    <span>${reports.length} ngày có báo cáo</span>
                </div>
            </div>
            
            <!-- BIỂU ĐỒ DOANH THU (đơn giản) -->
            <div class="revenue-chart">
                <h4>📊 Biểu đồ Doanh thu</h4>
                <div class="chart-bars">
                    ${reports.slice(0, 10).map(report => {
                        const maxRevenue = Math.max(...reports.map(r => r.revenue || 0));
                        const height = maxRevenue > 0 ? (report.revenue / maxRevenue * 100) : 0;
                        return `
                            <div class="chart-bar" style="height: ${height}%"
                                 title="${formatDateDisplay(report.date)}: ${formatCurrency(report.revenue)}">
                                <span class="bar-label">${formatDateDisplay(report.date).split('/')[0]}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <!-- TÓM TẮT CHI PHÍ -->
            <div class="expenses-summary">
                <h4>💸 Top Chi phí</h4>
                <div class="top-expenses">
                    ${getTopExpenses(reports).slice(0, 5).map(expense => `
                        <div class="expense-item">
                            <span>${expense.name}</span>
                            <span>${formatCurrency(expense.total)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- DANH SÁCH BÁO CÁO -->
            <div class="reports-list">
                <h4>📅 Danh sách Báo cáo</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Ngày</th>
                            <th>Doanh thu</th>
                            <th>Chi phí</th>
                            <th>Chuyển khoản</th>
                            <th>Thực nhận</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reports.map(report => {
                            const totalExpenses = calculateTotalExpenses(report);
                            const totalTransfers = calculateTotalTransfers(report);
                            const actualReceived = calculateActualReceived(report);
                            
                            return `
                                <tr>
                                    <td>${formatDateDisplay(report.date)}</td>
                                    <td>${formatCurrency(report.revenue)}</td>
                                    <td>${formatCurrency(totalExpenses)}</td>
                                    <td>${formatCurrency(totalTransfers)}</td>
                                    <td class="${actualReceived >= 0 ? 'positive' : 'negative'}">
                                        ${formatCurrency(actualReceived)}
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-outline" 
                                                onclick="viewReportDetail('${report.date}')">
                                            Xem
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Hàm render phần Vận hành
async function renderOperationsSection(periodData) {
    const { operations, operationsSummary } = periodData;
    const materialOps = operations.filter(op => op.type === 'material');
    const serviceOps = operations.filter(op => op.type === 'service');
    
    return `
        <div class="stats-section operations-section">
            <div class="section-header">
                <h3>🔧 Mua sắm Vận hành</h3>
                <div class="section-filters">
                    <label class="checkbox-label ${showStatMaterial ? 'active' : ''}">
                        <input type="checkbox" ${showStatMaterial ? 'checked' : ''} 
                               onchange="toggleStatMaterial()">
                        🛒 Hàng hóa (${materialOps.length})
                    </label>
                    <label class="checkbox-label ${showStatService ? 'active' : ''}">
                        <input type="checkbox" ${showStatService ? 'checked' : ''} 
                               onchange="toggleStatService()">
                        📝 Dịch vụ (${serviceOps.length})
                    </label>
                </div>
            </div>
            
            <!-- TỔNG HỢP -->
            <div class="operations-summary">
                <div class="summary-grid">
                    <div class="summary-item">
                        <h4>🛒 Hàng hóa</h4>
                        <div class="amount">${formatCurrency(operationsSummary.materialTotal)}</div>
                        <small>${operationsSummary.materialCount} giao dịch</small>
                    </div>
                    <div class="summary-item">
                        <h4>📝 Dịch vụ</h4>
                        <div class="amount">${formatCurrency(operationsSummary.serviceTotal)}</div>
                        <small>${operationsSummary.serviceCount} giao dịch</small>
                    </div>
                    <div class="summary-item">
                        <h4>📊 Trung bình/GD</h4>
                        <div class="amount">${formatCurrency(operationsSummary.avgTransaction)}</div>
                        <small>${operationsSummary.totalTransactions} giao dịch</small>
                    </div>
                    <div class="summary-item">
                        <h4>📈 Tỷ lệ</h4>
                        <div class="amount">
                            ${operationsSummary.totalAmount > 0 ? 
                              Math.round((operationsSummary.materialTotal / operationsSummary.totalAmount) * 100) : 0}%
                        </div>
                        <small>Hàng hóa/Tổng</small>
                    </div>
                </div>
            </div>
            
            <!-- HÀNG HÓA -->
            ${showStatMaterial ? `
            <div class="material-section">
                <h4>🛒 Chi tiết Hàng hóa</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tên hàng</th>
                            <th>Tổng SL</th>
                            <th>Tổng tiền</th>
                            <th>Số lần</th>
                            <th>Đơn giá TB</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${getGroupedOperations(materialOps).slice(0, 10).map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.totalQuantity} ${item.unit}</td>
                                <td>${formatCurrency(item.totalAmount)}</td>
                                <td>${item.count}</td>
                                <td>${formatCurrency(item.avgPrice)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            <!-- DỊCH VỤ -->
            ${showStatService ? `
            <div class="service-section">
                <h4>📝 Chi tiết Dịch vụ</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tên dịch vụ</th>
                            <th>Tổng tiền</th>
                            <th>Số lần</th>
                            <th>Trung bình</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${getGroupedOperations(serviceOps).slice(0, 10).map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${formatCurrency(item.totalAmount)}</td>
                                <td>${item.count}</td>
                                <td>${formatCurrency(item.avgAmount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
            
            <!-- DANH SÁCH CHI TIẾT -->
            <div class="operations-list">
                <h4>📅 Giao dịch theo ngày</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Ngày</th>
                            <th>Loại</th>
                            <th>Tên</th>
                            <th>Số lượng</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${operations.slice(0, 20).map(op => `
                            <tr>
                                <td>${formatDateDisplay(op.dateKey || op.date)}</td>
                                <td>${op.type === 'material' ? '🛒' : '📝'}</td>
                                <td>${op.name}</td>
                                <td>${op.quantity ? `${op.quantity} ${op.unit || ''}` : '-'}</td>
                                <td>${formatCurrency(op.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Hàm lấy dữ liệu thống kê theo kỳ
async function getPeriodStatistics() {
    try {
        const startDate = formatDate(currentStatPeriod.startDate);
        const endDate = formatDate(currentStatPeriod.endDate);
        
        // Lấy báo cáo
        const allReports = await dbGetAll('reports');
        const periodReports = allReports.filter(report => 
            report.date >= startDate && report.date <= endDate
        );
        
        // Lấy operations
        const allOperations = await dbGetAll('operations');
        const periodOperations = allOperations.filter(op => {
            const opDate = op.dateKey || (op.date ? op.date.split('T')[0] : '');
            return opDate && opDate >= startDate && opDate <= endDate;
        });
        
        // Tính tổng hợp báo cáo
        const reportsSummary = {
            totalDays: periodReports.length,
            totalRevenue: periodReports.reduce((sum, r) => sum + (r.revenue || 0), 0),
            totalExpenses: periodReports.reduce((sum, r) => {
                const expenses = calculateTotalExpenses(r);
                return sum + expenses;
            }, 0),
            totalTransfers: periodReports.reduce((sum, r) => {
                const transfers = calculateTotalTransfers(r);
                return sum + transfers;
            }, 0),
            totalReceived: periodReports.reduce((sum, r) => {
                const received = calculateActualReceived(r);
                return sum + received;
            }, 0),
            avgReceived: periodReports.length > 0 ? 
                periodReports.reduce((sum, r) => {
                    const received = calculateActualReceived(r);
                    return sum + received;
                }, 0) / periodReports.length : 0,
            expenseCount: periodReports.reduce((sum, r) => 
                sum + (r.expenses ? r.expenses.length : 0), 0
            )
        };
        
        // Tính tổng hợp operations
        const materialOps = periodOperations.filter(op => op.type === 'material');
        const serviceOps = periodOperations.filter(op => op.type === 'service');
        
        const operationsSummary = {
            totalTransactions: periodOperations.length,
            materialCount: materialOps.length,
            serviceCount: serviceOps.length,
            materialTotal: materialOps.reduce((sum, op) => sum + (op.amount || 0), 0),
            serviceTotal: serviceOps.reduce((sum, op) => sum + (op.amount || 0), 0),
            totalAmount: periodOperations.reduce((sum, op) => sum + (op.amount || 0), 0),
            avgTransaction: periodOperations.length > 0 ? 
                periodOperations.reduce((sum, op) => sum + (op.amount || 0), 0) / periodOperations.length : 0
        };
        
        return {
            reports: periodReports.sort((a, b) => b.date.localeCompare(a.date)),
            operations: periodOperations.sort((a, b) => {
                const dateA = a.dateKey || a.date;
                const dateB = b.dateKey || b.date;
                return dateB.localeCompare(dateA);
            }),
            reportsSummary,
            operationsSummary
        };
        
    } catch (error) {
        console.error('Error getting period statistics:', error);
        return {
            reports: [],
            operations: [],
            reportsSummary: {
                totalDays: 0,
                totalRevenue: 0,
                totalExpenses: 0,
                totalTransfers: 0,
                totalReceived: 0,
                avgReceived: 0,
                expenseCount: 0
            },
            operationsSummary: {
                totalTransactions: 0,
                materialCount: 0,
                serviceCount: 0,
                materialTotal: 0,
                serviceTotal: 0,
                totalAmount: 0,
                avgTransaction: 0
            }
        };
    }
}

// Helper functions
function getTopExpenses(reports) {
    const expenseMap = {};
    
    reports.forEach(report => {
        if (report.expenses && Array.isArray(report.expenses)) {
            report.expenses.forEach(expense => {
                const key = expense.name;
                if (!expenseMap[key]) {
                    expenseMap[key] = {
                        name: expense.name,
                        total: 0,
                        count: 0
                    };
                }
                expenseMap[key].total += expense.amount || 0;
                expenseMap[key].count++;
            });
        }
    });
    
    return Object.values(expenseMap)
        .sort((a, b) => b.total - a.total);
}

function getGroupedOperations(operations) {
    const grouped = {};
    
    operations.forEach(op => {
        const key = op.name + (op.unit ? `_${op.unit}` : '');
        if (!grouped[key]) {
            grouped[key] = {
                name: op.name,
                unit: op.unit || '',
                totalQuantity: 0,
                totalAmount: 0,
                count: 0
            };
        }
        grouped[key].totalQuantity += op.quantity || 0;
        grouped[key].totalAmount += op.amount || 0;
        grouped[key].count++;
    });
    
    return Object.values(grouped)
        .map(item => ({
            ...item,
            avgPrice: item.totalQuantity > 0 ? item.totalAmount / item.totalQuantity : 0,
            avgAmount: item.count > 0 ? item.totalAmount / item.count : 0
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);
}

// Event handlers
function changeStatPeriodBy(offset) {
    let newMonth = currentStatPeriod.month + offset;
    let newYear = currentStatPeriod.year;
    
    if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
    } else if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
    }
    
    currentStatPeriod = {
        month: newMonth,
        year: newYear,
        startDate: new Date(newYear, newMonth - 1, 20),
        endDate: new Date(newYear, newMonth, 19)
    };
    
    loadStatisticsTab();
}

function goToCurrentStatPeriod() {
    currentStatPeriod = getCurrentPeriod();
    loadStatisticsTab();
}

function changeStatView(view) {
    currentStatView = view;
    loadStatisticsTab();
}

function toggleStatMaterial() {
    showStatMaterial = !showStatMaterial;
    if (currentStatView === 'operations') {
        loadStatisticsTab();
    }
}

function toggleStatService() {
    showStatService = !showStatService;
    if (currentStatView === 'operations') {
        loadStatisticsTab();
    }
}

function toggleStatDetails() {
    showStatDetails = !showStatDetails;
    loadStatisticsTab();
}

function viewReportDetail(date) {
    currentReportDate = date;
    showTab('reports');
}

async function exportStatistics() {
    try {
        const periodData = await getPeriodStatistics();
        
        let content = `BÁO CÁO THỐNG KÊ - ${formatPeriodDisplay(currentStatPeriod)}\n`;
        content += `Kỳ: ${formatDateDisplay(currentStatPeriod.startDate)} - ${formatDateDisplay(currentStatPeriod.endDate)}\n\n`;
        
        // Tổng quan
        content += '=== TỔNG QUAN ===\n';
        content += `Tổng Doanh thu: ${formatCurrency(periodData.reportsSummary.totalRevenue)}\n`;
        content += `Tổng Chi phí: ${formatCurrency(periodData.reportsSummary.totalExpenses)}\n`;
        content += `Tổng Thực nhận: ${formatCurrency(periodData.reportsSummary.totalReceived)}\n`;
        content += `Tổng Mua sắm: ${formatCurrency(periodData.operationsSummary.totalAmount)}\n\n`;
        
        // Báo cáo
        if (periodData.reports.length > 0) {
            content += '=== BÁO CÁO HÀNG NGÀY ===\n';
            content += 'Ngày\tDoanh thu\tChi phí\tChuyển khoản\tThực nhận\n';
            periodData.reports.forEach(report => {
                const totalExpenses = calculateTotalExpenses(report);
                const totalTransfers = calculateTotalTransfers(report);
                const actualReceived = calculateActualReceived(report);
                
                content += `${report.date}\t${report.revenue}\t${totalExpenses}\t${totalTransfers}\t${actualReceived}\n`;
            });
            content += '\n';
        }
        
        // Operations
        if (periodData.operations.length > 0) {
            content += '=== MUA SẮM VẬN HÀNH ===\n';
            content += 'Ngày\tLoại\tTên\tSố lượng\tThành tiền\n';
            periodData.operations.forEach(op => {
                content += `${op.dateKey || op.date}\t${op.type}\t${op.name}\t${op.quantity || 0}\t${op.amount || 0}\n`;
            });
        }
        
        // Copy to clipboard
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(content);
            showMessage('✅ Đã copy báo cáo vào clipboard!', 'success');
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = content;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showMessage('✅ Đã copy báo cáo vào clipboard!', 'success');
        }
        
    } catch (error) {
        console.error('Error exporting statistics:', error);
        showMessage('❌ Lỗi khi xuất báo cáo', 'error');
    }
}

// Setup event listeners
function setupStatisticsEventListeners() {
    // Có thể thêm các event listeners cụ thể nếu cần
}

// Đưa hàm ra global scope
window.changeStatPeriodBy = changeStatPeriodBy;
window.goToCurrentStatPeriod = goToCurrentStatPeriod;
window.changeStatView = changeStatView;
window.toggleStatMaterial = toggleStatMaterial;
window.toggleStatService = toggleStatService;
window.toggleStatDetails = toggleStatDetails;
window.viewReportDetail = viewReportDetail;
window.exportStatistics = exportStatistics;

// reports.js - cuối file
window.loadReports = function() {
    console.log('📊 Loading reports...');
    // Gọi hàm chính của module
    if (typeof initializeReports === 'function') initializeReports();
    if (typeof loadReportsData === 'function') loadReportsData();
};

// inventory.js - cuối file  
window.loadInventory = function() {
    console.log('📦 Loading inventory...');
    if (typeof initializeInventory === 'function') initializeInventory();
    if (typeof loadInventoryData === 'function') loadInventoryData();
};

// statistics.js - cuối file
window.loadStatistics = function() {
    console.log('📈 Loading statistics...');
    if (typeof initializeStatistics === 'function') initializeStatistics();
};

// employees.js - cuối file
window.loadEmployeesData = function() {
    console.log('👥 Loading employees...');
};

// overview.js - cuối file
window.loadOverview = function() {
    console.log('👁 Loading overview...');
    if (typeof initializeOverview === 'function') initializeOverview();
};