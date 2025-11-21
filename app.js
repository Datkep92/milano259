// Global variables
let currentUser = null;
let currentExpenses = [];
let currentReportData = null;
let expenseCategories = [];
let currentDate = new Date().toISOString().split('T')[0];
let reportsChart = null;
let currentTimeframe = 0;

// Revenue Management Variables
let transferDetails = [];
let currentRevenueMethod = 'total';
let currentRevenueData = null;

// Edit Management
let editingItem = null;
let editingType = null;

// Global variables - ĐẢM BẢO KHAI BÁO ĐÚNG
let isInitializing = false;
let isDataLoaded = false;
let currentLoadDate = null; // THÊM BIẾN NÀY
// ==================== AUTHENTICATION ====================
async function login() {
    const email = getElement('email').value;
    const password = getElement('password').value;
    
    if (!email || !password) {
        showAlert('Lỗi', 'Vui lòng nhập email và mật khẩu');
        return;
    }
    
    try {
        showLoading(true);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        showMainApp();
        showToast('Đăng nhập thành công!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Đăng nhập thất bại';
        
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Email không hợp lệ';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Tài khoản đã bị vô hiệu hóa';
                break;
            case 'auth/user-not-found':
                errorMessage = 'Không tìm thấy tài khoản';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Mật khẩu không đúng';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau';
                break;
            default:
                errorMessage = error.message;
        }
        
        showAlert('Đăng nhập thất bại', errorMessage);
    } finally {
        showLoading(false);
    }
}

async function signUp() {
    const email = getElement('email').value;
    const password = getElement('password').value;
    
    if (!email || !password) {
        showAlert('Lỗi', 'Vui lòng nhập email và mật khẩu');
        return;
    }
    
    if (password.length < 6) {
        showAlert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
        return;
    }
    
    try {
        showLoading(true);
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Tạo user document trong Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            email: email,
            role: 'staff',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showAlert('Thành công', 'Đăng ký thành công! Bạn đã được đăng nhập tự động.');
        
    } catch (error) {
        console.error('Sign up error:', error);
        let errorMessage = 'Đăng ký thất bại';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Email đã được sử dụng';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email không hợp lệ';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Tính năng đăng ký tạm thời bị tắt';
                break;
            case 'auth/weak-password':
                errorMessage = 'Mật khẩu quá yếu';
                break;
            default:
                errorMessage = error.message;
        }
        
        showAlert('Đăng ký thất bại', errorMessage);
    } finally {
        showLoading(false);
    }
}

async function quickLogin(role) {
    let email, password;
    
    if (role === 'manager') {
        email = 'admin@milano.com';
        password = 'admin123';
    } else {
        email = 'sale@milano.com';
        password = 'sale123';
    }
    
    try {
        showLoading(true);
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        showMainApp();
        showToast(`Đăng nhập demo ${role === 'manager' ? 'Quản lý' : 'Nhân viên'} thành công!`, 'success');
    } catch (error) {
        console.error('Quick login error:', error);
        
        // Tạo tài khoản demo nếu chưa tồn tại
        if (error.code === 'auth/user-not-found') {
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                await db.collection('users').doc(userCredential.user.uid).set({
                    email: email,
                    role: role === 'manager' ? 'manager' : 'staff',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isDemo: true
                });
                currentUser = userCredential.user;
                showMainApp();
                showToast(`Đã tạo và đăng nhập demo ${role === 'manager' ? 'Quản lý' : 'Nhân viên'} thành công!`, 'success');
            } catch (createError) {
                showAlert('Lỗi demo', 'Không thể tạo tài khoản demo: ' + createError.message);
            }
        } else {
            showAlert('Đăng nhập demo thất bại', error.message);
        }
    } finally {
        showLoading(false);
    }
}

function logout() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        auth.signOut().then(() => {
            showToast('Đã đăng xuất thành công', 'success');
        }).catch(error => {
            console.error('Logout error:', error);
            showAlert('Lỗi', 'Đăng xuất thất bại: ' + error.message);
        });
    }
}

function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            showMainApp();
        } else {
            showLoginScreen();
        }
    });
}

async function loadUserData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        let manager = isManager();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            safeUpdate('userEmail', userData.email);
            manager = manager || (userData.role === 'manager');
            
            // Cập nhật last login
            await db.collection('users').doc(currentUser.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            safeUpdate('userEmail', currentUser.email);
            // Tạo user document nếu chưa có
            await db.collection('users').doc(currentUser.uid).set({
                email: currentUser.email,
                role: manager ? 'manager' : 'staff',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        safeUpdate('userRole', manager ? 'Quản lý' : 'Nhân viên');

        // Hiển thị icon quản lý cho manager
        const managementIcon = getElement('managementIcon');
        if (manager && managementIcon) {
            managementIcon.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error loading user data:', error);
        safeUpdate('userEmail', currentUser.email);
        safeUpdate('userRole', 'Nhân viên');
    }
}

function showLoginScreen() {
    getElement('loginScreen').classList.add('active');
    getElement('mainApp').classList.remove('active');
    // Reset form
    getElement('email').value = '';
    getElement('password').value = '';
}

function showMainApp() {
    getElement('loginScreen').classList.remove('active');
    getElement('mainApp').classList.add('active');
    
    // Chỉ khởi tạo app nếu chưa có dữ liệu
    if (currentExpenses.length === 0 && transferDetails.length === 0) {
        initializeApp();
    } else {
        console.log('📌 App already initialized, skipping...');
        updateMainDisplay();
    }
}

function isManager() {
    return currentUser && (
        currentUser.email === 'admin@milano.com' || 
        currentUser.email === 'manager@milano.com'
    );
}
function initializeApp() {
    // KIỂM TRA KỸ HƠN
    if (isInitializing) {
        console.log('🚫 App is already initializing, skipping...');
        return;
    }
    
    isInitializing = true;
    console.log('🚀 Starting app initialization...');
    
    currentDate = new Date().toISOString().split('T')[0];
    getElement('reportDate').value = currentDate;
    
    currentExpenses = [];
    transferDetails = [];
    currentRevenueData = null;
    currentReportData = null;
    isDataLoaded = false; // RESET TRẠNG THÁI LOAD
    currentLoadDate = null;
    
    loadDateData();
}

async function loadDateData() {
    const selectedDate = getElement('reportDate').value;
    
    // 🚀 KIỂM TRA KỸ HƠN - sử dụng currentLoadDate
    if (isDataLoaded && currentLoadDate === selectedDate) {
        console.log('📌 Data already loaded for this date:', selectedDate);
        return;
    }
    
    if (isInitializing && currentLoadDate === selectedDate) {
        console.log('🚫 Data is already loading for this date:', selectedDate);
        return;
    }
    
    console.log('📅 Loading data for date:', selectedDate);
    
    // Đánh dấu đang load
    isInitializing = true;
    currentLoadDate = selectedDate;
    
    // RESET DỮ LIỆU
    currentDate = selectedDate;
    currentExpenses = [];
    transferDetails = [];
    currentRevenueData = null;
    currentReportData = null;
    
    try {
        console.log('🔄 Starting to load date data...');
        
        const [startFund, expenses, transfers, revenueData, reportData] = await Promise.all([
            calculateStartFund(currentDate),
            loadExpensesForDate(currentDate),
            loadTransfersForDate(currentDate),
            loadRevenueData(currentDate),
            loadReportData(currentDate)
        ]);
        
        console.log('✅ All primary data loaded successfully');
        
        // CẬP NHẬT DỮ LIỆU
        if (reportData) {
            currentReportData = reportData;
        }
        
        if (revenueData) {
            currentRevenueData = revenueData;
            transferDetails = revenueData.transferDetails || [];
        }
        
        updateMainDisplay();
        
        // LOAD DỮ LIỆU PHỤ
        setTimeout(() => {
            loadExpenseCategories();
            loadRecentReports();
            initializeDetailTabs();
        }, 500);
        
        // ĐÁNH DẤU HOÀN THÀNH
        isDataLoaded = true;
        isInitializing = false;
        
        console.log('🎉 Date data loading completed for:', selectedDate);
        
    } catch (error) {
        console.error('❌ Error loading date data:', error);
        updateMainDisplay();
        isInitializing = false;
        isDataLoaded = false;
        currentLoadDate = null;
    }
}
// Sửa hàm initializeApp()
function initializeApp() {
    if (isInitializing) {
        console.log('🚫 App is already initializing, skipping...');
        return;
    }
    
    isInitializing = true;
    console.log('🚀 Starting app initialization...');
    
    currentDate = new Date().toISOString().split('T')[0];
    getElement('reportDate').value = currentDate;
    
    currentExpenses = [];
    transferDetails = [];
    currentRevenueData = null;
    currentReportData = null;
    
    loadDateData();
}

// Sửa hàm loadDateData() - THÊM PHẦN NÀY

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkAuthState();
});

// ==================== UTILITY FUNCTIONS ====================
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function formatDisplayDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

function getVietnamTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (7 * 3600000));
}

function formatVietnamDateTime(date) {
    return date.toLocaleString('vi-VN');
}

function handleFirestoreError(error, context) {
    console.error(`Error in ${context}:`, error);
    
    if (error.code === 'failed-precondition') {
        showAlert('Lỗi hệ thống', 'Hệ thống đang thiết lập. Vui lòng thử lại sau 1-2 phút.');
    } else if (error.code === 'unavailable') {
        showAlert('Lỗi kết nối', 'Mất kết nối internet. Vui lòng kiểm tra kết nối.');
    } else if (error.code === 'permission-denied') {
        showAlert('Lỗi quyền truy cập', 'Bạn không có quyền thực hiện thao tác này.');
    } else {
        showAlert('Lỗi', `Lỗi: ${error.message}`);
    }
}

function isManager() {
    return currentUser && currentUser.email === 'admin@milano.com';
}

