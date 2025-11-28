// Inventory tab functionality
let currentInventory = [];

// Initialize inventory tab
function initializeInventoryTab() {
    loadInventoryTab();
    setupInventoryEventListeners();
}

// Load inventory tab content
async function loadInventoryTab() {
    const container = document.getElementById('inventory');
    if (!container) return;

    currentInventory = await dbGetAll('inventory');
    renderInventoryTab(container, currentInventory);
}

// Setup event listeners for inventory tab
function setupInventoryEventListeners() {
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="show-product-history"]')) {
            showProductHistoryPopup(e.target.dataset.productId);
        } else if (e.target.matches('[data-action="add-inventory"]')) {
            showAddInventoryPopup();
        }
    });
}

// Render inventory tab
function renderInventoryTab(container, inventory) {
    const lowStockItems = inventory.filter(item => item.currentQuantity < item.minStock);
    const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
    
    container.innerHTML = `
        <div class="section">
            <h2>📦 Quản lý Kho</h2>
            
            ${isAdmin() ? `
                <div class="action-buttons">
                    <button class="btn btn-primary" data-action="add-inventory">
                        + Thêm sản phẩm
                    </button>
                </div>
            ` : ''}

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

            <div class="section">
                <h3>🧺 Danh sách tồn kho</h3>
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
            </div>

            <div class="summary-card">
                <h3>Tổng giá trị tồn kho hiện tại</h3>
                <div class="amount">${formatCurrency(totalValue)}</div>
            </div>
        </div>
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