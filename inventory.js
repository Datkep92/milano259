// Inventory tab functionality
let currentInventory = [];
let showOperationsHistory = false;
let inventoryEventListenersActive = false;
let currentInventoryDate = formatDate(); // Thêm biến ngày hiện tại
let currentPeriod = getCurrentPeriod(); // Thêm biến kỳ hiện tại

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

// Hàm format ngày hiển thị
function formatDateDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Hàm format kỳ
function formatPeriodDisplay(period) {
    const monthNames = [
        'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
        'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    return `${monthNames[period.month - 1]}/${period.year}`;
}

// Hàm chuyển đổi ngày thành chuỗi YYYY-MM-DD
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

// Hàm thay đổi ngày
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

// Hàm thay đổi kỳ
async function changeInventoryPeriod(periodOffset) {
    try {
        console.log('🔄 Changing period by:', periodOffset);
        
        // Tính toán kỳ mới
        let newMonth = currentPeriod.month + periodOffset;
        let newYear = currentPeriod.year;
        
        if (newMonth > 12) {
            newMonth = 1;
            newYear += 1;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear -= 1;
        }
        
        // Tạo kỳ mới
        currentPeriod = {
            month: newMonth,
            year: newYear,
            startDate: new Date(newYear, newMonth - 1, 20),
            endDate: new Date(newYear, newMonth, 19)
        };
        
        console.log('📅 New period:', formatPeriodDisplay(currentPeriod));
        console.log('📅 Start date:', currentPeriod.startDate.toISOString().split('T')[0]);
        console.log('📅 End date:', currentPeriod.endDate.toISOString().split('T')[0]);
        
        loadInventoryTab();
        
    } catch (error) {
        console.error('❌ Error changing period:', error);
        showMessage('❌ Lỗi khi thay đổi kỳ', 'error');
    }
}

// Hàm chuyển sang kỳ hiện tại
async function goToCurrentPeriod() {
    currentPeriod = getCurrentPeriod();
    console.log('📅 Going to current period:', formatPeriodDisplay(currentPeriod));
    loadInventoryTab();
}

// Đưa hàm ra global scope
window.changeInventoryDateByInput = changeInventoryDateByInput;
window.changeInventoryPeriod = changeInventoryPeriod;
window.goToCurrentPeriod = goToCurrentPeriod;
// Initialize inventory tab
function initializeInventoryTab() {
    addOperationsHistoryStyles();
    addInventoryStyles();
    addPeriodSectionStyles(); // Thêm dòng này
    loadInventoryTab();
    setupInventoryEventListeners();
}

// Load inventory tab content
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

// Trong inventory.js

function setupInventoryEventListeners() {
    if (inventoryEventListenersActive) {
        console.log('⚠️ Inventory listeners already active');
        return;
    }
    
    // Remove old listeners
    document.removeEventListener('click', handleInventoryClick);
    
    // Add new listener
    document.addEventListener('click', handleInventoryClick);
    
    inventoryEventListenersActive = true;
    console.log('✅ Inventory event listeners setup');
}

function cleanupInventoryEventListeners() {
    document.removeEventListener('click', handleInventoryClick);
    inventoryEventListenersActive = false;
    console.log('🧹 Cleaned up inventory event listeners');
}

// Handle inventory clicks
function handleInventoryClick(e) {
    const action = e.target.dataset.action;
    const target = e.target;
    
    console.log('📦 Inventory click detected - Action:', action, 'Target:', target);
    
    if (!action) return;
    
    // DỪNG sự kiện lan truyền để reports.js không bắt được
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

// Hàm lấy thống kê tồn kho theo kỳ (ĐÃ SỬA)
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
        
        // Lọc lịch sử kho theo kỳ
        const periodHistory = allHistory.filter(record => {
            let recordDate = '';
            if (record.reportDate) {
                recordDate = record.reportDate;
            } else if (record.date) {
                recordDate = record.date.split('T')[0];
            }
            
            return recordDate >= startDateStr && recordDate <= endDateStr;
        });
        
        // Lọc vận hành (mua sắm) theo kỳ
        const periodOperations = allOperations.filter(operation => {
            let operationDate = '';
            if (operation.dateKey) {
                operationDate = operation.dateKey;
            } else if (operation.date) {
                operationDate = operation.date.split('T')[0];
            }
            
            return operationDate >= startDateStr && operationDate <= endDateStr;
        });
        
        // Thống kê hàng hóa từ inventoryHistory
        const imports = periodHistory.filter(record => record.type === 'in');
        const exports = periodHistory.filter(record => record.type === 'out');
        
        const totalImports = imports.reduce((sum, record) => sum + (record.quantity || 0), 0);
        const totalExports = exports.reduce((sum, record) => sum + (record.quantity || 0), 0);
        const importValue = imports.reduce((sum, record) => sum + (record.totalPrice || 0), 0);
        
        // Thống kê vận hành (mua sắm) theo loại
        const materialOps = periodOperations.filter(op => op.type === 'material');
        const serviceOps = periodOperations.filter(op => op.type === 'service');
        
        const materialTotal = materialOps.reduce((sum, op) => sum + (op.amount || 0), 0);
        const serviceTotal = serviceOps.reduce((sum, op) => sum + (op.amount || 0), 0);
        const totalOperations = materialTotal + serviceTotal;
        
        return {
            // Thống kê hàng hóa
            totalImports,
            totalExports,
            importValue,
            
            // Thống kê dịch vụ
            serviceCount: serviceOps.length,
            serviceValue: serviceTotal,
            
            // Thống kê nguyên liệu/hàng hóa từ vận hành
            materialCount: materialOps.length,
            materialValue: materialTotal,
            
            // Tổng hợp
            totalTransactions: periodHistory.length + periodOperations.length,
            totalOperationsValue: totalOperations,
            totalAllValue: importValue + totalOperations,
            
            // Dữ liệu gốc
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

// Render inventory tab với phần vận hành và lịch sử kỳ
async function renderInventoryTab(container, inventory) {
    const lowStockItems = inventory.filter(item => item.currentQuantity < item.minStock);
    const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
    
    // Lấy tổng nhập/xuất trong kỳ
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
    </div>
            <!-- PHẦN LỊCH SỬ KỲ - HIỂN THỊ TRỰC TIẾP -->
            ${isPeriodSectionVisible ? await getPeriodSectionHTML() : ''}
        </div>
                <div class="date-selector">
                    <!-- THỐNG KÊ KỲ -->
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
            </div>
        </div>

        <div class="section">
        <h2>📦 Tồn Kho ${formatCurrency(totalValue)} </h2>

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
                </div>
            ` : ''}

           
           
    `;
}
// Show product history popup
async function showProductHistoryPopup(productId) {
    const product = await dbGet('inventory', productId);
    if (!product) {
        showMessage('Không tìm thấy sản phẩm', 'error');
        return;
    }
    
    const history = await dbGetAll('inventoryHistory', 'productId', IDBKeyRange.only(productId));
    
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

// Format date time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Setup inventory history event listeners
function setupInventoryHistoryEventListeners(productId) {
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="add-inventory-record"]')) {
            showAddInventoryRecordPopup(productId);
        }
    });
}

