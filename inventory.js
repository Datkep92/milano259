// inventory.js - Gọn gàng, đầy đủ chức năng
// Biến toàn cục
let currentInventory = [];
let showOperationsHistory = false;
let inventoryEventListenersActive = false;
let currentInventoryDate = formatDate();
let currentPeriod = getCurrentPeriod();
let currentPeriodView = 'day';
let showMaterialHistory = true;
let showServiceHistory = true;
let isPeriodSectionVisible = false;
let currentOperationsType = 'material';

// ============== UTILITY FUNCTIONS ==============
function getCurrentPeriod(date = new Date()) {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    if (day >= 20) {
        return {
            month: month,
            year: year,
            startDate: new Date(year, month - 1, 20),
            endDate: new Date(year, month, 19)
        };
    } else {
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

function formatDateDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatPeriodDisplay(period) {
    const monthNames = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    return `${monthNames[period.month - 1]}/${period.year}`;
}

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

function formatCurrency(amount) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function convertToDisplayFormat(dateString) {
    if (!dateString) return 'Không có ngày';
    
    try {
        if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            return dateString;
        }
        
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const parts = dateString.split('-');
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        }
        
        return dateString;
    } catch (error) {
        console.warn('❌ Date conversion error:', error);
        return dateString;
    }
}

function generateOperationId() {
    return 'op_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

function generateHistoryId() {
    return 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

function createOperationHTML(op) {
    return `
        <div class="operation-item" data-operation-id="${op.operationId || op.id}">
            <div class="operation-row-1">
                <div class="operation-type">
                    ${op.type === 'material' ? '🛒' : '🔧'}
                </div>
                <div class="operation-name">
                    ${op.name || op.productName || 'Không có tên'}
                </div>
            </div>
            
            <div class="operation-row-2">
                <div class="operation-quantity">
                    ${op.quantity || 1} ${op.unit || ''}
                    ${op.unitPrice ? ` • ${formatCurrency(op.unitPrice)}` : ''}
                </div>
                <div class="operation-amount">
                    ${formatCurrency(op.amount || op.total || 0)}
                </div>
            </div>
            
            ${op.description ? `
            <div class="operation-description">
                ${op.description}
            </div>
            ` : ''}
        </div>
    `;
}

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
    
    return Object.keys(grouped)
        .sort((a, b) => b.localeCompare(a))
        .reduce((result, key) => {
            result[key] = grouped[key];
            return result;
        }, {});
}

// ============== INVENTORY FUNCTIONS ==============
async function changeInventoryDateByInput(dateString) {
    console.log('🗓️ changeInventoryDateByInput called with:', dateString);
    
    if (!dateString) {
        showMessage('❌ Ngày không hợp lệ', 'error');
        return;
    }
    
    currentInventoryDate = dateString;
    console.log('📅 Inventory date set to:', currentInventoryDate);
    
    loadInventoryTab();
}

async function changeInventoryPeriod(periodOffset) {
    try {
        console.log('🔄 Changing period by:', periodOffset);
        
        let newMonth = currentPeriod.month + periodOffset;
        let newYear = currentPeriod.year;
        
        if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear -= 1;
        }
        
        currentPeriod = {
            month: newMonth,
            year: newYear,
            startDate: new Date(newYear, newMonth - 1, 20),
            endDate: new Date(newYear, newMonth, 19)
        };
        
        console.log('📅 New period:', formatPeriodDisplay(currentPeriod));
        loadInventoryTab();
        
    } catch (error) {
        console.error('❌ Error changing period:', error);
        showMessage('❌ Lỗi khi thay đổi kỳ', 'error');
    }
}

async function goToCurrentPeriod() {
    currentPeriod = getCurrentPeriod();
    console.log('📅 Going to current period:', formatPeriodDisplay(currentPeriod));
    loadInventoryTab();
}

function initializeInventoryTab() {
    addOperationsHistoryStyles();
    addInventoryStyles();
    addPeriodSectionStyles();
    loadInventoryTab();
    setupInventoryEventListeners();
}

async function loadInventoryTab() {
    const container = document.getElementById('inventory');
    if (!container) return;

    try {
        showLoading(true);
        currentInventory = await dbGetAll('inventory');
        renderInventoryTab(container, currentInventory);
        showLoading(false);
    } catch (error) {
        console.error('Error loading inventory tab:', error);
        showMessage('Lỗi tải dữ liệu kho', 'error');
        showLoading(false);
    }
}

function setupInventoryEventListeners() {
    if (inventoryEventListenersActive) {
        console.log('⚠️ Inventory listeners already active');
        return;
    }
    
    document.removeEventListener('click', handleInventoryClick);
    document.addEventListener('click', handleInventoryClick);
    
    inventoryEventListenersActive = true;
    console.log('✅ Inventory event listeners setup');
}

function cleanupInventoryEventListeners() {
    document.removeEventListener('click', handleInventoryClick);
    inventoryEventListenersActive = false;
    console.log('🧹 Cleaned up inventory event listeners');
}

function handleInventoryClick(e) {
    const action = e.target.dataset.action;
    const target = e.target;
    
    console.log('📦 Inventory click detected - Action:', action, 'Target:', target);
    
    if (!action) return;
    
    e.stopPropagation();
    
    if (action === "show-product-history") {
        const productId = target.dataset.productId;
        if (productId) showProductHistoryPopup(productId);
    } else if (action === "add-inventory") {
        showAddInventoryPopup();
    } else if (action === "show-operations") {
        console.log('🔧 Opening operations popup...');
        showOperationsPopup();
    } else if (action === "show-period-operations") {
        console.log('📊 Opening period operations...');
        showPeriodOperations();
    } else if (action === "toggle-operations-history") {
        console.log('🛒 Toggling operations history...');
        toggleOperationsHistory();
    } else if (action === "close-popup") {
        closePopup();
    }
}

