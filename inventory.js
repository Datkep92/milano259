// inventory.js - HOÀN CHỈNH

let currentInventory = [];
let showInventoryOperationsHistory = false;
let showInventoryReportsHistory = false;
let showPurchaseHistory = false;

// Initialize inventory tab
function initializeInventoryTab() {
    console.log('🔄 initializeInventoryTab called');
    loadInventoryTab();
    setupInventoryEventListeners();
}

// Load inventory tab content
async function loadInventoryTab() {
    const container = document.getElementById('inventory');
    console.log('📦 loadInventoryTab - container:', container);
    
    if (!container) {
        console.error('❌ Inventory container not found!');
        return;
    }

    try {
        showLoading(true);
        console.log('📦 Loading inventory data...');
        currentInventory = await dbGetAll('inventory');
        console.log('📦 Inventory data loaded:', currentInventory);
        
        renderInventoryTab(container, currentInventory);
        showLoading(false);
        
    } catch (error) {
        console.error('❌ Error loading inventory:', error);
        showMessage('Lỗi tải dữ liệu kho', 'error');
        showLoading(false);
    }
}

// Setup event listeners
function setupInventoryEventListeners() {
    console.log('🔧 Setting up inventory event listeners');
    
    document.addEventListener('click', function(e) {
        const action = e.target.dataset.action;
        console.log('🖱️ Inventory click - action:', action, 'target:', e.target);
        
        if (action === "show-product-history") {
            showProductHistoryPopup(e.target.dataset.productId);
        } else if (action === "add-inventory") {
            showAddInventoryPopup();
        } else if (action === "toggle-operations-history") {
            toggleInventoryOperationsHistory();
        } else if (action === "toggle-reports-history") {
            toggleInventoryReportsHistory();
        } else if (action === "toggle-purchase-history") {
            togglePurchaseHistory();
        } else if (action === "add-purchase") {
            showAddGoodsPopup();
        } else if (action === "open-operations-popup") {
            showOperationsPopup(e.target.dataset.type);
        } else if (action === "view-all-operations") {
            showAllOperationsHistory();
        } else if (action === "view-all-reports") {
            showAllReportsHistory();
        } else if (action === "view-all-purchases") {
            showAllGoodsHistory();
        } else if (action === "save-goods") {
            saveGoodsRecord();
        } else if (action === "save-new-product") {
            saveNewProduct();
        }
    });
}

// Toggle functions
function toggleInventoryOperationsHistory() {
    showInventoryOperationsHistory = !showInventoryOperationsHistory;
    loadInventoryTab();
}

function toggleInventoryReportsHistory() {
    showInventoryReportsHistory = !showInventoryReportsHistory;
    loadInventoryTab();
}

function togglePurchaseHistory() {
    showPurchaseHistory = !showPurchaseHistory;
    loadInventoryTab();
}

