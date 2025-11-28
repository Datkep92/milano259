// FIX: Thêm các biến global để theo dõi state
let currentReportDate = formatDate();
let currentReport = null;
let isReportsInitialized = false;
// FIX: Khai báo biến hiển thị danh sách kho
let showInventoryList = false;
let showReportsHistory = false;
let showOperationsHistory = false;

// FIX: Sửa hàm toggleInventoryList - đảm bảo reload đúng
function toggleInventoryList() {
    showInventoryList = !showInventoryList;
    console.log('📦 Toggle inventory list:', showInventoryList);
    loadReportsTab();
}

async function changeDateByInput(dateString) {
    console.log('🗓️ changeDateByInput called with:', dateString);
    
    // Validate date
    if (!dateString) {
        showMessage('❌ Ngày không hợp lệ', 'error');
        return;
    }
    
    // Update current date
    currentReportDate = dateString;
    console.log('📅 Current date set to:', currentReportDate);
    
    // Reload reports tab với ngày mới
    console.log('🔄 Calling loadReportsTab...');
    loadReportsTab();
}

// FIX: Đảm bảo hàm được đặt trong global scope
window.changeDateByInput = changeDateByInput;

// FIX: Sửa hàm initialize - chỉ chạy một lần
function initializeReportsTab() {
    if (!isReportsInitialized) {
        loadReportsTab();
        isReportsInitialized = true;
    }
}