// Show add inventory record popup
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
                <label>Đơn giá:</label>
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

// Setup add inventory record event listeners
function setupAddInventoryRecordEventListeners(productId) {
    // Show/hide price field based on transaction type
    const recordType = document.getElementById('recordType');
    const priceGroup = document.getElementById('priceGroup');
    
    recordType.addEventListener('change', function() {
        priceGroup.style.display = this.value === 'in' ? 'block' : 'none';
    });
    
    document.addEventListener('click', async function(e) {
        if (e.target.matches('[data-action="save-inventory-record"]')) {
            const type = document.getElementById('recordType').value;
            const quantity = parseFloat(document.getElementById('recordQuantity').value);
            const unitPrice = type === 'in' ? parseFloat(document.getElementById('recordUnitPrice').value) : 0;
            const note = document.getElementById('recordNote').value.trim();
            
            if (!quantity || quantity <= 0) {
                showMessage('Vui lòng nhập số lượng hợp lệ', 'error');
                return;
            }
            
            if (type === 'in' && (!unitPrice || unitPrice <= 0)) {
                showMessage('Vui lòng nhập đơn giá hợp lệ', 'error');
                return;
            }
            
            try {
                await addInventoryRecord(productId, type, quantity, unitPrice, note);
                showMessage('Đã thêm giao dịch thành công!', 'success');
                closePopup();
                // Refresh the history popup
                showProductHistoryPopup(productId);
                // Refresh main inventory tab
                loadInventoryTab();
                
            } catch (error) {
                console.error('Error adding inventory record:', error);
                showMessage('Lỗi khi thêm giao dịch', 'error');
            }
        }
    });
}