// Render inventory tab
function renderInventoryTab(container, inventory) {
    console.log('🎨 Rendering inventory tab with', inventory.length, 'products');
    
    const lowStockItems = inventory.filter(item => item.currentQuantity < item.minStock);
    const totalValue = inventory.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    
    container.innerHTML = `
        <div class="section">
            <h2>📦 Quản lý Kho</h2>
            
            <!-- NÚT HÀNH ĐỘNG -->
            <div class="action-buttons">
                <button class="btn btn-primary" data-action="add-inventory">
                    + Thêm sản phẩm
                </button>
                <button class="btn btn-success" data-action="add-purchase">
                    💰 Nhập hàng hóa
                </button>
                <button class="btn btn-info" data-action="open-operations-popup" data-type="material">
                    🛒 Nguyên liệu
                </button>
                <button class="btn btn-info" data-action="open-operations-popup" data-type="service">
                    📝 Dịch vụ
                </button>
            </div>

            <!-- NÚT LỊCH SỬ -->
            <div class="action-buttons">
                <button class="btn btn-secondary ${showInventoryReportsHistory ? 'active' : ''}" data-action="toggle-reports-history">
                    📜 Lịch sử Báo cáo
                </button>
                <button class="btn btn-secondary ${showInventoryOperationsHistory ? 'active' : ''}" data-action="toggle-operations-history">
                    🛒 Lịch sử Mua sắm
                </button>
                <button class="btn btn-secondary ${showPurchaseHistory ? 'active' : ''}" data-action="toggle-purchase-history">
                    🧾 Lịch sử Nhập hàng
                </button>
            </div>

            <!-- CẢNH BÁO TỒN KHO THẤP -->
            ${lowStockItems.length > 0 ? `
                <div class="alert alert-warning">
                    <h3>⚠ SẢN PHẨM SẮP HẾT HÀNG</h3>
                    ${lowStockItems.map(item => `
                        <div class="warning-item">
                            <span><strong>${item.name}</strong></span>
                            <span>Tồn: ${item.currentQuantity} | Tối thiểu: ${item.minStock}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <!-- DANH SÁCH TỒN KHO -->
            <div class="section">
                <h3>🧺 Danh sách tồn kho (${inventory.length} sản phẩm)</h3>
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
                            <tr class="${item.currentQuantity < item.minStock ? 'low-stock-row' : ''}">
                                <td>${index + 1}</td>
                                <td><strong>${item.name}</strong></td>
                                <td>${item.unit || 'cái'}</td>
                                <td>${item.currentQuantity || 0}</td>
                                <td>${formatCurrency(item.totalValue || 0)}</td>
                                <td>
                                    <button class="btn btn-primary btn-sm" 
                                            data-action="show-product-history" 
                                            data-product-id="${item.productId}">
                                        Lịch sử
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                        ${inventory.length === 0 ? `
                            <tr>
                                <td colspan="6" style="text-align: center; padding: 40px;">
                                    <p>📭 Chưa có sản phẩm nào trong kho</p>
                                    <button class="btn btn-primary" data-action="add-inventory">
                                        + Thêm sản phẩm đầu tiên
                                    </button>
                                </td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>

            <!-- TỔNG GIÁ TRỊ -->
            <div class="summary-card">
                <h3>💰 Tổng giá trị tồn kho hiện tại</h3>
                <div class="amount">${formatCurrency(totalValue)}</div>
            </div>

            <!-- LỊCH SỬ MUA SẮM -->
            ${showInventoryOperationsHistory ? `
                <div class="history-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: #17a2b8;">🛒 Lịch sử Mua sắm Vận hành</h3>
                        <button class="btn btn-info btn-sm" data-action="view-all-operations">
                            Xem tất cả
                        </button>
                    </div>
                    ${renderOperationsHistorySection()}
                </div>
            ` : ''}

            <!-- LỊCH SỬ BÁO CÁO -->
            ${showInventoryReportsHistory ? `
                <div class="history-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: #6c757d;">📜 Lịch sử Báo cáo</h3>
                        <button class="btn btn-secondary btn-sm" data-action="view-all-reports">
                            Xem tất cả
                        </button>
                    </div>
                    ${renderReportsHistorySection()}
                </div>
            ` : ''}

            <!-- LỊCH SỬ NHẬP HÀNG -->
            ${showPurchaseHistory ? `
                <div class="history-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: #28a745;">🧾 Lịch sử Hàng hóa/Dịch vụ</h3>
                        <button class="btn btn-success btn-sm" data-action="view-all-purchases">
                            Xem tất cả
                        </button>
                    </div>
                    ${renderGoodsHistorySection()}
                </div>
            ` : ''}
        </div>
    `;
    
    console.log('✅ Inventory tab rendered successfully');
}

// =========================================================================
// HÀM POPUP VÀ FORM
// =========================================================================

function showAddInventoryPopup() {
    const popupHTML = `
        <div class="popup" style="max-width: 500px;">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>➕ Thêm sản phẩm mới</h3>
            
            <div class="form-group">
                <label for="newProductName">Tên sản phẩm:</label>
                <input type="text" id="newProductName" placeholder="Nhập tên sản phẩm" required>
            </div>
            
            <div class="form-group">
                <label for="newProductUnit">Đơn vị tính:</label>
                <input type="text" id="newProductUnit" placeholder="VD: kg, hộp, cái" required>
            </div>
            
            <div class="form-group">
                <label for="newProductMinStock">Tồn kho tối thiểu:</label>
                <input type="number" id="newProductMinStock" placeholder="Số lượng cảnh báo" min="0" value="10" required>
            </div>
            
            <div class="form-group">
                <label for="newProductQuantity">Số lượng ban đầu:</label>
                <input type="number" id="newProductQuantity" placeholder="Số lượng hiện có" min="0" value="0" required>
            </div>
            
            <div class="form-group">
                <label for="newProductPrice">Đơn giá:</label>
                <input type="number" id="newProductPrice" placeholder="Giá nhập" min="0" value="0" required>
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-primary" data-action="save-new-product">Lưu</button>
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
}

async function saveNewProduct() {
    const name = document.getElementById('newProductName').value.trim();
    const unit = document.getElementById('newProductUnit').value.trim();
    const minStock = parseInt(document.getElementById('newProductMinStock').value) || 0;
    const quantity = parseInt(document.getElementById('newProductQuantity').value) || 0;
    const price = parseFloat(document.getElementById('newProductPrice').value) || 0;
    
    if (!name || !unit) {
        showMessage('Vui lòng nhập tên và đơn vị tính', 'error');
        return;
    }
    
    try {
        const productId = 'SP' + Date.now().toString().slice(-6);
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
        
        showMessage('✅ Đã thêm sản phẩm thành công!', 'success');
        closePopup();
        loadInventoryTab();
        
    } catch (error) {
        console.error('Error adding product:', error);
        showMessage('❌ Lỗi khi thêm sản phẩm', 'error');
    }
}

function showAddGoodsPopup() {
    const popupHTML = `
        <div class="popup" style="max-width: 500px;">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>💰 Nhập Hàng Hóa/Dịch Vụ</h3>
            
            <div class="form-group">
                <label>Tên hàng hóa/dịch vụ:</label>
                <input type="text" id="goodsName" placeholder="VD: Cà phê hạt, Dịch vụ sửa máy..." required>
            </div>
            
            <div class="form-group">
                <label>Loại:</label>
                <select id="goodsType" required>
                    <option value="material">Nguyên liệu</option>
                    <option value="service">Dịch vụ</option>
                    <option value="equipment">Thiết bị</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Số lượng:</label>
                <input type="number" id="goodsQuantity" placeholder="Số lượng" min="1" value="1" required>
            </div>
            
            <div class="form-group">
                <label>Đơn vị:</label>
                <input type="text" id="goodsUnit" placeholder="VD: kg, cái, lần..." required>
            </div>
            
            <div class="form-group">
                <label>Đơn giá:</label>
                <input type="number" id="goodsUnitPrice" placeholder="Giá cho 1 đơn vị" min="0" required>
            </div>
            
            <div class="form-group">
                <label>Tổng tiền:</label>
                <input type="number" id="goodsTotal" placeholder="Tổng chi phí" min="0" required>
            </div>
            
            <div class="form-group">
                <label>Ghi chú:</label>
                <textarea id="goodsNote" placeholder="Mô tả thêm..."></textarea>
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-primary" data-action="save-goods">💾 Lưu</button>
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
}

async function saveGoodsRecord() {
    const name = document.getElementById('goodsName').value.trim();
    const type = document.getElementById('goodsType').value;
    const quantity = parseInt(document.getElementById('goodsQuantity').value) || 0;
    const unit = document.getElementById('goodsUnit').value.trim();
    const unitPrice = parseFloat(document.getElementById('goodsUnitPrice').value) || 0;
    const total = parseFloat(document.getElementById('goodsTotal').value) || 0;
    const note = document.getElementById('goodsNote').value.trim();
    
    if (!name) {
        showMessage('Vui lòng nhập tên hàng hóa/dịch vụ', 'error');
        return;
    }
    
    try {
        const goodsRecord = {
            goodsId: 'goods_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: name,
            type: type,
            quantity: quantity,
            unit: unit,
            unitPrice: unitPrice,
            total: total,
            note: note,
            createdBy: getCurrentUser().employeeId,
            createdAt: new Date().toISOString(),
            date: new Date().toISOString()
        };
        
        await dbAdd('goodsHistory', goodsRecord);
        showMessage('✅ Đã lưu thông tin hàng hóa/dịch vụ', 'success');
        closePopup();
        loadInventoryTab();
        
    } catch (error) {
        console.error('Error saving goods:', error);
        showMessage('❌ Lỗi khi lưu thông tin: ' + error.message, 'error');
    }
}

function showOperationsPopup(type = 'material') {
    const typeName = type === 'material' ? 'Nguyên liệu' : 'Dịch vụ';
    const popupHTML = `
        <div class="popup" style="max-width: 500px;">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>🔧 Mua sắm Vận hành - ${typeName}</h3>
            
            <div class="form-group">
                <label>Tên ${typeName}:</label>
                <input type="text" id="operationName" placeholder="Tên ${typeName.toLowerCase()}">
            </div>
            
            ${type === 'material' ? `
                <div class="form-group">
                    <label>Số lượng:</label>
                    <input type="number" id="operationQuantity" placeholder="Số lượng" min="0">
                </div>
                <div class="form-group">
                    <label>Đơn vị:</label>
                    <input type="text" id="operationUnit" placeholder="Đơn vị">
                </div>
            ` : ''}
            
            <div class="form-group">
                <label>Thành tiền:</label>
                <input type="number" id="operationAmount" placeholder="Thành tiền" min="0">
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                <button class="btn btn-primary" data-action="save-operation">💾 Lưu</button>
            </div>
        </div>
    `;
    showPopup(popupHTML);
}

async function showProductHistoryPopup(productId) {
    const product = currentInventory.find(item => item.productId === productId);
    if (!product) {
        showMessage('Không tìm thấy sản phẩm', 'error');
        return;
    }
    
    try {
        const history = await dbGetAll('inventoryHistory', 'productId', IDBKeyRange.only(productId));
        
        const popupHTML = `
            <div class="popup" style="max-width: 800px;">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>📜 Lịch sử - ${product.name}</h3>
                <p><strong>ĐVT:</strong> ${product.unit} | <strong>Tồn kho:</strong> ${product.currentQuantity}</p>
                
                ${history.length > 0 ? `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Loại</th>
                                <th>SL</th>
                                <th>Đơn giá</th>
                                <th>Thành tiền</th>
                                <th>Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${history.map(record => `
                                <tr>
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
                ` : `
                    <div style="text-align: center; padding: 40px;">
                        <p>📭 Chưa có lịch sử nhập/xuất</p>
                    </div>
                `}
                
                <div class="popup-actions">
                    <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        
    } catch (error) {
        console.error('Error loading product history:', error);
        showMessage('❌ Lỗi tải lịch sử sản phẩm', 'error');
    }
}

// =========================================================================
// HÀM RENDER LỊCH SỬ
// =========================================================================

async function renderOperationsHistorySection() {
    try {
        const operations = await dbGetAll('operations');
        if (!operations || operations.length === 0) {
            return `<div style="text-align: center; padding: 20px; color: #666;">
                <p>📭 Chưa có giao dịch mua sắm nào</p>
                <small>Thêm giao dịch mua nguyên liệu/dịch vụ để xem ở đây</small>
            </div>`;
        }
        
        const recentOps = operations.slice(0, 3);
        
        return `
            <div>
                ${recentOps.map(op => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #e9ecef;">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: #333;">${op.name}</div>
                            <div style="font-size: 12px; color: #666;">
                                ${op.quantity ? `${op.quantity} ${op.unit} • ` : ''}${formatDateDisplay(op.date)}
                            </div>
                        </div>
                        <div style="font-weight: bold; color: #dc3545; font-size: 16px;">
                            ${formatCurrency(op.amount || 0)}
                        </div>
                    </div>
                `).join('')}
                ${operations.length > 3 ? `
                    <div style="text-align: center; padding: 10px; color: #17a2b8;">
                        +${operations.length - 3} giao dịch khác
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        return `<div style="text-align: center; padding: 20px; color: #dc3545;">
            <p>❌ Lỗi tải dữ liệu mua sắm</p>
        </div>`;
    }
}

async function renderReportsHistorySection() {
    try {
        const reports = await dbGetAll('reports');
        if (!reports || reports.length === 0) {
            return `<div style="text-align: center; padding: 20px; color: #666;">
                <p>📭 Chưa có báo cáo nào</p>
                <small>Báo cáo sẽ xuất hiện sau khi lưu từ tab Báo cáo</small>
            </div>`;
        }
        
        const recentReports = reports.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
        
        return `
            <div>
                ${recentReports.map(report => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #e9ecef;">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: #333;">${formatDateDisplay(report.date)}</div>
                            <div style="font-size: 12px; color: #666;">
                                DT: ${formatCurrency(report.revenue || 0)} • TN: ${formatCurrency(calculateActualReceived(report) || 0)}
                            </div>
                        </div>
                        <div style="color: #28a745; font-size: 14px;">
                            ${report.exports?.length || 0} xuất kho
                        </div>
                    </div>
                `).join('')}
                ${reports.length > 3 ? `
                    <div style="text-align: center; padding: 10px; color: #6c757d;">
                        +${reports.length - 3} báo cáo khác
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        return `<div style="text-align: center; padding: 20px; color: #dc3545;">
            <p>❌ Lỗi tải dữ liệu báo cáo</p>
        </div>`;
    }
}

async function renderGoodsHistorySection() {
    try {
        const goodsHistory = await dbGetAll('goodsHistory');
        if (!goodsHistory || goodsHistory.length === 0) {
            return `<div style="text-align: center; padding: 20px; color: #666;">
                <p>📭 Chưa có giao dịch nhập hàng nào</p>
                <small>Thêm hàng hóa/dịch vụ để xem ở đây</small>
            </div>`;
        }
        
        const recentGoods = goodsHistory.slice(0, 3);
        
        return `
            <div>
                ${recentGoods.map(goods => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #e9ecef;">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: #333;">${goods.name}</div>
                            <div style="font-size: 12px; color: #666;">
                                ${goods.quantity ? `${goods.quantity} ${goods.unit} • ` : ''}${formatDateDisplay(goods.date)}
                            </div>
                        </div>
                        <div style="font-weight: bold; color: #ff6b00; font-size: 16px;">
                            ${formatCurrency(goods.total || 0)}
                        </div>
                    </div>
                `).join('')}
                ${goodsHistory.length > 3 ? `
                    <div style="text-align: center; padding: 10px; color: #28a745;">
                        +${goodsHistory.length - 3} giao dịch khác
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        return `<div style="text-align: center; padding: 20px; color: #dc3545;">
            <p>❌ Lỗi tải dữ liệu nhập hàng</p>
        </div>`;
    }
}



// =========================================================================
// HÀM HỖ TRỢ
// =========================================================================

function formatCurrency(number) {
    if (typeof number !== 'number' || isNaN(number)) return '0 ₫';
    return number.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

function formatDateDisplay(dateString) {
    if (!dateString) return 'Không có ngày';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    } catch (error) {
        return dateString;
    }
}

function formatDateTime(dateString) {
    if (!dateString) return 'Không có ngày';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

function calculateActualReceived(report) {
    const totalExpenses = report.expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
    const totalTransfers = report.transfers?.reduce((sum, trans) => sum + (trans.amount || 0), 0) || 0;
    return (report.openingBalance || 0) + (report.revenue || 0) - totalExpenses - totalTransfers - (report.closingBalance || 0);
}

// Hàm giả lập (nếu chưa có)
function getCurrentUser() {
    return { employeeId: 'NV001', name: 'Admin' };
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

function showMessage(message, type = 'info') {
    alert(`[${type.toUpperCase()}] ${message}`);
}

function showPopup(content) {
    const popupContainer = document.getElementById('popupContainer');
    if (popupContainer) {
        popupContainer.innerHTML = content;
        popupContainer.classList.add('active');
    }
}

function closePopup() {
    const popupContainer = document.getElementById('popupContainer');
    if (popupContainer) {
        popupContainer.classList.remove('active');
        popupContainer.innerHTML = '';
    }
}
////
// =========================================================================
// HÀM XEM TOÀN BỘ LỊCH SỬ - SỬA GIỐNG REPORT
// =========================================================================

function showAllOperationsHistory() {
    showOperationsHistoryPopup();
}

function showAllReportsHistory() {
    showReportsHistoryPopup();
}

function showAllGoodsHistory() {
    showGoodsHistoryPopup();
}

// Hàm hiển thị popup lịch sử hàng hóa/dịch vụ - GIỐNG REPORT
async function showGoodsHistoryPopup() {
    if (!isAdmin()) {
        showMessage('Chỉ quản trị viên được xem lịch sử nhập hàng', 'error');
        return;
    }
    
    try {
        const goodsHistory = await dbGetAll('goodsHistory');
        const sortedGoods = goodsHistory.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);
        
        const popupHTML = `
            <div class="popup" style="max-width: 800px;">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>🧾 Lịch sử Nhập Hàng Hóa/Dịch Vụ</h3>
                
                <div class="history-list">
                    ${sortedGoods.map(goods => `
                        <div class="history-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee;">
                            <div style="flex: 1;">
                                <div class="history-date" style="font-size: 12px; color: #666;">${formatDateDisplay(goods.date)}</div>
                                <div class="history-details" style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: bold;">
                                        ${goods.type === 'material' ? '🛒' : goods.type === 'service' ? '🔧' : '⚙️'} 
                                        ${goods.name}
                                    </span>
                                    <span style="font-weight: bold; color: #ff6b00;">${formatCurrency(goods.total)}</span>
                                </div>
                                ${goods.quantity ? `
                                    <div class="history-quantity" style="font-size: 12px; color: #666;">
                                        ${goods.quantity} ${goods.unit} • ${formatCurrency(goods.unitPrice)}/đơn vị
                                    </div>
                                ` : ''}
                                ${goods.note ? `
                                    <div class="history-note" style="font-size: 12px; color: #888; margin-top: 4px;">
                                        📝 ${goods.note}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                ${sortedGoods.length === 0 ? `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <p>📭 Chưa có giao dịch nhập hàng nào</p>
                    </div>
                ` : ''}
                
                <div class="popup-actions" style="display: flex; justify-content: flex-end; margin-top: 20px;">
                    <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        
    } catch (error) {
        console.error('Error loading goods history:', error);
        showMessage('❌ Lỗi khi tải lịch sử nhập hàng', 'error');
    }
}

// Hàm hiển thị popup lịch sử mua sắm - GIỐNG REPORT
async function showOperationsHistoryPopup() {
    if (!isAdmin()) {
        showMessage('Chỉ quản trị viên được xem lịch sử mua sắm', 'error');
        return;
    }
    
    try {
        const operations = await dbGetAll('operations');
        const sortedOperations = operations.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);
        
        const popupHTML = `
            <div class="popup" style="max-width: 800px;">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>🛒 Lịch sử Mua sắm Vận hành</h3>
                
                <div class="history-list">
                    ${sortedOperations.map(op => `
                        <div class="history-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee;">
                            <div style="flex: 1;">
                                <div class="history-date" style="font-size: 12px; color: #666;">${formatDateDisplay(op.date)}</div>
                                <div class="history-details" style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: bold;">
                                        ${op.type === 'material' ? '🛒' : '🔧'} ${op.name}
                                    </span>
                                    <span style="font-weight: bold; color: #dc3545;">${formatCurrency(op.amount)}</span>
                                </div>
                                ${op.quantity ? `
                                    <div class="history-quantity" style="font-size: 12px; color: #666;">
                                        ${op.quantity} ${op.unit}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                ${sortedOperations.length === 0 ? `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <p>📭 Chưa có giao dịch mua sắm nào</p>
                    </div>
                ` : ''}
                
                <div class="popup-actions" style="display: flex; justify-content: flex-end; margin-top: 20px;">
                    <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        
    } catch (error) {
        console.error('Error loading operations history:', error);
        showMessage('❌ Lỗi khi tải lịch sử mua sắm', 'error');
    }
}

// Hàm hiển thị popup lịch sử báo cáo - GIỐNG REPORT
async function showReportsHistoryPopup() {
    try {
        const reports = await dbGetAll('reports');
        const sortedReports = reports.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
        
        const popupHTML = `
            <div class="popup" style="max-width: 800px;">
                <button class="close-popup" data-action="close-popup">×</button>
                <h3>📜 Lịch sử Báo cáo</h3>
                
                <div class="history-list">
                    ${sortedReports.map(report => {
                        const totalExpenses = calculateTotalExpenses(report);
                        const totalTransfers = calculateTotalTransfers(report);
                        const actualReceived = calculateActualReceived(report);
                        
                        return `
                            <div class="history-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee;">
                                <div style="flex: 1;">
                                    <div class="history-date" style="font-weight: bold; color: #333;">${formatDateDisplay(report.date)}</div>
                                    <div class="history-details" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 8px; font-size: 14px;">
                                        <span>DT: ${formatCurrency(report.revenue)}</span>
                                        <span>CP: ${formatCurrency(totalExpenses)}</span>
                                        <span style="color: #28a745; font-weight: bold;">TN: ${formatCurrency(actualReceived)}</span>
                                    </div>
                                    ${report.exports?.length > 0 ? `
                                        <div style="font-size: 12px; color: #666; margin-top: 4px;">
                                            📦 Xuất kho: ${report.exports.length} sản phẩm
                                        </div>
                                    ` : ''}
                                </div>
                                ${isAdmin() ? `
                                    <div class="history-actions" style="display: flex; gap: 5px;">
                                        <button class="btn btn-sm btn-outline" data-action="edit-report" data-date="${report.date}" style="padding: 4px 8px; font-size: 12px;">Sửa</button>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                ${sortedReports.length === 0 ? `
                    <div style="text-align: center; padding: 40px; color: #666;">
                        <p>📭 Chưa có báo cáo nào</p>
                    </div>
                ` : ''}
                
                <div class="popup-actions" style="display: flex; justify-content: flex-end; margin-top: 20px;">
                    <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                </div>
            </div>
        `;
        
        showPopup(popupHTML);
        
    } catch (error) {
        console.error('Error loading reports history:', error);
        showMessage('❌ Lỗi khi tải lịch sử báo cáo', 'error');
    }
}

// Thêm hàm hỗ trợ tính toán (nếu chưa có)
function calculateTotalExpenses(report) {
    if (!report.expenses || !Array.isArray(report.expenses)) {
        return 0;
    }
    return report.expenses.reduce((total, expense) => total + (expense.amount || 0), 0);
}

function calculateTotalTransfers(report) {
    if (!report.transfers || !Array.isArray(report.transfers)) {
        return 0;
    }
    return report.transfers.reduce((total, transfer) => total + (transfer.amount || 0), 0);
}

// Thêm hàm isAdmin (nếu chưa có)
function isAdmin() {
    const user = getCurrentUser();
    return user && user.employeeId === 'NV001'; // Giả sử NV001 là admin
}
