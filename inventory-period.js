// inventory-period.js
// Xử lý bộ lọc kỳ và hiển thị lịch sử mua hàng theo kỳ

let currentPeriodView = 'day'; // 'day' hoặc 'group'
let showMaterialHistory = true;
let showServiceHistory = true;
let currentInventoryPeriod = getCurrentPeriod();
// Thêm biến toàn cục
let isPeriodSectionVisible = false;

// Hàm toggle hiển thị section lịch sử kỳ
function togglePeriodSection() {
    isPeriodSectionVisible = !isPeriodSectionVisible;
    console.log('📊 Toggle period section:', isPeriodSectionVisible);
    loadInventoryTab(); // Reload lại tab để hiển thị
}

// Hàm lấy HTML cho section lịch sử kỳ
async function getPeriodSectionHTML() {
    try {
        const operations = await getOperationsByPeriod(currentInventoryPeriod);
        const materialOps = operations.filter(op => op.type === 'material');
        const serviceOps = operations.filter(op => op.type === 'service');
        
        const materialHTML = await renderPeriodMaterialHistory(materialOps);
        const serviceHTML = await renderPeriodServiceHistory(serviceOps);
        
        return `
            <div class="period-main-section">
                <!-- Header với nút đóng -->
                <div class="period-section-header">
                    <div class="period-title">
                        <h3>📊 Lịch sử Mua sắm - ${formatPeriodDisplay(currentInventoryPeriod)}</h3>
                        <small class="period-range">
                        </small>
                    </div>
                    <div class="period-section-actions">
                        <button class="btn btn-sm btn-outline" onclick="togglePeriodSection()">
                            Ẩn
                        </button>
                    </div>
                </div>
                
                <!-- Bộ lọc hiển thị -->
                <div class="period-filters">
                        <label>📅 Kiểu xem:</label>
                            <button class="btn btn-sm ${currentPeriodView === 'day' ? 'btn-primary' : 'btn-outline'}" 
                                    onclick="changePeriodView('day')">
                                Theo ngày
                            </button>
                            <button class="btn btn-sm ${currentPeriodView === 'group' ? 'btn-primary' : 'btn-outline'}" 
                                    onclick="changePeriodView('group')">
                                Gộp nội dung
                            </button>
                        </div>
                    
                    
                        <label>📋 Hiển thị:</label>
                        <div class="type-toggle">
                            <label class="checkbox-label">
                                <input type="checkbox" ${showMaterialHistory ? 'checked' : ''} 
                                       onchange="toggleMaterialHistory()">
                                🛒 Hàng hóa (${materialOps.length})
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" ${showServiceHistory ? 'checked' : ''} 
                                       onchange="toggleServiceHistory()">
                                📝 Dịch vụ (${serviceOps.length})
                            </label>
                        </div>
                    
                    <div class="period-navigation">
                        <button class="btn btn-sm btn-outline" onclick="changePeriodBy(-1)">
                            ◀ Kỳ trước
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="goToCurrentPeriodView()">
                            Kỳ hiện tại
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="changePeriodBy(1)">
                            Kỳ sau ▶
                        </button>
                    </div>
                </div>
                
                <!-- Tổng hợp -->
                <div class="period-summary">
                    <div class="summary-card">
                        <h4>Tổng chi phí Kỳ</h4>
                        <div class="amount">${formatCurrency(operations.reduce((sum, op) => sum + (op.amount || 0), 0))}</div>
                    </div>
                    <div class="summary-card">
                        <h4>Số giao dịch</h4>
                        <div class="amount">${operations.length}</div>
                    </div>
                    <div class="summary-card">
                        <h4>Hàng hóa</h4>
                        <div class="amount">${materialOps.length}</div>
                    </div>
                    <div class="summary-card">
                        <h4>Dịch vụ</h4>
                        <div class="amount">${serviceOps.length}</div>
                    </div>
                </div>
                
                <!-- Nội dung hiển thị -->
                <div class="period-content">
                    ${showMaterialHistory ? `
                        <h4>🛒 Lịch sử Mua hàng Hóa</h4>
                        ${materialOps.length > 0 ? materialHTML : '<p class="empty-state">Không có mua hàng hóa trong kỳ này</p>'}
                    </div>
                    ` : ''}
                    
                    ${showServiceHistory ? `
                    <div class="period-section-content">
                        <h4>📝 Lịch sử Mua Dịch vụ</h4>
                        ${serviceOps.length > 0 ? serviceHTML : '<p class="empty-state">Không có mua dịch vụ trong kỳ này</p>'}
                    </div>
                    ` : ''}
                    
                    ${!showMaterialHistory && !showServiceHistory ? `
                    <div class="empty-state">
                        <p>📭 Vui lòng chọn loại để hiển thị</p>
                    </div>
                    ` : ''}
                </div>
                
                <!-- Action buttons -->
                <div class="period-action-buttons">
                    <button class="btn btn-info btn-sm" onclick="exportPeriodData()">📥 Xuất dữ liệu</button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ Error getting period section:', error);
        return `
            <div class="period-main-section error">
                <p>❌ Lỗi khi tải dữ liệu kỳ: ${error.message}</p>
                <button class="btn btn-sm btn-secondary" onclick="togglePeriodSection()">
                    Đóng
                </button>
            </div>
        `;
    }
}
// Hàm lấy kỳ hiện tại (20N - 19N+1)
function getCurrentPeriod(date = new Date()) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    if (day >= 20) {
        // Nếu từ 20 trở đi, kỳ là tháng hiện tại
        return {
            month: month,
            year: year,
            startDate: new Date(year, month - 1, 20),
            endDate: new Date(year, month, 19)
        };
    } else {
        // Nếu trước 20, kỳ là tháng trước
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        
        return {
            month: prevMonth,
            year: prevYear,
            startDate: new Date(prevYear, prevMonth - 1, 20),
            endDate: new Date(year, month - 1, 19)
        };
    }
}

// Hàm format kỳ
function formatPeriodDisplay(period) {
    const monthNames = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    return `${monthNames[period.month - 1]}/${period.year}`;
}

// Hàm lấy operations theo kỳ
async function getOperationsByPeriod(period) {
    try {
        const operations = await dbGetAll('operations');
        const startDateStr = formatDate(period.startDate);
        const endDateStr = formatDate(period.endDate);
        
        console.log('📊 Getting operations for period:', {
            start: startDateStr,
            end: endDateStr
        });
        
        return operations.filter(op => {
            const opDate = op.dateKey || (op.date ? op.date.split('T')[0] : '');
            return opDate && opDate >= startDateStr && opDate <= endDateStr;
        });
        
    } catch (error) {
        console.error('❌ Error getting operations by period:', error);
        return [];
    }
}

// Hàm hiển thị lịch sử mua hàng theo kỳ
async function showPeriodOperations() {
    try {
        console.log('🔄 Loading period operations...');
        
        const operations = await getOperationsByPeriod(currentInventoryPeriod);
        const materialOps = operations.filter(op => op.type === 'material');
        const serviceOps = operations.filter(op => op.type === 'service');
        
        const materialHTML = await renderPeriodMaterialHistory(materialOps);
        const serviceHTML = await renderPeriodServiceHistory(serviceOps);
        
        const popupHTML = `
    <div class="popup period-popup">
        <button class="close-popup" data-action="close-popup">×</button>
        
        <div class="popup-header">
            <h2>📊 Lịch sử Mua sắm - ${formatPeriodDisplay(currentInventoryPeriod)}</h2>
            <p class="period-range">
                ${formatDateDisplay(currentInventoryPeriod.startDate)} - ${formatDateDisplay(currentInventoryPeriod.endDate)}
            </p>
        </div>
        
        <!-- BỘ LỌC - CHỈ 2 DÒNG -->
        <div class="period-filters">
            <!-- DÒNG 1: Kiểu xem + Hiển thị -->
            <div class="filter-row-1">
                <!-- Kiểu xem -->
                <div class="view-toggle-compact">
                    <span class="filter-label">📅 Xem:</span>
                    <button class="btn btn-sm ${currentPeriodView === 'day' ? 'btn-primary' : 'btn-outline'}" 
                            onclick="changePeriodView('day')">
                        Theo ngày
                    </button>
                    <button class="btn btn-sm ${currentPeriodView === 'group' ? 'btn-primary' : 'btn-outline'}" 
                            onclick="changePeriodView('group')">
                        Gộp nội dung
                    </button>
                </div>
                
                <!-- Hiển thị -->
                <div class="type-toggle-compact">
                    <span class="filter-label">📋 Hiển thị:</span>
                    <label class="checkbox-label ${showMaterialHistory ? 'active' : ''}">
                        <input type="checkbox" ${showMaterialHistory ? 'checked' : ''} 
                               onchange="toggleMaterialHistory()">
                        🛒 Hàng hóa (${materialOps.length})
                    </label>
                    <label class="checkbox-label ${showServiceHistory ? 'active' : ''}">
                        <input type="checkbox" ${showServiceHistory ? 'checked' : ''} 
                               onchange="toggleServiceHistory()">
                        📝 Dịch vụ (${serviceOps.length})
                    </label>
                </div>
            </div>
            
            <!-- DÒNG 2: Điều hướng kỳ -->
            <div class="filter-row-2">
                <div class="period-navigation-compact">
                    <button class="btn btn-sm btn-outline" onclick="changePeriodBy(-1)">
                        ◀ Kỳ trước
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="goToCurrentPeriodView()">
                        Kỳ hiện tại
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="changePeriodBy(1)">
                        Kỳ sau ▶
                    </button>
                </div>
            </div>
        </div>
                
                <!-- Tổng hợp -->
                <div class="period-summary">
                    <div class="summary-card">
                        <h4>Tổng chi phí Kỳ</h4>
                        <div class="amount">${formatCurrency(operations.reduce((sum, op) => sum + (op.amount || 0), 0))}</div>
                    </div>
                    <div class="summary-card">
                        <h4>Số giao dịch</h4>
                        <div class="amount">${operations.length}</div>
                    </div>
                    <div class="summary-card">
                        <h4>Hàng hóa</h4>
                        <div class="amount">${materialOps.length}</div>
                    </div>
                    <div class="summary-card">
                        <h4>Dịch vụ</h4>
                        <div class="amount">${serviceOps.length}</div>
                    </div>
                </div>
                
                <!-- Nội dung hiển thị -->
                <div class="period-content">
                    ${showMaterialHistory ? `
                    <div class="period-section">
                        <h3>🛒 Lịch sử Mua hàng Hóa</h3>
                        ${materialOps.length > 0 ? materialHTML : '<p class="empty-state">Không có mua hàng hóa trong kỳ này</p>'}
                    </div>
                    ` : ''}
                    
                    ${showServiceHistory ? `
                    <div class="period-section">
                        <h3>📝 Lịch sử Mua Dịch vụ</h3>
                        ${serviceOps.length > 0 ? serviceHTML : '<p class="empty-state">Không có mua dịch vụ trong kỳ này</p>'}
                    </div>
                    ` : ''}
                    
                    ${!showMaterialHistory && !showServiceHistory ? `
                    <div class="empty-state">
                        <p>📭 Vui lòng chọn loại để hiển thị</p>
                    </div>
                    ` : ''}
                </div>
                
                <div class="popup-actions">
                    <button class="btn btn-secondary" onclick="closePopup()">Đóng</button>
                    <button class="btn btn-info" onclick="exportPeriodData()">📥 Xuất dữ liệu</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        addPeriodOperationsStyles();
        
    } catch (error) {
        console.error('❌ Error showing period operations:', error);
        showMessage('❌ Lỗi khi tải lịch sử kỳ', 'error');
    }
}