// Add inventory record
async function addInventoryRecord(productId, type, quantity, unitPrice, note) {
    const product = await dbGet('inventory', productId);
    if (!product) {
        throw new Error('Product not found');
    }
    
    // Calculate new quantity
    let newQuantity = product.currentQuantity;
    if (type === 'in') {
        newQuantity += quantity;
    } else if (type === 'out') {
        if (quantity > product.currentQuantity) {
            throw new Error('Số lượng xuất vượt quá tồn kho');
        }
        newQuantity -= quantity;
    }
    
    // Calculate new average price and total value
    let newAveragePrice = product.averagePrice;
    let newTotalValue = product.totalValue;
    
    if (type === 'in') {
        const totalCost = product.totalValue + (quantity * unitPrice);
        newAveragePrice = totalCost / newQuantity;
        newTotalValue = totalCost;
    } else if (type === 'out') {
        newTotalValue = newQuantity * newAveragePrice;
    }
    
    // Add history record
    const historyRecord = {
        productId: productId,
        type: type,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: type === 'in' ? quantity * unitPrice : null,
        note: note,
        createdBy: getCurrentUser().employeeId,
        date: new Date().toISOString()
    };
    
    await dbAdd('inventoryHistory', historyRecord);
    
    // Update product inventory
    await dbUpdate('inventory', productId, {
        currentQuantity: newQuantity,
        averagePrice: newAveragePrice,
        totalValue: newTotalValue,
        updatedAt: new Date().toISOString()
    });
}

// Show add inventory popup
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
                <label for="newProductPrice">Đơn giá:</label>
                <input type="number" id="newProductPrice" placeholder="Giá nhập">
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