// FIX: Sửa hàm getOrCreateReport - đơn giản hóa
async function getOrCreateReport(date) {
    try {
        console.log('🔍 getOrCreateReport called for date:', date);
        
        let report = await dbGet('reports', date);
        
        if (!report) {
            console.log('🆕 Creating new report for date:', date);
            
            // Tạo báo cáo mới với số dư đầu kỳ = 0
            // Số dư đầu kỳ sẽ được cập nhật khi lưu báo cáo ngày hôm trước
            report = {
                reportId: date,
                date: date,
                openingBalance: 0,
                closingBalance: 0,
                revenue: 0,
                expenses: [],
                transfers: [],
                exports: [],
                createdBy: getCurrentUser().employeeId,
                updatedBy: getCurrentUser().employeeId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await dbAdd('reports', report);
            console.log('✅ Created new report');
        } else {
            console.log('📝 Using existing report');
            // FIX: Đảm bảo exports tồn tại trong report cũ
            if (!report.exports) {
                report.exports = [];
                await dbUpdate('reports', report.reportId, {
                    exports: [],
                    updatedAt: new Date().toISOString()
                });
            }
        }
        
        return report;
    } catch (error) {
        console.error('❌ Error in getOrCreateReport:', error);
        return {
            reportId: date,
            date: date,
            openingBalance: 0,
            closingBalance: 0,
            revenue: 0,
            expenses: [],
            transfers: [],
            exports: [],
            createdBy: getCurrentUser().employeeId,
            updatedBy: getCurrentUser().employeeId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
}
/*
// FIX: Sửa hàm updateReportField - đảm bảo currentReport không bị null
async function updateReportField(field, value) {
    if (!currentReport) {
        console.error('currentReport is null when updating field:', field);
        currentReport = await getOrCreateReport(currentReportDate);
    }
    
    try {
        currentReport[field] = value;
        const actualReceived = calculateActualReceived(currentReport);
        
        // Update UI
        const actualReceivedElement = document.getElementById('actualReceived');
        if (actualReceivedElement) {
            actualReceivedElement.textContent = formatCurrency(actualReceived);
        }
        
        await dbUpdate('reports', currentReport.reportId, {
            [field]: value,
            updatedBy: getCurrentUser().employeeId,
            updatedAt: new Date().toISOString()
        });
        
        console.log('Updated field:', field, 'to:', value);
        
    } catch (error) {
        console.error('Error updating report:', error);
        showMessage('Lỗi khi cập nhật báo cáo', 'error');
    }
}
*/
// FIX: Sửa hàm updateReportField - chỉ update UI, không lưu DB
async function updateReportField(field, value) {
    if (!currentReport) {
        console.error('currentReport is null when updating field:', field);
        currentReport = await getOrCreateReport(currentReportDate);
    }
    
    try {
        // CHỈ CẬP NHẬT TRONG MEMORY, KHÔNG LƯU DB
        currentReport[field] = value;
        const actualReceived = calculateActualReceived(currentReport);
        
        // Update UI only
        const actualReceivedElement = document.getElementById('actualReceived');
        if (actualReceivedElement) {
            actualReceivedElement.textContent = formatCurrency(actualReceived);
        }
        
        console.log('Updated field in memory:', field, 'to:', value);
        // KHÔNG gọi dbUpdate ở đây nữa
        
    } catch (error) {
        console.error('Error updating report field:', error);
        showMessage('Lỗi khi cập nhật báo cáo', 'error');
    }
}
// FIX: Thêm hàm debug để kiểm tra state
function debugReportsState() {
    console.log('=== REPORTS DEBUG ===');
    console.log('currentReportDate:', currentReportDate);
    console.log('currentReport:', currentReport);
    console.log('isReportsInitialized:', isReportsInitialized);
    
    const container = document.getElementById('reports');
    console.log('Reports container exists:', !!container);
    console.log('Reports container HTML length:', container?.innerHTML?.length);
    
    // Kiểm tra event listeners
    const expenseElements = document.querySelectorAll('[data-action="show-expenses"]');
    const transferElements = document.querySelectorAll('[data-action="show-transfers"]');
    console.log('Expense elements:', expenseElements.length);
    console.log('Transfer elements:', transferElements.length);
}

// FIX: Gọi debug khi cần (có thể remove sau khi fix xong)
// setTimeout(debugReportsState, 2000);






function handleReportsInput(e) {
    if (e.target.matches('#revenueInput')) {
        const value = parseFloat(e.target.value) || 0;
        updateReportField('revenue', value);
    } else if (e.target.matches('#closingBalanceInput')) {
        const value = parseFloat(e.target.value) || 0;
        updateReportField('closingBalance', value);
    }
}


// FIX: Sửa hàm setupReportsEventListeners - bind events cho toàn bộ document
function setupReportsEventListeners() {
    console.log('Setting up reports event listeners...');
    
    // Remove all existing listeners
    document.removeEventListener('click', handleReportsClick);
    document.removeEventListener('input', handleReportsInput);
    
    // Add new listeners - sử dụng event delegation
    document.addEventListener('click', handleReportsClick);
    document.addEventListener('input', handleReportsInput);
    
    console.log('Event listeners setup completed');
}

// FIX: Thêm hàm hiển thị lịch sử xuất kho từ inventory.js
async function showExportsHistoryPopup() {
    try {
        // Lấy tất cả lịch sử xuất kho
        const allHistory = await dbGetAll('inventoryHistory');
        const exportsHistory = allHistory.filter(record => 
            record.type === 'out' && record.date.includes(currentReportDate)
        );
        
        console.log('📦 Exports history for today:', exportsHistory);
        
        if (exportsHistory.length === 0) {
            showMessage('📭 Không có lịch sử xuất kho cho ngày hôm nay', 'info');
            return;
        }
        
        // Lấy thông tin sản phẩm để hiển thị tên
        const inventory = await dbGetAll('inventory');
        
        const popupHTML = `
            <div class="popup" style="max-width: 800px;">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>📦 Lịch sử Xuất kho - ${formatDateDisplay(currentReportDate)}</h3>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Tên sản phẩm</th>
                            <th>Thời gian</th>
                            <th>SL xuất</th>
                            <th>Đơn giá</th>
                            <th>Thành tiền</th>
                            <th>Ghi chú</th>
                            <th>NV thực hiện</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${exportsHistory.map((record, index) => {
                            const product = inventory.find(p => p.productId === record.productId);
                            const productName = product ? product.name : 'Unknown';
                            
                            return `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${productName}</td>
                                    <td>${formatDateTime(record.date)}</td>
                                    <td style="color: red;">-${record.quantity}</td>
                                    <td>${record.unitPrice ? formatCurrency(record.unitPrice) : '-'}</td>
                                    <td>${record.totalPrice ? formatCurrency(record.totalPrice) : '-'}</td>
                                    <td>${record.note || ''}</td>
                                    <td>${record.createdBy || 'System'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                
                <div class="export-summary">
                    <strong>Tổng xuất: ${exportsHistory.reduce((sum, record) => sum + record.quantity, 0)} sản phẩm</strong>
                </div>
                
                <div class="popup-actions">
                    <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        
    } catch (error) {
        console.error('Error loading exports history:', error);
        showMessage('❌ Lỗi khi tải lịch sử xuất kho', 'error');
    }
}
// FIX: Hàm lấy lịch sử xuất kho theo ngày
async function getExportsHistoryForDate(date) {
    try {
        const allHistory = await dbGetAll('inventoryHistory');
        const inventory = await dbGetAll('inventory');
        
        // Lọc xuất kho theo ngày
        const exportsHistory = allHistory.filter(record => {
            const recordDate = record.date.split('T')[0]; // Lấy phần YYYY-MM-DD
            return record.type === 'out' && recordDate === date;
        });
        
        // Gắn thông tin sản phẩm
        const exportsWithProducts = exportsHistory.map(record => {
            const product = inventory.find(p => p.productId === record.productId);
            return {
                ...record,
                product: product
            };
        });
        
        console.log('📦 Exports history for', date, ':', exportsWithProducts);
        return exportsWithProducts;
        
    } catch (error) {
        console.error('Error getting exports history:', error);
        return [];
    }
}

// FIX: Hàm format thời gian
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}
// FIX: Sửa hàm renderReportsTab - sắp xếp logic hiển thị
async function renderReportsTab(container, report) {
    const actualReceived = calculateActualReceived(report);
    const totalExpenses = calculateTotalExpenses(report);
    const totalTransfers = calculateTotalTransfers(report);
    const totalExports = calculateTotalExports(report);
    
    // Lấy lịch sử xuất kho thực tế từ database
    const exportsHistory = await getExportsHistoryForDate(report.date);
    const hasExportsHistory = exportsHistory.length > 0;
    const totalHistoricalExports = exportsHistory.reduce((sum, record) => sum + record.quantity, 0);
    
    // FIX: Luôn cho phép sửa, không chặn readonly
    const isSaved = report.revenue > 0 || report.closingBalance > 0 || totalExports > 0 || hasExportsHistory;
    
    container.innerHTML = `
        <div class="section">
            <div class="report-header">
                ${isSaved ? '<div class="saved-badge">✅ĐÃ LƯU</div>' : ''}
            </div>
            
            <div class="date-selector">
                <input type="date" class="date-input" value="${report.date}" id="dateInput" 
                       onchange="changeDateByInput(this.value)">
            </div>

            <div class="summary-grid">
                <div class="summary-card">
                    <h3>Số dư đầu kỳ</h3>
                    <div class="amount">${formatCurrency(report.openingBalance)}</div>
                </div>
                
                <div class="summary-card">
                    <h3>Doanh thu</h3>
                    <input type="number" id="revenueInput" class="amount-input" 
                           value="${report.revenue}" placeholder="0" min="0">
                </div>
                
                <div class="summary-card clickable" data-action="show-expenses">
                    <h3>Chi phí ›</h3>
                    <div class="amount">${formatCurrency(totalExpenses)}</div>
                </div>
                
                <div class="summary-card clickable" data-action="show-transfers">
                    <h3>Chuyển khoản ›</h3>
                    <div class="amount">${formatCurrency(totalTransfers)}</div>
                </div>
                
                <div class="summary-card">
                    <h3>Số dư cuối kỳ</h3>
                    <input type="number" id="closingBalanceInput" class="amount-input" 
                           value="${report.closingBalance}" placeholder="0" min="0">
                </div>
                
                <div class="summary-card" style="background: #e8f5e8;">
                    <h3>Thực nhận</h3>
                    <div class="amount" style="color: #2e7d32;">${formatCurrency(actualReceived)}</div>
                </div>
            </div>

            <div class="action-buttons">
                <button class="btn btn-primary" data-action="save-report">
                    ${isSaved ? '💾 Cập nhật báo cáo' : '💾 Lưu báo cáo'}
                </button>
                <button class="btn btn-success" data-action="share-zalo">📱 Gửi Zalo</button>
            </div>
        </div>

        <!-- PHẦN XUẤT KHO - HIỆN TẠI -->
        <div class="section">
            <div class="section-header-with-action">
                <h2>📦 Xuất kho trong ngày</h2>
                <button class="btn btn-outline btn-sm" data-action="toggle-inventory-list">
                    ${showInventoryList ? '▲ Ẩn danh sách' : '▼ Hiện danh sách'}
                </button>
            </div>
            
            ${showInventoryList ? `
                <div class="exports-table-container">
                    <table class="exports-table">
                        <thead>
                            <tr>
                                <th>Tên sản phẩm</th>
                                <th>Tồn kho</th>
                                <th>Xuất kho</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${await renderExportsTable(report.exports)}
                        </tbody>
                    </table>
                </div>
            ` : ''}

            <div class="export-total">
                <strong>Tổng xuất kho hiện tại: ${totalExports} sản phẩm</strong>
            </div>
        </div>

        <!-- PHẦN XUẤT KHO - LỊCH SỬ ĐÃ LƯU -->
        ${hasExportsHistory ? `
            <div class="section">
                <div class="section-header-with-action">
                    <h2>📋 Lịch sử Xuất kho đã lưu</h2>
                </div>
                
                <div class="exports-history-section">
                    <div class="exports-history-list">
                        ${exportsHistory.map(record => {
                            const product = record.product;
                            return `
                                <div class="export-history-item">
                                    <span class="export-product">${product?.name || 'Unknown'}</span>
                                    <span class="export-quantity">${record.quantity} ${product?.unit || ''}</span>
                                    <span class="export-time">${formatTime(record.date)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="exports-history-total">
                        <strong>Tổng: ${totalHistoricalExports} sản phẩm</strong>
                    </div>
                </div>
            </div>
        ` : ''}

        <!-- PHẦN MUA SẮM VẬN HÀNH -->
        <div class="section">
            <h2>🔧 Mua sắm vận hành</h2>
            <div class="operations-summary">
                <div class="operation-item clickable" data-action="show-operations" data-type="material">
                    <span>•</span><span>Nguyên liệu ${formatCurrency(await calculateOperationsTotal('material', report.date))} ›</span>
                </div>
                <div class="operation-item clickable" data-action="show-operations" data-type="service">
                    <span>•</span><span>Dịch vụ ${formatCurrency(await calculateOperationsTotal('service', report.date))} ›</span>
                </div>
            </div>
        </div>

        <!-- PHẦN LỊCH SỬ BÁO CÁO -->
        <div class="section">
            <div class="section-header-with-action">
                <h2>📜 Lịch sử Báo cáo</h2>
                <button class="btn btn-outline btn-sm" data-action="toggle-reports-history">
                    ${showReportsHistory ? '▲ Ẩn' : '▼ Xem'}
                </button>
            </div>
            ${showReportsHistory ? await renderReportsHistory() : ''}
        </div>

        <!-- PHẦN LỊCH SỬ MUA SẮM -->
        <div class="section">
            <div class="section-header-with-action">
                <h2>🛒 Lịch sử Mua sắm</h2>
                <button class="btn btn-outline btn-sm" data-action="toggle-operations-history">
                    ${showOperationsHistory ? '▲ Ẩn' : '▼ Hiện'}
                </button>
            </div>
            ${showOperationsHistory ? await renderOperationsHistory() : ''}
        </div>

        ${isAdmin() ? `
        <div class="section">
            <h2>🧪 Developer Tools</h2>
            <div class="dev-actions">
                <button class="btn btn-danger btn-sm" data-action="clear-all-data">🗑️ Xóa dữ liệu</button>
                <button class="btn btn-warning btn-sm" data-action="clear-device-id">🆔 Xóa ID</button>
                <span style="font-size: 12px; color: #666;">Device: ${getDeviceId()}</span>
            </div>
        </div>
        ` : ''}
    `;
}

// FIX: Hàm render danh sách báo cáo
async function renderReportsHistoryList() {
    try {
        const reports = await dbGetAll('reports');
        const sortedReports = reports.sort((a, b) => b.date.localeCompare(a.date));
        
        // Nhân viên chỉ xem 3 báo cáo gần nhất
        const displayReports = isAdmin() ? sortedReports.slice(0, 10) : sortedReports.slice(0, 3);
        
        if (displayReports.length === 0) {
            return '<div class="empty-state"><p>Chưa có báo cáo nào</p></div>';
        }
        
        let historyHTML = '';
        
        for (const report of displayReports) {
            const totalExpenses = calculateTotalExpenses(report);
            const totalTransfers = calculateTotalTransfers(report);
            const actualReceived = calculateActualReceived(report);
            const totalExports = calculateTotalExports(report);
            
            // Lấy lịch sử xuất kho thực tế cho ngày này
            const exportsHistory = await getExportsHistoryForDate(report.date);
            const totalHistoricalExports = exportsHistory.reduce((sum, record) => sum + record.quantity, 0);
            const totalAllExports = totalExports + totalHistoricalExports;
            
            historyHTML += `
                <div class="history-day">
                    <div class="history-header">
                        <strong>${formatDateDisplay(report.date)}</strong>
                        <div class="history-actions">
                            ${isAdmin() ? `
                                <button class="btn btn-sm btn-outline" data-action="edit-report" data-date="${report.date}">Sửa</button>
                                <button class="btn btn-sm btn-danger" data-action="delete-report" data-date="${report.date}">Xóa</button>
                            ` : report.date === formatDate() ? `
                                <button class="btn btn-sm btn-outline" data-action="edit-report" data-date="${report.date}">Sửa</button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="history-details">
                        <div class="history-row">
                            <span>Doanh thu:</span>
                            <span>${formatCurrency(report.revenue)}</span>
                        </div>
                        <div class="history-row">
                            <span>Chi phí:</span>
                            <span>${formatCurrency(totalExpenses)}</span>
                        </div>
                        <div class="history-row">
                            <span>Thực nhận:</span>
                            <span class="history-actual">${formatCurrency(actualReceived)}</span>
                        </div>
                        ${totalAllExports > 0 ? `
                            <div class="history-exports">
                                <strong>📦 Xuất kho: ${totalAllExports} sản phẩm</strong>
                                <button class="btn btn-link btn-sm" data-action="show-day-exports" data-date="${report.date}">
                                    (chi tiết)
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        return `<div class="reports-history-list">${historyHTML}</div>`;
        
    } catch (error) {
        return '<div class="empty-state"><p>Lỗi tải lịch sử báo cáo</p></div>';
    }
}

// FIX: Hàm render lịch sử xuất kho
async function renderExportsHistoryList() {
    try {
        const allHistory = await dbGetAll('inventoryHistory');
        const inventory = await dbGetAll('inventory');
        
        // Lọc chỉ xuất kho và nhóm theo ngày
        const exportsHistory = allHistory.filter(record => record.type === 'out');
        const exportsByDate = {};
        
        exportsHistory.forEach(record => {
            const recordDate = record.date.split('T')[0];
            if (!exportsByDate[recordDate]) {
                exportsByDate[recordDate] = [];
            }
            
            const product = inventory.find(p => p.productId === record.productId);
            exportsByDate[recordDate].push({
                ...record,
                product: product
            });
        });
        
        // Sắp xếp ngày mới nhất trước
        const sortedDates = Object.keys(exportsByDate).sort((a, b) => b.localeCompare(a));
        const displayDates = isAdmin() ? sortedDates.slice(0, 10) : sortedDates.slice(0, 5);
        
        if (displayDates.length === 0) {
            return '<div class="empty-state"><p>Chưa có xuất kho nào</p></div>';
        }
        
        let exportsHTML = '';
        
        for (const date of displayDates) {
            const dayExports = exportsByDate[date];
            const totalExports = dayExports.reduce((sum, record) => sum + record.quantity, 0);
            
            exportsHTML += `
                <div class="exports-day">
                    <div class="exports-header">
                        <strong>${formatDateDisplay(date)}</strong>
                        <span class="exports-total">${totalExports} sản phẩm</span>
                    </div>
                    
                    <div class="exports-items">
                        ${dayExports.slice(0, 3).map(record => `
                            <div class="export-item">
                                <span class="export-product">${record.product?.name || 'Unknown'}</span>
                                <span class="export-quantity">${record.quantity} ${record.product?.unit || ''}</span>
                                <span class="export-time">${formatTime(record.date)}</span>
                            </div>
                        `).join('')}
                        
                        ${dayExports.length > 3 ? `
                            <div class="export-more">
                                <button class="btn btn-link btn-sm" data-action="show-day-exports" data-date="${date}">
                                    +${dayExports.length - 3} sản phẩm khác
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        return `<div class="exports-history-list">${exportsHTML}</div>`;
        
    } catch (error) {
        return '<div class="empty-state"><p>Lỗi tải lịch sử xuất kho</p></div>';
    }
}

// FIX: Hàm hiển thị chi tiết xuất kho theo ngày
async function showDayExportsPopup(date) {
    try {
        const exportsHistory = await getExportsHistoryForDate(date);
        
        if (exportsHistory.length === 0) {
            showMessage(`📭 Không có xuất kho ngày ${formatDateDisplay(date)}`, 'info');
            return;
        }
        
        const totalExports = exportsHistory.reduce((sum, record) => sum + record.quantity, 0);
        
        const popupHTML = `
            <div class="popup" style="max-width: 700px;">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>📦 Chi tiết Xuất kho - ${formatDateDisplay(date)}</h3>
                
                <div class="exports-summary">
                    <strong>Tổng: ${totalExports} sản phẩm</strong>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tên sản phẩm</th>
                            <th>SL</th>
                            <th>ĐVT</th>
                            <th>Thời gian</th>
                            <th>Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${exportsHistory.map((record, index) => `
                            <tr>
                                <td>${record.product?.name || 'Unknown'}</td>
                                <td style="color: red; font-weight: bold;">${record.quantity}</td>
                                <td>${record.product?.unit || ''}</td>
                                <td>${formatTime(record.date)}</td>
                                <td>${record.note || ''}</td>
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
        
    } catch (error) {
        console.error('Error showing day exports:', error);
        showMessage('❌ Lỗi khi tải chi tiết xuất kho', 'error');
    }
}
// FIX: Cập nhật hàm handleReportsClick - thêm handler cho lịch sử xuất kho
function handleReportsClick(e) {
    const action = e.target.dataset.action;
    const target = e.target;

    console.log('🔍 Click detected - Action:', action, 'Target:', target);

    if (action === "clear-all-data") clearAllData();
    else if (action === "clear-device-id") clearDeviceId();
    else if (action === "toggle-operations-history") toggleOperationsHistory();
    else if (action === "debug-exports") debugExportsDetailed();
    else if (action === "add-sample-exports") addSampleExports();
    
    if (action === "toggle-reports-history") {
        toggleReportsHistoryTab();
    }
    
    // FIX: Thêm handler cho lịch sử xuất kho
    if (action === "show-exports-history") {
        console.log('📦 Opening exports history popup...');
        showExportsHistoryPopup();
        return;
    }
    
    // FIX: Xử lý click vào dòng export
    if (target.closest('.export-row') && target.dataset.action !== 'decrease-export') {
        const productId = target.closest('.export-row').dataset.productId;
        if (productId) increaseExport(productId);
        return;
    }
    
    if (action === "show-expenses") {
        console.log('💰 Opening expenses popup...');
        showExpensesPopup();
    } 
    else if (action === "show-transfers") {
        console.log('🏦 Opening transfers popup...');
        showTransfersPopup();
    } 
    else if (action === "save-report") {
        saveCurrentReport();
    } 
    else if (action === "copy-report") {
        copyReportToClipboard();
    } 
    else if (action === "share-zalo") {
        shareReportToZalo();
    } 
    else if (action === "toggle-inventory-list") {
        toggleInventoryList();
    }
    else if (action === "increase-export") {
        const productId = target.dataset.productId || target.closest('[data-action="increase-export"]')?.dataset.productId;
        if (productId) increaseExport(productId);
    }
    else if (action === "decrease-export") {
        const productId = target.dataset.productId || target.closest('[data-action="decrease-export"]')?.dataset.productId;
        if (productId) decreaseExport(productId);
    }
    else if (action === "show-operations") {
        console.log('🔧 Opening operations popup...');
        const type = target.dataset.type || target.closest('[data-action="show-operations"]')?.dataset.type;
        console.log('Operations type:', type);
        showOperationsPopup();
    }
    else if (action === "show-reports-history") {
        showReportsHistoryPopup();
    }
    else if (action === "show-operations-history") {
        showOperationsHistoryPopup();
    }
}


async function renderExportsTable(currentExports) {
    try {
        const inventory = await dbGetAll('inventory');
        if (!inventory?.length) return '<tr><td colspan="4" class="empty-table"><p>Kho trống</p></td></tr>';

        return inventory.map(product => {
            const exportItem = currentExports?.find(exp => exp.productId === product.productId);
            const exportQuantity = exportItem?.quantity || 0;
            
            return `
                <tr class="export-row clickable" data-action="increase-export" data-product-id="${product.productId}">
                    <td class="product-info">
                        <div class="product-name-row">
                            <span class="product-name">${product.name}</span>
                            <span class="product-unit">${product.unit}</span>
                        </div>
                    </td>
                    <td class="stock-quantity">${product.currentQuantity}</td>
                    <td class="export-quantity">${exportQuantity}</td>
                    <td class="export-actions">
                        <button class="btn btn-danger btn-sm" data-action="decrease-export" 
                                data-product-id="${product.productId}" ${exportQuantity === 0 ? 'disabled' : ''}>-</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        return '<tr><td colspan="4" class="empty-table"><p>Lỗi tải kho</p></td></tr>';
    }
}
    
// FIX: Hàm fix tất cả số dư đầu kỳ
async function fixAllOpeningBalances() {
    try {
        console.log('🔄 Fixing all opening balances...');
        
        const allReports = await dbGetAll('reports');
        const sortedReports = allReports.sort((a, b) => a.date.localeCompare(b.date));
        
        console.log('📊 Total reports:', sortedReports.length);
        
        for (let i = 0; i < sortedReports.length; i++) {
            const currentReport = sortedReports[i];
            let newOpeningBalance = 0;
            
            if (i > 0) {
                // Lấy báo cáo ngày hôm trước
                const prevReport = sortedReports[i - 1];
                
                // Kiểm tra xem có phải ngày liên tiếp không
                const currentDate = new Date(currentReport.date + 'T00:00:00');
                const prevDate = new Date(prevReport.date + 'T00:00:00');
                prevDate.setDate(prevDate.getDate() + 1);
                
                if (formatDate(currentDate) === formatDate(prevDate)) {
                    newOpeningBalance = prevReport.closingBalance;
                }
            }
            
            if (currentReport.openingBalance !== newOpeningBalance) {
                console.log(`🔄 Fixing ${currentReport.date}: ${currentReport.openingBalance} → ${newOpeningBalance}`);
                await dbUpdate('reports', currentReport.reportId, {
                    openingBalance: newOpeningBalance,
                    updatedAt: new Date().toISOString()
                });
            }
        }
        
        console.log('✅ Fixed all opening balances');
        showMessage('✅ Đã fix tất cả số dư đầu kỳ', 'success');
        
        // Reload để xem kết quả
        setTimeout(() => {
            loadReportsTab();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error fixing opening balances:', error);
        showMessage('❌ Lỗi khi fix số dư đầu kỳ', 'error');
    }
}
// Debug chi tiết tính ngày
function debugDateCalculation() {
    console.log('🐛 DEBUG TÍNH NGÀY...');
    
    const testDates = ['2025-11-25', '2025-11-26', '2025-11-27'];
    
    for (const testDate of testDates) {
        console.log(`\n📅 Testing date: ${testDate}`);
        
        // Tạo Date object
        const currentDateObj = new Date(testDate + 'T00:00:00');
        console.log('   Current Date Object:', currentDateObj);
        console.log('   Current Date String:', currentDateObj.toString());
        
        // Tính ngày tiếp theo
        const nextDate = new Date(currentDateObj);
        nextDate.setDate(currentDateObj.getDate() + 1);
        console.log('   Next Date Object:', nextDate);
        console.log('   Next Date String:', nextDate.toString());
        
        // Format cả hai
        const currentFormatted = formatDate(currentDateObj);
        const nextFormatted = formatDate(nextDate);
        
        console.log('   Current Formatted:', currentFormatted);
        console.log('   Next Formatted:', nextFormatted);
        console.log('   Same?', currentFormatted === nextFormatted ? '❌ BUG!' : '✅ OK');
    }
}

// Chạy debug
debugDateCalculation();
// FIX: Sửa hàm updateNextDayOpeningBalance - tính ngày không dùng Date object
async function updateNextDayOpeningBalance(currentDayClosingBalance, currentDate = currentReportDate) {
    try {
        console.log('🔄 updateNextDayOpeningBalance called with:', currentDayClosingBalance, 'for date:', currentDate);
        
        // Tính ngày tiếp theo bằng cách parse string trực tiếp
        console.log('📅 Calculating next date from:', currentDate);
        
        const [year, month, day] = currentDate.split('-').map(Number);
        console.log('   Parsed date:', { year, month, day });
        
        // Tạo Date object chỉ để tính toán, không dùng để format
        const tempDate = new Date(year, month - 1, day); // month - 1 vì Date month là 0-based
        tempDate.setDate(tempDate.getDate() + 1);
        
        const nextYear = tempDate.getFullYear();
        const nextMonth = (tempDate.getMonth() + 1).toString().padStart(2, '0');
        const nextDay = tempDate.getDate().toString().padStart(2, '0');
        const nextDateStr = `${nextYear}-${nextMonth}-${nextDay}`;
        
        console.log('📊 Date calculation:');
        console.log('   Current Date:', currentDate);
        console.log('   Next Date:', nextDateStr);
        
        // Lấy hoặc tạo báo cáo cho ngày tiếp theo
        let nextReport = await dbGet('reports', nextDateStr);
        console.log('📋 Next report found:', !!nextReport);
        
        if (!nextReport) {
            console.log('🆕 Creating new report for next day:', nextDateStr);
            nextReport = {
                reportId: nextDateStr,
                date: nextDateStr,
                openingBalance: currentDayClosingBalance,
                closingBalance: 0,
                revenue: 0,
                expenses: [],
                transfers: [],
                exports: [],
                createdBy: getCurrentUser().employeeId,
                updatedBy: getCurrentUser().employeeId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await dbAdd('reports', nextReport);
            console.log('✅ Created next day report with opening balance:', currentDayClosingBalance);
        } else {
            console.log('📝 Updating existing next day report');
            console.log('   Current opening balance:', nextReport.openingBalance);
            console.log('   New opening balance:', currentDayClosingBalance);
            
            if (nextReport.openingBalance !== currentDayClosingBalance) {
                console.log('🔄 Updating next day opening balance...');
                await dbUpdate('reports', nextDateStr, {
                    openingBalance: currentDayClosingBalance,
                    updatedAt: new Date().toISOString()
                });
                console.log('✅ Updated next day opening balance');
            } else {
                console.log('✅ Next day opening balance is already correct');
            }
        }
        
        return nextDateStr;
        
    } catch (error) {
        console.error('❌ Error updating next day opening balance:', error);
    }
}
// FIX: Sửa hoàn toàn hàm formatDate - tránh timezone issues
function formatDate(date = new Date()) {
    // Nếu là string, xử lý trực tiếp không dùng Date object
    if (typeof date === 'string') {
        // Kiểm tra định dạng YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date; // Trả về nguyên string nếu đã đúng format
        }
        // Nếu không phải định dạng chuẩn, thử parse
        const parts = date.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];
            return `${year}-${month}-${day}`;
        }
    }
    
    // Nếu là Date object, format thủ công
    if (date instanceof Date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Fallback: lấy ngày hiện tại
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}
// FIX: Sửa hàm saveCurrentReport - truyền đúng ngày hiện tại
/*
async function saveCurrentReport() {
    if (!currentReport) return;
    
    try {
        console.log('💾 saveCurrentReport called for date:', currentReportDate);
        
        const revenueInput = document.getElementById('revenueInput');
        const closingBalanceInput = document.getElementById('closingBalanceInput');
        
        if (revenueInput && closingBalanceInput) {
            const revenue = parseFloat(revenueInput.value) || 0;
            const closingBalance = parseFloat(closingBalanceInput.value) || 0;
            
            console.log('📊 Revenue:', revenue, 'Closing Balance:', closingBalance);
            
            // FIX: Đảm bảo exports tồn tại
            if (!currentReport.exports) {
                currentReport.exports = [];
            }
            
            // Cập nhật báo cáo hàng ngày
            currentReport.revenue = revenue;
            currentReport.closingBalance = closingBalance;
            
            await dbUpdate('reports', currentReport.reportId, {
                revenue: revenue,
                closingBalance: closingBalance,
                updatedBy: getCurrentUser().employeeId,
                updatedAt: new Date().toISOString()
            });
            
            console.log('✅ Report saved for date:', currentReportDate);
            
            // QUAN TRỌNG: Cập nhật số dư đầu kỳ cho ngày tiếp theo
            // Truyền currentReportDate để đảm bảo tính đúng ngày tiếp theo
            const nextDate = await updateNextDayOpeningBalance(closingBalance, currentReportDate);
            console.log('📅 Next date that was updated:', nextDate);
            
            // Nếu có xuất kho thì cập nhật kho và ghi lịch sử
            if (currentReport.exports && currentReport.exports.length > 0) {
                console.log('📦 Processing exports...');
                await updateInventoryFromExports();
                
                // RESET xuất kho sau khi lưu thành công
                currentReport.exports = [];
                await dbUpdate('reports', currentReport.reportId, {
                    exports: [],
                    updatedAt: new Date().toISOString()
                });
            }
            
            showMessage('✅ Đã lưu báo cáo thành công!', 'success');
            
            // Reload để hiển thị trạng thái mới
            setTimeout(() => {
                loadReportsTab();
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Error saving report:', error);
        showMessage('❌ Lỗi khi lưu báo cáo: ' + error.message, 'error');
    }
}
    */
   // FIX: Sửa hàm saveCurrentReport - lưu tất cả dữ liệu từ UI
async function saveCurrentReport() {
    if (!currentReport) return;
    
    try {
        console.log('💾 saveCurrentReport called - Saving all data to DB');
        
        // LẤY DỮ LIỆU TỪ UI INPUTS
        const revenueInput = document.getElementById('revenueInput');
        const closingBalanceInput = document.getElementById('closingBalanceInput');
        
        if (revenueInput && closingBalanceInput) {
            const revenue = parseFloat(revenueInput.value) || 0;
            const closingBalance = parseFloat(closingBalanceInput.value) || 0;
            
            console.log('📊 Saving data - Revenue:', revenue, 'Closing Balance:', closingBalance);
            
            // CẬP NHẬT CURRENT REPORT VỚI DỮ LIỆU MỚI NHẤT
            currentReport.revenue = revenue;
            currentReport.closingBalance = closingBalance;
            
            // ĐẢM BẢO exports tồn tại
            if (!currentReport.exports) {
                currentReport.exports = [];
            }
            
            // LƯU TẤT CẢ VÀO DATABASE
            await dbUpdate('reports', currentReport.reportId, {
                revenue: revenue,
                closingBalance: closingBalance,
                expenses: currentReport.expenses || [],
                transfers: currentReport.transfers || [],
                exports: currentReport.exports || [],
                updatedBy: getCurrentUser().employeeId,
                updatedAt: new Date().toISOString()
            });
            
            console.log('✅ All data saved to database');
            
            // CẬP NHẬT SỐ DƯ ĐẦU KỲ CHO NGÀY TIẾP THEO
            await updateNextDayOpeningBalance(closingBalance, currentReportDate);
            
            // XỬ LÝ XUẤT KHO NẾU CÓ
            if (currentReport.exports && currentReport.exports.length > 0) {
                console.log('📦 Processing exports for inventory update...');
                await updateInventoryFromExports();
                
                // RESET xuất kho sau khi lưu thành công
                currentReport.exports = [];
                await dbUpdate('reports', currentReport.reportId, {
                    exports: [],
                    updatedAt: new Date().toISOString()
                });
            }
            
            showMessage('✅ Đã lưu báo cáo thành công!', 'success');
            
            // Reload để hiển thị trạng thái mới
            setTimeout(() => {
                loadReportsTab();
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Error saving report:', error);
        showMessage('❌ Lỗi khi lưu báo cáo: ' + error.message, 'error');
    }
}
// FIX: Hàm debug để kiểm tra tất cả báo cáo
async function debugAllReports() {
    try {
        const allReports = await dbGetAll('reports');
        const sortedReports = allReports.sort((a, b) => a.date.localeCompare(b.date));
        
        console.log('=== 📊 ALL REPORTS DEBUG ===');
        sortedReports.forEach((report, index) => {
            console.log(`📅 ${report.date}: Opening=${report.openingBalance}, Closing=${report.closingBalance}, Revenue=${report.revenue}`);
        });
        console.log('=== END DEBUG ===');
        
        return sortedReports;
    } catch (error) {
        console.error('Error debugging reports:', error);
    }
}

// Gọi hàm này trong console để debug
// debugAllReports();
// FIX: Sửa hàm loadReportsTab - bỏ reset trạng thái đã lưu
async function loadReportsTab() {
    const container = document.getElementById('reports');
    if (!container) return;

    try {
        showLoading(true);
        currentReport = await getOrCreateReport(currentReportDate);
        
        // FIX: Bỏ reset hasSavedToday để cho phép sửa lại
        renderReportsTab(container, currentReport);
        setupReportsEventListeners();
        showLoading(false);
    } catch (error) {
        console.error('Error loading reports tab:', error);
        showMessage('Lỗi tải dữ liệu báo cáo', 'error');
        showLoading(false);
    }
}

// FIX: Sửa hàm updateInventoryFromExports - chỉ trừ kho 1 lần
async function updateInventoryFromExports() {
    try {
        console.log('Updating inventory from exports...');
        
        for (const exportItem of currentReport.exports) {
            // Tìm sản phẩm trong kho
            const product = await dbGet('inventory', exportItem.productId);
            
            if (product) {
                // Kiểm tra số lượng xuất có hợp lệ không
                if (exportItem.quantity > product.currentQuantity) {
                    showMessage(`❌ Không đủ tồn kho cho ${product.name}. Tồn: ${product.currentQuantity}, Xuất: ${exportItem.quantity}`, 'error');
                    continue; // Bỏ qua sản phẩm này nhưng vẫn xử lý sản phẩm khác
                }
                
                // Cập nhật số lượng tồn kho
                const newQuantity = product.currentQuantity - exportItem.quantity;
                
                await dbUpdate('inventory', product.productId, {
                    currentQuantity: newQuantity,
                    totalValue: newQuantity * product.averagePrice,
                    updatedAt: new Date().toISOString()
                });
                
                // Ghi lịch sử xuất kho
                await dbAdd('inventoryHistory', {
                    productId: product.productId,
                    type: 'out',
                    quantity: exportItem.quantity,
                    unitPrice: product.averagePrice,
                    totalPrice: exportItem.quantity * product.averagePrice,
                    note: `Xuất kho bán hàng - NV: ${getCurrentUser().name} - Ngày: ${formatDateDisplay(currentReportDate)}`,
                    createdBy: getCurrentUser().employeeId,
                    date: new Date().toISOString()
                });
                
                console.log(`Updated inventory for ${product.name}: -${exportItem.quantity}`);
            } else {
                console.warn(`Product not found: ${exportItem.productId}`);
                showMessage(`❌ Sản phẩm không tồn tại trong kho: ${exportItem.name}`, 'error');
            }
        }
        
    } catch (error) {
        console.error('Error updating inventory from exports:', error);
        throw error; // Ném lỗi để hàm saveCurrentReport bắt
    }
}
// FIX: Sửa hàm increaseExport - xử lý trường hợp exports không tồn tại
async function increaseExport(productId) {
    if (!currentReport) return;
    
    try {
        // Đảm bảo exports tồn tại
        if (!currentReport.exports) {
            currentReport.exports = [];
        }
        
        // Lấy thông tin sản phẩm từ kho
        const product = await dbGet('inventory', productId);
        if (!product) {
            showMessage('❌ Sản phẩm không tồn tại trong kho', 'error');
            return;
        }

        let exportItem = currentReport.exports.find(exp => exp.productId === productId);
        
        if (exportItem) {
            // Kiểm tra không vượt quá tồn kho
            if (exportItem.quantity >= product.currentQuantity) {
                showMessage(`❌ Không đủ tồn kho. Tồn kho: ${product.currentQuantity}`, 'error');
                return;
            }
            exportItem.quantity += 1;
        } else {
            // Tạo mới với số lượng 1
            exportItem = {
                productId: productId,
                name: product.name,
                quantity: 1,
                exportedAt: new Date().toISOString()
            };
            currentReport.exports.push(exportItem);
        }
        
        await dbUpdate('reports', currentReport.reportId, {
            exports: currentReport.exports,
            updatedAt: new Date().toISOString()
        });
        
        // FIX: Thêm hiệu ứng visual feedback
        const row = document.querySelector(`[data-product-id="${productId}"]`);
        if (row) {
            row.classList.add('clicked');
            setTimeout(() => row.classList.remove('clicked'), 300);
        }
        
        showMessage(`📦 Đã thêm ${product.name} vào xuất kho`, 'success');
        loadReportsTab();
        
    } catch (error) {
        console.error('Error increasing export:', error);
        showMessage('❌ Lỗi khi thêm xuất kho', 'error');
    }
}

// FIX: Sửa hàm decreaseExport - cho phép giảm xuất kho sau khi lưu
async function decreaseExport(productId) {
    if (!currentReport) return;
    
    try {
        const exportItem = currentReport.exports.find(exp => exp.productId === productId);
        
        if (exportItem) {
            if (exportItem.quantity > 1) {
                exportItem.quantity -= 1;
            } else {
                // Xóa khỏi báo cáo nếu số lượng = 0
                currentReport.exports = currentReport.exports.filter(exp => exp.productId !== productId);
            }
            
            await dbUpdate('reports', currentReport.reportId, {
                exports: currentReport.exports,
                updatedAt: new Date().toISOString()
            });
            
            showMessage(`📦 Đã giảm ${exportItem.name} trong xuất kho`, 'success');
            loadReportsTab();
        }
        
    } catch (error) {
        console.error('Error decreasing export:', error);
        showMessage('❌ Lỗi khi giảm xuất kho', 'error');
    }
}
// FIX: Thêm hàm addFromInventory - click vào sản phẩm trong kho để thêm xuất kho
async function addFromInventory(productId) {
    if (!currentReport) return;
    
    try {
        // Lấy thông tin sản phẩm từ kho
        const product = await dbGet('inventory', productId);
        if (!product) {
            showMessage('❌ Sản phẩm không tồn tại trong kho', 'error');
            return;
        }

        // Kiểm tra xem đã có trong xuất kho chưa
        let exportItem = currentReport.exports.find(exp => exp.productId === productId);
        
        if (exportItem) {
            // Nếu đã có thì tăng số lượng
            if (exportItem.quantity >= product.currentQuantity) {
                showMessage(`❌ Không đủ tồn kho. Tồn kho: ${product.currentQuantity}`, 'error');
                return;
            }
            exportItem.quantity += 1;
        } else {
            // Nếu chưa có thì tạo mới với số lượng 1
            exportItem = {
                productId: productId,
                name: product.name,
                quantity: 1,
                exportedAt: new Date().toISOString()
            };
            currentReport.exports.push(exportItem);
        }
        
        await dbUpdate('reports', currentReport.reportId, {
            exports: currentReport.exports,
            updatedAt: new Date().toISOString()
        });
        
        showMessage(`📦 Đã thêm ${product.name} vào xuất kho`, 'success');
        loadReportsTab();
        
    } catch (error) {
        console.error('Error adding from inventory:', error);
        showMessage('❌ Lỗi khi thêm xuất kho', 'error');
    }
}
// FIX: Sửa hàm renderReportsHistory
async function renderReportsHistory() {
    try {
        const reports = await dbGetAll('reports');
        const sortedReports = reports.sort((a, b) => b.date.localeCompare(a.date));
        
        // Nhân viên chỉ xem 3 báo cáo gần nhất
        const displayReports = isAdmin() ? sortedReports.slice(0, 10) : sortedReports.slice(0, 3);
        
        let historyHTML = '';
        
        for (const report of displayReports) {
            const totalExpenses = calculateTotalExpenses(report);
            const totalTransfers = calculateTotalTransfers(report);
            const actualReceived = calculateActualReceived(report);
            const totalExports = calculateTotalExports(report);
            
            historyHTML += `
                <div class="history-day">
                    <div class="history-header">
                        <strong>${formatDateDisplay(report.date)}</strong>
                        <div class="history-actions">
                            ${isAdmin() ? `
                                <button class="btn btn-sm btn-outline" data-action="edit-report" data-date="${report.date}">Sửa</button>
                                <button class="btn btn-sm btn-danger" data-action="delete-report" data-date="${report.date}">Xóa</button>
                            ` : report.date === formatDate() ? `
                                <button class="btn btn-sm btn-outline" data-action="edit-report" data-date="${report.date}">Sửa</button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="history-details">
                        <div class="history-row">
                            <span>Doanh thu:</span>
                            <span>${formatCurrency(report.revenue)}</span>
                        </div>
                        <div class="history-row">
                            <span>Chi phí:</span>
                            <span>${formatCurrency(totalExpenses)}</span>
                        </div>
                        <div class="history-row">
                            <span>Thực nhận:</span>
                            <span class="history-actual">${formatCurrency(actualReceived)}</span>
                        </div>
                        ${totalExports > 0 ? `
                            <div class="history-exports">
                                <strong>Xuất kho: ${totalExports} sản phẩm</strong>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        return `<div class="reports-history-list">${historyHTML}</div>`;
        
    } catch (error) {
        return '<div class="empty-state"><p>Lỗi tải lịch sử</p></div>';
    }
}
// FIX: Hàm render chi tiết xuất kho trong lịch sử
function renderExportsHistory(exports) {
    if (!exports || exports.length === 0) return '';
    
    return exports.map(exp => `
        <div class="export-history-item">
            <span>${exp.name}</span>
            <span class="export-qty">${exp.quantity}</span>
        </div>
    `).join('');
}


async function renderOperationsHistory() {
    try {
        const operations = await dbGetAll('operations');
        const sortedOps = operations.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);
        
        if (sortedOps.length === 0) return '<p class="empty-state">Chưa có giao dịch nào</p>';
        
        return `
            <div class="operations-history">
                ${sortedOps.map(op => `
                    <div class="operation-history-item">
                        <span class="op-date">${formatDateDisplay(op.date)}</span>
                        <span class="op-name">${op.type === 'material' ? '🛒' : '🔧'} ${op.name}</span>
                        <span class="op-amount">${formatCurrency(op.amount)}</span>
                        ${op.quantity ? `<span class="op-quantity">${op.quantity} ${op.unit}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        return '<p class="empty-state">Lỗi tải lịch sử</p>';
    }
}

// FIX: Thêm toggle function
function toggleOperationsHistory() {
    showOperationsHistory = !showOperationsHistory;
    loadReportsTab();
}

// FIX: Trong reports.js - đổi tên hàm để tránh trùng
function toggleReportsHistoryTab() {
    showReportsHistory = !showReportsHistory;
    loadReportsTab();
}
function clearDeviceId() {
    localStorage.removeItem('cafe_device_id');
    localStorage.removeItem('currentUser');
    showMessage('✅ Đã xóa ID thiết bị', 'success');
    setTimeout(() => location.href = 'login.html', 1000);
}
async function clearAllData() {
    if (!confirm('❌ XÓA TOÀN BỘ DỮ LIỆU?\n\nThis cannot be undone!')) return;
    
    try {
        const stores = ['employees', 'reports', 'inventory', 'inventoryHistory', 'operations', 'attendance', 'settings'];
        for (const storeName of stores) {
            const allData = await dbGetAll(storeName);
            for (const item of allData) {
                await dbDelete(storeName, storeName === 'reports' ? item.reportId : 
                                            storeName === 'employees' ? item.employeeId :
                                            storeName === 'inventory' ? item.productId :
                                            storeName === 'settings' ? item.key : item[Object.keys(item)[0]]);
            }
        }
        showMessage('✅ Đã xóa toàn bộ dữ liệu', 'success');
        setTimeout(() => location.reload(), 1000);
    } catch (error) {
        showMessage('❌ Lỗi khi xóa dữ liệu', 'error');
    }
}


// FIX: Thêm hàm debug event listeners
function debugOperationsClick() {
    console.log('🐛 DEBUG OPERATIONS CLICK...');
    
    const operationElements = document.querySelectorAll('[data-action="show-operations"]');
    console.log('Found operation elements:', operationElements.length);
    
    operationElements.forEach((el, index) => {
        console.log(`Element ${index}:`, el);
        console.log(`  - dataset:`, el.dataset);
        console.log(`  - innerHTML:`, el.innerHTML);
    });
}

// Gọi debug sau khi render
// setTimeout(debugOperationsClick, 1000);

// FIX: Sửa hàm addSampleExports - tạo xuất kho từ danh sách kho thực tế
async function addSampleExports() {
    if (!currentReport) return;
    
    try {
        // Lấy danh sách sản phẩm từ kho
        const inventory = await dbGetAll('inventory');
        
        if (inventory.length === 0) {
            showMessage('❌ Không có sản phẩm nào trong kho', 'error');
            return;
        }
        
        // Tạo xuất kho mẫu từ 2 sản phẩm đầu tiên
        currentReport.exports = inventory.slice(0, 2).map(product => ({
            productId: product.productId,
            name: product.name,
            quantity: 1, // Mặc định 1
            exportedAt: new Date().toISOString()
        }));
        
        await dbUpdate('reports', currentReport.reportId, {
            exports: currentReport.exports,
            updatedAt: new Date().toISOString()
        });
        
        showMessage('✅ Đã thêm xuất kho mẫu', 'success');
        loadReportsTab();
        
    } catch (error) {
        console.error('Error adding sample exports:', error);
        showMessage('❌ Lỗi khi thêm dữ liệu mẫu', 'error');
    }
}



// FIX: Thêm hàm debug để test event listeners
function testEventListeners() {
    console.log('=== TESTING EVENT LISTENERS ===');
    
    // Test tất cả các elements có data-action
    const allActionElements = document.querySelectorAll('[data-action]');
    console.log('Total elements with data-action:', allActionElements.length);
    
    allActionElements.forEach((el, index) => {
        console.log(`Element ${index}:`, el, 'Action:', el.dataset.action);
    });
    
    // Test cụ thể các elements quan trọng
    const testElements = [
        '[data-action="show-expenses"]',
        '[data-action="show-transfers"]', 
        '[data-action="increase-export"]',
        '[data-action="decrease-export"]',
        '[data-action="show-operations"]',
        '[data-action="show-reports-history"]',
        '[data-action="show-operations-history"]'
    ];
    
    testElements.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`Elements for ${selector}:`, elements.length);
    });
}

// FIX: Gọi test sau khi render
// setTimeout(testEventListeners, 1000);

// Calculate totals
function calculateActualReceived(report) {
    const totalExpenses = calculateTotalExpenses(report);
    const totalTransfers = calculateTotalTransfers(report);
    return report.openingBalance + report.revenue - totalExpenses - totalTransfers - report.closingBalance;
}


// FIX: Sửa hàm calculateTotalTransfers
function calculateTotalTransfers(report) {
    if (!report.transfers || !Array.isArray(report.transfers)) {
        return 0;
    }
    return report.transfers.reduce((total, transfer) => total + (transfer.amount || 0), 0);
}

// FIX: Sửa hàm calculateTotalExports
function calculateTotalExports(report) {
    if (!report.exports || !Array.isArray(report.exports)) {
        return 0;
    }
    return report.exports.reduce((total, exportItem) => total + (exportItem.quantity || 0), 0);
}

async function calculateOperationsTotal(type, date) {
    try {
        const operations = await dbGetAll('operations');
        return operations
            .filter(op => op.type === type && op.date === date)
            .reduce((total, op) => total + (op.amount || 0), 0);
    } catch (error) {
        console.error('Error calculating operations total:', error);
        return 0;
    }
}




// FIX: Sửa hàm showExpensesPopup - thêm dropdown autocomplete
async function showExpensesPopup() {
    if (!currentReport) return;
    
    // Lấy danh sách chi phí từ lịch sử
    const allReports = await dbGetAll('reports');
    const expenseHistory = new Set();
    
    allReports.forEach(report => {
        if (report.expenses && Array.isArray(report.expenses)) {
            report.expenses.forEach(expense => {
                if (expense.name && expense.name.trim()) {
                    expenseHistory.add(expense.name.trim());
                }
            });
        }
    });
    
    const expenseSuggestions = Array.from(expenseHistory).slice(0, 10); // Giới hạn 10 đề xuất
    
    const popupHTML = `
        <div class="popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>💰 Quản lý Chi phí - ${formatDateDisplay(currentReport.date)}</h3>
            
            <div class="add-expense-form">
                <div class="expense-input-container">
                    <input type="text" id="expenseName" placeholder="Tìm hoặc nhập tên chi phí" 
                           list="expenseSuggestions" autocomplete="off">
                    <datalist id="expenseSuggestions">
                        ${expenseSuggestions.map(expense => `
                            <option value="${expense}">${expense}</option>
                        `).join('')}
                    </datalist>
                </div>
                <input type="number" id="expenseAmount" placeholder="Số tiền" min="0">
                <button class="btn btn-primary" data-action="add-expense">Thêm</button>
            </div>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Tên chi phí</th>
                        <th>Số tiền</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody id="expensesList">
                    ${currentReport.expenses.map(expense => `
                        <tr>
                            <td>${expense.name}</td>
                            <td>${formatCurrency(expense.amount)}</td>
                            <td>
                                <button class="btn btn-danger btn-sm" 
                                        data-action="delete-expense" 
                                        data-id="${expense.expenseId}">Xóa</button>
                            </td>
                        </tr>
                    `).join('')}
                    ${currentReport.expenses.length === 0 ? `
                        <tr>
                            <td colspan="3" style="text-align: center; color: #666;">Chưa có chi phí nào</td>
                        </tr>
                    ` : ''}
                </tbody>
            </table>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
    setupExpensesEventListeners();
}

function setupExpensesEventListeners() {
    document.removeEventListener('click', handleExpensesClick);
    document.addEventListener('click', handleExpensesClick);
}

function handleExpensesClick(e) {
    if (e.target.matches('[data-action="add-expense"]')) {
        addNewExpense();
    } else if (e.target.matches('[data-action="delete-expense"]')) {
        deleteExpense(e.target.dataset.id);
    }
}

async function addNewExpense() {
    const nameInput = document.getElementById('expenseName');
    const amountInput = document.getElementById('expenseAmount');
    
    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    
    if (!name) {
        showMessage('Vui lòng nhập tên chi phí', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showMessage('Vui lòng nhập số tiền hợp lệ', 'error');
        return;
    }
    
    try {
        const newExpense = {
            expenseId: 'exp_' + Date.now(),
            name: name,
            amount: amount,
            createdAt: new Date().toISOString()
        };
        
        currentReport.expenses.push(newExpense);
        await dbUpdate('reports', currentReport.reportId, { 
            expenses: currentReport.expenses,
            updatedAt: new Date().toISOString()
        });
        
        nameInput.value = '';
        amountInput.value = '';
        
        showMessage('Đã thêm chi phí thành công', 'success');
        showExpensesPopup();
        loadReportsTab();
        
    } catch (error) {
        console.error('Error adding expense:', error);
        showMessage('Lỗi khi thêm chi phí', 'error');
    }
}

async function deleteExpense(expenseId) {
    try {
        currentReport.expenses = currentReport.expenses.filter(exp => exp.expenseId !== expenseId);
        await dbUpdate('reports', currentReport.reportId, { 
            expenses: currentReport.expenses,
            updatedAt: new Date().toISOString()
        });
        
        showMessage('Đã xóa chi phí', 'success');
        showExpensesPopup();
        loadReportsTab();
        
    } catch (error) {
        console.error('Error deleting expense:', error);
        showMessage('Lỗi khi xóa chi phí', 'error');
    }
}

// FIX: Sửa hàm showTransfersPopup - cho phép 0đ và tự động nội dung
async function showTransfersPopup() {
    if (!currentReport) return;
    
    // Lấy danh sách nội dung từ lịch sử
    const allReports = await dbGetAll('reports');
    const transferHistory = new Set();
    
    allReports.forEach(report => {
        if (report.transfers && Array.isArray(report.transfers)) {
            report.transfers.forEach(transfer => {
                if (transfer.content && transfer.content.trim()) {
                    transferHistory.add(transfer.content.trim());
                }
            });
        }
    });
    
    const transferSuggestions = Array.from(transferHistory).slice(0, 10);
    
    const popupHTML = `
        <div class="popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>🏦 Quản lý Chuyển khoản - ${formatDateDisplay(currentReport.date)}</h3>
            
            <div class="add-transfer-form">
                <div class="transfer-input-container">
                    <input type="text" id="transferContent" placeholder="Nội dung chuyển khoản" 
                           list="transferSuggestions" autocomplete="off">
                    <datalist id="transferSuggestions">
                        ${transferSuggestions.map(content => `
                            <option value="${content}">${content}</option>
                        `).join('')}
                    </datalist>
                </div>
                <input type="number" id="transferAmount" placeholder="Số tiền" min="0">
                <button class="btn btn-primary" data-action="add-transfer">Thêm</button>
            </div>
            
            <div class="transfer-note">
                <small>💡 Có thể nhập số tiền 0đ. Nếu không nhập nội dung sẽ tự động tạo.</small>
            </div>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nội dung</th>
                        <th>Số tiền</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody id="transfersList">
                    ${currentReport.transfers.map(transfer => `
                        <tr>
                            <td>${transfer.content || 'Không có nội dung'}</td>
                            <td>${formatCurrency(transfer.amount)}</td>
                            <td>
                                <button class="btn btn-danger btn-sm" 
                                        data-action="delete-transfer" 
                                        data-id="${transfer.transferId}">Xóa</button>
                            </td>
                        </tr>
                    `).join('')}
                    ${currentReport.transfers.length === 0 ? `
                        <tr>
                            <td colspan="3" style="text-align: center; color: #666;">Chưa có chuyển khoản nào</td>
                        </tr>
                    ` : ''}
                </tbody>
            </table>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
    setupTransfersEventListeners();
}

// FIX: Sửa hàm addNewTransfer - cho phép 0đ và tự động nội dung
async function addNewTransfer() {
    const contentInput = document.getElementById('transferContent');
    const amountInput = document.getElementById('transferAmount');
    
    let content = contentInput.value.trim();
    const amount = parseFloat(amountInput.value) || 0; // Cho phép 0đ
    
    // Tự động tạo nội dung nếu để trống
    if (!content && amount > 0) {
        content = `Chuyển khoản ${formatCurrency(amount)}`;
    } else if (!content) {
        content = 'Chuyển khoản'; // Mặc định cho 0đ
    }
    
    try {
        const newTransfer = {
            transferId: 'trf_' + Date.now(),
            content: content,
            amount: amount,
            createdAt: new Date().toISOString()
        };
        
        currentReport.transfers.push(newTransfer);
        await dbUpdate('reports', currentReport.reportId, { 
            transfers: currentReport.transfers,
            updatedAt: new Date().toISOString()
        });
        
        contentInput.value = '';
        amountInput.value = '';
        
        showMessage('Đã thêm chuyển khoản thành công', 'success');
        showTransfersPopup();
        loadReportsTab();
        
    } catch (error) {
        console.error('Error adding transfer:', error);
        showMessage('Lỗi khi thêm chuyển khoản', 'error');
    }
}

function setupTransfersEventListeners() {
    document.removeEventListener('click', handleTransfersClick);
    document.addEventListener('click', handleTransfersClick);
}

function handleTransfersClick(e) {
    if (e.target.matches('[data-action="add-transfer"]')) {
        addNewTransfer();
    } else if (e.target.matches('[data-action="delete-transfer"]')) {
        deleteTransfer(e.target.dataset.id);
    }
}


async function deleteTransfer(transferId) {
    try {
        currentReport.transfers = currentReport.transfers.filter(trf => trf.transferId !== transferId);
        await dbUpdate('reports', currentReport.reportId, { 
            transfers: currentReport.transfers,
            updatedAt: new Date().toISOString()
        });
        
        showMessage('Đã xóa chuyển khoản', 'success');
        showTransfersPopup();
        loadReportsTab();
        
    } catch (error) {
        console.error('Error deleting transfer:', error);
        showMessage('Lỗi khi xóa chuyển khoản', 'error');
    }
}

// Operations popup
async function showOperationsPopup() {
    if (!isAdmin()) {
        showMessage('Chỉ quản trị viên được thao tác', 'error');
        return;
    }
    
    const popupHTML = `
        <div class="popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>🔧 Mua sắm vận hành</h3>
            
            <div class="popup-tabs">
                <button class="popup-tab-btn active" data-tab="material">Nguyên liệu </button>
                <button class="popup-tab-btn" data-tab="service">Dịch vụ </button>
            </div>
            
            <div id="materialTab" class="popup-tab-content active">
                <div class="form-group">
                    <label>Tên nguyên liệu:</label>
                    <input type="text" id="materialName" placeholder="Tên nguyên liệu">
                </div>
                <div class="form-group">
                    <label>Đơn vị tính:</label>
                    <input type="text" id="materialUnit" placeholder="VD: kg, hộp">
                </div>
                <div class="form-group">
                    <label>Số lượng:</label>
                    <input type="number" id="materialQuantity" placeholder="Số lượng">
                </div>
                <div class="form-group">
                    <label>Thành tiền:</label>
                    <input type="number" id="materialAmount" placeholder="Thành tiền">
                </div>
                <button class="btn btn-primary" data-action="save-material" style="width: 100%;">
                    Lưu - Cập nhật kho
                </button>
            </div>
            
            <div id="serviceTab" class="popup-tab-content">
                <div class="form-group">
                    <label>Tên dịch vụ:</label>
                    <input type="text" id="serviceName" placeholder="Tên dịch vụ">
                </div>
                <div class="form-group">
                    <label>Số tiền:</label>
                    <input type="number" id="serviceAmount" placeholder="Số tiền">
                </div>
                <button class="btn btn-primary" data-action="save-service" style="width: 100%;">
                    Lưu
                </button>
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
    setupOperationsEventListeners();
}

function setupOperationsEventListeners() {
    // Tab switching
    document.querySelectorAll('.popup-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.popup-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.popup-tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(this.dataset.tab + 'Tab').classList.add('active');
        });
    });
    
    // Save actions
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="save-material"]')) {
            saveMaterialOperation();
        } else if (e.target.matches('[data-action="save-service"]')) {
            saveServiceOperation();
        }
    });
}

async function saveMaterialOperation() {
    const name = document.getElementById('materialName').value.trim();
    const unit = document.getElementById('materialUnit').value.trim();
    const quantity = parseFloat(document.getElementById('materialQuantity').value);
    const amount = parseFloat(document.getElementById('materialAmount').value);
    
    if (!name || !unit || !quantity || !amount) {
        showMessage('Vui lòng nhập đầy đủ thông tin', 'error');
        return;
    }
    
    try {
        const operation = {
            type: 'material',
            name: name,
            unit: unit,
            quantity: quantity,
            amount: amount,
            date: currentReportDate,
            createdBy: getCurrentUser().employeeId,
            createdAt: new Date().toISOString()
        };
        
        await dbAdd('operations', operation);
        
        // Update inventory
        await updateInventoryForMaterial(name, unit, quantity, amount);
        
        showMessage('Đã lưu mua nguyên liệu thành công', 'success');
        closePopup();
        loadReportsTab();
        
    } catch (error) {
        console.error('Error saving material:', error);
        showMessage('Lỗi khi lưu mua nguyên liệu', 'error');
    }
}

async function saveServiceOperation() {
    const name = document.getElementById('serviceName').value.trim();
    const amount = parseFloat(document.getElementById('serviceAmount').value);
    
    if (!name || !amount) {
        showMessage('Vui lòng nhập đầy đủ thông tin', 'error');
        return;
    }
    
    try {
        const operation = {
            type: 'service',
            name: name,
            amount: amount,
            date: currentReportDate,
            createdBy: getCurrentUser().employeeId,
            createdAt: new Date().toISOString()
        };
        
        await dbAdd('operations', operation);
        
        showMessage('Đã lưu mua dịch vụ thành công', 'success');
        closePopup();
        loadReportsTab();
        
    } catch (error) {
        console.error('Error saving service:', error);
        showMessage('Lỗi khi lưu mua dịch vụ', 'error');
    }
}

async function updateInventoryForMaterial(name, unit, quantity, amount) {
    try {
        // Find existing product or create new
        const products = await dbGetAll('inventory');
        let product = products.find(p => p.name === name && p.unit === unit);
        
        if (product) {
            // Update existing product
            const newQuantity = product.currentQuantity + quantity;
            const newTotalValue = product.totalValue + amount;
            const newAveragePrice = newTotalValue / newQuantity;
            
            await dbUpdate('inventory', product.productId, {
                currentQuantity: newQuantity,
                totalValue: newTotalValue,
                averagePrice: newAveragePrice,
                updatedAt: new Date().toISOString()
            });
        } else {
            // Create new product
            const productId = 'SP' + Date.now().toString().slice(-4);
            await dbAdd('inventory', {
                productId: productId,
                name: name,
                unit: unit,
                currentQuantity: quantity,
                minStock: 5,
                averagePrice: amount / quantity,
                totalValue: amount,
                createdBy: getCurrentUser().employeeId,
                createdAt: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error updating inventory:', error);
    }
}

// History popups
async function showReportsHistoryPopup() {
    try {
        const reports = await dbGetAll('reports');
        const sortedReports = reports.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
        
        const popupHTML = `
            <div class="popup">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>📜 Lịch sử báo cáo hàng ngày</h3>
                
                <div class="history-list">
                    ${sortedReports.map(report => {
                        const totalExpenses = calculateTotalExpenses(report);
                        const totalTransfers = calculateTotalTransfers(report);
                        const actualReceived = calculateActualReceived(report);
                        
                        return `
                            <div class="history-item">
                                <div class="history-date">${formatDateDisplay(report.date)}</div>
                                <div class="history-details">
                                    <span>DT: ${formatCurrency(report.revenue)}</span>
                                    <span>CP: ${formatCurrency(totalExpenses)}</span>
                                    <span>TN: ${formatCurrency(actualReceived)}</span>
                                </div>
                                ${isAdmin() ? `
                                    <div class="history-actions">
                                        <button class="btn btn-sm btn-secondary" data-action="edit-report" data-date="${report.date}">Sửa</button>
                                        <button class="btn btn-sm btn-danger" data-action="delete-report" data-date="${report.date}">Xóa</button>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="popup-actions">
                    <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        
    } catch (error) {
        console.error('Error loading reports history:', error);
        showMessage('Lỗi khi tải lịch sử báo cáo', 'error');
    }
}

async function showOperationsHistoryPopup() {
    if (!isAdmin()) {
        showMessage('Chỉ quản trị viên được xem lịch sử mua sắm', 'error');
        return;
    }
    
    try {
        const operations = await dbGetAll('operations');
        const sortedOperations = operations.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
        
        const popupHTML = `
            <div class="popup">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>📦 Lịch sử mua sắm vận hành</h3>
                
                <div class="history-list">
                    ${sortedOperations.map(op => `
                        <div class="history-item">
                            <div class="history-date">${formatDateDisplay(op.date)}</div>
                            <div class="history-details">
                                <span>${op.type === 'material' ? '🛒' : '🔧'} ${op.name}</span>
                                <span>${formatCurrency(op.amount)}</span>
                            </div>
                            ${op.quantity ? `<div class="history-quantity">${op.quantity} ${op.unit}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div class="popup-actions">
                    <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        
    } catch (error) {
        console.error('Error loading operations history:', error);
        showMessage('Lỗi khi tải lịch sử mua sắm', 'error');
    }
}

// FIX: Sửa hàm calculateTotalExports - đảm bảo tính đúng
function calculateTotalExports(report) {
    console.log('🐛 calculateTotalExports - report:', report);
    
    if (!report || !report.exports || !Array.isArray(report.exports)) {
        console.log('❌ No exports data');
        return 0;
    }
    
    const total = report.exports.reduce((sum, exportItem) => {
        const quantity = exportItem.quantity || 0;
        console.log(`   ${exportItem.name}: ${quantity}`);
        return sum + quantity;
    }, 0);
    
    console.log('✅ Total exports:', total);
    return total;
}

// FIX: Sửa hàm createDailyReportContent - thêm lịch sử xuất kho
async function createDailyReportContent(reportData) {
    console.log('🐛 createDailyReportContent - reportData:', reportData);
    
    const actualReceived = calculateActualReceived(reportData);
    const totalExpenses = calculateTotalExpenses(reportData);
    const totalTransfers = calculateTotalTransfers(reportData);
    const totalExports = calculateTotalExports(reportData);
    
    // Lấy lịch sử xuất kho thực tế
    const exportsHistory = await getExportsHistoryForDate(reportData.date);
    const totalHistoricalExports = exportsHistory.reduce((sum, record) => sum + record.quantity, 0);
    
    let content = `📊 BÁO CÁO NGÀY ${formatDateDisplay(reportData.date)}\n\n`;
    
    content += `💰 Số dư đầu kỳ: ${formatCurrency(reportData.openingBalance)}\n`;
    content += `📈 Doanh thu: ${formatCurrency(reportData.revenue)}\n`;
    content += `💸 Chi phí: ${formatCurrency(totalExpenses)}\n`;
    content += `🏦 Chuyển khoản: ${formatCurrency(totalTransfers)}\n`;
    content += `💰 Số dư cuối kỳ: ${formatCurrency(reportData.closingBalance)}\n`;
    content += `🎯 Thực nhận: ${formatCurrency(actualReceived)}\n\n`;

    // Chi tiết chi phí
    if (reportData.expenses && reportData.expenses.length > 0) {
        content += `📋 CHI TIẾT CHI PHÍ:\n`;
        reportData.expenses.forEach(expense => {
            content += `   • ${expense.name}: ${formatCurrency(expense.amount)}\n`;
        });
        content += `\n`;
    }

    // Chi tiết chuyển khoản
    if (reportData.transfers && reportData.transfers.length > 0) {
        content += `🏦 CHI TIẾT CHUYỂN KHOẢN:\n`;
        reportData.transfers.forEach(transfer => {
            const contentText = transfer.content || 'Chuyển khoản';
            content += `   • ${contentText}: ${formatCurrency(transfer.amount)}\n`;
        });
        content += `\n`;
    }

    // XUẤT KHO - HIỆN TẠI (chưa lưu)
    console.log('📦 Processing current exports...');
    
    if (reportData.exports && reportData.exports.length > 0) {
        const validExports = reportData.exports.filter(exp => exp.quantity > 0);
        if (validExports.length > 0) {
            content += `📦 XUẤT KHO HIỆN TẠI (${totalExports} sản phẩm):\n`;
            
            const inventory = await dbGetAll('inventory');
            
            for (const exportItem of validExports) {
                console.log('   Processing export item:', exportItem);
                
                const product = inventory.find(p => p.productId === exportItem.productId);
                const productName = product ? product.name : exportItem.name;
                const productUnit = product ? product.unit : '';
                
                content += `   • ${productName}: ${exportItem.quantity} ${productUnit}\n`;
                console.log(`   ✅ Added: ${productName} - ${exportItem.quantity} ${productUnit}`);
            }
            content += `\n`;
        }
    }

    // XUẤT KHO - LỊCH SỬ (đã lưu)
    console.log('📚 Processing exports history...');
    
    if (exportsHistory.length > 0) {
        content += `📚 XUẤT KHO ĐÃ LƯU (${totalHistoricalExports} sản phẩm):\n`;
        
        // Nhóm theo sản phẩm để tổng hợp
        const productExports = {};
        exportsHistory.forEach(record => {
            const productName = record.product?.name || 'Unknown';
            if (!productExports[productName]) {
                productExports[productName] = {
                    quantity: 0,
                    unit: record.product?.unit || ''
                };
            }
            productExports[productName].quantity += record.quantity;
        });
        
        // Hiển thị tổng hợp
        Object.entries(productExports).forEach(([productName, data]) => {
            content += `   • ${productName}: ${data.quantity} ${data.unit}\n`;
        });
        content += `\n`;
    }

    // TỔNG KẾT XUẤT KHO
    const totalAllExports = totalExports + totalHistoricalExports;
    if (totalAllExports > 0) {
        content += `📊 TỔNG XUẤT KHO: ${totalAllExports} sản phẩm\n\n`;
    } else {
        content += `📦 XUẤT KHO: 0 sản phẩm\n\n`;
    }

    content += `-- Quản lý Cafe --`;

    console.log('📄 FINAL REPORT CONTENT:');
    console.log(content);
    
    return content;
}
function calculateTotalExpenses(report) {
    if (!report.expenses || !Array.isArray(report.expenses)) {
        return 0;
    }
    return report.expenses.reduce((total, expense) => total + (expense.amount || 0), 0);
}
// FIX: Hàm lấy dữ liệu xuất hàng trực tiếp từ UI
async function getExportsFromUI() {
    console.log('📦 Lấy dữ liệu xuất hàng từ UI...');
    
    const exportRows = document.querySelectorAll('.export-row');
    console.log('Tìm thấy số dòng xuất kho:', exportRows.length);
    
    let totalQuantity = 0;
    const items = [];
    
    for (const row of exportRows) {
        const productId = row.dataset.productId;
        const quantityElement = row.querySelector('.export-quantity');
        const nameElement = row.querySelector('.product-name');
        const unitElement = row.querySelector('.product-unit');
        
        if (quantityElement && nameElement) {
            const quantity = parseInt(quantityElement.textContent) || 0;
            const name = nameElement.textContent.trim();
            const unit = unitElement ? unitElement.textContent.trim() : '';
            
            console.log(`   Sản phẩm: ${name}, Số lượng: ${quantity} ${unit}`);
            
            if (quantity > 0) {
                totalQuantity += quantity;
                items.push({
                    productId,
                    name,
                    quantity,
                    unit
                });
            }
        }
    }
    
    console.log('📊 Tổng xuất kho từ UI:', totalQuantity, 'sản phẩm');
    console.log('📦 Chi tiết items:', items);
    
    return {
        totalQuantity,
        items
    };
}

// FIX: Sửa hàm copyReportToClipboard - không cần load từ DB
async function copyReportToClipboard() {
    if (!currentReport) return;
    
    try {
        console.log('📋 Bắt đầu copy báo cáo từ UI...');
        
        const reportContent = await createDailyReportContent(currentReport);
        const success = await zaloIntegration.copyToClipboard(reportContent);
        
        if (success) {
            zaloIntegration.showNotification('📋 Đã copy báo cáo vào clipboard!', 'success');
        } else {
            zaloIntegration.showNotification('❌ Không thể copy báo cáo', 'error');
        }
        
    } catch (error) {
        console.error('Error copying report:', error);
        zaloIntegration.showNotification('❌ Lỗi khi copy báo cáo: ' + error.message, 'error');
    }
}

// FIX: Sửa class ZaloIntegration để dùng hàm trên
class ZaloIntegration {
    constructor() {
        this.zaloDeepLink = 'zalo://';
    }

    /**
     * Tạo nội dung báo cáo ngày
     */
    async createDailyReportContent(reportData) {
        return await createDailyReportContent(reportData);
    }

    /**
     * Copy nội dung vào clipboard
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback cho các trình duyệt cũ
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            }
        } catch (err) {
            console.error('Lỗi copy clipboard:', err);
            return false;
        }
    }

    /**
     * Mở Zalo và gửi tin nhắn
     */
    async sendToZalo(reportData) {
        try {
            // Tạo nội dung báo cáo
            const reportContent = await this.createDailyReportContent(reportData);
            console.log('📋 Report content:', reportContent); // DEBUG
            
            // Copy vào clipboard
            const copySuccess = await this.copyToClipboard(reportContent);
            
            if (!copySuccess) {
                throw new Error('Không thể copy nội dung vào clipboard');
            }

            // Mở Zalo
            this.openZalo();
            
            // Hiển thị thông báo
            this.showNotification('Đã copy báo cáo vào clipboard. Mở Zalo và paste để gửi!', 'success');
            
            return true;
        } catch (error) {
            console.error('Lỗi gửi Zalo:', error);
            this.showNotification('Lỗi khi gửi báo cáo: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * Mở ứng dụng Zalo
     */
    openZalo() {
        // Thử mở ứng dụng Zalo
        window.location.href = this.zaloDeepLink;
        
        // Fallback: sau 2 giây, mở web Zalo nếu ứng dụng không mở được
        setTimeout(() => {
            window.open('https://zalo.me', '_blank');
        }, 2000);
    }

    /**
     * Hiển thị thông báo
     */
    showNotification(message, type = 'info') {
        // Tạo thông báo tạm thời
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Tự động xóa sau 5 giây
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        // Cho phép đóng thủ công
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }
}

// Tạo instance global
const zaloIntegration = new ZaloIntegration();

// FIX: Sửa hàm shareReportToZalo để dùng class mới
async function shareReportToZalo() {
    if (!currentReport) return;
    
    try {
        const success = await zaloIntegration.sendToZalo(currentReport);
        
        if (success) {
            console.log('✅ Gửi Zalo thành công');
        }
        
    } catch (error) {
        console.error('Error sharing to Zalo:', error);
    }
}

// FIX: Sửa hàm copyReportToClipboard - đảm bảo lấy dữ liệu mới nhất
async function copyReportToClipboard() {
    if (!currentReport) return;
    
    try {
        console.log('📋 Bắt đầu copy báo cáo...');
        
        // ĐẢM BẢO: Load lại dữ liệu mới nhất từ database
        const freshReport = await dbGet('reports', currentReportDate);
        console.log('Fresh report from DB:', freshReport);
        
        if (freshReport) {
            currentReport = freshReport; // Cập nhật currentReport với dữ liệu mới
        }
        
        const reportContent = await createDailyReportContent(currentReport);
        const success = await zaloIntegration.copyToClipboard(reportContent);
        
        if (success) {
            zaloIntegration.showNotification('📋 Đã copy báo cáo vào clipboard!', 'success');
        } else {
            zaloIntegration.showNotification('❌ Không thể copy báo cáo', 'error');
        }
        
    } catch (error) {
        console.error('Error copying report:', error);
        zaloIntegration.showNotification('❌ Lỗi khi copy báo cáo: ' + error.message, 'error');
    }
}