async function getPeriodInventoryStats() {
    try {
        const allHistory = await dbGetAll('inventoryHistory');
        const allOperations = await dbGetAll('operations');
        
        const startDateStr = formatDate(currentPeriod.startDate);
        const endDateStr = formatDate(currentPeriod.endDate);
        
        console.log('📊 Getting period stats:', {
            start: startDateStr,
            end: endDateStr
        });
        
        const periodHistory = allHistory.filter(record => {
            let recordDate = '';
            if (record.reportDate) {
                recordDate = record.reportDate;
            } else if (record.date) {
                recordDate = record.date.split('T')[0];
            }
            
            return recordDate >= startDateStr && recordDate <= endDateStr;
        });
        
        const periodOperations = allOperations.filter(operation => {
            let operationDate = '';
            if (operation.dateKey) {
                operationDate = operation.dateKey;
            } else if (operation.date) {
                operationDate = operation.date.split('T')[0];
            }
            
            return operationDate >= startDateStr && operationDate <= endDateStr;
        });
        
        const imports = periodHistory.filter(record => record.type === 'in');
        const exports = periodHistory.filter(record => record.type === 'out');
        
        const totalImports = imports.reduce((sum, record) => sum + (record.quantity || 0), 0);
        const totalExports = exports.reduce((sum, record) => sum + (record.quantity || 0), 0);
        const importValue = imports.reduce((sum, record) => sum + (record.totalPrice || 0), 0);
        
        const materialOps = periodOperations.filter(op => op.type === 'material');
        const serviceOps = periodOperations.filter(op => op.type === 'service');
        
        const materialTotal = materialOps.reduce((sum, op) => sum + (op.amount || 0), 0);
        const serviceTotal = serviceOps.reduce((sum, op) => sum + (op.amount || 0), 0);
        const totalOperations = materialTotal + serviceTotal;
        
        return {
            totalImports,
            totalExports,
            importValue,
            serviceCount: serviceOps.length,
            serviceValue: serviceTotal,
            materialCount: materialOps.length,
            materialValue: materialTotal,
            totalTransactions: periodHistory.length + periodOperations.length,
            totalOperationsValue: totalOperations,
            totalAllValue: importValue + totalOperations,
            periodHistory,
            periodOperations,
            materialOps,
            serviceOps
        };
        
    } catch (error) {
        console.error('❌ Error getting period stats:', error);
        return {
            totalImports: 0,
            totalExports: 0,
            importValue: 0,
            serviceCount: 0,
            serviceValue: 0,
            materialCount: 0,
            materialValue: 0,
            totalTransactions: 0,
            totalOperationsValue: 0,
            totalAllValue: 0,
            periodHistory: [],
            periodOperations: [],
            materialOps: [],
            serviceOps: []
        };
    }
}