// Setup add inventory event listeners
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
                const productId = 'SP' + Date.now().toString().slice(-4);
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
                
                // Add initial inventory record if quantity > 0
                if (quantity > 0) {
                    const historyRecord = {
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

// Operations functionality moved from reports.js
let currentOperationsType = 'material';

// FIX: Hàm tạo ID cho vận hành
function generateOperationId() {
    return 'op_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

// FIX: Hàm hiển thị popup vận hành
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
                    <label>Tên / Mô tả:</label>
                    <input type="text" id="materialName" placeholder="Tên nguyên liệu/hàng hóa">
                </div>
                <div class="form-group">
                    <label>Số lượng:</label>
                    <input type="number" id="materialQuantity" placeholder="Số lượng" min="0">
                </div>
                <div class="form-group">
                    <label>Đơn vị (vd: kg, gói):</label>
                    <input type="text" id="materialUnit" placeholder="Đơn vị">
                </div>
                <div class="form-group">
                    <label>Thành tiền (tổng):</label>
                    <input type="number" id="materialAmount" placeholder="Thành tiền" min="0">
                </div>
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

// FIX: Hàm lưu nguyên liệu
async function saveMaterial() {
    const name = document.getElementById('materialName').value.trim();
    const quantity = parseFloat(document.getElementById('materialQuantity').value);
    const unit = document.getElementById('materialUnit').value.trim();
    const amount = parseFloat(document.getElementById('materialAmount').value);

    if (!name || isNaN(quantity) || quantity <= 0 || isNaN(amount) || amount <= 0) {
        showMessage('Vui lòng nhập đầy đủ Tên, Số lượng và Thành tiền hợp lệ.', 'error');
        return;
    }

    try {
        const currentUser = getCurrentUser();
        const operationId = generateOperationId();
        
        // SỬA: Sử dụng ngày đã chọn trong inventory
        const selectedDate = currentInventoryDate;
        const isoDate = new Date(selectedDate + 'T12:00:00').toISOString();

        console.log('📅 Saving material for selected date:', selectedDate);

        // 1. Tạo Operation Record với ngày đã chọn
        const operationRecord = {
            operationId: operationId,
            date: isoDate,
            dateKey: selectedDate,
            type: 'material',
            name: name,
            quantity: quantity,
            unit: unit,
            amount: amount,
            createdBy: currentUser.employeeId,
            createdAt: isoDate
        };

        await dbAdd('operations', operationRecord);
        console.log('✅ Saved operation record for date:', selectedDate);

        // 2. Cập nhật Kho hàng
        const inventoryItems = await dbGetAll('inventory');
        let product = inventoryItems.find(p => p.name.toLowerCase() === name.toLowerCase());
        
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
            productId: product.productId,
            type: 'in',
            quantity: quantity,
            unitPrice: amount / quantity,
            totalPrice: amount,
            note: `Mua sắm vận hành: ${name} - Ngày: ${formatDateDisplay(selectedDate)}`,
            createdBy: currentUser.employeeId,
            date: isoDate,
            reportDate: selectedDate // Thêm reportDate để lọc theo kỳ
        };
        await dbAdd('inventoryHistory', historyRecord);
        
        // 4. Cập nhật tồn kho
        const totalQuantityBefore = product.currentQuantity;
        const totalValueBefore = product.totalValue;
        
        const newTotalQuantity = totalQuantityBefore + quantity;
        const newTotalValue = totalValueBefore + amount;
        const newAveragePrice = newTotalQuantity > 0 ? newTotalValue / newTotalQuantity : 0;
        
        await dbUpdate('inventory', product.productId, {
            currentQuantity: newTotalQuantity,
            totalValue: newTotalValue,
            averagePrice: newAveragePrice,
            updatedAt: isoDate
        });

        console.log('✅ Updated inventory for date:', selectedDate);
        showMessage(`✅ Đã lưu mua sắm Nguyên liệu cho ngày ${formatDateDisplay(selectedDate)}`, 'success');
        closePopup();
        loadInventoryTab();

    } catch (error) {
        console.error('Error saving material operation:', error);
        showMessage('❌ Lỗi khi lưu mua sắm Nguyên liệu', 'error');
    }
}

// FIX: Hàm lưu dịch vụ
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
        
        // SỬA: Sử dụng ngày đã chọn trong inventory
        const selectedDate = currentInventoryDate;
        const isoDate = new Date(selectedDate + 'T12:00:00').toISOString();

        console.log('📅 Saving service for selected date:', selectedDate);

        // Tạo Operation Record với ngày đã chọn
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

        showMessage(`✅ Đã lưu mua sắm Dịch vụ cho ngày ${formatDateDisplay(selectedDate)}`, 'success');
        closePopup();
        loadInventoryTab();

    } catch (error) {
        console.error('Error saving service operation:', error);
        showMessage('❌ Lỗi khi lưu mua sắm Dịch vụ', 'error');
    }
}
// Thêm vào hàm addOperationsHistoryStyles() hoặc tạo hàm mới
function addInventoryStyles() {
    if (!document.getElementById('inventory-styles')) {
        const style = document.createElement('style');
        style.id = 'inventory-styles';
        style.textContent = `
            /* Date and Period Selector */
            .date-period-selector {
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            @media (max-width: 768px) {
                .date-period-selector {
                    grid-template-columns: 1fr;
                }
            }
            
            .date-selector, .period-selector {
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .date-selector h3, .period-selector h3 {
                margin-top: 0;
                margin-bottom: 10px;
                font-size: 16px;
                color: #2c3e50;
            }
            
            .date-input {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                margin-bottom: 10px;
            }
            
            .date-actions {
                display: flex;
                gap: 10px;
            }
            
            .period-navigation {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .period-display {
                flex: 1;
                text-align: center;
                padding: 10px;
                background: #f8f9fa;
                border-radius: 6px;
            }
            
            .period-display strong {
                display: block;
                font-size: 16px;
                color: #2c3e50;
            }
            
            .period-display small {
                display: block;
                color: #666;
                font-size: 12px;
                margin-top: 2px;
            }
            
            .period-actions {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
            }
            
            .period-stats {
                margin-top: 15px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 6px;
                border-left: 4px solid #3498db;
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
            
            /* Warning Section */
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

// FIX: Setup event listeners cho vận hành
function setupOperationsEventListeners(initialTab) {
    document.removeEventListener('click', handleOperationsClick); 
    document.addEventListener('click', handleOperationsClick);

    // Thiết lập tab active ban đầu
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

// FIX: Hàm xử lý click trong popup vận hành
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

// FIX: Hàm tính tổng vận hành theo loại
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

// FIX: Hiển thị lịch sử vận hành
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
        
        // Sắp xếp theo ngày mới nhất
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
                const dailyTotal = dailyOps.reduce((sum, item) => sum + (item.amount || item.total || 0), 0);
                
                historyHTML += `
                    <div class="date-group">
                        <div class="date-group-header">
                            <h4>${opDate}</h4>
                            <span class="daily-total">${formatCurrency(dailyTotal)}</span>
                        </div>
                        <div class="date-group-operations">
                `;
            }
            
            historyHTML += createOperationHTML(op);
        }
        
        if (currentDateGroup !== null) {
            historyHTML += `</div></div>`;
        }
        
        const totalAmount = sortedOps.reduce((sum, op) => sum + (op.amount || op.total || 0), 0);
        const totalCount = sortedOps.length;
        
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
// Thêm CSS cho operations history nếu chưa có
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
            }
            
            .summary-item {
                flex: 1;
                background: white;
                padding: 12px;
                border-radius: 6px;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .summary-item span {
                display: block;
                color: #666;
                font-size: 13px;
                margin-bottom: 5px;
            }
            
            .summary-item strong {
                display: block;
                font-size: 20px;
                color: #2c3e50;
            }
            
            .operations-timeline {
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .date-group {
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                margin-bottom: 10px;
            }
            
            .date-group-header {
                background: #f8f9fa;
                padding: 12px 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .date-group-header h4 {
                margin: 0;
                font-size: 15px;
                color: #2c3e50;
                font-weight: 600;
            }
            
            .daily-total {
                font-weight: bold;
                color: #27ae60;
                font-size: 14px;
            }
            
            .date-group-operations {
                padding: 10px;
            }
            
            .operation-item {
                padding: 12px;
                border-bottom: 1px solid #f5f5f5;
                transition: background 0.2s;
            }
            
            .operation-item:hover {
                background: #f8f9fa;
            }
            
            .operation-item:last-child {
                border-bottom: none;
            }
            
            .operation-row-1 {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 8px;
            }
            
            .operation-type {
                font-size: 16px;
                min-width: 24px;
            }
            
            .operation-name {
                flex: 1;
                font-weight: 500;
                color: #2c3e50;
                font-size: 14px;
            }
            
            .operation-row-2 {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .operation-quantity {
                color: #666;
                font-size: 13px;
            }
            
            .operation-amount {
                font-weight: bold;
                color: #e74c3c;
                font-size: 14px;
            }
            
            .operation-description {
                margin-top: 5px;
                color: #777;
                font-size: 12px;
                font-style: italic;
                padding-left: 34px;
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
            
            /* Popup Tabs */
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
// Hàm format tiền tệ - thêm nếu chưa có
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
// Helper function tạo HTML cho operation
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

// Helper function chuyển đổi định dạng ngày
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

// FIX: Hàm toggle lịch sử vận hành
function toggleOperationsHistory() {
    showOperationsHistory = !showOperationsHistory;
    console.log('🛒 Toggle operations history:', showOperationsHistory);
    loadInventoryTab();
}
// Hàm format ngày hiển thị
function formatDateDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}
// Thêm CSS cho period section
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
                margin: 0 0 5px 0;
                color: #2c3e50;
                font-size: 18px;
            }
            
            .period-range {
                color: #666;
                font-size: 14px;
            }
            
            .period-filters {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
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
            
            .period-summary {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .period-content {
                max-height: 600px;
                overflow-y: auto;
                padding: 10px;
                background: #f9f9f9;
                border-radius: 6px;
                margin-bottom: 15px;
            }
            
            .period-section-content {
                margin-bottom: 25px;
            }
            
            .period-section-content h4 {
                margin-top: 0;
                margin-bottom: 15px;
                color: #2c3e50;
                font-size: 16px;
                padding-bottom: 8px;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .period-action-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding-top: 15px;
                border-top: 1px solid #e0e0e0;
            }
            
            .day-view, .group-view {
                background: white;
                padding: 15px;
                border-radius: 6px;
                margin-bottom: 15px;
            }
            
            .day-group {
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                margin-bottom: 15px;
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
            
            .checkbox-label {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-right: 15px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }
}
// Hàm format tiền tệ
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
// Đưa các hàm cần thiết ra global scope
window.togglePeriodSection = togglePeriodSection;
window.getPeriodSectionHTML = getPeriodSectionHTML;
window.changePeriodBy = changePeriodBy;
window.goToCurrentPeriodView = goToCurrentPeriodView;
window.changePeriodView = changePeriodView;
window.toggleMaterialHistory = toggleMaterialHistory;
window.toggleServiceHistory = toggleServiceHistory;
window.exportPeriodData = exportPeriodData;