// Hàm hiển thị lịch sử hàng hóa
async function renderPeriodMaterialHistory(operations) {
    if (operations.length === 0) return '<p class="empty-state">Không có dữ liệu</p>';
    
    if (currentPeriodView === 'day') {
        return renderMaterialByDay(operations);
    } else {
        return renderMaterialByGroup(operations);
    }
}

// Hàm hiển thị lịch sử dịch vụ
async function renderPeriodServiceHistory(operations) {
    if (operations.length === 0) return '<p class="empty-state">Không có dữ liệu</p>';
    
    if (currentPeriodView === 'day') {
        return renderServiceByDay(operations);
    } else {
        return renderServiceByGroup(operations);
    }
}

// Hiển thị hàng hóa theo ngày
function renderMaterialByDay(operations) {
    const operationsByDay = groupOperationsByDay(operations);
    
    let html = '<div class="day-view">';
    
    for (const [date, dayOps] of Object.entries(operationsByDay)) {
        const dayTotal = dayOps.reduce((sum, op) => sum + (op.amount || 0), 0);
        
        html += `
            <div class="day-group">
                <div class="day-header">
                    <strong>${formatDateDisplay(date)}</strong>
                    <span class="day-total">${formatCurrency(dayTotal)}</span>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tên hàng hóa</th>
                            <th>Số lượng</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dayOps.map(op => `
                            <tr>
                                <td>${op.name || 'Không tên'}</td>
                                <td>${op.quantity || 0} ${op.unit || ''}</td>
                                <td>${formatCurrency(op.amount || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

// Hiển thị hàng hóa gộp theo nội dung
function renderMaterialByGroup(operations) {
    const groupedItems = {};
    
    // Nhóm theo tên hàng hóa
    operations.forEach(op => {
        const key = `${op.name}_${op.unit}`;
        if (!groupedItems[key]) {
            groupedItems[key] = {
                name: op.name,
                unit: op.unit,
                totalQuantity: 0,
                totalAmount: 0,
                operations: []
            };
        }
        groupedItems[key].totalQuantity += op.quantity || 0;
        groupedItems[key].totalAmount += op.amount || 0;
        groupedItems[key].operations.push(op);
    });
    
    let html = '<div class="group-view">';
    html += `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Tên hàng hóa</th>
                    <th>Tổng số lượng</th>
                    <th>Đơn vị</th>
                    <th>Tổng tiền</th>
                    <th>Số lần mua</th>
                    <th>Đơn giá TB</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    for (const item of Object.values(groupedItems)) {
        const avgPrice = item.totalQuantity > 0 ? item.totalAmount / item.totalQuantity : 0;
        
        html += `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td>${item.totalQuantity}</td>
                <td>${item.unit}</td>
                <td>${formatCurrency(item.totalAmount)}</td>
                <td>${item.operations.length}</td>
                <td>${formatCurrency(avgPrice)}</td>
            </tr>
        `;
    }
    
    html += `
            </tbody>
        </table>
    `;
    
    html += '</div>';
    return html;
}

// Hiển thị dịch vụ theo ngày
function renderServiceByDay(operations) {
    const operationsByDay = groupOperationsByDay(operations);
    
    let html = '<div class="day-view">';
    
    for (const [date, dayOps] of Object.entries(operationsByDay)) {
        const dayTotal = dayOps.reduce((sum, op) => sum + (op.amount || 0), 0);
        
        html += `
            <div class="day-group">
                <div class="day-header">
                    <strong>${formatDateDisplay(date)}</strong>
                    <span class="day-total">${formatCurrency(dayTotal)}</span>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tên dịch vụ</th>
                            <th>Số tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dayOps.map(op => `
                            <tr>
                                <td>${op.name || 'Không tên'}</td>
                                <td>${formatCurrency(op.amount || 0)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

// Hiển thị dịch vụ gộp theo nội dung
function renderServiceByGroup(operations) {
    const groupedServices = {};
    
    // Nhóm theo tên dịch vụ
    operations.forEach(op => {
        const key = op.name;
        if (!groupedServices[key]) {
            groupedServices[key] = {
                name: op.name,
                totalAmount: 0,
                count: 0,
                operations: []
            };
        }
        groupedServices[key].totalAmount += op.amount || 0;
        groupedServices[key].count += 1;
        groupedServices[key].operations.push(op);
    });
    
    let html = '<div class="group-view">';
    html += `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Tên dịch vụ</th>
                    <th>Số lần mua</th>
                    <th>Tổng tiền</th>
                    <th>Trung bình/lần</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    for (const service of Object.values(groupedServices)) {
        const avgAmount = service.count > 0 ? service.totalAmount / service.count : 0;
        
        html += `
            <tr>
                <td><strong>${service.name}</strong></td>
                <td>${service.count}</td>
                <td>${formatCurrency(service.totalAmount)}</td>
                <td>${formatCurrency(avgAmount)}</td>
            </tr>
        `;
    }
    
    html += `
            </tbody>
        </table>
    `;
    
    html += '</div>';
    return html;
}

// Hàm nhóm operations theo ngày
function groupOperationsByDay(operations) {
    const grouped = {};
    
    operations.forEach(op => {
        const date = op.dateKey || (op.date ? op.date.split('T')[0] : '');
        if (!date) return;
        
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(op);
    });
    
    // Sắp xếp ngày mới nhất trước
    return Object.keys(grouped)
        .sort((a, b) => b.localeCompare(a))
        .reduce((result, key) => {
            result[key] = grouped[key];
            return result;
        }, {});
}
// Hàm thay đổi kỳ
function changePeriodBy(offset) {
    let newMonth = currentInventoryPeriod.month + offset;
    let newYear = currentInventoryPeriod.year;
    
    if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
    } else if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
    }
    
    currentInventoryPeriod = {
        month: newMonth,
        year: newYear,
        startDate: new Date(newYear, newMonth - 1, 20),
        endDate: new Date(newYear, newMonth, 19)
    };
    
    // Thay vì showPopup, reload tab
    if (isPeriodSectionVisible) {
        loadInventoryTab();
    }
}

// Hàm chuyển về kỳ hiện tại
function goToCurrentPeriodView() {
    currentInventoryPeriod = getCurrentPeriod();
    if (isPeriodSectionVisible) {
        loadInventoryTab();
    }
}

// Hàm thay đổi kiểu xem
function changePeriodView(view) {
    currentPeriodView = view;
    if (isPeriodSectionVisible) {
        loadInventoryTab();
    }
}

// Hàm toggle hiển thị hàng hóa
function toggleMaterialHistory() {
    showMaterialHistory = !showMaterialHistory;
    if (isPeriodSectionVisible) {
        loadInventoryTab();
    }
}

// Hàm toggle hiển thị dịch vụ
function toggleServiceHistory() {
    showServiceHistory = !showServiceHistory;
    if (isPeriodSectionVisible) {
        loadInventoryTab();
    }
}

// Hàm xuất dữ liệu kỳ
async function exportPeriodData() {
    try {
        const operations = await getOperationsByPeriod(currentInventoryPeriod);
        const materialOps = operations.filter(op => op.type === 'material');
        const serviceOps = operations.filter(op => op.type === 'service');
        
        let content = `LỊCH SỬ MUA SẮM - ${formatPeriodDisplay(currentInventoryPeriod)}\n`;
        content += `Kỳ: ${formatDateDisplay(currentInventoryPeriod.startDate)} - ${formatDateDisplay(currentInventoryPeriod.endDate)}\n\n`;
        
        // Hàng hóa
        if (materialOps.length > 0) {
            content += '🛒 HÀNG HÓA:\n';
            content += 'Tên hàng\tSố lượng\tĐơn vị\tThành tiền\tNgày\n';
            materialOps.forEach(op => {
                const date = op.dateKey || (op.date ? op.date.split('T')[0] : '');
                content += `${op.name}\t${op.quantity || 0}\t${op.unit || ''}\t${op.amount || 0}\t${date}\n`;
            });
            content += '\n';
        }
        
        // Dịch vụ
        if (serviceOps.length > 0) {
            content += '📝 DỊCH VỤ:\n';
            content += 'Tên dịch vụ\tSố tiền\tNgày\n';
            serviceOps.forEach(op => {
                const date = op.dateKey || (op.date ? op.date.split('T')[0] : '');
                content += `${op.name}\t${op.amount || 0}\t${date}\n`;
            });
        }
        
        // Tổng kết
        content += '\n=== TỔNG HỢP ===\n';
        content += `Tổng giao dịch: ${operations.length}\n`;
        content += `Hàng hóa: ${materialOps.length}\n`;
        content += `Dịch vụ: ${serviceOps.length}\n`;
        content += `Tổng chi: ${formatCurrency(operations.reduce((sum, op) => sum + (op.amount || 0), 0))}\n`;
        
        // Copy to clipboard
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(content);
            showMessage('✅ Đã copy dữ liệu kỳ vào clipboard!', 'success');
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = content;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showMessage('✅ Đã copy dữ liệu kỳ vào clipboard!', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error exporting period data:', error);
        showMessage('❌ Lỗi khi xuất dữ liệu', 'error');
    }
}

// Thêm CSS cho period operations
function addPeriodOperationsStyles() {
    if (!document.getElementById('period-operations-styles')) {
        const style = document.createElement('style');
        style.id = 'period-operations-styles';
        style.textContent = `
            .period-range {
                color: #666;
                font-size: 14px;
                margin-top: -5px;
                margin-bottom: 20px;
            }
            
            .period-filters {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
            }
            
            @media (max-width: 768px) {
                .period-filters {
                    grid-template-columns: 1fr;
                }
            }
            
            .filter-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: #2c3e50;
                font-size: 14px;
            }
            
            .view-toggle, .type-toggle, .period-navigation {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .checkbox-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 13px;
                cursor: pointer;
                padding: 5px;
                border-radius: 4px;
                transition: background 0.2s;
            }
            
            .checkbox-label:hover {
                background: rgba(0,0,0,0.05);
            }
            
            .checkbox-label input {
                margin: 0;
            }
            
            .period-summary {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin-bottom: 20px;
            }
            
            @media (max-width: 768px) {
                .period-summary {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            
            .period-summary .summary-card {
                background: white;
                padding: 12px;
                border-radius: 6px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .period-summary .summary-card h4 {
                margin: 0 0 5px 0;
                font-size: 12px;
                color: #666;
            }
            
            .period-summary .summary-card .amount {
                font-size: 16px;
                font-weight: bold;
                color: #2c3e50;
            }
            
            .period-content {
                max-height: 500px;
                overflow-y: auto;
                padding-right: 10px;
            }
            
            .period-section {
                margin-bottom: 25px;
            }
            
            .period-section h3 {
                margin-top: 0;
                margin-bottom: 15px;
                font-size: 16px;
                color: #2c3e50;
                padding-bottom: 8px;
                border-bottom: 2px solid #3498db;
            }
            
            .day-view {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            
            .day-group {
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                overflow: hidden;
            }
            
            .day-header {
                background: #f8f9fa;
                padding: 10px 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .day-header strong {
                font-size: 14px;
                color: #2c3e50;
            }
            
            .day-total {
                font-weight: bold;
                color: #27ae60;
                font-size: 14px;
            }
            
            .group-view .data-table {
                margin-top: 10px;
            }
            
            .group-view .data-table th {
                background: #f8f9fa;
            }
            
            .empty-state {
                text-align: center;
                padding: 20px;
                color: #666;
                font-style: italic;
                background: #f9f9f9;
                border-radius: 6px;
            }
        `;
        document.head.appendChild(style);
    }
}

// Đưa hàm ra global scope
window.showPeriodOperations = showPeriodOperations;
window.changePeriodBy = changePeriodBy;
window.goToCurrentPeriodView = goToCurrentPeriodView;
window.changePeriodView = changePeriodView;
window.toggleMaterialHistory = toggleMaterialHistory;
window.toggleServiceHistory = toggleServiceHistory;
window.exportPeriodData = exportPeriodData;

// Hàm format ngày hiển thị
function formatDateDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Hàm format ngày YYYY-MM-DD
function formatDate(date = new Date()) {
    if (typeof date === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }
    }
    
    if (date instanceof Date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

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
    if (typeof initializeEmployees === 'function') initializeEmployees();
};

// overview.js - cuối file
window.loadOverview = function() {
    console.log('👁 Loading overview...');
    if (typeof initializeOverview === 'function') initializeOverview();
};