function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element not found: ${id}`);
        // Trả về object giả để tránh lỗi
        return {
            textContent: '',
            value: '',
            style: { display: '' },
            classList: {
                add: function() {},
                remove: function() {},
                contains: function() { return false; }
            },
            addEventListener: function() {},
            removeEventListener: function() {},
            setAttribute: function() {},
            getAttribute: function() { return null; },
            focus: function() {},
            click: function() {}
        };
    }
    return element;
}

function safeUpdate(id, value) {
    const element = getElement(id);
    if (element) element.textContent = value;
}

// ==================== AUTHENTICATION ====================
async function login() {
    const email = getElement('email').value;
    const password = getElement('password').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        showMainApp();
    } catch (error) {
        showAlert('Đăng nhập thất bại', error.message);
    }
}

async function signUp() {
    const email = getElement('email').value;
    const password = getElement('password').value;
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(userCredential.user.uid).set({
            email: email,
            role: 'staff',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showAlert('Thành công', 'Đăng ký thành công!');
    } catch (error) {
        showAlert('Đăng ký thất bại', error.message);
    }
}

async function quickLogin(role) {
    let email, password;
    
    if (role === 'manager') {
        email = 'admin@milano.com';
        password = 'admin123';
    } else {
        email = 'sale@milano.com';
        password = 'sale123';
    }
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        showMainApp();
    } catch (error) {
        showAlert('Đăng nhập thất bại', error.message);
    }
}

function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
            showMainApp();
            // 🚀 KHÔNG gọi initializeApp() ở đây nữa
            // vì nó đã được gọi trong showMainApp()
        } else {
            showLoginScreen();
        }
    });
}

async function loadUserData() {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    let manager = isManager();
    
    if (userDoc.exists) {
        const userData = userDoc.data();
        safeUpdate('userEmail', userData.email);
        manager = manager || (userData.role === 'manager');
    } else {
        safeUpdate('userEmail', currentUser.email);
        await db.collection('users').doc(currentUser.uid).set({
            email: currentUser.email,
            role: manager ? 'manager' : 'staff',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    safeUpdate('userRole', manager ? 'Quản lý' : 'Nhân viên');

    // Show management icon for managers
    const managementIcon = getElement('managementIcon');
    if (manager && managementIcon) {
        managementIcon.style.display = 'block';
    }
}

function logout() {
    auth.signOut();
}

function showLoginScreen() {
    getElement('loginScreen').classList.add('active');
    getElement('mainApp').classList.remove('active');
}

function showMainApp() {
    getElement('loginScreen').classList.remove('active');
    getElement('mainApp').classList.add('active');
    
    // 🚀 CHỈ khởi tạo app khi chuyển từ login sang main
    // Kiểm tra nếu chưa có dữ liệu thì mới initialize
    if (currentExpenses.length === 0 && transferDetails.length === 0) {
        initializeApp();
    } else {
        console.log('📌 App already initialized, skipping...');
        updateMainDisplay(); // Chỉ cập nhật hiển thị
    }
}



function setupEventListeners() {
    // Date change listener - RESET HOÀN TOÀN KHI ĐỔI NGÀY
    getElement('reportDate')?.addEventListener('change', function() {
        console.log('Date changed to:', this.value);
        loadDateData();
    });
    // Date change listener
    getElement('reportDate')?.addEventListener('change', loadDateData);
    
    // Real-time calculation
    getElement('reportRevenue')?.addEventListener('input', calculateReport);
    getElement('reportEndFund')?.addEventListener('input', calculateReport);
    
    // Revenue method change
    document.querySelectorAll('input[name="revenueMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentRevenueMethod = this.value;
            updateRevenueInputStates();
            recalculateRevenue();
        });
    });
    
    // Management icon click
    const managementIcon = getElement('managementIcon');
    if (managementIcon) {
        managementIcon.addEventListener('click', function() {
            switchTab('reports');
            loadStaffManagement();
        });
    }
    
    // Close popups when clicking outside
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('popup')) {
            event.target.classList.remove('active');
        }
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    getElement(tabName + 'Tab').classList.add('active');
}

// ==================== TODAY BUTTON & DATE MANAGEMENT ====================
function loadTodayData() {
    const today = new Date().toISOString().split('T')[0];
    
    if (getElement('reportDate').value === today) {
        loadDateData();
        showToast('Đã làm mới dữ liệu ngày hôm nay', 'info');
    } else {
        getElement('reportDate').value = today;
        loadDateData();
    }
}
async function debugData() {
    console.log('=== DEBUG DATA ===');
    console.log('Current Date:', currentDate);
    console.log('Transfer Details:', transferDetails);
    console.log('Current Revenue Data:', currentRevenueData);
    console.log('Current Report Data:', currentReportData);
    
    // Kiểm tra trong database
    try {
        const transfersDoc = await db.collection('daily_transfers')
            .doc(`${currentDate}_milano`)
            .get();
        console.log('Transfers in DB:', transfersDoc.exists ? transfersDoc.data() : 'NOT FOUND');
        
        const revenueDoc = await db.collection('daily_revenue')
            .doc(`${currentDate}_milano`)
            .get();
        console.log('Revenue in DB:', revenueDoc.exists ? revenueDoc.data() : 'NOT FOUND');
        
    } catch (error) {
        console.error('Debug error:', error);
    }
}
// ==================== EXPENSE STATISTICS BY DATE ====================
async function updateExpenseStatisticsForDate(date) {
    try {
        console.log('Loading expense statistics for date:', date);
        
        // Tải tất cả chi phí của ngày được chọn
        const expensesDoc = await db.collection('daily_expenses')
            .doc(`${date}_milano`)
            .get();
            
        let dailyExpenses = [];
        
        if (expensesDoc.exists) {
            const data = expensesDoc.data();
            if (data.date === date && data.expenses) {
                dailyExpenses = data.expenses.map(expense => ({
                    ...expense,
                    date: date,
                    source: 'daily_expenses'
                }));
            }
        }
        
        console.log('Daily expenses for statistics:', dailyExpenses);
        
        // Hiển thị thống kê cho ngày này
        displayDailyExpenseStatistics(dailyExpenses, date);
        
    } catch (error) {
        console.error('Error loading daily expense statistics:', error);
        displayDailyExpenseStatistics([], date);
    }
}

function displayDailyExpenseStatistics(expenses, date) {
    const container = getElement('expenseStatistics');
    
    if (!container) {
        console.error('Statistics container not found!');
        return;
    }
    
    if (!expenses || expenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                📅 ${formatDisplayDate(date)}: Không có chi phí nào
            </div>
        `;
        return;
    }

    // Nhóm chi phí theo loại
    const groupedByCategory = {};
    expenses.forEach(expense => {
        if (!groupedByCategory[expense.category]) {
            groupedByCategory[expense.category] = [];
        }
        groupedByCategory[expense.category].push(expense);
    });

    // Tính tổng chi phí ngày
    const dailyTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    container.innerHTML = `
        <div class="daily-statistics-header">
            <h3>📊 Thống Kê Chi Phí - ${formatDisplayDate(date)}</h3>
            <div class="daily-total">
                Tổng chi phí: <strong>${formatCurrency(dailyTotal)}</strong>
            </div>
        </div>
        
        ${Object.entries(groupedByCategory)
            .sort((a, b) => {
                const totalA = a[1].reduce((sum, item) => sum + item.amount, 0);
                const totalB = b[1].reduce((sum, item) => sum + item.amount, 0);
                return totalB - totalA;
            })
            .map(([category, categoryExpenses]) => {
                const total = categoryExpenses.reduce((sum, item) => sum + item.amount, 0);
                const count = categoryExpenses.length;
                const percentage = ((total / dailyTotal) * 100).toFixed(1);
                
                return `
                    <div class="category-group">
                        <div class="category-header" onclick="toggleCategoryDetails('${category.replace(/\s+/g, '-')}-${date}')">
                            <span class="category-title">${category}</span>
                            <span class="category-stats">
                                ${count} mục • ${formatCurrency(total)} • ${percentage}%
                            </span>
                            <span class="category-toggle">▼</span>
                        </div>
                        <div class="category-details" id="details-${category.replace(/\s+/g, '-')}-${date}" style="display: none;">
                            ${categoryExpenses.map(expense => `
                                <div class="expense-history-item">
                                    <span class="history-time">⏰ ${expense.createdAt ? formatVietnamDateTime(new Date(expense.createdAt)) : 'Không xác định'}</span>
                                    <span class="history-amount">${formatCurrency(expense.amount)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
    `;
    
    console.log('Daily statistics displayed for date:', date);
}


async function loadExpensesForDate(date) {
    try {
        console.log('Loading expenses for date:', date);
        const expensesDoc = await db.collection('daily_expenses')
            .doc(`${date}_milano`)
            .get();
            
        if (expensesDoc.exists) {
            const data = expensesDoc.data();
            if (data.date === date) {
                currentExpenses = data.expenses || [];
                console.log('Expenses loaded:', currentExpenses);
            } else {
                currentExpenses = [];
            }
        } else {
            currentExpenses = [];
        }
        updateExpensesDisplay();
        
    } catch (error) {
        console.error('Error loading expenses:', error);
        currentExpenses = [];
        updateExpensesDisplay();
    }
}

async function loadTransfersForDate(date) {
    try {
        console.log('Loading transfers for date:', date);
        const transfersDoc = await db.collection('daily_transfers')
            .doc(`${date}_milano`)
            .get();
            
        if (transfersDoc.exists) {
            const data = transfersDoc.data();
            if (data.date === date) {
                transferDetails = data.transfers || [];
                console.log('Transfers loaded:', transferDetails);
            } else {
                transferDetails = [];
            }
        } else {
            transferDetails = [];
        }
        updateTransferDisplay();
        
    } catch (error) {
        console.error('Error loading transfers:', error);
        transferDetails = [];
        updateTransferDisplay();
    }
}

// Hàm debug để kiểm tra dữ liệu theo ngày
async function debugCurrentData() {
    console.log('=== DEBUG CURRENT DATA ===');
    console.log('Current Date:', currentDate);
    console.log('Current Expenses:', currentExpenses);
    console.log('Transfer Details:', transferDetails);
    console.log('Current Revenue Data:', currentRevenueData);
    console.log('Current Report Data:', currentReportData);
    
    // Kiểm tra trong database
    try {
        const expensesDoc = await db.collection('daily_expenses')
            .doc(`${currentDate}_milano`)
            .get();
        console.log('Expenses in DB:', expensesDoc.exists ? expensesDoc.data() : 'NOT FOUND');
        
        const transfersDoc = await db.collection('daily_transfers')
            .doc(`${currentDate}_milano`)
            .get();
        console.log('Transfers in DB:', transfersDoc.exists ? transfersDoc.data() : 'NOT FOUND');
        
        const revenueDoc = await db.collection('daily_revenue')
            .doc(`${currentDate}_milano`)
            .get();
        console.log('Revenue in DB:', revenueDoc.exists ? revenueDoc.data() : 'NOT FOUND');
        
    } catch (error) {
        console.error('Debug error:', error);
    }
}

// Gọi hàm debug từ console browser: debugCurrentData()
function updateMainDisplay() {
    const totalExpenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    
    console.log('Updating main display:', {
        date: currentDate,
        expenses: totalExpenses,
        transfers: transferTotal,
        hasRevenueData: !!currentRevenueData,
        hasReportData: !!currentReportData
    });
    
    // Hiển thị chi phí và chuyển khoản
    safeUpdate('expensesDisplay', formatCurrency(totalExpenses));
    safeUpdate('transferDisplay', formatCurrency(transferTotal));
    
    // Hiển thị doanh thu và tiền mặt từ revenue data
    if (currentRevenueData) {
        safeUpdate('cashDisplay', formatCurrency(currentRevenueData.cashAmount));
        safeUpdate('revenueDisplay', formatCurrency(currentRevenueData.totalRevenue));
    } else {
        safeUpdate('cashDisplay', formatCurrency(0));
        safeUpdate('revenueDisplay', formatCurrency(0));
    }
    
    // Hiển thị số dư cuối và thực lãnh từ report data
    if (currentReportData) {
        safeUpdate('revenueDisplay', formatCurrency(currentReportData.revenue));
        safeUpdate('endFundDisplay', formatCurrency(currentReportData.endFund));
        safeUpdate('actualIncomeDisplay', formatCurrency(currentReportData.actualIncome));
    } else {
        safeUpdate('endFundDisplay', formatCurrency(0));
        safeUpdate('actualIncomeDisplay', formatCurrency(0));
    }
    
    const startFund = parseFloat(getElement('reportStartFund').value) || 0;
    safeUpdate('startFundDisplay', formatCurrency(startFund));
}
// Thêm biến cache
let expenseCategoriesCache = null;
let lastCategoriesLoad = 0;
// ==================== EXPENSE MANAGEMENT ====================
async function loadExpenseCategories() {
    // Cache 5 phút
    if (expenseCategoriesCache && (Date.now() - lastCategoriesLoad) < 300000) {
        expenseCategories = expenseCategoriesCache;
        updateExpenseCategoryDropdown();
        return;
    }
    
    try {
        const categoriesDoc = await db.collection('expense_categories').doc('milano').get();
        
        if (categoriesDoc.exists) {
            expenseCategories = categoriesDoc.data().categories || [];
        } else {
            expenseCategories = ['Ăn uống', 'Xăng xe', 'Văn phòng phẩm', 'Tiếp khách', 'Bảo trì', 'Khác'];
            await db.collection('expense_categories').doc('milano').set({
                categories: expenseCategories,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Update cache
        expenseCategoriesCache = expenseCategories;
        lastCategoriesLoad = Date.now();
        
        updateExpenseCategoryDropdown();
        
    } catch (error) {
        console.error('Error loading expense categories:', error);
        expenseCategories = ['Ăn uống', 'Xăng xe', 'Văn phòng phẩm', 'Tiếp khách', 'Bảo trì', 'Khác'];
        updateExpenseCategoryDropdown();
    }
}

function setupExpenseDropdown() {
    const categoryInput = getElement('expenseCategory');
    const suggestionsContainer = getElement('categorySuggestions');
    
    if (!categoryInput || !suggestionsContainer) return;
    
    let selectedIndex = -1;
    
    categoryInput.addEventListener('focus', function() {
        showCategorySuggestions(this.value);
    });
    
    categoryInput.addEventListener('input', function() {
        showCategorySuggestions(this.value);
        selectedIndex = -1;
    });
    
    categoryInput.addEventListener('keydown', function(e) {
        const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
            updateHighlight();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateHighlight();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                suggestions[selectedIndex].click();
            } else if (this.value.trim()) {
                addExpenseItem();
            }
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    });
    
    function showCategorySuggestions(query) {
        const filtered = expenseCategories.filter(cat => 
            cat.toLowerCase().includes(query.toLowerCase())
        );
        
        suggestionsContainer.innerHTML = '';
        
        filtered.forEach((category, index) => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = category;
            div.addEventListener('click', function() {
                categoryInput.value = category;
                hideSuggestions();
                categoryInput.focus();
            });
            suggestionsContainer.appendChild(div);
        });
        
        if (query.trim() && !expenseCategories.includes(query.trim())) {
            const addNewDiv = document.createElement('div');
            addNewDiv.className = 'suggestion-item highlight';
            addNewDiv.innerHTML = `➕ Thêm mới: "<strong>${query}</strong>"`;
            addNewDiv.addEventListener('click', function() {
                hideSuggestions();
                categoryInput.focus();
            });
            suggestionsContainer.appendChild(addNewDiv);
        }
        
        if (filtered.length > 0 || query.trim()) {
            suggestionsContainer.classList.add('active');
        } else {
            hideSuggestions();
        }
    }
    
    function updateHighlight() {
        const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');
        suggestions.forEach((item, index) => {
            item.classList.toggle('highlight', index === selectedIndex);
        });
        
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            suggestions[selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }
    
    function hideSuggestions() {
        suggestionsContainer.classList.remove('active');
        selectedIndex = -1;
    }
}

function updateExpenseCategoryDropdown() {
    console.log('Expense categories updated:', expenseCategories);
}

function openExpensePopup() {
    updateExpensesDisplay();
    getElement('expensePopup').classList.add('active');
    setTimeout(setupExpenseDropdown, 100);
}

function addExpenseItem() {
    const categoryInput = getElement('expenseCategory');
    const amountInput = getElement('expenseAmount');
    
    const category = categoryInput.value.trim();
    const amount = parseFloat(amountInput.value);
    
    // Cho phép chỉ nhập category hoặc chỉ nhập amount
    if (!category && (!amount || amount <= 0)) {
        showToast('Vui lòng nhập loại chi phí HOẶC số tiền', 'error');
        return;
    }
    
    const finalCategory = category || 'Chi phí khác';
    const finalAmount = amount && amount > 0 ? amount : 0;
    
    // Kiểm tra nếu là loại chi phí mới
    const isNewCategory = !expenseCategories.includes(finalCategory);
    
    currentExpenses.push({
        category: finalCategory,
        amount: finalAmount,
        id: Date.now().toString(),
        createdAt: new Date()
    });
    
    // Nếu là loại mới, thêm vào dropdown và lưu vào database
    if (isNewCategory) {
        expenseCategories.push(finalCategory);
        updateExpenseCategoryDropdown();
        saveExpenseCategories();
    }
    
    updateExpensesDisplay();
    
    categoryInput.value = '';
    amountInput.value = '';
    showToast('Đã thêm chi phí', 'success');
}

async function saveExpenseCategories() {
    try {
        await db.collection('expense_categories').doc('milano').set({
            categories: expenseCategories,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
    } catch (error) {
        console.error('Error saving expense categories:', error);
    }
}

function updateExpensesDisplay() {
    const container = getElement('currentExpensesList');
    const total = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    if (container) {
        if (currentExpenses.length === 0) {
            container.innerHTML = '<div class="empty-state">Chưa có chi phí</div>';
        } else {
            container.innerHTML = currentExpenses.map(exp => `
                <div class="expense-item">
                    <div class="expense-info">
                        <strong>${exp.category}</strong>: ${formatCurrency(exp.amount)}
                    </div>
                    <div class="expense-actions">
                        <button onclick="editExpenseItem('${exp.id}')" class="btn-edit">✏️</button>
                        <button onclick="removeExpenseItem('${exp.id}')" class="btn-delete">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    safeUpdate('expensesTotal', formatCurrency(total));
    safeUpdate('reportExpenses', formatCurrency(total));
    safeUpdate('expensesDisplay', formatCurrency(total));
}

function editExpenseItem(id) {
    const expense = currentExpenses.find(exp => exp.id === id);
    if (!expense) return;
    
    editingItem = expense;
    editingType = 'expense';
    
    getElement('editExpenseCategory').value = expense.category;
    getElement('editExpenseAmount').value = expense.amount;
    
    getElement('editExpensePopup').classList.add('active');
}

function saveEditedExpense() {
    if (!editingItem) return;
    
    const category = getElement('editExpenseCategory').value.trim();
    const amount = parseFloat(getElement('editExpenseAmount').value) || 0;
    
    if (!category && amount <= 0) {
        showToast('Vui lòng nhập loại chi phí HOẶC số tiền', 'error');
        return;
    }
    
    const oldData = { ...editingItem };
    
    editingItem.category = category || 'Chi phí khác';
    editingItem.amount = amount;
    editingItem.updatedAt = new Date();
    editingItem.updatedBy = currentUser.uid;
    
    updateExpensesDisplay();
    closeEditExpensePopup();
    
    // Log edit history
    logEditHistory('expense', oldData, editingItem);
    
    showToast('Đã cập nhật chi phí', 'success');
}

function removeExpenseItem(id) {
    const expense = currentExpenses.find(exp => exp.id === id);
    if (expense && confirm('Xóa chi phí này?')) {
        currentExpenses = currentExpenses.filter(exp => exp.id !== id);
        updateExpensesDisplay();
        showToast('Đã xóa chi phí', 'success');
    }
}

async function saveExpenses() {
    try {
        await db.collection('daily_expenses')
            .doc(`${currentDate}_milano`)
            .set({
                date: currentDate,
                expenses: currentExpenses,
                total: currentExpenses.reduce((sum, exp) => sum + exp.amount, 0),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentUser.uid
            });
        
        showToast('Đã lưu chi phí thành công', 'success');
        closeExpensePopup();
        
    } catch (error) {
        handleFirestoreError(error, 'saveExpenses');
    }
}

// ==================== TRANSFER MANAGEMENT ====================
function openTransferPopup() {
    updateTransferDisplay();
    getElement('transferPopup').classList.add('active');
}

function addTransferDetail() {
    const amountInput = getElement('transferValue');
    const descriptionInput = getElement('transferDescription');
    
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();
    
    // Cho phép chỉ nhập số tiền hoặc chỉ nhập nội dung
    if ((!amount || amount <= 0) && !description) {
        showToast('Vui lòng nhập số tiền HOẶC nội dung', 'error');
        return;
    }
    
    const finalAmount = amount && amount > 0 ? amount : 0;
    const finalDescription = description || `Chuyển khoản ${formatCurrency(finalAmount)}`;
    
    transferDetails.push({
        amount: finalAmount,
        description: finalDescription,
        id: Date.now().toString(),
        createdAt: new Date()
    });
    
    updateTransferDisplay();
    recalculateRevenue();
    
    amountInput.value = '';
    descriptionInput.value = '';
    showToast('Đã thêm chuyển khoản', 'success');
}

function updateTransferDisplay() {
    const container = getElement('transferDetailsList');
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    
    if (container) {
        if (transferDetails.length === 0) {
            container.innerHTML = '<div class="empty-state">Chưa có chuyển khoản</div>';
        } else {
            container.innerHTML = transferDetails.map(item => `
                <div class="transfer-item">
                    <div class="transfer-info">
                        <div class="transfer-amount">${formatCurrency(item.amount)}</div>
                        <div class="transfer-description">${item.description}</div>
                    </div>
                    <div class="transfer-actions">
                        <button onclick="editTransferItem('${item.id}')" class="btn-edit">✏️</button>
                        <button onclick="removeTransferDetail('${item.id}')" class="btn-delete">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    safeUpdate('transferTotal', formatCurrency(transferTotal));
    safeUpdate('transferTotalRevenue', formatCurrency(transferTotal));
    safeUpdate('transferDisplay', formatCurrency(transferTotal));
}

function editTransferItem(id) {
    const transfer = transferDetails.find(item => item.id === id);
    if (!transfer) return;
    
    editingItem = transfer;
    editingType = 'transfer';
    
    getElement('editTransferAmount').value = transfer.amount;
    getElement('editTransferDescription').value = transfer.description;
    
    getElement('editTransferPopup').classList.add('active');
}

function saveEditedTransfer() {
    if (!editingItem) return;
    
    const amount = parseFloat(getElement('editTransferAmount').value) || 0;
    const description = getElement('editTransferDescription').value.trim();
    
    if (amount <= 0 && !description) {
        showToast('Vui lòng nhập số tiền HOẶC nội dung', 'error');
        return;
    }
    
    const oldData = { ...editingItem };
    
    editingItem.amount = amount;
    editingItem.description = description || `Chuyển khoản ${formatCurrency(amount)}`;
    editingItem.updatedAt = new Date();
    editingItem.updatedBy = currentUser.uid;
    
    updateTransferDisplay();
    recalculateRevenue();
    closeEditTransferPopup();
    
    // Log edit history
    logEditHistory('transfer', oldData, editingItem);
    
    showToast('Đã cập nhật chuyển khoản', 'success');
}

function removeTransferDetail(id) {
    const transfer = transferDetails.find(item => item.id === id);
    if (transfer && confirm('Xóa chuyển khoản này?')) {
        transferDetails = transferDetails.filter(item => item.id !== id);
        updateTransferDisplay();
        recalculateRevenue();
        showToast('Đã xóa chuyển khoản', 'success');
    }
}

async function saveTransfers() {
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    
    try {
        await db.collection('daily_transfers')
            .doc(`${currentDate}_milano`)
            .set({
                date: currentDate,
                transfers: transferDetails,
                total: transferTotal,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentUser.uid,
                companyId: 'milano'
            });
        
        // CẬP NHẬT REVENUE DATA
        if (!currentRevenueData) {
            currentRevenueData = {
                totalRevenue: 0,
                cashAmount: 0,
                transferTotal: transferTotal,
                transferDetails: transferDetails,
                method: 'detail',
                updatedAt: new Date()
            };
        } else {
            currentRevenueData.transferTotal = transferTotal;
            currentRevenueData.transferDetails = transferDetails;
            currentRevenueData.method = 'detail';
            currentRevenueData.updatedAt = new Date();
        }
        
        // LƯU REVENUE DATA
        await saveRevenueData();
        
        recalculateRevenueFromTransfers();
        updateMainDisplay();
        
        showToast('Đã lưu chuyển khoản', 'success');
        closeTransferPopup();
        
    } catch (error) {
        handleFirestoreError(error, 'saveTransfers');
    }
}

function recalculateRevenueFromTransfers() {
    if (!currentRevenueData) return;
    
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    
    if (currentRevenueData.method === 'detail') {
        const cashAmount = currentRevenueData.cashAmount || 0;
        currentRevenueData.totalRevenue = cashAmount + transferTotal;
    } else {
        const totalRevenue = currentRevenueData.totalRevenue || 0;
        currentRevenueData.cashAmount = totalRevenue - transferTotal;
    }
    
    currentRevenueData.transferTotal = transferTotal;
}

// ==================== REVENUE MANAGEMENT ====================
function openRevenuePopup() {
    getElement('totalRevenue').value = '';
    getElement('cashAmount').value = '';
    
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    
    if (currentRevenueData) {
        currentRevenueMethod = currentRevenueData.method || 'total';
        if (currentRevenueMethod === 'total') {
            getElement('totalRevenue').value = currentRevenueData.totalRevenue;
            getElement('cashAmount').value = currentRevenueData.totalRevenue - transferTotal;
        } else {
            getElement('cashAmount').value = currentRevenueData.cashAmount;
            getElement('totalRevenue').value = currentRevenueData.cashAmount + transferTotal;
        }
    } else {
        currentRevenueMethod = 'total';
        if (transferTotal > 0) {
            getElement('cashAmount').value = 0;
            getElement('totalRevenue').value = transferTotal;
        }
    }
    
    updateRevenueInputStates();
    recalculateRevenue();
    
    getElement('revenuePopup').classList.add('active');
}

function updateRevenueInputStates() {
    const isTotalMethod = currentRevenueMethod === 'total';
    
    getElement('totalRevenue').readOnly = !isTotalMethod;
    getElement('cashAmount').readOnly = isTotalMethod;
    
    if (isTotalMethod) {
        getElement('totalRevenue').placeholder = "Nhập tổng";
        getElement('cashAmount').placeholder = "Tự động tính";
    } else {
        getElement('totalRevenue').placeholder = "Tự động tính";
        getElement('cashAmount').placeholder = "Nhập tiền mặt";
    }
}

function calculateFromTotal() {
    if (currentRevenueMethod !== 'total') return;
    recalculateRevenue();
}

function calculateFromDetail() {
    if (currentRevenueMethod !== 'detail') return;
    recalculateRevenue();
}

function recalculateRevenue() {
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    
    if (currentRevenueMethod === 'total') {
        const totalRevenue = parseFloat(getElement('totalRevenue').value) || 0;
        const cashAmount = totalRevenue - transferTotal;
        
        getElement('cashAmount').value = cashAmount > 0 ? cashAmount : 0;
        safeUpdate('transferTotalRevenue', formatCurrency(transferTotal));
    } else {
        const cashAmount = parseFloat(getElement('cashAmount').value) || 0;
        const totalRevenue = cashAmount + transferTotal;
        
        getElement('totalRevenue').value = totalRevenue;
        safeUpdate('transferTotalRevenue', formatCurrency(transferTotal));
    }
    
    if (!currentRevenueData) {
        currentRevenueData = {
            totalRevenue: parseFloat(getElement('totalRevenue').value) || 0,
            cashAmount: parseFloat(getElement('cashAmount').value) || 0,
            transferTotal: transferTotal,
            transferDetails: transferDetails,
            method: currentRevenueMethod
        };
    }
}

function confirmRevenue() {
    const totalRevenue = parseFloat(getElement('totalRevenue').value) || 0;
    const cashAmount = parseFloat(getElement('cashAmount').value) || 0;
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    
    if (totalRevenue <= 0) {
        showToast('Doanh thu phải lớn hơn 0', 'error');
        return;
    }
    
    if (cashAmount < 0) {
        showToast('Tiền mặt không thể âm', 'error');
        return;
    }
    
    const calculatedTotal = cashAmount + transferTotal;
    if (Math.abs(totalRevenue - calculatedTotal) > 1000) {
        showToast(`Số liệu không khớp! Doanh thu: ${formatCurrency(totalRevenue)}, Tính được: ${formatCurrency(calculatedTotal)}`, 'error');
        return;
    }
    
     currentRevenueData = {
        totalRevenue: totalRevenue,
        cashAmount: cashAmount,
        transferTotal: transferTotal,
        transferDetails: transferDetails,
        method: currentRevenueMethod,
        updatedAt: new Date()
    };
    
    // LƯU REVENUE DATA
    saveRevenueData();
    
    getElement('reportRevenue').value = totalRevenue;
    updateMainDisplay();
    
    showToast('Đã lưu doanh thu', 'success');
    closeRevenuePopup();
    calculateReport();
}
async function loadRevenueData(date) {
    try {
        console.log('Loading revenue data for date:', date);
        const revenueDoc = await db.collection('daily_revenue')
            .doc(`${date}_milano`)
            .get();
            
        if (revenueDoc.exists) {
            const data = revenueDoc.data();
            if (data.date === date) {
                console.log('Revenue data loaded:', data);
                return data;
            }
        }
        console.log('No revenue data found for date:', date);
        return null;
        
    } catch (error) {
        console.error('Error loading revenue data:', error);
        return null;
    }
}
async function saveRevenueData() {
    if (!currentRevenueData) return;
    
    try {
        const revenueData = {
            date: currentDate,
            ...currentRevenueData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid,
            companyId: 'milano'
        };
        
        await db.collection('daily_revenue')
            .doc(`${currentDate}_milano`)
            .set(revenueData);
            
        console.log('Revenue data saved successfully');
    } catch (error) {
        console.error('Error saving revenue data:', error);
    }
}
function openReportPopup() {
    const totalExpenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    
    safeUpdate('reportExpenses', formatCurrency(totalExpenses));
    safeUpdate('reportTransferDisplay', formatCurrency(transferTotal));
    
    // Tự động tính tiền mặt khi có doanh thu và chuyển khoản
    if (currentRevenueData) {
        getElement('reportRevenue').value = currentRevenueData.totalRevenue;
        safeUpdate('reportCashDisplay', formatCurrency(currentRevenueData.cashAmount));
    } else if (currentReportData) {
        getElement('reportRevenue').value = currentReportData.revenue;
        getElement('reportEndFund').value = currentReportData.endFund;
        
        if (currentReportData.revenueDetails) {
            safeUpdate('reportCashDisplay', formatCurrency(currentReportData.revenueDetails.cashAmount));
            safeUpdate('reportTransferDisplay', formatCurrency(currentReportData.revenueDetails.transferTotal));
        }
    } else {
        getElement('reportRevenue').value = '';
        getElement('reportEndFund').value = '';
        safeUpdate('reportCashDisplay', '0 ₫');
        safeUpdate('reportTransferDisplay', formatCurrency(transferTotal));
    }
    
    // HIỂN THỊ/HIDE INPUT CHO QUẢN LÝ
    toggleActualIncomeInput();
    toggleStartFundEdit(); // THÊM DÒNG NÀY
    
    calculateReport();
    getElement('reportPopup').classList.add('active');
}

function calculateReport() {
    const startFund = parseFloat(getElement('reportStartFund').value) || 0;
    const revenue = parseFloat(getElement('reportRevenue').value) || 0;
    const expenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    const endFund = parseFloat(getElement('reportEndFund').value) || 0;
    
    // CÔNG THỨC MỚI: Thực lãnh = Số dư đầu + Doanh thu - Chi phí - Chuyển khoản - Số dư cuối
    const actualIncome = startFund + revenue - expenses - transferTotal - endFund;
    
    safeUpdate('calculatedIncome', formatCurrency(actualIncome));
    
    // Đồng bộ với input Thực lãnh nếu là quản lý
    if (isManager() && getElement('reportActualIncome')) {
        // Chỉ cập nhật nếu người dùng không đang nhập vào input Thực lãnh
        if (!getElement('reportActualIncome').matches(':focus')) {
            getElement('reportActualIncome').value = actualIncome || '';
        }
    }
    
    return actualIncome;
}

async function submitReport() {
    const revenue = parseFloat(getElement('reportRevenue').value);
    const endFund = parseFloat(getElement('reportEndFund').value);
    
    if (!revenue || revenue <= 0) {
        showToast('Vui lòng nhập doanh thu hợp lệ', 'error');
        return;
    }
    
    if (!endFund || endFund < 0) {
        showToast('Vui lòng nhập số dư cuối kỳ hợp lệ', 'error');
        return;
    }
    
    // KHAI BÁO TẤT CẢ BIẾN CẦN THIẾT
    const startFund = parseFloat(getElement('reportStartFund').value) || 0;
    const totalExpenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    
    // KIỂM TRA NẾU QUẢN LÝ NHẬP THỰC LÃNH
    let actualIncome;
    if (isManager() && getElement('reportActualIncome').value) {
        actualIncome = parseFloat(getElement('reportActualIncome').value);
        // Ghi log hành động điều chỉnh
        console.log('Manager adjusted actual income:', actualIncome);
        
        // Thêm thông tin vào edit history
        const calculatedIncome = startFund + revenue - totalExpenses - transferTotal - endFund;
        if (Math.abs(actualIncome - calculatedIncome) > 100) {
            console.log(`Manager adjustment: ${formatCurrency(calculatedIncome)} → ${formatCurrency(actualIncome)}`);
        }
    } else {
        // Tính thực lãnh bình thường
        actualIncome = startFund + revenue - totalExpenses - transferTotal - endFund;
    }
    
    const oldEndFund = currentReportData ? currentReportData.endFund : null;
    const oldStartFund = currentReportData ? currentReportData.startFund : null;
    
    const changes = {};
    if (currentReportData) {
        if (currentReportData.revenue !== revenue) {
            changes.revenue = { from: currentReportData.revenue, to: revenue };
        }
        if (currentReportData.endFund !== endFund) {
            changes.endFund = { from: currentReportData.endFund, to: endFund };
        }
        if (currentReportData.startFund !== startFund) {
            changes.startFund = { from: currentReportData.startFund, to: startFund };
        }
        if (currentReportData.totalExpenses !== totalExpenses) {
            changes.totalExpenses = { from: currentReportData.totalExpenses, to: totalExpenses };
        }
        if (currentReportData.actualIncome !== actualIncome) {
            changes.actualIncome = { 
                from: currentReportData.actualIncome, 
                to: actualIncome,
                detail: isManager() && getElement('reportActualIncome').value ? 'Điều chỉnh bởi quản lý' : 'Tính toán tự động'
            };
        }
    }
    
    try {
        const reportData = {
            date: currentDate,
            startFund: startFund,
            revenue: revenue,
            expenses: currentExpenses,
            totalExpenses: totalExpenses,
            endFund: endFund,
            actualIncome: actualIncome,
            status: 'submitted',
            creatorId: currentUser.uid,
            creatorEmail: currentUser.email,
            companyId: 'milano',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (currentReportData) {
            reportData.createdAt = currentReportData.createdAt;
        } else {
            reportData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        // === PHẦN QUAN TRỌNG: LƯU REVENUE DATA ===
        if (currentRevenueData) {
            // Đảm bảo transfer details được cập nhật mới nhất
            currentRevenueData.transferDetails = transferDetails;
            currentRevenueData.transferTotal = transferTotal;
            currentRevenueData.updatedAt = new Date();
            
            // Lưu revenue data vào collection riêng
            await db.collection('daily_revenue')
                .doc(`${currentDate}_milano`)
                .set({
                    date: currentDate,
                    ...currentRevenueData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: currentUser.uid,
                    companyId: 'milano'
                });
                
            reportData.revenueDetails = currentRevenueData;
            
        } else if (transferDetails.length > 0) {
            // Tự động tạo revenue data từ transfers nếu có chuyển khoản nhưng chưa có revenue data
            currentRevenueData = {
                totalRevenue: revenue,
                cashAmount: revenue - transferTotal,
                transferTotal: transferTotal,
                transferDetails: transferDetails,
                method: 'detail',
                updatedAt: new Date()
            };
            
            // Lưu revenue data vào collection riêng
            await db.collection('daily_revenue')
                .doc(`${currentDate}_milano`)
                .set({
                    date: currentDate,
                    ...currentRevenueData,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: currentUser.uid,
                    companyId: 'milano'
                });
                
            reportData.revenueDetails = currentRevenueData;
        }
        // === KẾT THÚC PHẦN LƯU REVENUE DATA ===
        
        let reportId;
        const isUpdate = !!currentReportData;
        const action = isUpdate ? 'updated' : 'created';
        
        const editRecord = {
            timestamp: getVietnamTime(),
            userId: currentUser.uid,
            userEmail: currentUser.email,
            action: action,
            changes: changes,
            actualIncome: actualIncome,
            version: isUpdate ? (currentReportData.editHistory?.length || 0) + 1 : 1
        };
        
        if (isUpdate) {
            reportData.editHistory = [...(currentReportData.editHistory || []), editRecord];
        } else {
            reportData.editHistory = [editRecord];
        }
        
        if (isUpdate) {
            reportId = currentReportData.id;
            await db.collection('reports').doc(reportId).update(reportData);
        } else {
            const newReport = await db.collection('reports').add(reportData);
            reportId = newReport.id;
        }
        
        // Lưu expenses nếu có
        if (currentExpenses.length > 0) {
            await db.collection('daily_expenses')
                .doc(`${currentDate}_milano`)
                .set({
                    date: currentDate,
                    expenses: currentExpenses,
                    total: totalExpenses,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: currentUser.uid,
                    reportId: reportId
                });
        }
        
        // Lưu transfers nếu có - ĐẢM BẢO LUÔN LƯU TRANSFERS
        if (transferDetails.length > 0) {
            await db.collection('daily_transfers')
                .doc(`${currentDate}_milano`)
                .set({
                    date: currentDate,
                    transfers: transferDetails,
                    total: transferTotal,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: currentUser.uid,
                    reportId: reportId
                });
        } else {
            // Nếu không có transfer details nhưng có transferTotal từ revenue data, vẫn lưu
            if (currentRevenueData && currentRevenueData.transferTotal > 0) {
                await db.collection('daily_transfers')
                    .doc(`${currentDate}_milano`)
                    .set({
                        date: currentDate,
                        transfers: currentRevenueData.transferDetails || [],
                        total: currentRevenueData.transferTotal,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedBy: currentUser.uid,
                        reportId: reportId
                    });
            }
        }
        
        // XỬ LÝ HIỆU ỨNG CÁNH BƯỚM KHI THAY ĐỔI SỐ DƯ ĐẦU HOẶC CUỐI
        if (isUpdate) {
            // Nếu quản lý thay đổi số dư đầu
            if (isManager() && oldStartFund !== null && oldStartFund !== startFund) {
                await applyButterflyEffect(currentDate, oldStartFund, startFund);
            }
            
            // Nếu thay đổi số dư cuối
            if (oldEndFund !== null && oldEndFund !== endFund) {
                await updateSubsequentDays(currentDate, oldEndFund, endFund);
            }
        }
        
        closeReportPopup();
        await loadDateData();
        await loadRecentReports();
        
        // LUÔN LOAD LẠI REPORTS TAB ĐỂ CẬP NHẬT DỮ LIỆU MỚI
        await loadReports(currentTimeframe);
        
        const successTime = formatVietnamDateTime(getVietnamTime());
        showAlertWithConfirm(
            'Thành công', 
            `Đã gửi báo cáo lúc ${successTime}! Bạn có muốn chia sẻ qua Zalo?`,
            'Chia sẻ Zalo',
            'Để sau',
            () => {
                copyReportToClipboard();
            },
            () => {
                showToast('Báo cáo đã được lưu thành công', 'success');
            }
        );
        
    } catch (error) {
        console.error('Error submitting report:', error);
        
        if (error.code === 'failed-precondition') {
            showToast('Dữ liệu đang được cập nhật từ nơi khác. Vui lòng thử lại sau.', 'error');
        } else if (error.code === 'permission-denied') {
            showToast('Bạn không có quyền thực hiện thao tác này.', 'error');
        } else {
            handleFirestoreError(error, 'submitReport');
        }
    }
}
// ==================== START FUND MANAGEMENT ====================
function toggleStartFundEdit() {
    const startFundInput = getElement('reportStartFund');
    const startFundNote = getElement('startFundNote');
    
    if (isManager()) {
        startFundInput.readOnly = false;
        startFundNote.style.display = 'block';
        startFundInput.style.background = 'rgba(255, 255, 0, 0.1)';
        startFundInput.style.border = '2px solid #ffc107';
    } else {
        startFundInput.readOnly = true;
        startFundNote.style.display = 'none';
        startFundInput.style.background = '';
        startFundInput.style.border = '';
    }
}

async function updateStartFundForDate(date, newStartFund) {
    try {
        // Cập nhật số dư đầu cho ngày hiện tại
        const reports = await db.collection('reports')
            .where('date', '==', date)
            .where('companyId', '==', 'milano')
            .get();
            
        if (!reports.empty) {
            const reportDoc = reports.docs[0];
            const oldStartFund = reportDoc.data().startFund;
            
            await reportDoc.ref.update({
                startFund: newStartFund,
                actualIncome: newStartFund + reportDoc.data().revenue - reportDoc.data().totalExpenses - (reportDoc.data().revenueDetails?.transferTotal || 0) - reportDoc.data().endFund,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Log thay đổi
            console.log(`Updated start fund for ${date}: ${formatCurrency(oldStartFund)} → ${formatCurrency(newStartFund)}`);
            
            return oldStartFund;
        }
        return null;
    } catch (error) {
        console.error('Error updating start fund:', error);
        throw error;
    }
}

// Hiệu ứng cánh bướm - cập nhật tất cả các ngày sau khi thay đổi số dư đầu
async function applyButterflyEffect(startDate, oldStartFund, newStartFund) {
    if (oldStartFund === newStartFund) return;
    
    try {
        const subsequentReports = await db.collection('reports')
            .where('companyId', '==', 'milano')
            .where('date', '>', startDate)
            .orderBy('date', 'asc')
            .get();
        
        const batch = db.batch();
        let currentStartFund = newStartFund;
        let updatedCount = 0;
        
        for (const doc of subsequentReports.docs) {
            const report = doc.data();
            const newActualIncome = currentStartFund + report.revenue - report.totalExpenses - (report.revenueDetails?.transferTotal || 0) - report.endFund;
            
            batch.update(doc.ref, {
                startFund: currentStartFund,
                actualIncome: newActualIncome,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            currentStartFund = report.endFund;
            updatedCount++;
        }
        
        if (updatedCount > 0) {
            await batch.commit();
            showToast(`Đã cập nhật ${updatedCount} ngày tiếp theo (hiệu ứng cánh bướm)`, 'info');
        }
        
    } catch (error) {
        console.error('Error in butterfly effect:', error);
        throw error;
    }
}
// ==================== REVERSE CALCULATION FROM ACTUAL INCOME ====================
function calculateReverseFromActualIncome() {
    if (!isManager()) {
        showToast('Chỉ quản lý mới được sử dụng tính năng này', 'error');
        getElement('reportActualIncome').value = '';
        return;
    }

    const actualIncome = parseFloat(getElement('reportActualIncome').value) || 0;
    const startFund = parseFloat(getElement('reportStartFund').value) || 0;
    const expenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    const endFund = parseFloat(getElement('reportEndFund').value) || 0;

    if (!endFund || endFund <= 0) {
        showToast('Vui lòng nhập số dư cuối trước', 'error');
        return;
    }

    // CÔNG THỨC TRUY NGƯỢC: Doanh thu = Thực lãnh + Chi phí + Chuyển khoản + Số dư cuối - Số dư đầu
    const calculatedRevenue = actualIncome + expenses + transferTotal + endFund - startFund;

    if (calculatedRevenue < 0) {
        showToast('Số liệu không hợp lệ. Thực lãnh quá thấp so với chi phí', 'error');
        return;
    }

    // Cập nhật doanh thu
    getElement('reportRevenue').value = Math.round(calculatedRevenue);
    
    // Cập nhật tiền mặt (nếu có revenue data)
    if (currentRevenueData) {
        const cashAmount = calculatedRevenue - transferTotal;
        currentRevenueData.cashAmount = cashAmount > 0 ? cashAmount : 0;
        currentRevenueData.totalRevenue = calculatedRevenue;
        safeUpdate('reportCashDisplay', formatCurrency(cashAmount));
    }

    // Hiển thị kết quả
    safeUpdate('calculatedIncome', formatCurrency(actualIncome));
    showToast(`Đã tính: Doanh thu = ${formatCurrency(calculatedRevenue)}`, 'success');
}

function toggleActualIncomeInput() {
    const actualIncomeSection = getElement('actualIncomeInputSection');
    if (isManager()) {
        actualIncomeSection.style.display = 'block';
        
        // Nếu đang xem báo cáo cũ, hiển thị thực lãnh hiện tại
        if (currentReportData) {
            getElement('reportActualIncome').value = currentReportData.actualIncome || '';
        } else {
            getElement('reportActualIncome').value = '';
        }
    } else {
        actualIncomeSection.style.display = 'none';
    }
}
async function loadReports(timeframe = 0) {
    currentTimeframe = timeframe;
    
    try {
        // Cập nhật UI ngay lập tức
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.days) === timeframe) {
                btn.classList.add('active');
            }
        });
        
        // 🚀 CHỈ LOAD BÁO CÁO CHÍNH TRƯỚC
        let query = db.collection('reports')
            .where('companyId', '==', 'milano');
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        if (timeframe === 0) {
            query = query.where('date', '==', todayStr);
        } else if (timeframe === 1) {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            query = query.where('date', '==', yesterdayStr);
        } else if (timeframe === 7 || timeframe === 30) {
            const daysToSubtract = timeframe - 1;
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - daysToSubtract);
            const startDateStr = startDate.toISOString().split('T')[0];
            query = query.where('date', '>=', startDateStr);
        }
        
        const snapshot = await query.orderBy('date', 'desc').get();
        
        const reports = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                reportDate: new Date(data.date)
            };
        });
        
        // Hiển thị báo cáo ngay
        displayReports(reports);
        updateSummary(reports);
        
        // 📦 LOAD DỮ LIỆU NẶNG SAU
        setTimeout(() => {
            drawReportsChart(reports); // Chart có thể load sau
            
            // Chỉ load detailed data nếu tab đang active
            const reportsTab = getElement('reportsTab');
            if (reportsTab && reportsTab.classList.contains('active')) {
                const activeDetailTab = document.querySelector('.detail-tab-content.active');
                if (activeDetailTab) {
                    const tabName = activeDetailTab.id.replace('DetailTab', '');
                    switch(tabName) {
                        case 'transfers':
                            loadDetailedTransfers(timeframe);
                            break;
                        case 'expenses':
                            loadDetailedExpenses(timeframe);
                            break;
                        case 'statistics':
                            loadExpenseStatistics(timeframe);
                            break;
                    }
                }
            }
        }, 500);
        
    } catch (error) {
        handleFirestoreError(error, 'loadReports');
    }
}

function displayReports(reports) {
    const tbody = document.querySelector('#reportsTable tbody');
    
    // Kiểm tra nếu phần tử không tồn tại
    if (!tbody) {
        console.warn('Reports table tbody not found');
        return;
    }
    
    if (!reports || reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Không có báo cáo nào</td></tr>';
        return;
    }

    tbody.innerHTML = reports.map(report => {
        const actualIncome = report.actualIncome;
        const calculatedIncome = report.revenue + report.startFund - report.totalExpenses - 
                               (report.revenueDetails?.transferTotal || 0) - report.endFund;
        const difference = actualIncome - calculatedIncome;
        const statusClass = Math.abs(difference) < 1000 ? 'status-ok' : 'status-alert';
        const statusText = Math.abs(difference) < 1000 ? 'Đã khớp' : 'Lệch ' + formatCurrency(difference);

        return `
            <tr>
                <td>${formatDisplayDate(report.date)}</td>
                <td>${formatCurrency(report.revenue)}</td>
                <td>${formatCurrency(report.totalExpenses)}</td>
                <td>${formatCurrency(actualIncome)}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>${report.creatorEmail || 'N/A'}</td>
                <td>
                    <button onclick="viewFullReport('${report.id}')" class="btn-info">👁️ Xem</button>
                    <button onclick="editExistingReport('${report.id}')" class="btn-edit">✏️ Sửa</button>
                    ${isManager() ? `<button onclick="deleteReport('${report.id}')" class="btn-danger">🗑️</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function updateSummary(reports) {
    const totalRevenue = reports.reduce((sum, r) => sum + r.revenue, 0);
    const totalExpenses = reports.reduce((sum, r) => sum + r.totalExpenses, 0);
    const totalActualIncome = reports.reduce((sum, r) => sum + r.actualIncome, 0);

    safeUpdate('totalRevenueSummary', formatCurrency(totalRevenue));
    safeUpdate('totalExpensesSummary', formatCurrency(totalExpenses));
    safeUpdate('totalActualIncome', formatCurrency(totalActualIncome));
}

// ==================== DETAILED TABLES ====================
async function loadDetailedTransfers(timeframe) {
    try {
        let query = db.collection('daily_transfers')
            .where('date', '>=', getStartDateFromTimeframe(timeframe));
        
        const snapshot = await query.orderBy('date', 'desc').get();
        
        const allTransfers = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            data.transfers.forEach(transfer => {
                allTransfers.push({
                    ...transfer,
                    date: data.date,
                    reportId: doc.id
                });
            });
        });
        
        displayDetailedTransfers(allTransfers);
        
    } catch (error) {
        handleFirestoreError(error, 'loadDetailedTransfers');
    }
}

function displayDetailedTransfers(transfers) {
    const container = getElement('detailedTransfersList');
    
    if (!container || !container.innerHTML) {
        console.log('Detailed transfers container not available');
        return;
    }
    
    if (!transfers || transfers.length === 0) {
        container.innerHTML = '<div class="empty-state">Không có chuyển khoản nào</div>';
        return;
    }

    // Nhóm transfers theo ngày
    const groupedByDate = {};
    transfers.forEach(transfer => {
        if (!groupedByDate[transfer.date]) {
            groupedByDate[transfer.date] = [];
        }
        groupedByDate[transfer.date].push(transfer);
    });

    container.innerHTML = Object.entries(groupedByDate)
        .sort((a, b) => new Date(b[0]) - new Date(a[0])) // Sắp xếp ngày mới nhất trước
        .map(([date, dayTransfers]) => {
            const total = dayTransfers.reduce((sum, item) => sum + item.amount, 0);
            
            return `
                <div class="date-group">
                    <div class="date-group-header">
                        <span class="date-title">📅 ${formatDisplayDate(date)}</span>
                        <span class="date-count">SL CK: ${dayTransfers.length}</span>
                    </div>
                    <div class="date-content">
                        <div class="transfer-details">
                            ${dayTransfers.map(item => `
                                <div class="transfer-detail-item">
                                    <span class="transfer-amount">${formatCurrency(item.amount)}</span>
                                    <span class="transfer-desc">${item.description || 'Chuyển khoản'}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="date-total">🏦 TỔNG: ${formatCurrency(total)}</div>
                    </div>
                </div>
            `;
        }).join('');
}

async function loadDetailedExpenses(timeframe) {
    try {
        let query = db.collection('daily_expenses')
            .where('date', '>=', getStartDateFromTimeframe(timeframe));
        
        const snapshot = await query.orderBy('date', 'desc').get();
        
        const allExpenses = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            data.expenses.forEach(expense => {
                allExpenses.push({
                    ...expense,
                    date: data.date,
                    reportId: doc.id
                });
            });
        });
        
        displayDetailedExpenses(allExpenses);
        
    } catch (error) {
        handleFirestoreError(error, 'loadDetailedExpenses');
    }
}

function displayDetailedExpenses(expenses) {
    const container = getElement('detailedExpensesList');
    
    if (!container || !container.innerHTML) {
        console.log('Detailed expenses container not available');
        return;
    }
    
    if (!expenses || expenses.length === 0) {
        container.innerHTML = '<div class="empty-state">Không có chi phí nào</div>';
        return;
    }

    // Nhóm expenses theo ngày
    const groupedByDate = {};
    expenses.forEach(expense => {
        if (!groupedByDate[expense.date]) {
            groupedByDate[expense.date] = [];
        }
        groupedByDate[expense.date].push(expense);
    });

    container.innerHTML = Object.entries(groupedByDate)
        .sort((a, b) => new Date(b[0]) - new Date(a[0])) // Sắp xếp ngày mới nhất trước
        .map(([date, dayExpenses]) => {
            const total = dayExpenses.reduce((sum, item) => sum + item.amount, 0);
            
            return `
                <div class="date-group">
                    <div class="date-group-header">
                        <span class="date-title">📅 ${formatDisplayDate(date)}</span>
                        <span class="date-count">SL CP: ${dayExpenses.length}</span>
                    </div>
                    <div class="date-content">
                        <div class="expense-details">
                            ${dayExpenses.map(item => `
                                <div class="expense-detail-item">
                                    <span class="expense-amount">${formatCurrency(item.amount)}</span>
                                    <span class="expense-category">${item.category}</span>
                                </div>
                            `).join('')}
                        </div>
                        <div class="date-total">💸 TỔNG: ${formatCurrency(total)}</div>
                    </div>
                </div>
            `;
        }).join('');
}



// ==================== CHART MANAGEMENT ====================
function drawReportsChart(reports) {
    if (!reports || reports.length === 0) {
        if (reportsChart) {
            reportsChart.destroy();
            reportsChart = null;
        }
        return;
    }
    
    const sortedReports = reports.slice().sort((a, b) => a.reportDate - b.reportDate);
    const labels = sortedReports.map(r => formatDisplayDate(r.reportDate));
    const revenues = sortedReports.map(r => r.revenue);
    const expenses = sortedReports.map(r => r.totalExpenses);
    const transfers = sortedReports.map(r => r.revenueDetails?.transferTotal || 0);
    const incomes = sortedReports.map(r => r.actualIncome);

    const ctx = getElement('reportsChart').getContext('2d');

    if (reportsChart) {
        reportsChart.destroy();
    }

    reportsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Doanh Thu',
                    data: revenues,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Chi Phí',
                    data: expenses,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Chuyển Khoản',
                    data: transfers,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Thực Lãnh',
                    data: incomes,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value).replace('₫', '');
                        }
                    }
                }
            }
        }
    });
}

// ==================== FULL REPORT VIEW ====================
async function viewFullReport(reportId) {
    try {
        const reportDoc = await db.collection('reports').doc(reportId).get();
        if (!reportDoc.exists) {
            showAlert('Lỗi', 'Không tìm thấy báo cáo');
            return;
        }

        const report = reportDoc.data();
        
        // Hiển thị thông tin đầy đủ
        safeUpdate('fullReportDate', formatDisplayDate(report.date));
        safeUpdate('fullReportCreator', report.creatorEmail || 'N/A');
        safeUpdate('fullReportStartFund', formatCurrency(report.startFund));
        safeUpdate('fullReportRevenue', formatCurrency(report.revenue));
        safeUpdate('fullReportExpenses', formatCurrency(report.totalExpenses));
        safeUpdate('fullReportEndFund', formatCurrency(report.endFund));
        safeUpdate('fullReportActualIncome', formatCurrency(report.actualIncome));
        
        // Hiển thị chi tiết doanh thu
        if (report.revenueDetails) {
            safeUpdate('fullReportCash', formatCurrency(report.revenueDetails.cashAmount));
            safeUpdate('fullReportTransfer', formatCurrency(report.revenueDetails.transferTotal));
            getElement('fullRevenueDetails').style.display = 'block';
        } else {
            getElement('fullRevenueDetails').style.display = 'none';
        }
        
        // Hiển thị chi tiết chi phí
        const expensesList = getElement('fullExpensesList');
        if (report.expenses && report.expenses.length > 0) {
            expensesList.innerHTML = report.expenses.map(exp => `
                <div class="expense-item">
                    <div class="expense-info">
                        <strong>${exp.category}</strong>: ${formatCurrency(exp.amount)}
                    </div>
                </div>
            `).join('');
            getElement('fullExpensesSection').style.display = 'block';
        } else {
            getElement('fullExpensesSection').style.display = 'none';
        }
        
        // Hiển thị lịch sử chỉnh sửa
        displayFullEditHistory(report.editHistory);
        
        // Lưu report ID để sửa
        getElement('fullReportPopup').dataset.reportId = reportId;
        
        getElement('fullReportPopup').classList.add('active');

    } catch (error) {
        handleFirestoreError(error, 'viewFullReport');
    }
}

function displayFullEditHistory(history) {
    const container = getElement('fullEditHistoryList');
    
    if (!history || history.length === 0) {
        container.innerHTML = '<div class="empty-state">Không có lịch sử chỉnh sửa</div>';
        return;
    }

    const sortedHistory = [...history].sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return timeB - timeA;
    });

    container.innerHTML = sortedHistory.map((record, index) => {
        let time;
        if (record.timestamp?.toDate) {
            time = record.timestamp.toDate();
        } else {
            time = new Date(record.timestamp);
        }
        
        const timeStr = time ? formatVietnamDateTime(time) : 'Không xác định';
        
        const changes = record.changes ? Object.entries(record.changes)
            .filter(([key, value]) => value.from !== value.to)
            .map(([key, value]) => `
                <div class="change-item">
                    <strong>${getFieldLabel(key)}:</strong> 
                    ${formatCurrency(value.from)} → ${formatCurrency(value.to)}
                    ${value.detail ? `<br><small>${value.detail}</small>` : ''}
                </div>
            `).join('') : 'Không có thay đổi cụ thể';

        return `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-user">${record.userEmail || 'N/A'}</span>
                    <span class="history-time">${timeStr}</span>
                </div>
                <div class="history-action">${getActionLabel(record.action)} - Phiên bản ${record.version}</div>
                ${changes ? `<div class="history-changes">${changes}</div>` : ''}
            </div>
        `;
    }).join('');
}

function editFullReport() {
    const reportId = getElement('fullReportPopup').dataset.reportId;
    if (reportId) {
        closeFullReportPopup();
        setTimeout(() => editExistingReport(reportId), 300);
    }
}

// ==================== STAFF MANAGEMENT ====================
async function loadStaffManagement() {
    try {
        const snapshot = await db.collection('users').get();
        const staff = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        displayStaffManagement(staff);
    } catch (error) {
        handleFirestoreError(error, 'loadStaffManagement');
    }
}

function displayStaffManagement(staff) {
    const container = getElement('staffManagementList');
    
    // Kiểm tra nếu container không tồn tại thì không làm gì
    if (!container || !container.innerHTML) {
        console.log('Staff management container not available');
        return;
    }
    
    if (!staff || staff.length === 0) {
        container.innerHTML = '<div class="empty-state">Không có nhân viên nào</div>';
        return;
    }
    
    container.innerHTML = staff.map(user => {
        let actionButton;
        
        if (user.role === 'manager') {
            if (user.id === currentUser.uid) {
                actionButton = '<em>Quản lý (Bạn)</em>';
            } else {
                actionButton = `<button onclick="demoteUser('${user.id}')" class="btn-danger">⬇️ Hạ cấp</button>`;
            }
        } else {
            actionButton = `<button onclick="promoteUser('${user.id}')" class="btn-edit">👑 Thăng cấp</button>`;
        }
        
        return `
            <div class="staff-item">
                <div class="staff-info">
                    <div class="staff-email">${user.email}</div>
                    <div class="staff-role">${user.role === 'manager' ? 'Quản lý' : 'Nhân viên'}</div>
                    <div class="staff-date">${user.createdAt ? formatDisplayDate(user.createdAt.toDate()) : 'N/A'}</div>
                </div>
                <div class="staff-actions">
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}

async function promoteUser(userId) {
    if (!isManager()) {
        showAlert('Lỗi', 'Bạn không có quyền thực hiện thao tác này');
        return;
    }
    
    if (confirm('Cấp quyền quản lý cho nhân viên này?')) {
        try {
            await db.collection('users').doc(userId).update({
                role: 'manager',
                promotedAt: firebase.firestore.FieldValue.serverTimestamp(),
                promotedBy: currentUser.uid
            });
            loadStaffManagement();
            showAlert('Thành công', 'Đã cấp quyền quản lý');
        } catch (error) {
            handleFirestoreError(error, 'promoteUser');
        }
    }
}

async function demoteUser(userId) {
    if (!isManager() || userId === currentUser.uid) {
        showAlert('Lỗi', 'Bạn không có quyền thực hiện thao tác này');
        return;
    }
    
    if (confirm('Hạ cấp quyền quản lý của nhân viên này?')) {
        try {
            await db.collection('users').doc(userId).update({
                role: 'staff',
                demotedAt: firebase.firestore.FieldValue.serverTimestamp(),
                demotedBy: currentUser.uid
            });
            loadStaffManagement();
            showAlert('Thành công', 'Đã hạ cấp quyền thành công');
        } catch (error) {
            handleFirestoreError(error, 'demoteUser');
        }
    }
}

// ==================== RECENT REPORTS ====================
async function loadRecentReports() {
    try {
        const snapshot = await db.collection('reports')
            .where('companyId', '==', 'milano')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
            
        const reports = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        displayRecentReports(reports);
        
    } catch (error) {
        console.error('Error loading recent reports:', error);
    }
}
// Thêm hàm copy dữ liệu báo cáo
async function copyReportData(reportId) {
    try {
        const reportDoc = await db.collection('reports').doc(reportId).get();
        if (!reportDoc.exists) return;
        
        const report = reportDoc.data();
        const expenses = report.totalExpenses || 0;
        const transfers = report.revenueDetails?.transferTotal || 0;
        const actualIncome = report.actualIncome || 0;
        
        const reportText = `
📊 BÁO CÁO MILANO - ${formatDisplayDate(report.date)}

💸 Chi phí: ${formatCurrency(expenses)}
🏦 Chuyển khoản: ${formatCurrency(transfers)}
💰 Thực lãnh: ${formatCurrency(actualIncome)}

📈 Doanh thu: ${formatCurrency(report.revenue)}
💰 Số dư đầu: ${formatCurrency(report.startFund)}
🏦 Số dư cuối: ${formatCurrency(report.endFund)}

👤 Người tạo: ${report.creatorEmail}
⏰ Thời gian: ${report.updatedAt ? formatVietnamDateTime(report.updatedAt.toDate()) : 'N/A'}
        `.trim();
        
        copyToClipboard(reportText, 'Đã copy dữ liệu báo cáo!');
        
    } catch (error) {
        console.error('Error copying report data:', error);
        showToast('Lỗi khi copy dữ liệu', 'error');
    }
}

function displayRecentReports(reports) {
    const container = getElement('recentReportsList');
    
    if (reports.length === 0) {
        container.innerHTML = '<div class="report-item"><div class="report-date">Chưa có dữ liệu</div></div>';
        return;
    }
    
    container.innerHTML = reports.map(report => {
        const expenses = report.totalExpenses || 0;
        const transfers = report.revenueDetails?.transferTotal || 0;
        const actualIncome = report.actualIncome || 0;
        
        return `
            <div class="report-item" onclick="viewFullReport('${report.id}')">
                <div class="report-info">
                    <div class="report-date">${formatDisplayDate(report.date)}</div>
                    <div class="report-breakdown">
                        <span class="breakdown-item expense">💸 ${formatCurrency(expenses)}</span>
                        <span class="breakdown-item transfer">🏦 ${formatCurrency(transfers)}</span>
                        <span class="breakdown-item income">💰 ${formatCurrency(actualIncome)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function calculateStartFund(date) {
    try {
        console.log('Calculating start fund for date:', date);
        
        // Tìm ngày hôm trước
        const prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        
        console.log('Looking for previous day:', prevDateStr);
        
        // Tìm báo cáo ngày trước đó
        const prevReports = await db.collection('reports')
            .where('date', '==', prevDateStr)
            .where('companyId', '==', 'milano')
            .get();
            
        let startFund = 0;
        
        if (!prevReports.empty) {
            // Lấy số dư cuối của ngày trước làm số dư đầu hiện tại
            const prevReport = prevReports.docs[0].data();
            startFund = prevReport.endFund;
            console.log(`Found previous day report. End fund: ${prevReport.endFund} → Start fund: ${startFund}`);
        } else {
            console.log('No previous day report found, using default start fund');
            startFund = 469000; // Số dư mặc định
        }
        
        // Cập nhật hiển thị
        safeUpdate('startFundDisplay', formatCurrency(startFund));
        getElement('reportStartFund').value = startFund;
        
        console.log('Final start fund:', startFund);
        return startFund;
        
    } catch (error) {
        console.error('Error calculating start fund:', error);
        const defaultFund = 469000;
        safeUpdate('startFundDisplay', formatCurrency(defaultFund));
        getElement('reportStartFund').value = defaultFund;
        return defaultFund;
    }
}

async function updateSubsequentDays(startDate, originalEndFund, newEndFund) {
    if (originalEndFund === newEndFund) {
        return;
    }
    
    try {
        const subsequentReports = await db.collection('reports')
            .where('companyId', '==', 'milano')
            .where('date', '>', startDate)
            .orderBy('date', 'asc')
            .get();
        
        let currentStartFund = newEndFund;
        const batch = db.batch();
        
        for (const doc of subsequentReports.docs) {
            const report = doc.data();
            const reportDate = report.date;
            
            batch.update(doc.ref, {
                startFund: currentStartFund,
                actualIncome: report.revenue - report.totalExpenses,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            currentStartFund = report.endFund;
        }
        
        if (subsequentReports.docs.length > 0) {
            await batch.commit();
            showToast(`Đã cập nhật ${subsequentReports.docs.length} ngày tiếp theo`, 'info');
        }
        
    } catch (error) {
        console.error('Error in butterfly effect update:', error);
    }
}

function logEditHistory(type, oldData, newData) {
    console.log(`Edit history - ${type}:`, {
        old: oldData,
        new: newData,
        differences: getDifferences(oldData, newData)
    });
}

function getDifferences(oldData, newData) {
    const differences = {};
    Object.keys(newData).forEach(key => {
        if (oldData[key] !== newData[key]) {
            differences[key] = {
                from: oldData[key],
                to: newData[key]
            };
        }
    });
    return differences;
}

function getFieldLabel(field) {
    const labels = {
        revenue: 'Doanh thu',
        endFund: 'Số dư cuối',
        startFund: 'Số dư đầu',
        totalExpenses: 'Chi phí',
        actualIncome: 'Thực lãnh',
        cashAmount: 'Tiền mặt',
        transferTotal: 'Chuyển khoản'
    };
    return labels[field] || field;
}

function getActionLabel(action) {
    const labels = {
        created: '🆕 Tạo mới',
        updated: '✏️ Chỉnh sửa'
    };
    return labels[action] || action;
}

// ==================== POPUP MANAGEMENT ====================
function closeTransferPopup() { getElement('transferPopup').classList.remove('active'); }
function closeExpensePopup() { getElement('expensePopup').classList.remove('active'); }
function closeRevenuePopup() { getElement('revenuePopup').classList.remove('active'); }
function closeReportPopup() { getElement('reportPopup').classList.remove('active'); }
function closeEditExpensePopup() { getElement('editExpensePopup').classList.remove('active'); editingItem = null; editingType = null; }
function closeEditTransferPopup() { getElement('editTransferPopup').classList.remove('active'); editingItem = null; editingType = null; }
function closeFullReportPopup() { getElement('fullReportPopup').classList.remove('active'); }

function openTransferPopupFromExpense() { closeExpensePopup(); setTimeout(openTransferPopup, 300); }
function openReportPopupFromExpense() { closeExpensePopup(); setTimeout(openReportPopup, 300); }
function openReportPopupFromTransfer() { closeTransferPopup(); setTimeout(openReportPopup, 300); }
function openTransferPopupFromReport() { closeReportPopup(); setTimeout(openTransferPopup, 300); }
function openExpensePopupFromReport() { closeReportPopup(); setTimeout(openExpensePopup, 300); }
function openRevenuePopupFromReport() { closeReportPopup(); setTimeout(openRevenuePopup, 300); }
function openTransferPopupFromRevenue() { closeRevenuePopup(); setTimeout(openTransferPopup, 300); }

// ==================== ALERT & TOAST SYSTEM ====================
function showAlert(title, message) {
    safeUpdate('alertTitle', title);
    safeUpdate('alertMessage', message);
    getElement('alertPopup').classList.add('active');
}

function showAlertWithConfirm(title, message, confirmText, cancelText, onConfirm, onCancel) {
    safeUpdate('alertTitle', title);
    safeUpdate('alertMessage', message);
    
    const alertPopup = getElement('alertPopup');
    const alertFooter = alertPopup.querySelector('.popup-footer');
    
    alertFooter.innerHTML = `
        <button onclick="handleConfirm()" class="btn-confirm">✅ ${confirmText}</button>
        <button onclick="handleCancel()" class="btn-cancel">❌ ${cancelText}</button>
    `;
    
    window.handleConfirm = function() {
        closeAlert();
        if (onConfirm) onConfirm();
        window.handleConfirm = null;
        window.handleCancel = null;
    };
    
    window.handleCancel = function() {
        closeAlert();
        if (onCancel) onCancel();
        window.handleConfirm = null;
        window.handleCancel = null;
    };
    
    alertPopup.classList.add('active');
}

function closeAlert() {
    getElement('alertPopup').classList.remove('active');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}

// ==================== CUSTOM DATE FILTER ====================
function showCustomDateModal() {
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
    
    getElement('customStartDate').value = oneWeekAgoStr;
    getElement('customEndDate').value = today;
    getElement('customDateModal').classList.add('active');
}

function closeCustomDateModal() {
    getElement('customDateModal').classList.remove('active');
}

async function applyCustomDateFilter() {
    const startDate = getElement('customStartDate').value;
    const endDate = getElement('customEndDate').value;
    
    if (!startDate || !endDate) {
        showAlert('Lỗi', 'Vui lòng chọn đầy đủ ngày bắt đầu và kết thúc');
        return;
    }
    
    if (startDate > endDate) {
        showAlert('Lỗi', 'Ngày bắt đầu không thể sau ngày kết thúc');
        return;
    }
    
    try {
        const snapshot = await db.collection('reports')
            .where('companyId', '==', 'milano')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .orderBy('date', 'desc')
            .get();
            
        const reports = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                reportDate: new Date(data.date)
            };
        });
        
        displayReports(reports);
        updateSummary(reports);
        drawReportsChart(reports);
        closeCustomDateModal();
        
    } catch (error) {
        handleFirestoreError(error, 'applyCustomDateFilter');
    }
}

// ==================== EDIT EXISTING REPORT ====================
async function editExistingReport(reportId) {
    try {
        const reportDoc = await db.collection('reports').doc(reportId).get();
        if (reportDoc.exists) {
            const report = reportDoc.data();
            
            const canEdit = isManager() || report.creatorId === currentUser.uid;
            if (!canEdit) {
                showAlert('Lỗi', 'Bạn không có quyền chỉnh sửa báo cáo này');
                return;
            }
            
            currentDate = report.date;
            getElement('reportDate').value = currentDate;
            
            currentExpenses = [];
            transferDetails = [];
            currentRevenueData = null;
            
            await loadExpensesForDate(currentDate);
            await loadTransfersForDate(currentDate);
            
            currentReportData = {
                id: reportId,
                ...report
            };
            
            if (report.revenueDetails) {
                currentRevenueData = report.revenueDetails;
                transferDetails = report.revenueDetails.transferDetails || [];
            }
            
            updateMainDisplay();
            switchTab('report');
            setTimeout(openReportPopup, 300);
        }
    } catch (error) {
        handleFirestoreError(error, 'editExistingReport');
    }
}

// ==================== DELETE REPORT ====================
async function deleteReport(reportId) {
    if (!isManager()) {
        showAlert('Lỗi', 'Bạn không có quyền xóa báo cáo');
        return;
    }
    
    if (confirm('Bạn có chắc muốn xóa báo cáo này?')) {
        try {
            const reportDoc = await db.collection('reports').doc(reportId).get();
            if (!reportDoc.exists) return;
            
            const report = reportDoc.data();
            const reportDate = report.date;
            
            await db.collection('reports').doc(reportId).delete();
            
            await updateSubsequentDaysAfterDelete(reportDate);
            
            showAlert('Thành công', 'Đã xóa báo cáo');
            loadReports(currentTimeframe);
            
        } catch (error) {
            handleFirestoreError(error, 'deleteReport');
        }
    }
}

async function updateSubsequentDaysAfterDelete(deletedDate) {
    try {
        const prevDate = new Date(deletedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        
        const prevReport = await db.collection('reports')
            .where('date', '==', prevDateStr)
            .where('companyId', '==', 'milano')
            .get();
            
        let newStartFund = 469000;
        
        if (!prevReport.empty) {
            newStartFund = prevReport.docs[0].data().endFund;
        }
        
        await updateSubsequentDays(deletedDate, 0, newStartFund);
        
    } catch (error) {
        console.error('Error updating after delete:', error);
    }
}

// ==================== ZALO SHARE ====================
function copyReportToClipboard() {
    const startFund = parseFloat(getElement('reportStartFund').value) || 0;
    const revenue = parseFloat(getElement('reportRevenue').value) || 0;
    const expenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const endFund = parseFloat(getElement('reportEndFund').value) || 0;
    const actualIncome = calculateReport();
    
    const transferTotal = currentRevenueData ? currentRevenueData.transferTotal : 0;
    const cashAmount = currentRevenueData ? currentRevenueData.cashAmount : 0;
    
    const reportDate = formatDisplayDate(currentDate);
    const reportTime = formatVietnamDateTime(getVietnamTime());
    
    const reportText = `
📊 BÁO CÁO QUỸ - MILANO COFFEE
📅 Ngày: ${reportDate}
⏰ Giờ báo cáo: ${reportTime}

💰 SỐ DƯ ĐẦU: ${formatCurrency(startFund)}
📈 DOANH THU: ${formatCurrency(revenue)}
💸 CHI PHÍ: ${formatCurrency(expenses)}
🏦 CHUYỂN KHOẢN: ${formatCurrency(transferTotal)}
🏦 SỐ DƯ CUỐI: ${formatCurrency(endFund)}
💵 THỰC LÃNH: ${formatCurrency(actualIncome)}

💳 CHI TIẾT DOANH THU:
💵 Tiền mặt: ${formatCurrency(cashAmount)}
🏦 Chuyển khoản: ${formatCurrency(transferTotal)}

📋 CHI TIẾT CHI PHÍ:
${currentExpenses.length > 0 ? 
  currentExpenses.map(exp => `• ${exp.category}: ${formatCurrency(exp.amount)}`).join('\n') : 
  '• Không có chi phí'}

📋 CHI TIẾT CHUYỂN KHOẢN:
${transferDetails.length > 0 ? 
  transferDetails.map(transfer => `• ${transfer.description}: ${formatCurrency(transfer.amount)}`).join('\n') : 
  '• Không có chuyển khoản'}

---
Tổng kiểm: ${formatCurrency(startFund + revenue - expenses - transferTotal - endFund)}
Báo cáo được tạo lúc: ${reportTime}
    `.trim();
    
    copyToClipboard(reportText, 'Báo cáo đã được copy! Bạn có thể dán vào Zalo ngay.');
}

function copyToClipboard(text, successMessage = 'Đã copy vào clipboard!') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(successMessage, 'success');
        }).catch(err => {
            useFallbackCopy(text, successMessage);
        });
    } else {
        useFallbackCopy(text, successMessage);
    }
}

function useFallbackCopy(text, successMessage) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
            showToast(successMessage, 'success');
        } else {
            showToast('Không thể copy tự động. Vui lòng copy thủ công.', 'error');
            showManualCopyDialog(text);
        }
    } catch (err) {
        document.body.removeChild(textArea);
        showToast('Không thể copy tự động. Vui lòng copy thủ công.', 'error');
        showManualCopyDialog(text);
    }
}
async function loadExpenseStatistics(timeframe) {
    try {
        console.log('Loading expense statistics for timeframe:', timeframe);
        const startDate = getStartDateFromTimeframe(timeframe);
        console.log('Start date for filter:', startDate);
        
        let query = db.collection('daily_expenses')
            .where('date', '>=', startDate);
        
        const snapshot = await query.orderBy('date', 'desc').get();
        
        const allExpenses = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log('Processing expenses for date:', data.date, 'count:', data.expenses?.length || 0);
            
            if (data.expenses && data.expenses.length > 0) {
                data.expenses.forEach(expense => {
                    allExpenses.push({
                        ...expense,
                        date: data.date,
                        source: 'daily_expenses',
                        documentId: doc.id
                    });
                });
            }
        });
        
        console.log('Total expenses found:', allExpenses.length);
        
        // Hiển thị thống kê với tiêu đề theo timeframe
        displayExpenseStatisticsWithTimeframe(allExpenses, timeframe);
        
    } catch (error) {
        console.error('Error in loadExpenseStatistics:', error);
        handleFirestoreError(error, 'loadExpenseStatistics');
    }
}
// ==================== DELETE ALL (MANAGER ONLY) ====================
async function deleteAllReports() {
    if (!isManager()) {
        showAlert('Lỗi', 'Bạn không có quyền thực hiện thao tác này.');
        return;
    }

    if (!confirm('⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ DỮ LIỆU BÁO CÁO?')) {
        return;
    }
    
    if (!confirm('⚠️ XÁC NHẬN CUỐI CÙNG: Thao tác này sẽ XÓA VĨNH VIỄN tất cả báo cáo và chi phí. Tiếp tục?')) {
        return;
    }

    try {
        const reportsSnapshot = await db.collection('reports')
            .where('companyId', '==', 'milano')
            .get();
            
        const batch = db.batch();
        reportsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        currentExpenses = [];
        currentReportData = null;
        expenseCategories = ['Ăn uống', 'Xăng xe', 'Văn phòng phẩm', 'Tiếp khách', 'Bảo trì', 'Khác'];
        
        showAlert('Thành công', `Đã xóa thành công ${reportsSnapshot.size} báo cáo!`);
        
        loadDateData();
        loadRecentReports();
        if (currentTimeframe !== undefined) {
            loadReports(currentTimeframe);
        }
        
    } catch (error) {
        handleFirestoreError(error, 'deleteAllReports');
    }
}

// Inject CSS for new components
const additionalCSS = `
.toast {
    position: fixed;
    top: 80px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    max-width: 300px;
    animation: slideIn 0.3s ease;
}

.toast-success { border-left: 4px solid #28a745; }
.toast-error { border-left: 4px solid #dc3545; }
.toast-info { border-left: 4px solid #17a2b8; }
.toast-warning { border-left: 4px solid #ffc107; }

.toast-content {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.toast-message { flex: 1; font-size: 14px; }
.toast-close { background: none; border: none; font-size: 18px; cursor: pointer; color: #666; margin-left: 10px; }

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

.detailed-item, .staff-item, .report-item {
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.item-info, .staff-info, .report-info {
    flex: 1;
}

.item-date, .staff-date, .report-date {
    font-size: 0.8rem;
    color: #666;
}

.item-description, .item-category, .staff-email, .report-amount {
    font-weight: 600;
    margin: 4px 0;
}

.item-amount, .staff-role {
    color: #28a745;
    font-weight: bold;
}

.staff-actions, .report-actions {
    display: flex;
    gap: 5px;
}

.btn-view {
    background: #17a2b8;
    color: white;
    border: none;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.7rem;
}
`;
async function loadExpenseStatistics(timeframe) {
    try {
        console.log('Loading expense statistics for timeframe:', timeframe);
        const startDate = getStartDateFromTimeframe(timeframe);
        console.log('Start date for filter:', startDate);
        
        let query = db.collection('daily_expenses')
            .where('date', '>=', startDate);
        
        const snapshot = await query.orderBy('date', 'desc').get();
        
        const allExpenses = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log('Processing expenses for date:', data.date, 'count:', data.expenses?.length || 0);
            
            if (data.expenses && data.expenses.length > 0) {
                data.expenses.forEach(expense => {
                    allExpenses.push({
                        ...expense,
                        date: data.date,
                        source: 'daily_expenses',
                        documentId: doc.id
                    });
                });
            }
        });
        
        console.log('Total expenses found:', allExpenses.length);
        
        // Hiển thị thống kê với tiêu đề theo timeframe
        displayExpenseStatisticsWithTimeframe(allExpenses, timeframe);
        
    } catch (error) {
        console.error('Error in loadExpenseStatistics:', error);
        handleFirestoreError(error, 'loadExpenseStatistics');
    }
}


// Hàm lấy ngày bắt đầu từ timeframe
function getStartDateFromTimeframe(timeframe) {
    const today = new Date();
    
    if (timeframe === 0) {
        return today.toISOString().split('T')[0];
    } else if (timeframe === 1) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    } else if (timeframe === 7 || timeframe === 30) {
        const daysToSubtract = timeframe - 1;
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - daysToSubtract);
        return startDate.toISOString().split('T')[0];
    }
    
    return today.toISOString().split('T')[0];
}

// Hiển thị thống kê chi phí theo loại
function displayExpenseStatistics(expenses) {
    const container = getElement('expenseStatistics');
    console.log('Displaying expense statistics, container:', container);
    console.log('Expenses data:', expenses);
    
    if (!container) {
        console.error('Statistics container not found!');
        return;
    }
    
    if (!expenses || expenses.length === 0) {
        container.innerHTML = '<div class="empty-state">Không có chi phí nào trong khoảng thời gian này</div>';
        console.log('No expenses to display');
        return;
    }

    // Nhóm chi phí theo loại
    const groupedByCategory = {};
    expenses.forEach(expense => {
        if (!groupedByCategory[expense.category]) {
            groupedByCategory[expense.category] = [];
        }
        groupedByCategory[expense.category].push(expense);
    });

    console.log('Grouped by category:', groupedByCategory);
    
    if (Object.keys(groupedByCategory).length === 0) {
        container.innerHTML = '<div class="empty-state">Không có dữ liệu chi phí</div>';
        return;
    }

    container.innerHTML = Object.entries(groupedByCategory)
        .sort((a, b) => {
            const totalA = a[1].reduce((sum, item) => sum + item.amount, 0);
            const totalB = b[1].reduce((sum, item) => sum + item.amount, 0);
            return totalB - totalA;
        })
        .map(([category, categoryExpenses]) => {
            const total = categoryExpenses.reduce((sum, item) => sum + item.amount, 0);
            const count = categoryExpenses.length;
            
            return `
                <div class="category-group">
                    <div class="category-header" onclick="toggleCategoryDetails('${category.replace(/\s+/g, '-')}')">
                        <span class="category-title">${category}</span>
                        <span class="category-stats">${count} lần - ${formatCurrency(total)}</span>
                        <span class="category-toggle">▼</span>
                    </div>
                    <div class="category-details" id="details-${category.replace(/\s+/g, '-')}" style="display: none;">
                        ${categoryExpenses.map(expense => `
                            <div class="expense-history-item">
                                <span class="history-date">${formatDisplayDate(expense.date)}</span>
                                <span class="history-amount">${formatCurrency(expense.amount)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    
    console.log('Statistics displayed successfully');
}

// Hàm toggle hiển thị chi tiết loại chi phí
function toggleCategoryDetails(categoryId) {
    const detailsId = `details-${categoryId}`;
    const detailsElement = getElement(detailsId);
    console.log('Toggling category:', categoryId, detailsElement);
    
    if (detailsElement) {
        const headerElement = detailsElement.previousElementSibling;
        const toggleElement = headerElement.querySelector('.category-toggle');
        
        if (detailsElement.style.display === 'none' || !detailsElement.style.display) {
            detailsElement.style.display = 'block';
            toggleElement.textContent = '▲';
        } else {
            detailsElement.style.display = 'none';
            toggleElement.textContent = '▼';
        }
    }
}
// Thêm hàm loading indicator
function showLoading(show = true) {
    let loadingElement = getElement('loadingIndicator');
    
    if (!loadingElement) {
        // Tạo loading indicator nếu chưa có
        const loader = document.createElement('div');
        loader.id = 'loadingIndicator';
        loader.innerHTML = `
            <div class="loading-overlay">
                <div class="loading-spinner"></div>
                <div class="loading-text">Đang tải...</div>
            </div>
        `;
        document.body.appendChild(loader);
        loadingElement = loader;
    }
    
    if (show) {
        loadingElement.style.display = 'flex';
    } else {
        loadingElement.style.display = 'none';
    }
}


function showDetailTab(tabName) {
    console.log('Switching to tab:', tabName, 'with timeframe:', currentTimeframe);
    
    // Ẩn tất cả các tab content
    document.querySelectorAll('.detail-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Bỏ active tất cả các tab button
    document.querySelectorAll('.detail-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Hiển thị tab được chọn
    const selectedTab = getElement(tabName + 'DetailTab');
    if (selectedTab && selectedTab.classList) {
        selectedTab.classList.add('active');
        console.log('Tab activated:', tabName + 'DetailTab');
    } else {
        console.warn('Tab not found:', tabName + 'DetailTab');
        return;
    }
    
    // Active tab button tương ứng
    const activeButton = document.querySelector(`.detail-tab-btn[onclick*="${tabName}"]`);
    if (activeButton && activeButton.classList) {
        activeButton.classList.add('active');
    }
    
    // 🚀 CHỈ LOAD KHI TAB THỰC SỰ ĐƯỢC MỞ
    setTimeout(() => {
        switch(tabName) {
            case 'staff':
                loadStaffManagement();
                break;
            case 'transfers':
                loadDetailedTransfers(currentTimeframe);
                break;
            case 'expenses':
                loadDetailedExpenses(currentTimeframe);
                break;
            case 'statistics':
                loadExpenseStatistics(currentTimeframe);
                break;
            case 'reports':
                // Đã load từ trước, không cần load lại
                break;
        }
    }, 100);
}

function initializeDetailTabs() {
    // Đảm bảo tab đầu tiên được active khi khởi động
    const activeTab = document.querySelector('.detail-tab-content.active');
    if (!activeTab) {
        showDetailTab('reports');
    }
}

async function loadReportData(date) {
    try {
        console.log('Loading report data for date:', date);
        const reports = await db.collection('reports')
            .where('date', '==', date)
            .where('companyId', '==', 'milano')
            .get();
            
        if (!reports.empty) {
            const reportData = {
                id: reports.docs[0].id,
                ...reports.docs[0].data()
            };
            console.log('Report data loaded:', reportData);
            return reportData;
        } else {
            console.log('No report data found for date:', date);
            return null;
        }
        
    } catch (error) {
        console.error('Error loading report data:', error);
        return null;
    }
}
// ==================== PRINT MANAGEMENT ====================
function printManagementReport() {
    if (!isManager()) {
        showAlert('Lỗi', 'Chỉ quản lý mới được sử dụng tính năng in báo cáo');
        return;
    }

    console.log('🖨️ Preparing to print management report...');
    
    // Tạo cửa sổ in
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showAlert('Lỗi', 'Không thể mở cửa sổ in. Vui lòng cho phép popup.');
        return;
    }

    // Lấy dữ liệu hiện tại từ bộ lọc
    const timeframe = currentTimeframe;
    const timeframeText = getTimeframeText(timeframe);
    const printDate = new Date().toLocaleString('vi-VN');
    
    // Tạo nội dung HTML để in
    const printContent = generatePrintContent(timeframe, timeframeText, printDate);
    
    // Ghi nội dung vào cửa sổ in
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Chờ nội dung load xong rồi in
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

function generatePrintContent(timeframe, timeframeText, printDate) {
    // Lấy dữ liệu từ các bảng hiện tại
    const reportsTable = document.getElementById('reportsTable');
    const summaryData = getSummaryData();
    
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo Cáo Quản Lý - Milano Coffee</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 20px;
            color: #333;
            font-size: 14px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }
        .header h1 {
            color: #2c3e50;
            margin: 0;
            font-size: 24px;
        }
        .header h2 {
            color: #7f8c8d;
            margin: 5px 0;
            font-size: 18px;
        }
        .print-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 12px;
            color: #666;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 25px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #2c3e50;
        }
        .summary-card .value {
            font-size: 18px;
            font-weight: bold;
            color: #e74c3c;
        }
        .table-container {
            margin-bottom: 25px;
        }
        .table-container h3 {
            background: #34495e;
            color: white;
            padding: 10px;
            margin: 0;
            font-size: 16px;
            border-radius: 5px 5px 0 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th {
            background: #ecf0f1;
            padding: 10px;
            text-align: left;
            border: 1px solid #bdc3c7;
            font-weight: bold;
        }
        td {
            padding: 8px 10px;
            border: 1px solid #bdc3c7;
        }
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #bdc3c7;
            font-size: 12px;
            color: #7f8c8d;
        }
        .no-data {
            text-align: center;
            padding: 20px;
            color: #7f8c8d;
            font-style: italic;
        }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>☕ MILANO COFFEE</h1>
        <h2>BÁO CÁO QUẢN LÝ</h2>
        <div class="print-info">
            <span><strong>Khoảng thời gian:</strong> ${timeframeText}</span>
            <span><strong>Ngày in:</strong> ${printDate}</span>
            <span><strong>Người in:</strong> ${currentUser.email}</span>
        </div>
    </div>

    ${generateSummarySection(summaryData)}
    ${generateReportsSection()}
    ${generateExpensesSection()}
    ${generateTransfersSection()}

    <div class="footer">
        <p>Báo cáo được tạo tự động từ Hệ thống Quản lý Milano Coffee</p>
        <p>📞 Hotline: 0909 999 999 | 📍 Địa chỉ: Milano Coffee</p>
    </div>
</body>
</html>`;
}

function generateSummarySection(summaryData) {
    return `
    <div class="summary-cards">
        <div class="summary-card">
            <h3>Tổng Doanh Thu</h3>
            <div class="value">${summaryData.totalRevenue}</div>
        </div>
        <div class="summary-card">
            <h3>Tổng Chi Phí</h3>
            <div class="value">${summaryData.totalExpenses}</div>
        </div>
        <div class="summary-card">
            <h3>Thực Lãnh</h3>
            <div class="value">${summaryData.totalActualIncome}</div>
        </div>
    </div>`;
}

function generateReportsSection() {
    const reportsTable = document.getElementById('reportsTable');
    const tbody = reportsTable ? reportsTable.querySelector('tbody') : null;
    
    if (!tbody || tbody.textContent.includes('Không có báo cáo')) {
        return `
        <div class="table-container">
            <h3>📊 BÁO CÁO HÀNG NGÀY</h3>
            <div class="no-data">Không có dữ liệu báo cáo</div>
        </div>`;
    }

    const rows = Array.from(tbody.querySelectorAll('tr'));
    let tableHTML = `
    <div class="table-container">
        <h3>📊 BÁO CÁO HÀNG NGÀY</h3>
        <table>
            <thead>
                <tr>
                    <th>Ngày</th>
                    <th>Doanh Thu</th>
                    <th>Chi Phí</th>
                    <th>Thực Lãnh</th>
                    <th>Trạng Thái</th>
                    <th>Người Tạo</th>
                </tr>
            </thead>
            <tbody>`;

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            tableHTML += `
                <tr>
                    <td>${cells[0].textContent}</td>
                    <td>${cells[1].textContent}</td>
                    <td>${cells[2].textContent}</td>
                    <td>${cells[3].textContent}</td>
                    <td>${cells[4].textContent}</td>
                    <td>${cells[5].textContent}</td>
                </tr>`;
        }
    });

    tableHTML += `
            </tbody>
        </table>
    </div>`;
    
    return tableHTML;
}

function generateExpensesSection() {
    const expensesList = document.getElementById('detailedExpensesList');
    if (!expensesList) return '';

    const dateGroups = expensesList.querySelectorAll('.date-group');
    if (dateGroups.length === 0) {
        return `
        <div class="table-container">
            <h3>💸 CHI TIẾT CHI PHÍ</h3>
            <div class="no-data">Không có dữ liệu chi phí</div>
        </div>`;
    }

    let tableHTML = `
    <div class="table-container">
        <h3>💸 CHI TIẾT CHI PHÍ</h3>
        <table>
            <thead>
                <tr>
                    <th>Ngày</th>
                    <th>Loại Chi Phí</th>
                    <th>Số Tiền</th>
                </tr>
            </thead>
            <tbody>`;

    dateGroups.forEach(group => {
        const dateHeader = group.querySelector('.date-title');
        const date = dateHeader ? dateHeader.textContent.replace('📅 ', '') : 'N/A';
        
        const expenseItems = group.querySelectorAll('.expense-detail-item');
        expenseItems.forEach(item => {
            const category = item.querySelector('.expense-category');
            const amount = item.querySelector('.expense-amount');
            
            if (category && amount) {
                tableHTML += `
                    <tr>
                        <td>${date}</td>
                        <td>${category.textContent}</td>
                        <td>${amount.textContent}</td>
                    </tr>`;
            }
        });
    });

    tableHTML += `
            </tbody>
        </table>
    </div>`;
    
    return tableHTML;
}

function generateTransfersSection() {
    const transfersList = document.getElementById('detailedTransfersList');
    if (!transfersList) return '';

    const dateGroups = transfersList.querySelectorAll('.date-group');
    if (dateGroups.length === 0) {
        return `
        <div class="table-container">
            <h3>🏦 CHI TIẾT CHUYỂN KHOẢN</h3>
            <div class="no-data">Không có dữ liệu chuyển khoản</div>
        </div>`;
    }

    let tableHTML = `
    <div class="table-container">
        <h3>🏦 CHI TIẾT CHUYỂN KHOẢN</h3>
        <table>
            <thead>
                <tr>
                    <th>Ngày</th>
                    <th>Nội Dung</th>
                    <th>Số Tiền</th>
                </tr>
            </thead>
            <tbody>`;

    dateGroups.forEach(group => {
        const dateHeader = group.querySelector('.date-title');
        const date = dateHeader ? dateHeader.textContent.replace('📅 ', '') : 'N/A';
        
        const transferItems = group.querySelectorAll('.transfer-detail-item');
        transferItems.forEach(item => {
            const description = item.querySelector('.transfer-desc');
            const amount = item.querySelector('.transfer-amount');
            
            if (description && amount) {
                tableHTML += `
                    <tr>
                        <td>${date}</td>
                        <td>${description.textContent}</td>
                        <td>${amount.textContent}</td>
                    </tr>`;
            }
        });
    });

    tableHTML += `
            </tbody>
        </table>
    </div>`;
    
    return tableHTML;
}

function getSummaryData() {
    return {
        totalRevenue: document.getElementById('totalRevenueSummary')?.textContent || '0 ₫',
        totalExpenses: document.getElementById('totalExpensesSummary')?.textContent || '0 ₫',
        totalActualIncome: document.getElementById('totalActualIncome')?.textContent || '0 ₫'
    };
}

function getTimeframeText(timeframe) {
    const texts = {
        0: 'Hôm nay',
        1: 'Hôm qua',
        7: '7 Ngày Gần Đây',
        30: '30 Ngày Gần Đây'
    };
    return texts[timeframe] || 'Tất cả';
}
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);