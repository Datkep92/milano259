// Main application initialization
let currentTab = 'reports';

// Initialize application
async function initializeApp() {
    try {
        showLoading(true);
        
        // Check authentication
        if (!checkAuth()) {
            window.location.href = 'login.html';
            return;
        }
        
        // Initialize database
        await initializeDatabase();
        
        // Initialize sample data for demo
        await initializeSampleData();
        
        // Setup main event listeners
        setupAppEventListeners();
        
        // Load current user info
        loadUserInfo();
        
        // Initialize current tab
        initializeCurrentTab();
        
        showLoading(false);
        
    } catch (error) {
        console.error('App initialization error:', error);
        showMessage('Lỗi khởi tạo ứng dụng', 'error');
        showLoading(false);
    }
}

// Setup main event listeners
function setupAppEventListeners() {
    // Tab switching
    document.addEventListener('click', function(e) {
        if (e.target.matches('.tab-btn')) {
            switchTab(e.target.dataset.tab);
        }
    });
    
    // Logout
    document.addEventListener('click', function(e) {
        if (e.target.matches('#logoutBtn')) {
            logout();
        }
    });
    
    // Popup close
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="close-popup"]') || 
            e.target.matches('.popup-container')) {
            closePopup();
        }
    });
    
    // Prevent popup close when clicking inside popup
    document.addEventListener('click', function(e) {
        if (e.target.matches('.popup')) {
            e.stopPropagation();
        }
    });
}

// Load user info
function loadUserInfo() {
    const user = getCurrentUser();
    const userNameElement = document.getElementById('userName');
    
    if (userNameElement && user) {
        userNameElement.textContent = `${user.name} (${user.role === 'admin' ? 'Quản trị' : 'Nhân viên'})`;
    }
}


// FIX: Sửa hàm switchTab - reset state khi chuyển tab khác
function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Reset reports state nếu chuyển sang tab khác
    if (tabName !== 'reports') {
        isReportsInitialized = false;
    }
    
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    currentTab = tabName;
    initializeCurrentTab();
}

// FIX: Sửa hàm initializeCurrentTab - thêm timeout để đảm bảo DOM ready
function initializeCurrentTab() {
    setTimeout(() => {
        switch (currentTab) {
            case 'reports':
                initializeReportsTab();
                break;
            case 'employees':
                initializeEmployeesTab();
                break;
            case 'inventory':
                initializeInventoryTab();
                break;
            case 'overview':
                initializeOverviewTab();
                break;
        }
    }, 50);
}

// Show loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

// Show popup
function showPopup(html) {
    const container = document.getElementById('popupContainer');
    if (container) {
        container.innerHTML = html;
        container.classList.add('active');
    }
}

// Close popup
function closePopup() {
    const container = document.getElementById('popupContainer');
    if (container) {
        container.classList.remove('active');
        container.innerHTML = '';
    }
}

// Show message
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    
    // Add to page
    document.body.appendChild(messageElement);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 5000);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Add CSS for new elements
const additionalCSS = `
    .popup-tabs {
        display: flex;
        gap: 5px;
        margin-bottom: 20px;
        border-bottom: 1px solid #ddd;
    }
    
    .popup-tab-btn {
        padding: 10px 20px;
        border: none;
        background: none;
        cursor: pointer;
        border-bottom: 3px solid transparent;
    }
    
    .popup-tab-btn.active {
        border-bottom-color: #667eea;
        color: #667eea;
    }
    
    .popup-tab-content {
        display: none;
    }
    
    .popup-tab-content.active {
        display: block;
    }
    
    .add-expense-form, .add-transfer-form {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        flex-wrap: wrap;
    }
    
    .add-expense-form input, .add-transfer-form input {
        flex: 1;
        min-width: 150px;
    }
    
    .period-selector {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        flex-wrap: wrap;
    }
    
    .profit-calculation {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
    }
    
    .calculation-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #dee2e6;
    }
    
    .calculation-row.total {
        font-weight: bold;
        border-bottom: 2px solid #007bff;
    }
    
    .calculation-row.net-profit {
        font-weight: bold;
        color: #28a745;
        font-size: 1.1em;
        border-bottom: none;
    }
    
    .history-section {
        margin-bottom: 15px;
    }
    
    .history-toggle {
        background: none;
        border: none;
        padding: 10px;
        cursor: pointer;
        font-weight: bold;
        color: #667eea;
        width: 100%;
        text-align: left;
        border: 1px solid #ddd;
        border-radius: 5px;
    }
    
    .history-content {
        margin-top: 10px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 5px;
    }
    
    .salary-calculation {
        line-height: 1.6;
    }
    
    .salary-calculation p {
        margin: 5px 0;
    }
    
    .btn-sm {
        padding: 5px 10px;
        font-size: 12px;
    }
    
    .amount-input {
        border: none;
        background: none;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        width: 100%;
        color: inherit;
    }
    
    .amount-input:focus {
        outline: none;
        background: white;
        border: 1px solid #667eea;
        border-radius: 5px;
    }
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

// THÊM vào app.js - các hàm utility
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDate(date = new Date()) {
    return date.toISOString().split('T')[0];
}

function formatDateDisplay(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('vi-VN');
}

function formatMonthDisplay(monthString) {
    const [year, month] = monthString.split('-');
    return `Tháng ${month}/${year}`;
}

function getPreviousMonth(monthString) {
    const [year, month] = monthString.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
    }
    
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

// Hàm hiển thị message toàn cục
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.global-message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageElement = document.createElement('div');
    messageElement.className = `global-message message ${type}`;
    messageElement.textContent = message;
    messageElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        max-width: 300px;
    `;
    
    if (type === 'error') {
        messageElement.style.background = '#dc3545';
    } else if (type === 'success') {
        messageElement.style.background = '#28a745';
    } else {
        messageElement.style.background = '#17a2b8';
    }
    
    document.body.appendChild(messageElement);
    
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 5000);
}