async function renderInventoryTab(container, inventory) {
    const lowStockItems = inventory.filter(item => item.currentQuantity < item.minStock);
    const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
    
    const periodStats = await getPeriodInventoryStats();
    
    container.innerHTML = `
    <div class="inventory-content" data-tab="inventory">
        ${lowStockItems.length > 0 ? `
            <div class="warning-section">
                <h3>⚠ SẢN PHẨM TỒN KHO THẤP</h3>
                ${lowStockItems.map(item => `
                    <div class="warning-item">
                        <span>${item.name}</span>
                        <span>SL: ${item.currentQuantity} | Min: ${item.minStock}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        ${isPeriodSectionVisible ? await getPeriodSectionHTML() : ''}
        
        <div class="date-selector">
            ${periodStats.totalImports > 0 || periodStats.totalExports > 0 ? `
                <div class="period-stats">
                    <h4>📈 Thống kê Kỳ ${formatPeriodDisplay(currentPeriod)}</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span>📥 Nhập kho:</span>
                            <strong>${periodStats.totalImports} sản phẩm</strong>
                        </div>
                        <div class="stat-item">
                            <span>📤 Xuất kho:</span>
                            <strong>${periodStats.totalExports} sản phẩm</strong>
                        </div>
                        <div class="stat-item">
                            <span>💰 Giá trị nhập:</span>
                            <strong>${formatCurrency(periodStats.importValue)}</strong>
                        </div>
                        <div class="stat-item">
                            <span>📊 Tổng giao dịch:</span>
                            <strong>${periodStats.totalTransactions}</strong>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>

        <div class="section">
            <h2>📦 Tồn Kho ${formatCurrency(totalValue)}</h2>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Tên sản phẩm</th>
                        <th>ĐVT</th>
                        <th>Số lượng</th>
                        <th>Thành tiền</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${inventory.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.name}</td>
                            <td>${item.unit}</td>
                            <td>${item.currentQuantity}</td>
                            <td>${formatCurrency(item.totalValue)}</td>
                            <td>
                                <button class="btn btn-primary btn-sm" 
                                        data-action="show-product-history" 
                                        data-product-id="${item.productId}">
                                    Lịch sử
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
           
            ${isAdmin() ? `
                <div class="action-buttons">
                    <button class="btn btn-success" data-action="show-operations">
                        🔧 Mua sắm Vận hành
                    </button>
                    <button class="btn ${isPeriodSectionVisible ? 'btn-warning' : 'btn-info'}" 
                            onclick="togglePeriodSection()">
                        ${isPeriodSectionVisible ? '📊 Ẩn Lịch sử' : '📊 Xem Lịch sử'}
                    </button>
                    <button class="btn btn-outline" data-action="add-inventory">
                        ➕ Thêm SP
                    </button>
                </div>
            ` : ''}
        </div>
    </div>`;
}

async function showProductHistoryPopup(productId) {
    const product = await dbGet('inventory', productId);
    if (!product) {
        showMessage('Không tìm thấy sản phẩm', 'error');
        return;
    }
    
    // Lấy lịch sử, sắp xếp theo ngày mới nhất
    const history = (await dbGetAll('inventoryHistory', 'productId', IDBKeyRange.only(productId)))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const popupHTML = `
        <div class="popup" style="max-width: 800px;">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>📜 Lịch sử nhập/xuất - ${product.name}</h3>
            <p><strong>ĐVT:</strong> ${product.unit}</p>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Thời gian</th>
                        <th>Loại</th>
                        <th>SL</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                        <th>Ghi chú</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map((record, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${formatDateTime(record.date)}</td>
                            <td>
                                <span style="color: ${record.type === 'in' ? 'green' : 'red'}">
                                    ${record.type === 'in' ? 'NHẬP' : 'XUẤT'}
                                </span>
                            </td>
                            <td>${record.type === 'in' ? '+' : '-'}${record.quantity}</td>
                            <td>${record.unitPrice ? formatCurrency(record.unitPrice) : '-'}</td>
                            <td>${record.totalPrice ? formatCurrency(record.totalPrice) : '-'}</td>
                            <td>${record.note || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            ${isAdmin() ? `
                <div class="popup-actions">
                    <button class="btn btn-primary" data-action="add-inventory-record" data-product-id="${productId}">
                        Thêm giao dịch
                    </button>
                </div>
            ` : ''}
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
    setupInventoryHistoryEventListeners(productId);
}

function setupInventoryHistoryEventListeners(productId) {
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="add-inventory-record"]')) {
            showAddInventoryRecordPopup(productId);
        }
    });
}

function showAddInventoryRecordPopup(productId) {
    const popupHTML = `
        <div class="popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>➕ Thêm giao dịch kho</h3>
            
            <div class="form-group">
                <label>Loại giao dịch:</label>
                <select id="recordType">
                    <option value="in">Nhập hàng</option>
                    <option value="out">Xuất hàng</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Số lượng:</label>
                <input type="number" id="recordQuantity" placeholder="Nhập số lượng">
            </div>
            
            <div class="form-group" id="priceGroup">
                <label>Đơn giá (cho 1 đơn vị):</label>
                <input type="number" id="recordUnitPrice" placeholder="Nhập đơn giá">
            </div>
            
            <div class="form-group">
                <label>Ghi chú:</label>
                <input type="text" id="recordNote" placeholder="Nhập ghi chú">
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-primary" data-action="save-inventory-record" data-product-id="${productId}">
                    Lưu
                </button>
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
    setupAddInventoryRecordEventListeners(productId);
}

function setupAddInventoryRecordEventListeners(productId) {
    const recordType = document.getElementById('recordType');
    const priceGroup = document.getElementById('priceGroup');
    
    recordType.addEventListener('change', function() {
        priceGroup.style.display = this.value === 'in' ? 'block' : 'none';
    });
    
    document.addEventListener('click', async function(e) {
        if (e.target.matches('[data-action="save-inventory-record"]')) {
            const type = document.getElementById('recordType').value;
            const quantity = parseFloat(document.getElementById('recordQuantity').value);
            // Lấy unitPrice chỉ khi type là 'in', nếu không thì là 0
            const unitPrice = type === 'in' ? parseFloat(document.getElementById('recordUnitPrice').value) : 0;
            const note = document.getElementById('recordNote').value.trim();
            
            if (!quantity || quantity <= 0) {
                showMessage('Vui lòng nhập số lượng hợp lệ', 'error');
                return;
            }
            
            // Kiểm tra giá nhập chỉ khi nhập hàng
            if (type === 'in' && (!unitPrice || unitPrice <= 0)) {
                showMessage('Vui lòng nhập đơn giá hợp lệ', 'error');
                return;
            }
            
            try {
                await addInventoryRecord(productId, type, quantity, unitPrice, note);
                showMessage('Đã thêm giao dịch thành công!', 'success');
                // Đóng popup thêm giao dịch, sau đó mở lại popup lịch sử
                closePopup();
                showProductHistoryPopup(productId);
                loadInventoryTab();
                
            } catch (error) {
                console.error('Error adding inventory record:', error);
                showMessage('Lỗi khi thêm giao dịch: ' + error.message, 'error');
            }
        }
    });
}

async function addInventoryRecord(productId, type, quantity, unitPrice, note) {
    const product = await dbGet('inventory', productId);
    if (!product) {
        throw new Error('Product not found');
    }
    
    let newQuantity = product.currentQuantity;
    let newTotalValue = product.totalValue;
    
    if (type === 'in') {
        newQuantity += quantity;
        newTotalValue += (quantity * unitPrice);
    } else if (type === 'out') {
        if (quantity > product.currentQuantity) {
            throw new Error('Số lượng xuất vượt quá tồn kho hiện có');
        }
        newQuantity -= quantity;
        // Tính giá trị xuất dựa trên giá trung bình hiện tại
        newTotalValue -= (quantity * product.averagePrice);
    }
    
    // Recalculate Average Price
    let newAveragePrice = (newQuantity > 0) ? (newTotalValue / newQuantity) : 0;

    // Đảm bảo không có giá trị âm
    if (newTotalValue < 0) newTotalValue = 0;
    
    const historyRecord = {
        historyId: generateHistoryId(),
        productId: productId,
        type: type,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: type === 'in' ? (quantity * unitPrice) : (quantity * product.averagePrice), // Lưu tổng giá trị của giao dịch
        note: note,
        createdBy: getCurrentUser().employeeId,
        date: new Date().toISOString()
    };
    
    await dbAdd('inventoryHistory', historyRecord);
    
    await dbUpdate('inventory', productId, {
        currentQuantity: newQuantity,
        averagePrice: newAveragePrice,
        totalValue: newTotalValue,
        updatedAt: new Date().toISOString()
    });
}

function showAddInventoryPopup() {
    if (!isAdmin()) {
        showMessage('Chỉ quản trị viên được thêm sản phẩm', 'error');
        return;
    }
    
    const popupHTML = `
        <div class="popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>➕ Thêm sản phẩm mới</h3>
            
            <div class="form-group">
                <label for="newProductName">Tên sản phẩm:</label>
                <input type="text" id="newProductName" placeholder="Nhập tên sản phẩm">
            </div>
            
            <div class="form-group">
                <label for="newProductUnit">Đơn vị tính:</label>
                <input type="text" id="newProductUnit" placeholder="VD: kg, hộp, cái">
            </div>
            
            <div class="form-group">
                <label for="newProductMinStock">Tồn kho tối thiểu:</label>
                <input type="number" id="newProductMinStock" placeholder="Số lượng cảnh báo">
            </div>
            
            <div class="form-group">
                <label for="newProductQuantity">Số lượng ban đầu:</label>
                <input type="number" id="newProductQuantity" placeholder="Số lượng hiện có">
            </div>
            
            <div class="form-group">
                <label for="newProductPrice">Đơn giá (cho 1 đơn vị):</label>
                <input type="number" id="newProductPrice" placeholder="Giá nhập ban đầu">
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-primary" data-action="save-new-product">Lưu</button>
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
    setupAddInventoryEventListeners();
}

function setupAddInventoryEventListeners() {
    document.addEventListener('click', async function(e) {
        if (e.target.matches('[data-action="save-new-product"]')) {
            const name = document.getElementById('newProductName').value.trim();
            const unit = document.getElementById('newProductUnit').value.trim();
            const minStock = parseInt(document.getElementById('newProductMinStock').value) || 0;
            const quantity = parseInt(document.getElementById('newProductQuantity').value) || 0;
            const price = parseFloat(document.getElementById('newProductPrice').value) || 0;
            
            if (!name || !unit) {
                showMessage('Vui lòng nhập tên và đơn vị tính', 'error');
                return;
            }
            
            if (quantity < 0 || price < 0) {
                showMessage('Số lượng và giá phải lớn hơn hoặc bằng 0', 'error');
                return;
            }
            
            try {
                // Kiểm tra trùng tên/đơn vị
                const existingProduct = await findProductByNameAndUnit(name, unit);
                if (existingProduct) {
                    showMessage('❌ Sản phẩm đã tồn tại với tên và đơn vị này. Vui lòng cập nhật thay vì thêm mới.', 'error');
                    return;
                }

                const productId = 'SP_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5);
                const totalValue = quantity * price;
                
                const newProduct = {
                    productId: productId,
                    name: name,
                    unit: unit,
                    currentQuantity: quantity,
                    minStock: minStock,
                    averagePrice: price,
                    totalValue: totalValue,
                    createdBy: getCurrentUser().employeeId,
                    createdAt: new Date().toISOString()
                };
                
                await dbAdd('inventory', newProduct);
                
                if (quantity > 0) {
                    const historyRecord = {
                        historyId: generateHistoryId(),
                        productId: productId,
                        type: 'in',
                        quantity: quantity,
                        unitPrice: price,
                        totalPrice: totalValue,
                        note: 'Nhập kho ban đầu',
                        createdBy: getCurrentUser().employeeId,
                        date: new Date().toISOString()
                    };
                    await dbAdd('inventoryHistory', historyRecord);
                }
                
                showMessage('Đã thêm sản phẩm thành công!', 'success');
                closePopup();
                loadInventoryTab();
                
            } catch (error) {
                console.error('Error adding product:', error);
                showMessage('Lỗi khi thêm sản phẩm', 'error');
            }
        }
    });
}

/**
 * @name findProductByNameAndUnit
 * @description Tìm kiếm sản phẩm trong kho bằng tên và đơn vị tính.
 */
async function findProductByNameAndUnit(name, unit) {
    const allProducts = await dbGetAll('inventory');
    return allProducts.find(p => p.name.toLowerCase() === name.toLowerCase() && p.unit.toLowerCase() === unit.toLowerCase());
}

// ============== OPERATIONS FUNCTIONS ==============
function showOperationsPopup(type = 'material') {
    const popupHTML = `
        <div class="popup" style="max-width: 500px;">
            <button class="close-popup" data-action="close-popup">×</button>
            <div class="popup-info">
                <h3><small>📅 Kỳ: <strong>${formatPeriodDisplay(currentPeriod)}</strong></small></h3>
                <input type="date" class="date-input" value="${currentInventoryDate}" 
                       id="inventoryDateInput" onchange="changeInventoryDateByInput(this.value)">
            </div>
            
            <div class="popup-tabs">
                <button class="popup-tab-btn" data-tab="materialTab" id="materialTabBtn">🛒 Nguyên liệu / Hàng hóa</button>
                <button class="popup-tab-btn" data-tab="serviceTab">📝 Dịch vụ / Chi phí khác</button>
            </div>

            <div id="materialTab" class="popup-tab-content">
                <div class="form-group">
                    <label>Tên Nguyên liệu/Hàng hóa:</label>
                    <input type="text" id="materialName" placeholder="Tên sản phẩm đã có trong kho">
                </div>
                <div class="form-group">
                    <label>Đơn vị (vd: kg, gói):</label>
                    <input type="text" id="materialUnit" placeholder="Đơn vị tương ứng trong kho">
                </div>
                <div class="form-group">
                    <label>Số lượng (SL nhập):</label>
                    <input type="number" id="materialQuantity" placeholder="Số lượng đã mua" min="0">
                </div>
                <div class="form-group">
                    <label>Thành tiền (tổng chi):</label>
                    <input type="number" id="materialAmount" placeholder="Tổng số tiền đã chi" min="0">
                </div>
                <small class="text-info">Lưu ý: Sản phẩm phải tồn tại trong danh sách tồn kho.</small>
                <button class="btn btn-primary" data-action="save-material" style="width: 100%;">💾 Lưu - Cập nhật kho</button>
            </div>

            <div id="serviceTab" class="popup-tab-content">
                <div class="form-group">
                    <label>Tên dịch vụ / Chi phí:</label>
                    <input type="text" id="serviceName" placeholder="Tên dịch vụ/chi phí">
                </div>
                <div class="form-group">
                    <label>Số tiền:</label>
                    <input type="number" id="serviceAmount" placeholder="Số tiền" min="0">
                </div>
                <button class="btn btn-primary" data-action="save-service" style="width: 100%;">💾 Lưu</button>
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
            </div>
        </div>
    `;
    showPopup(popupHTML);
    setupOperationsEventListeners(type);
}

async function saveMaterial() {
    const name = document.getElementById('materialName').value.trim();
    const quantity = parseFloat(document.getElementById('materialQuantity').value);
    const unit = document.getElementById('materialUnit').value.trim();
    const amount = parseFloat(document.getElementById('materialAmount').value);

    if (!name || isNaN(quantity) || quantity <= 0 || !unit || isNaN(amount) || amount <= 0) {
        showMessage('Vui lòng nhập đầy đủ Tên, Số lượng, Đơn vị và Thành tiền hợp lệ.', 'error');
        return;
    }

    try {
        const currentUser = getCurrentUser();
        const operationId = generateOperationId();
        
        const selectedDate = currentInventoryDate;
        const isoDate = new Date(selectedDate + 'T12:00:00').toISOString();
        const unitPrice = amount / quantity; // Tính đơn giá nhập

        console.log('📅 Saving material for selected date:', selectedDate);

        // 1. Tạo Operation Record
        const operationRecord = {
            operationId: operationId,
            date: isoDate,
            dateKey: selectedDate,
            type: 'material',
            name: name,
            quantity: quantity,
            unit: unit,
            amount: amount,
            unitPrice: unitPrice, 
            createdBy: currentUser.employeeId,
            createdAt: isoDate
        };

        await dbAdd('operations', operationRecord);
        console.log('✅ Saved operation record for date:', selectedDate);

        // 2. Cập nhật Kho hàng: Tìm kiếm sản phẩm
        // Sử dụng findProductByNameAndUnit để đảm bảo tìm đúng sản phẩm
        let product = await findProductByNameAndUnit(name, unit); 
        
        if (!product) {
            // Tạo sản phẩm mới nếu chưa có
            const newProductId = 'prod_' + Math.random().toString(36).substring(2, 9);
            product = {
                productId: newProductId,
                name: name,
                unit: unit,
                currentQuantity: 0,
                minStock: 0,
                averagePrice: 0,
                totalValue: 0,
                createdAt: isoDate
            };
            await dbAdd('inventory', product);
            console.log('✅ Created new product');
        }

        // 3. Tạo bản ghi lịch sử nhập kho với ngày đã chọn
        const historyRecord = {
            historyId: generateHistoryId(),
            productId: product.productId,
            type: 'in',
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: amount,
            note: `Mua sắm vận hành: ${name} - Ngày: ${formatDateDisplay(selectedDate)}`,
            createdBy: currentUser.employeeId,
            date: isoDate,
            reportDate: selectedDate
        };
        await dbAdd('inventoryHistory', historyRecord);
        
        // 4. Cập nhật tồn kho
        const totalQuantityBefore = product.currentQuantity;
        const totalValueBefore = product.totalValue;
        
        const newTotalQuantity = totalQuantityBefore + quantity;
        const newTotalValue = totalValueBefore + amount;
        const newAveragePrice = newTotalQuantity > 0 ? newTotalValue / newTotalQuantity : 0;
        
        const updatedProduct = await dbUpdate('inventory', product.productId, {
            currentQuantity: newTotalQuantity,
            totalValue: newTotalValue,
            averagePrice: newAveragePrice,
            updatedAt: isoDate
        });

        // 5. YÊU CẦU ĐỒNG BỘ HÓA FIREBASE (GỌI ĐÚNG ĐỐI SỐ)
        if (typeof syncToFirebase === 'function') {
            await syncToFirebase('operations', operationRecord);
            await syncToFirebase('inventoryHistory', historyRecord);
            await syncToFirebase('inventory', updatedProduct);
            console.log('🔥 Firebase sync requested after material save.');
        }

        console.log('✅ Updated inventory for date:', selectedDate);
        showMessage(`✅ Đã lưu mua sắm Nguyên liệu cho ngày ${formatDateDisplay(selectedDate)}`, 'success');
        closePopup();
        loadInventoryTab();

    } catch (error) {
        console.error('Error saving material operation:', error);
        showMessage('❌ Lỗi khi lưu mua sắm Nguyên liệu: ' + (error.message || error), 'error');
    }
}

async function saveService() {
    const name = document.getElementById('serviceName').value.trim();
    const amount = parseFloat(document.getElementById('serviceAmount').value);

    if (!name || isNaN(amount) || amount <= 0) {
        showMessage('Vui lòng nhập đầy đủ Tên Dịch vụ và Số tiền hợp lệ.', 'error');
        return;
    }

    try {
        const currentUser = getCurrentUser();
        const operationId = generateOperationId();
        
        const selectedDate = currentInventoryDate;
        const isoDate = new Date(selectedDate + 'T12:00:00').toISOString();

        console.log('📅 Saving service for selected date:', selectedDate);

        // 1. Tạo Operation Record
        const operationRecord = {
            operationId: operationId,
            date: isoDate,
            dateKey: selectedDate,
            type: 'service',
            name: name,
            quantity: 0,
            unit: '',
            amount: amount,
            createdBy: currentUser.employeeId,
            createdAt: isoDate
        };

        await dbAdd('operations', operationRecord);
        console.log('✅ Saved service operation for date:', selectedDate);

        // 2. YÊU CẦU ĐỒNG BỘ HÓA FIREBASE (GỌI ĐÚNG ĐỐI SỐ)
        if (typeof syncToFirebase === 'function') {
            await syncToFirebase('operations', operationRecord);
            console.log('🔥 Firebase sync requested after service save.');
        }

        showMessage(`✅ Đã lưu mua sắm Dịch vụ cho ngày ${formatDateDisplay(selectedDate)}`, 'success');
        closePopup();
        loadInventoryTab();

    } catch (error) {
        console.error('Error saving service operation:', error);
        showMessage('❌ Lỗi khi lưu mua sắm Dịch vụ', 'error');
    }
}

function setupOperationsEventListeners(initialTab) {
    document.removeEventListener('click', handleOperationsClick); 
    document.addEventListener('click', handleOperationsClick);

    const tabName = initialTab === 'material' ? 'materialTab' : 'serviceTab';
    const initialTabBtn = document.querySelector(`[data-tab="${tabName}"]`);
    
    document.querySelectorAll('.popup-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.popup-tab-content').forEach(content => {
        content.classList.remove('active');
    });

    if (initialTabBtn) {
        initialTabBtn.classList.add('active');
    }
    const initialTabContent = document.getElementById(tabName);
    if (initialTabContent) {
        initialTabContent.classList.add('active');
    }
}

function handleOperationsClick(e) {
    if (e.target.matches('.popup-tab-btn')) {
        const tabName = e.target.dataset.tab;
        
        document.querySelectorAll('.popup-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');
        
        document.querySelectorAll('.popup-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
        
    } else if (e.target.matches('[data-action="save-material"]')) {
        saveMaterial();
        
    } else if (e.target.matches('[data-action="save-service"]')) {
        saveService();
    }
}

async function calculateOperationsTotal(type) {
    try {
        const operations = await dbGetAll('operations');
        const total = operations
            .filter(op => op.type === type && op.dateKey === formatDate())
            .reduce((sum, op) => sum + (op.amount || 0), 0);
        return total;
    } catch (error) {
        console.error('Error calculating operations total:', error);
        return 0;
    }
}

async function renderOperationsHistory() {
    try {
        console.log('🛒 Loading ALL operations history');
        const operations = await dbGetAll('operations');
        
        console.log('🛒 ALL operations:', operations);
        
        if (operations.length === 0) {
            return `
                <div class="empty-state">
                    <p>📭 Chưa có giao dịch mua sắm nào</p>
                    <small>Thêm giao dịch mới để xem ở đây</small>
                </div>
            `;
        }
        
        const sortedOps = operations.sort((a, b) => {
            const dateA = new Date(a.date || a.createdAt || a.dateKey);
            const dateB = new Date(b.date || b.createdAt || b.dateKey);
            return dateB - dateA;
        });
        
        console.log('🛒 Sorted operations:', sortedOps);
        
        let historyHTML = '';
        let currentDateGroup = null;
        
        for (const op of sortedOps) {
            const opDate = convertToDisplayFormat(op.date || op.dateKey || op.createdAt);
            
            if (opDate !== currentDateGroup) {
                if (currentDateGroup !== null) {
                    historyHTML += `</div></div>`;
                }
                
                currentDateGroup = opDate;
                const dailyOps = sortedOps.filter(item => 
                    convertToDisplayFormat(item.date || item.dateKey || item.createdAt) === opDate
                );
                const dailyTotal = dailyOps.reduce((sum, item) => sum + (item.amount || 0), 0);
                
                historyHTML += `
                    <div class="day-group">
                        <div class="day-header">
                            <strong>${opDate}</strong>
                            <span class="day-total">${formatCurrency(dailyTotal)}</span>
                        </div>
                        <div class="operations-list">
                `;
            }
            
            historyHTML += createOperationHTML(op);
        }
        
        // Đóng thẻ cuối cùng
        if (currentDateGroup !== null) {
            historyHTML += `</div></div>`;
        }
        
        const totalCount = operations.length;
        const totalAmount = operations.reduce((sum, op) => sum + (op.amount || 0), 0);
        
        const html = `
            <div class="operations-history-full">
                <div class="operations-summary">
                    <div class="summary-item">
                        <span>Tổng giao dịch</span>
                        <strong>${totalCount}</strong>
                    </div>
                    <div class="summary-item">
                        <span>Tổng chi phí</span>
                        <strong>${formatCurrency(totalAmount)}</strong>
                    </div>
                </div>
                <div class="operations-timeline">
                    ${historyHTML}
                </div>
            </div>
        `;
        console.log('✅ Operations history HTML generated');
        return html;
        
    } catch (error) {
        console.error('❌ Error loading operations history:', error);
        return `
            <div class="empty-state error-state">
                <p>❌ Lỗi tải lịch sử mua sắm</p>
                <small>${error.message}</small>
            </div>
        `;
    }
}

function toggleOperationsHistory() {
    showOperationsHistory = !showOperationsHistory;
    console.log('🛒 Toggle operations history:', showOperationsHistory);
    loadInventoryTab();
}

// ============== PERIOD MANAGEMENT FUNCTIONS ==============
function togglePeriodSection() {
    isPeriodSectionVisible = !isPeriodSectionVisible;
    console.log('📊 Toggle period section:', isPeriodSectionVisible);
    loadInventoryTab();
}

async function getPeriodSectionHTML() {
    try {
        const operations = await getOperationsByPeriod(currentPeriod);
        const materialOps = operations.filter(op => op.type === 'material');
        const serviceOps = operations.filter(op => op.type === 'service');
        const materialHTML = await renderPeriodMaterialHistory(materialOps);
        const serviceHTML = await renderPeriodServiceHistory(serviceOps);
        
        return `
            <div class="period-main-section">
                <div class="period-section-header">
                    <div class="period-title">
                        <h3>📊 Lịch sử Mua sắm - ${formatPeriodDisplay(currentPeriod)}</h3>
                        <small class="period-range">
                            ${formatDateDisplay(currentPeriod.startDate)} - ${formatDateDisplay(currentPeriod.endDate)}
                        </small>
                    </div>
                    <div class="period-section-actions">
                        <button class="btn btn-sm btn-outline" onclick="togglePeriodSection()">
                            Ẩn
                        </button>
                    </div>
                </div>
                
                <div class="period-filters">
                    <div class="filter-group">
                        <label>📅 Kiểu xem:</label>
                        <div class="view-toggle">
                            <button class="btn btn-sm ${currentPeriodView === 'day' ? 'btn-primary' : 'btn-outline'}" onclick="changePeriodView('day')"> Theo ngày </button>
                            <button class="btn btn-sm ${currentPeriodView === 'group' ? 'btn-primary' : 'btn-outline'}" onclick="changePeriodView('group')"> Gộp nội dung </button>
                        </div>
                    </div>
                    <div class="filter-group">
                        <label>📋 Hiển thị:</label>
                        <div class="type-toggle">
                            <label class="checkbox-label">
                                <input type="checkbox" ${showMaterialHistory ? 'checked' : ''} onchange="toggleMaterialHistory()"> 🛒 Hàng...
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" ${showServiceHistory ? 'checked' : ''} onchange="toggleServiceHistory()"> 📝 Dịch vụ
                            </label>
                        </div>
                    </div>
                </div>

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
                <button class="btn btn-sm btn-secondary" onclick="togglePeriodSection()"> Đóng </button>
            </div>
        `;
    }
}

async function getOperationsByPeriod(period) {
    try {
        const operations = await dbGetAll('operations');
        const startDateStr = formatDate(period.startDate);
        const endDateStr = formatDate(period.endDate);
        
        console.log('📊 Getting operations for period:', { start: startDateStr, end: endDateStr });
        
        return operations.filter(op => {
            const opDate = op.dateKey || (op.date ? op.date.split('T')[0] : '');
            return opDate && opDate >= startDateStr && opDate <= endDateStr;
        });
    } catch (error) {
        console.error('❌ Error getting operations by period:', error);
        return [];
    }
}

async function showPeriodOperations() {
    try {
        console.log('🔄 Loading period operations...');
        const operations = await getOperationsByPeriod(currentPeriod);
        const materialOps = operations.filter(op => op.type === 'material');
        const serviceOps = operations.filter(op => op.type === 'service');
        const materialHTML = await renderPeriodMaterialHistory(materialOps);
        const serviceHTML = await renderPeriodServiceHistory(serviceOps);
        
        const popupHTML = `
            <div class="popup period-popup">
                <button class="close-popup" data-action="close-popup">×</button>
                <div class="popup-header">
                    <h2>📊 Lịch sử Mua sắm - ${formatPeriodDisplay(currentPeriod)}</h2>
                    <p class="period-range">
                        ${formatDateDisplay(currentPeriod.startDate)} - ${formatDateDisplay(currentPeriod.endDate)}
                    </p>
                </div>
                
                <div class="period-filters">
                    <div class="filter-row-1">
                        <div class="view-toggle-compact">
                            <span class="filter-label">📅 Xem:</span>
                            <div class="view-toggle">
                                <button class="btn btn-sm ${currentPeriodView === 'day' ? 'btn-primary' : 'btn-outline'}" onclick="changePeriodView('day')"> Theo ngày </button>
                                <button class="btn btn-sm ${currentPeriodView === 'group' ? 'btn-primary' : 'btn-outline'}" onclick="changePeriodView('group')"> Gộp nội dung </button>
                            </div>
                        </div>
                        <div class="type-toggle-compact">
                            <span class="filter-label">📋 Hiển thị:</span>
                            <div class="type-toggle">
                                <label class="checkbox-label">
                                    <input type="checkbox" ${showMaterialHistory ? 'checked' : ''} onchange="toggleMaterialHistory()"> 🛒 Hàng hóa
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" ${showServiceHistory ? 'checked' : ''} onchange="toggleServiceHistory()"> 📝 Dịch vụ
                                </label>
                            </div>
                        </div>
                        <div class="period-navigation-compact">
                            <span class="filter-label">Kỳ:</span>
                            <div class="period-navigation">
                                <button class="btn btn-sm btn-outline" onclick="changeInventoryPeriod(-1)"> < </button>
                                <button class="btn btn-sm btn-outline" onclick="goToCurrentPeriod()"> Hiện tại </button>
                                <button class="btn btn-sm btn-outline" onclick="changeInventoryPeriod(1)"> > </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="summary-cards">
                    <div class="summary-card total-card">
                        <h4>Tổng chi phí</h4>
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

async function renderPeriodMaterialHistory(operations) {
    if (operations.length === 0) return '<p class="empty-state">Không có dữ liệu</p>';
    if (currentPeriodView === 'day') {
        return renderMaterialByDay(operations);
    } else {
        return renderMaterialByGroup(operations);
    }
}

async function renderPeriodServiceHistory(operations) {
    if (operations.length === 0) return '<p class="empty-state">Không có dữ liệu</p>';
    if (currentPeriodView === 'day') {
        return renderServiceByDay(operations);
    } else {
        return renderServiceByGroup(operations);
    }
}

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
                            <th>Tên hàng</th>
                            <th>SL</th>
                            <th>ĐVT</th>
                            <th>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dayOps.map(op => `
                            <tr>
                                <td>${op.name || 'Không tên'}</td>
                                <td>${op.quantity || 0}</td>
                                <td>${op.unit || ''}</td>
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

function renderMaterialByGroup(operations) {
    const groupedItems = {};
    
    operations.forEach(op => {
        const key = op.name + op.unit;
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
                    <th>Tên hàng</th>
                    <th>Tổng SL</th>
                    <th>ĐVT</th>
                    <th>Tổng tiền</th>
                    <th>Số lần mua</th>
                    <th>Giá TB</th>
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

function renderServiceByGroup(operations) {
    const groupedServices = {};
    
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
        const avgPrice = service.count > 0 ? service.totalAmount / service.count : 0;
        html += `
            <tr>
                <td><strong>${service.name}</strong></td>
                <td>${service.count}</td>
                <td>${formatCurrency(service.totalAmount)}</td>
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

function changePeriodView(view) {
    currentPeriodView = view;
    console.log('📅 Changing period view:', view);
    loadInventoryTab();
}

function toggleMaterialHistory() {
    showMaterialHistory = !showMaterialHistory;
    loadInventoryTab();
}

function toggleServiceHistory() {
    showServiceHistory = !showServiceHistory;
    loadInventoryTab();
}

async function exportPeriodData() {
    const operations = await getOperationsByPeriod(currentPeriod);
    const materialOps = operations.filter(op => op.type === 'material');
    const serviceOps = operations.filter(op => op.type === 'service');
    
    let content = `LỊCH SỬ MUA SẮM - ${formatPeriodDisplay(currentPeriod)}\n`;
    content += `Kỳ: ${formatDateDisplay(currentPeriod.startDate)} - ${formatDateDisplay(currentPeriod.endDate)}\n\n`;
    
    if (materialOps.length > 0) {
        content += '🛒 HÀNG HÓA:\n';
        content += 'Tên hàng\tSố lượng\tĐơn vị\tThành tiền\tNgày\n';
        materialOps.forEach(op => {
            const date = op.dateKey || (op.date ? op.date.split('T')[0] : '');
            content += `${op.name}\t${op.quantity || 0}\t${op.unit || ''}\t${op.amount || 0}\t${date}\n`;
        });
        content += '\n';
    }
    
    if (serviceOps.length > 0) {
        content += '📝 DỊCH VỤ:\n';
        content += 'Tên dịch vụ\tSố tiền\tNgày\n';
        serviceOps.forEach(op => {
            const date = op.dateKey || (op.date ? op.date.split('T')[0] : '');
            content += `${op.name}\t${op.amount || 0}\t${date}\n`;
        });
    }
    
    content += '\n=== TỔNG HỢP ===\n';
    content += `Tổng giao dịch: ${operations.length}\n`;
    content += `Hàng hóa: ${materialOps.length}\n`;
    content += `Dịch vụ: ${serviceOps.length}\n`;
    content += `Tổng chi: ${formatCurrency(operations.reduce((sum, op) => sum + (op.amount || 0), 0))}\n`;
    
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
}

function addInventoryStyles() {
    if (!document.getElementById('inventory-styles')) {
        const style = document.createElement('style');
        style.id = 'inventory-styles';
        style.textContent = `
            .inventory-content {
                padding: 20px;
                max-width: 1200px;
                margin: 0 auto;
            }
            .date-selector {
                margin-bottom: 20px;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .section {
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                margin-bottom: 20px;
            }
            .section h2 {
                margin-top: 0;
                color: #2c3e50;
                font-size: 1.5em;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
                margin-bottom: 15px;
            }
            .action-buttons {
                display: flex;
                gap: 10px;
                margin-top: 20px;
                justify-content: flex-end;
            }
            
            /* Thống kê kỳ */
            .period-stats {
                background: #ecf0f1;
                border: 1px solid #bdc3c7;
                border-radius: 6px;
                padding: 15px;
            }
            .period-stats h4 {
                margin-top: 0;
                margin-bottom: 10px;
                font-size: 14px;
                color: #2c3e50;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
            }
            .stat-item {
                background: white;
                padding: 8px;
                border-radius: 4px;
                text-align: center;
            }
            .stat-item span {
                display: block;
                font-size: 12px;
                color: #666;
                margin-bottom: 3px;
            }
            .stat-item strong {
                display: block;
                font-size: 13px;
                color: #2c3e50;
            }
            .warning-section {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                border-radius: 6px;
                padding: 15px;
                margin-bottom: 20px;
            }
            .warning-section h3 {
                margin-top: 0;
                color: #856404;
                font-size: 16px;
            }
            .warning-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid #ffeaa7;
            }
            .warning-item:last-child {
                border-bottom: none;
            }
            .warning-item span:first-child {
                font-weight: 500;
                color: #856404;
            }
            .warning-item span:last-child {
                color: #d39e00;
                font-size: 14px;
            }
        `;
        document.head.appendChild(style);
    }
}

function addOperationsHistoryStyles() {
    if (!document.getElementById('operations-history-styles')) {
        const style = document.createElement('style');
        style.id = 'operations-history-styles';
        style.textContent = `
            .operations-history-full {
                margin-top: 20px;
                padding: 15px;
                background: #f9f9f9;
                border-radius: 8px;
            }
            .operations-summary {
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #eee;
            }
            .operations-summary .summary-item {
                background: white;
                padding: 10px 15px;
                border-radius: 4px;
                flex: 1;
                text-align: center;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .operations-summary .summary-item span {
                display: block;
                font-size: 12px;
                color: #666;
                margin-bottom: 3px;
            }
            .operations-summary .summary-item strong {
                display: block;
                font-size: 15px;
                color: #2c3e50;
            }
            .operations-timeline {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .day-group {
                border: 1px solid #ddd;
                border-radius: 6px;
                overflow: hidden;
                background: white;
            }
            .day-header {
                background: #ecf0f1;
                padding: 10px 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 14px;
            }
            .day-header strong {
                color: #2c3e50;
            }
            .day-total {
                font-weight: bold;
                color: #27ae60;
            }
            .operations-list {
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .operation-item {
                border: 1px solid #f0f0f0;
                padding: 10px;
                border-radius: 4px;
                transition: background 0.2s;
            }
            .operation-item:hover {
                background: #f7f7f7;
            }
            .operation-row-1, .operation-row-2 {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
            }
            .operation-type {
                font-size: 1.2em;
            }
            .operation-name {
                font-weight: 500;
                flex-grow: 1;
                margin-left: 10px;
                color: #34495e;
            }
            .operation-amount {
                font-weight: bold;
                color: #e74c3c;
            }
            .operation-quantity {
                font-size: 13px;
                color: #7f8c8d;
            }
            .operation-description {
                font-size: 12px;
                color: #95a5a6;
                margin-top: 5px;
                border-top: 1px dashed #eee;
                padding-top: 5px;
            }
            .empty-state {
                text-align: center;
                padding: 30px 20px;
                color: #666;
            }
            .empty-state p {
                margin: 0 0 5px 0;
            }
            .empty-state small {
                font-size: 12px;
                color: #999;
            }
            .error-state {
                color: #e74c3c;
            }
            .popup-tabs {
                display: flex;
                gap: 5px;
                margin-bottom: 20px;
                border-bottom: 1px solid #e0e0e0;
            }
            .popup-tab-btn {
                flex: 1;
                padding: 10px;
                background: none;
                border: none;
                border-bottom: 3px solid transparent;
                cursor: pointer;
                text-align: center;
                font-weight: 500;
                color: #666;
                transition: all 0.3s;
                font-size: 14px;
            }
            .popup-tab-btn.active {
                border-bottom-color: #3498db;
                color: #3498db;
                background: #f8f9fa;
            }
            .popup-tab-content {
                display: none;
            }
            .popup-tab-content.active {
                display: block;
            }
        `;
        document.head.appendChild(style);
    }
}

function addPeriodSectionStyles() {
    if (!document.getElementById('period-section-styles')) {
        const style = document.createElement('style');
        style.id = 'period-section-styles';
        style.textContent = `
            .period-main-section {
                background: white;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                border: 1px solid #e0e0e0;
            }
            .period-section-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 2px solid #f0f0f0;
            }
            .period-title h3 {
                margin: 0;
                color: #2c3e50;
            }
            .period-range {
                display: block;
                font-size: 12px;
                color: #7f8c8d;
                margin-top: 5px;
            }
            .period-filters {
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
                gap: 15px;
                margin-bottom: 20px;
            }
            .period-content {
                margin-top: 20px;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .period-section h3 {
                color: #2980b9;
                border-bottom: 2px solid #3498db;
                padding-bottom: 5px;
                margin-bottom: 15px;
            }
            .period-action-buttons {
                margin-top: 20px;
                text-align: right;
            }
        `;
        document.head.appendChild(style);
    }
}

function addPeriodOperationsStyles() {
    if (!document.getElementById('period-operations-styles')) {
        const style = document.createElement('style');
        style.id = 'period-operations-styles';
        style.textContent = `
            .period-popup {
                max-width: 90vw;
                width: 900px;
            }
            .period-popup .popup-header {
                padding-bottom: 10px;
                border-bottom: 2px solid #f0f0f0;
                margin-bottom: 15px;
            }
            .period-popup .period-filters {
                grid-template-columns: 1fr;
            }
            .filter-row-1 {
                display: flex;
                justify-content: space-between;
                gap: 20px;
                padding: 10px 0;
                border-bottom: 1px solid #e0e0e0;
            }
            .view-toggle-compact, .type-toggle-compact, .period-navigation-compact {
                flex-basis: 33.33%;
            }
            .view-toggle-compact, .type-toggle-compact, .period-navigation-compact {
                border-right: 1px solid #eee;
                padding-right: 20px;
            }
            .period-navigation-compact {
                border-right: none;
                padding-right: 0;
            }
            .filter-label {
                display: block;
                font-weight: 500;
                color: #2c3e50;
                margin-bottom: 5px;
                font-size: 13px;
            }
            .summary-cards {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                margin-bottom: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 6px;
                border: 1px solid #eee;
            }
            .summary-card {
                background: white;
                padding: 10px;
                border-radius: 4px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .summary-card h4 {
                margin: 0 0 5px 0;
                font-size: 12px;
                color: #7f8c8d;
                font-weight: normal;
            }
            .summary-card .amount {
                font-size: 16px;
                font-weight: bold;
                color: #2c3e50;
            }
            .total-card .amount {
                color: #e74c3c;
                font-size: 18px;
            }
            .day-view .day-header {
                background: #ecf0f1;
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
            /* Responsive adjustments for period popup */
            @media (max-width: 768px) {
                .period-popup {
                    width: 95vw;
                }
                .filter-row-1 {
                    flex-direction: column;
                    gap: 15px;
                }
                .view-toggle-compact, .type-toggle-compact, .period-navigation-compact {
                    flex-basis: auto;
                    border-right: none;
                    padding-right: 0;
                    border-bottom: 1px dashed #eee;
                    padding-bottom: 10px;
                }
                .period-navigation-compact {
                    border-bottom: none;
                    padding-bottom: 0;
                }
                .summary-cards {
                    grid-template-columns: 1fr 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// ============== GLOBAL EXPORTS ==============\n
window.changeInventoryDateByInput = changeInventoryDateByInput;
window.changeInventoryPeriod = changeInventoryPeriod;
window.goToCurrentPeriod = goToCurrentPeriod;
window.togglePeriodSection = togglePeriodSection;
window.getPeriodSectionHTML = getPeriodSectionHTML;
window.changePeriodView = changePeriodView;
window.toggleMaterialHistory = toggleMaterialHistory;
window.toggleServiceHistory = toggleServiceHistory;
window.exportPeriodData = exportPeriodData;
window.showPeriodOperations = showPeriodOperations;

window.loadInventory = function() {
    console.log('📦 Loading inventory...');
    if (typeof initializeInventoryTab === 'function') initializeInventoryTab(); 
};