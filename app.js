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

function handleFirestoreError(error, context) {
    console.error(`Error in ${context}:`, error);
    
    if (error.code === 'failed-precondition') {
        showAlert('Lỗi hệ thống', 'Hệ thống đang thiết lập. Vui lòng thử lại sau 1-2 phút.');
    } else if (error.code === 'unavailable') {
        showAlert('Lỗi kết nối', 'Mất kết nối internet. Ứng dụng sẽ hoạt động ở chế độ offline.');
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
        if (error.code === 'auth/user-not-found') {
            showAlert('Lỗi', `Tài khoản ${email} chưa được tạo. Vui lòng tạo tài khoản trong Firebase Authentication trước.`);
        } else {
            showAlert('Đăng nhập thất bại', error.message);
        }
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

    const managementTab = getElement('managementTab');
    if (manager && managementTab) {
        managementTab.style.display = 'block';
        loadStaffManagement();
    } else if (managementTab) {
        managementTab.style.display = 'none';
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
    initializeApp();
}

// ==================== TODAY BUTTON FUNCTION ====================
function loadTodayData() {
    const today = new Date().toISOString().split('T')[0];
    
    // Chỉ load nếu chưa ở ngày hôm nay
    if (getElement('reportDate').value === today) {
        // Nếu đã là hôm nay, reload để cập nhật dữ liệu mới nhất
        loadDateData();
        showAlert('Thông báo', 'Đã làm mới dữ liệu ngày hôm nay');
    } else {
        // Chuyển về ngày hôm nay và load dữ liệu
        getElement('reportDate').value = today;
        loadDateData();
    }
    
    console.log('Loaded today data:', today);
}

async function loadExpensesForDate(date) {
    try {
        console.log('Loading expenses for date:', date);
        
        const expensesDoc = await db.collection('daily_expenses')
            .doc(`${date}_milano`)
            .get();
            
        if (expensesDoc.exists) {
            const data = expensesDoc.data();
            console.log('Found expenses data:', data);
            
            // CHỈ gán expenses nếu đúng ngày
            if (data.date === date) {
                currentExpenses = data.expenses || [];
            } else {
                currentExpenses = [];
            }
        } else {
            console.log('No expenses found for date:', date);
            currentExpenses = [];
        }
        
        console.log('Loaded expenses:', currentExpenses.length, 'items');
        updateExpensesDisplay();
        
    } catch (error) {
        console.error('Error loading expenses:', error);
        handleFirestoreError(error, 'loadExpensesForDate');
        currentExpenses = [];
        updateExpensesDisplay();
    }
}

// ==================== REVENUE MANAGEMENT ====================
function openRevenuePopup() {
    // Reset form - chỉ hiển thị dữ liệu của ngày hiện tại
    getElement('totalRevenue').value = '';
    getElement('cashAmount').value = '';
    
    // Nếu có revenue data của ngày hiện tại, hiển thị
    if (currentRevenueData && currentRevenueData.method) {
        currentRevenueMethod = currentRevenueData.method;
        if (currentRevenueMethod === 'total') {
            getElement('totalRevenue').value = currentRevenueData.totalRevenue;
        } else {
            getElement('cashAmount').value = currentRevenueData.cashAmount;
        }
    } else {
        currentRevenueMethod = 'total';
    }
    
    updateRevenueInputStates();
    recalculateRevenue();
    
    getElement('revenuePopup').classList.add('active');
}

// ==================== TRANSFER MANAGEMENT ====================
function openTransferPopup() {
    // CHỈ hiển thị transfer details của ngày hiện tại
    updateTransferDisplay();
    getElement('transferPopup').classList.add('active');
}



// ==================== EDIT REPORT ====================
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
            
            // QUAN TRỌNG: Cập nhật currentDate và reset dữ liệu
            currentDate = report.date;
            getElement('reportDate').value = currentDate;
            
            // Reset và load dữ liệu của ngày đó
            currentExpenses = [];
            transferDetails = [];
            currentRevenueData = null;
            
            // Load expenses của ngày đó
            await loadExpensesForDate(currentDate);
            
            // Load report data
            currentReportData = {
                id: reportId,
                ...report
            };
            
            // Load revenue details nếu có
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
// ==================== DATA INTEGRITY CHECK ====================
function validateDateData() {
    console.log('=== DATA VALIDATION ===');
    console.log('Current Date:', currentDate);
    console.log('Current Expenses:', currentExpenses.length, 'items');
    console.log('Transfer Details:', transferDetails.length, 'items');
    console.log('Revenue Data:', currentRevenueData ? 'Exists' : 'Null');
    console.log('Report Data:', currentReportData ? 'Exists' : 'Null');
    
    // Kiểm tra xem có dữ liệu của ngày khác không
    if (currentReportData && currentReportData.date !== currentDate) {
        console.warn('⚠️ Report data date mismatch!');
        return false;
    }
    
    return true;
}

function initializeApp() {
    // Luôn set về ngày hiện tại khi khởi động
    currentDate = new Date().toISOString().split('T')[0];
    getElement('reportDate').value = currentDate;
    
    // Reset dữ liệu
    currentExpenses = [];
    transferDetails = [];
    currentRevenueData = null;
    currentReportData = null;
    
    loadDateData();
    loadExpenseCategories();
    loadRecentReports();
    
    console.log('App initialized with today:', currentDate);
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });
    
    // Real-time calculation
    getElement('reportRevenue')?.addEventListener('input', calculateReport);
    getElement('reportEndFund')?.addEventListener('input', calculateReport);
    
    // QUAN TRỌNG: Thêm event listener cho date change
    getElement('reportDate')?.addEventListener('change', loadDateData);
    
    // Revenue method change
    document.querySelectorAll('input[name="revenueMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentRevenueMethod = this.value;
            updateRevenueInputStates();
            recalculateRevenue();
        });
    });
    
    // Close popups when clicking outside
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('popup')) {
            event.target.classList.remove('active');
        }
    });
}

function switchTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    getElement(tabName + 'Tab').classList.add('active');
    
    // Load data if needed
    if (tabName === 'reports') {
        loadReports(0);
        
        const managerActionReports = getElement('managerActionReports');
        const managerReportFilters = getElement('managerReportFilters');
        
        if (managerActionReports) {
            managerActionReports.style.display = isManager() ? 'block' : 'none';
        }
        if (managerReportFilters) {
            managerReportFilters.style.display = isManager() ? 'inline-block' : 'none';
        }
    } else if (tabName === 'management') {
        loadStaffManagement();
    }
}



async function loadReportData(date) {
    try {
        const reports = await db.collection('reports')
            .where('date', '==', date)
            .where('companyId', '==', 'milano')
            .get();
            
        if (!reports.empty) {
            currentReportData = {
                id: reports.docs[0].id,
                ...reports.docs[0].data()
            };
        } else {
            currentReportData = null;
        }
        
    } catch (error) {
        console.error('Error loading report data:', error);
        currentReportData = null;
    }
}

function updateMainDisplay() {
    console.log('Updating main display for date:', currentDate);
    
    // Update expenses (CHI PHÍ - khoản chi ra)
    const totalExpenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    safeUpdate('expensesDisplay', formatCurrency(totalExpenses));
    
    // Update transfer (CHUYỂN KHOẢN - phần của doanh thu)
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    safeUpdate('transferDisplay', formatCurrency(transferTotal));
    
    // Update cash và revenue từ revenue data
    if (currentRevenueData) {
        safeUpdate('cashDisplay', formatCurrency(currentRevenueData.cashAmount));
        safeUpdate('revenueDisplay', formatCurrency(currentRevenueData.totalRevenue));
    } else {
        safeUpdate('cashDisplay', formatCurrency(0));
        safeUpdate('revenueDisplay', formatCurrency(0));
    }
    
    // Update từ report data
    if (currentReportData) {
        safeUpdate('revenueDisplay', formatCurrency(currentReportData.revenue));
        safeUpdate('endFundDisplay', formatCurrency(currentReportData.endFund));
        safeUpdate('actualIncomeDisplay', formatCurrency(currentReportData.actualIncome));
    } else {
        safeUpdate('endFundDisplay', formatCurrency(0));
        safeUpdate('actualIncomeDisplay', formatCurrency(0));
    }
    
    // Luôn tính start fund
    const startFund = parseFloat(getElement('reportStartFund').value) || 0;
    safeUpdate('startFundDisplay', formatCurrency(startFund));
    
    console.log('Display updated - Expenses:', totalExpenses, 'Transfer:', transferTotal);
}

// ==================== EXPENSE MANAGEMENT ====================
async function loadExpenseCategories() {
    try {
        const categoriesDoc = await db.collection('expense_categories').doc('milano').get();
        
        if (categoriesDoc.exists) {
            expenseCategories = categoriesDoc.data().categories || [];
        } else {
            expenseCategories = ['Ăn uống', 'Xăng xe', 'Văn phòng phẩm', 'Tiếp khách', 'Bảo trì', 'Khác'];
            try {
                await db.collection('expense_categories').doc('milano').set({
                    categories: expenseCategories,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (saveError) {
                console.log('Could not save default categories:', saveError);
            }
        }
        
        updateExpenseCategoryDropdown();
        
    } catch (error) {
        handleFirestoreError(error, 'loadExpenseCategories');
        expenseCategories = ['Ăn uống', 'Xăng xe', 'Văn phòng phẩm', 'Tiếp khách', 'Bảo trì', 'Khác'];
        updateExpenseCategoryDropdown();
    }
}





function removeExpenseItem(id) {
    currentExpenses = currentExpenses.filter(exp => exp.id !== id);
    updateExpensesDisplay();
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



function addExpenseItem() {
    const categoryInput = getElement('expenseCategory');
    const amountInput = getElement('expenseAmount');
    
    const category = categoryInput.value.trim();
    const amount = parseFloat(amountInput.value);
    
    if (!category) {
        showToast('Vui lòng nhập loại chi phí', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showToast('Vui lòng nhập số tiền hợp lệ', 'error');
        return;
    }
    
    // Kiểm tra nếu là loại chi phí mới
    const isNewCategory = !expenseCategories.includes(category);
    
    // Thêm vào danh sách hiện tại
    currentExpenses.push({
        category: category,
        amount: amount,
        id: Date.now().toString(),
        createdAt: new Date()
    });
    
    // Nếu là loại mới, thêm vào dropdown và lưu vào database
    if (isNewCategory) {
        expenseCategories.push(category);
        updateExpenseCategoryDropdown();
        saveExpenseCategories(); // Lưu categories mới vào database
        showToast(`Đã thêm loại chi phí mới: "${category}"`, 'success');
    }
    
    updateExpensesDisplay();
    
    // Clear form
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
        console.log('Expense categories saved');
    } catch (error) {
        console.error('Error saving expense categories:', error);
        showToast('Lỗi khi lưu loại chi phí mới', 'error');
    }
}
// ==================== ENHANCED EXPENSE MANAGEMENT WITH CUSTOM DROPDOWN ====================
function setupExpenseDropdown() {
    const categoryInput = getElement('expenseCategory');
    const suggestionsContainer = getElement('categorySuggestions');
    
    if (!categoryInput || !suggestionsContainer) return;
    
    let selectedIndex = -1;
    
    // Show suggestions when focusing
    categoryInput.addEventListener('focus', function() {
        showCategorySuggestions(this.value);
    });
    
    // Filter suggestions while typing
    categoryInput.addEventListener('input', function() {
        showCategorySuggestions(this.value);
        selectedIndex = -1;
    });
    
    // Keyboard navigation
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
                addExpenseItem(); // Add with current input
            }
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    });
    
    // Click outside to hide
    document.addEventListener('click', function(e) {
        if (!categoryInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            hideSuggestions();
        }
    });
    
    function showCategorySuggestions(query) {
        const filtered = expenseCategories.filter(cat => 
            cat.toLowerCase().includes(query.toLowerCase())
        );
        
        suggestionsContainer.innerHTML = '';
        
        // Show matching categories
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
        
        // Show "Add new" option if input doesn't match existing
        if (query.trim() && !expenseCategories.includes(query.trim())) {
            const addNewDiv = document.createElement('div');
            addNewDiv.className = 'suggestion-item highlight';
            addNewDiv.innerHTML = `➕ Thêm mới: "<strong>${query}</strong>"`;
            addNewDiv.addEventListener('click', function() {
                // Keep the current input value
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
    // Không cần làm gì vì suggestions được render động
    // Chỉ cần đảm bảo expenseCategories được cập nhật
    console.log('Expense categories updated:', expenseCategories);
}

// Gọi setup khi mở popup
function openExpensePopup() {
    console.log('Opening expense popup for date:', currentDate);
    updateExpensesDisplay();
    getElement('expensePopup').classList.add('active');
    
    // Setup dropdown sau khi popup hiển thị
    setTimeout(setupExpenseDropdown, 100);
}
// Trong hàm initializeApp() hoặc loadExpenseCategories()
async function loadExpenseCategories() {
    try {
        const categoriesDoc = await db.collection('expense_categories').doc('milano').get();
        
        if (categoriesDoc.exists) {
            expenseCategories = categoriesDoc.data().categories || [];
        } else {
            expenseCategories = ['Ăn uống', 'Xăng xe', 'Văn phòng phẩm', 'Tiếp khách', 'Bảo trì', 'Khác'];
            try {
                await db.collection('expense_categories').doc('milano').set({
                    categories: expenseCategories,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (saveError) {
                console.log('Could not save default categories:', saveError);
            }
        }
        
        updateExpenseCategoryDropdown(); // QUAN TRỌNG: Cập nhật dropdown sau khi load
        
    } catch (error) {
        handleFirestoreError(error, 'loadExpenseCategories');
        expenseCategories = ['Ăn uống', 'Xăng xe', 'Văn phòng phẩm', 'Tiếp khách', 'Bảo trì', 'Khác'];
        updateExpenseCategoryDropdown();
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




function removeTransferDetail(id) {
    transferDetails = transferDetails.filter(item => item.id !== id);
    updateTransferDisplay();
    recalculateRevenue();
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

// ==================== FIXED TRANSFER MANAGEMENT ====================
function addTransferDetail() {
    const amountInput = getElement('transferValue');
    const descriptionInput = getElement('transferDescription');
    
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();
    
    if (!amount || amount <= 0) {
        showToast('Vui lòng nhập số tiền hợp lệ', 'error');
        return;
    }
    
    // Nếu không có nội dung, dùng nội dung mặc định
    const finalDescription = description || `Chuyển khoản ${formatCurrency(amount)}`;
    
    transferDetails.push({
        amount: amount,
        description: finalDescription,
        id: Date.now().toString(),
        createdAt: new Date()
    });
    
    updateTransferDisplay();
    recalculateRevenue();
    
    // Clear form
    amountInput.value = '';
    descriptionInput.value = '';
    showToast('Đã thêm chuyển khoản', 'success');
}

function saveTransfers() {
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    
    // QUAN TRỌNG: Luôn cập nhật revenue data khi có transfer
    if (!currentRevenueData) {
        currentRevenueData = {
            totalRevenue: 0,
            cashAmount: 0,
            transferTotal: transferTotal,
            transferDetails: transferDetails,
            method: 'detail'
        };
    } else {
        currentRevenueData.transferTotal = transferTotal;
        currentRevenueData.transferDetails = transferDetails;
        currentRevenueData.method = 'detail';
    }
    
    // CẬP NHẬT QUAN TRỌNG: Tính lại doanh thu tự động
    recalculateRevenueFromTransfers();
    
    updateMainDisplay();
    showToast('Đã lưu chuyển khoản', 'success');
    closeTransferPopup();
}

function recalculateRevenueFromTransfers() {
    if (!currentRevenueData) return;
    
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    
    if (currentRevenueData.method === 'detail') {
        // Nếu đang dùng phương pháp chi tiết, cập nhật tổng doanh thu
        const cashAmount = currentRevenueData.cashAmount || 0;
        currentRevenueData.totalRevenue = cashAmount + transferTotal;
    } else {
        // Nếu đang dùng phương pháp tổng, cập nhật tiền mặt
        const totalRevenue = currentRevenueData.totalRevenue || 0;
        currentRevenueData.cashAmount = totalRevenue - transferTotal;
    }
    
    currentRevenueData.transferTotal = transferTotal;
}


// ==================== TRANSFER MANAGEMENT TAB ====================
async function loadTransferManagement() {
    try {
        // Load tất cả transfers từ tất cả reports
        const reportsSnapshot = await db.collection('reports')
            .where('companyId', '==', 'milano')
            .orderBy('date', 'desc')
            .get();
            
        const allTransfers = [];
        
        reportsSnapshot.docs.forEach(doc => {
            const report = doc.data();
            if (report.revenueDetails && report.revenueDetails.transferDetails) {
                report.revenueDetails.transferDetails.forEach(transfer => {
                    allTransfers.push({
                        ...transfer,
                        reportDate: report.date,
                        reportId: doc.id,
                        creatorEmail: report.creatorEmail
                    });
                });
            }
        });
        
        displayTransferManagement(allTransfers);
        
    } catch (error) {
        handleFirestoreError(error, 'loadTransferManagement');
    }
}

function displayTransferManagement(transfers) {
    const container = getElement('transferManagementList');
    
    if (!transfers || transfers.length === 0) {
        container.innerHTML = '<div class="empty-state">Chưa có chuyển khoản nào</div>';
        return;
    }
    
    // Nhóm theo nội dung
    const groupedTransfers = transfers.reduce((acc, transfer) => {
        const key = transfer.description;
        if (!acc[key]) {
            acc[key] = {
                description: key,
                totalAmount: 0,
                occurrences: 0,
                transfers: []
            };
        }
        acc[key].totalAmount += transfer.amount;
        acc[key].occurrences += 1;
        acc[key].transfers.push(transfer);
        return acc;
    }, {});
    
    const sortedGroups = Object.values(groupedTransfers)
        .sort((a, b) => b.totalAmount - a.totalAmount);
    
    container.innerHTML = sortedGroups.map(group => `
        <div class="transfer-group">
            <div class="transfer-group-header">
                <h4>${group.description}</h4>
                <span class="transfer-group-total">${formatCurrency(group.totalAmount)} (${group.occurrences} lần)</span>
            </div>
            <div class="transfer-group-details">
                ${group.transfers.map(transfer => `
                    <div class="transfer-detail-item">
                        <span class="transfer-date">${formatDisplayDate(transfer.reportDate)}</span>
                        <span class="transfer-amount">${formatCurrency(transfer.amount)}</span>
                        <span class="transfer-creator">${transfer.creatorEmail}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
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
    
    const totalRevenue = parseFloat(getElement('totalRevenue').value) || 0;
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    const cashAmount = totalRevenue - transferTotal;
    
    getElement('cashAmount').value = cashAmount > 0 ? cashAmount : 0;
    safeUpdate('transferTotalRevenue', formatCurrency(transferTotal));
}

function calculateFromDetail() {
    if (currentRevenueMethod !== 'detail') return;
    
    const cashAmount = parseFloat(getElement('cashAmount').value) || 0;
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    const totalRevenue = cashAmount + transferTotal;
    
    getElement('totalRevenue').value = totalRevenue;
    safeUpdate('transferTotalRevenue', formatCurrency(transferTotal));
}

function recalculateRevenue() {
    const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
    
    if (currentRevenueMethod === 'total') {
        // Phương pháp nhập tổng: Tổng → Tính TM & CK
        const totalRevenue = parseFloat(getElement('totalRevenue').value) || 0;
        const cashAmount = totalRevenue - transferTotal;
        
        getElement('cashAmount').value = cashAmount > 0 ? cashAmount : 0;
        safeUpdate('transferTotalRevenue', formatCurrency(transferTotal));
    } else {
        // Phương pháp nhập chi tiết: TM & CK → Tính tổng
        const cashAmount = parseFloat(getElement('cashAmount').value) || 0;
        const totalRevenue = cashAmount + transferTotal;
        
        getElement('totalRevenue').value = totalRevenue;
        safeUpdate('transferTotalRevenue', formatCurrency(transferTotal));
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
    
    // KIỂM TRA LOGIC QUAN TRỌNG: Tổng doanh thu = Tiền mặt + Chuyển khoản
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
        method: currentRevenueMethod
    };
    
    getElement('reportRevenue').value = totalRevenue;
    updateMainDisplay();
    
    showToast('Đã lưu doanh thu', 'success');
    closeRevenuePopup();
    calculateReport();
}

// ==================== REPORT MANAGEMENT ====================
function calculateReport() {
    const startFund = parseFloat(getElement('reportStartFund').value) || 0;
    const revenue = parseFloat(getElement('reportRevenue').value) || 0;
    const expenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const endFund = parseFloat(getElement('reportEndFund').value) || 0;
    
    // CÔNG THỨC ĐÚNG:
    // Thực lãnh = (Doanh thu + Số dư đầu) - Chi phí - Số dư cuối
    const actualIncome = revenue + startFund - expenses - endFund;
    
    safeUpdate('calculatedIncome', formatCurrency(actualIncome));
    return actualIncome;
}


// ==================== REPORTS TAB ====================
async function loadReports(timeframe = 0) {
    currentTimeframe = timeframe;
    
    try {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.days) === timeframe) {
                btn.classList.add('active');
            }
        });
        
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
            const totalExpenses = data.expenses ? data.expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;

            return {
                id: doc.id,
                ...data,
                reportDate: new Date(data.date),
                totalExpenses: totalExpenses
            };
        });
        
        displayReports(reports);
        updateSummary(reports);
        drawReportsChart(reports);
        
    } catch (error) {
        handleFirestoreError(error, 'loadReports');
    }
}

// Trong hàm displayReports(), cập nhật cột thao tác:
function displayReports(reports) {
    const tbody = document.querySelector('#reportsTable tbody');
    
    if (!reports || reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Không có báo cáo nào</td></tr>';
        return;
    }

    tbody.innerHTML = reports.map(report => {
        const calculatedIncome = report.revenue - report.totalExpenses;
        const difference = report.endFund - (report.startFund + calculatedIncome);
        const statusClass = Math.abs(difference) < 1000 ? 'status-ok' : 'status-alert';
        const statusText = Math.abs(difference) < 1000 ? 'Đã khớp' : 'Lệch ' + formatCurrency(difference);

        return `
            <tr>
                <td>${formatDisplayDate(report.date)}</td>
                <td>${formatCurrency(report.revenue)}</td>
                <td>${formatCurrency(report.totalExpenses)}</td>
                <td>${formatCurrency(calculatedIncome)}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>${report.creatorEmail || 'N/A'}</td>
                <td>
                    <button onclick="viewReportDetails('${report.id}')" class="btn-info">👁️</button>
                    <button onclick="editExistingReport('${report.id}')" class="btn-edit">✏️</button>
                    ${isManager() ? `<button onclick="deleteReport('${report.id}')" class="btn-danger">🗑️</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function updateSummary(reports) {
    const totalRevenue = reports.reduce((sum, r) => sum + r.revenue, 0);
    const totalExpenses = reports.reduce((sum, r) => sum + r.totalExpenses, 0);
    const totalActualIncome = totalRevenue - totalExpenses;

    safeUpdate('totalRevenueSummary', formatCurrency(totalRevenue));
    safeUpdate('totalExpensesSummary', formatCurrency(totalExpenses));
    safeUpdate('totalActualIncome', formatCurrency(totalActualIncome));
}

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
    const incomes = sortedReports.map(r => r.revenue - r.totalExpenses);

    const ctx = getElement('reportsChart').getContext('2d');

    if (reportsChart) {
        reportsChart.destroy();
    }

    reportsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Doanh Thu',
                    data: revenues,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    type: 'bar',
                    order: 2
                },
                {
                    label: 'Chi Phí',
                    data: expenses,
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    type: 'bar',
                    order: 3
                },
                {
                    label: 'Thực Lãnh',
                    data: incomes,
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderWidth: 3,
                    type: 'line',
                    fill: true,
                    tension: 0.3,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
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
    const tbody = document.querySelector('#staffTable tbody');
    
    tbody.innerHTML = staff.map(user => {
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
            <tr>
                <td>${user.email}</td>
                <td>${user.role === 'manager' ? 'Quản lý' : 'Nhân viên'}</td>
                <td>${user.createdAt ? formatDisplayDate(user.createdAt.toDate()) : 'N/A'}</td>
                <td>${actionButton}</td>
            </tr>
        `;
    }).join('');
}

async function promoteUser(userId) {
    if (confirm('Cấp quyền quản lý cho nhân viên này?')) {
        try {
            await db.collection('users').doc(userId).update({
                role: 'manager'
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
                role: 'staff'
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

function displayRecentReports(reports) {
    const container = getElement('recentReportsList');
    
    if (reports.length === 0) {
        container.innerHTML = '<div class="report-item"><div class="report-date">Chưa có dữ liệu</div><div class="report-amount">0 ₫</div></div>';
        return;
    }
    
    container.innerHTML = reports.map(report => `
        <div class="report-item">
            <div class="report-date">${formatDisplayDate(report.date)}</div>
            <div class="report-amount">${formatCurrency(report.actualIncome)}</div>
        </div>
    `).join('');
}

// ==================== IMPROVED START FUND CALCULATION ====================
async function calculateStartFund(date) {
    try {
        const prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        
        console.log('Calculating start fund for:', date, 'from previous day:', prevDateStr);
        
        const reports = await db.collection('reports')
            .where('date', '==', prevDateStr)
            .where('companyId', '==', 'milano')
            .get();
            
        let startFund = 0;
        
        if (!reports.empty) {
            const prevReport = reports.docs[0].data();
            startFund = prevReport.endFund;
            console.log('Found previous day end fund:', startFund);
        } else {
            // Nếu là ngày đầu tiên có báo cáo, dùng mặc định
            const allReports = await db.collection('reports')
                .where('companyId', '==', 'milano')
                .orderBy('date', 'asc')
                .limit(1)
                .get();
                
            if (allReports.empty) {
                startFund = 469000; // Số dư mặc định ban đầu
                console.log('No reports found, using default start fund:', startFund);
            } else {
                const firstReport = allReports.docs[0].data();
                const firstReportDate = new Date(firstReport.date);
                const currentDateObj = new Date(date);
                
                if (currentDateObj < firstReportDate) {
                    startFund = 469000; // Ngày trước ngày đầu tiên
                } else {
                    startFund = firstReport.startFund; // Ngày đầu tiên
                }
                console.log('Using first report start fund:', startFund);
            }
        }
        
        safeUpdate('startFundDisplay', formatCurrency(startFund));
        getElement('reportStartFund').value = startFund;
        
        return startFund;
        
    } catch (error) {
        console.error('Error calculating start fund:', error);
        safeUpdate('startFundDisplay', formatCurrency(469000));
        getElement('reportStartFund').value = 469000;
        return 469000;
    }
}

// ==================== BUTTERFLY EFFECT - UPDATE SUBSEQUENT DAYS ====================
async function updateSubsequentDays(startDate, originalEndFund, newEndFund) {
    // Chỉ cập nhật nếu số dư cuối thay đổi
    if (originalEndFund === newEndFund) {
        return;
    }
    
    console.log('Butterfly effect: Updating subsequent days from', startDate);
    console.log('End fund changed from', originalEndFund, 'to', newEndFund);
    
    try {
        // Lấy tất cả các ngày sau ngày hiện tại
        const subsequentReports = await db.collection('reports')
            .where('companyId', '==', 'milano')
            .where('date', '>', startDate)
            .orderBy('date', 'asc')
            .get();
        
        let currentStartFund = newEndFund;
        const batch = db.batch();
        
        // Cập nhật tuần tự từng ngày
        for (const doc of subsequentReports.docs) {
            const report = doc.data();
            const reportDate = report.date;
            
            console.log('Updating report for:', reportDate, 'start fund from', report.startFund, 'to', currentStartFund);
            
            // Cập nhật số dư đầu = số dư cuối của ngày trước
            batch.update(doc.ref, {
                startFund: currentStartFund,
                actualIncome: report.revenue - report.totalExpenses,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Số dư cuối của ngày này trở thành số dư đầu của ngày sau
            currentStartFund = report.endFund;
        }
        
        if (subsequentReports.docs.length > 0) {
            await batch.commit();
            console.log('Butterfly effect: Updated', subsequentReports.docs.length, 'subsequent days');
            showAlert('Thông báo', `Đã cập nhật ${subsequentReports.docs.length} ngày tiếp theo`);
        }
        
    } catch (error) {
        console.error('Error in butterfly effect update:', error);
        handleFirestoreError(error, 'updateSubsequentDays');
    }
}
// ==================== VIETNAM TIME FUNCTIONS ====================
function getVietnamTime() {
    // Tạo date object với timezone Việt Nam (UTC+7)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const vietnamTime = new Date(utc + (7 * 3600000)); // UTC+7
    return vietnamTime;
}

function getVietnamDateString() {
    const vietnamTime = getVietnamTime();
    return vietnamTime.toISOString().split('T')[0];
}

function formatVietnamDateTime(date) {
    const options = {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    
    try {
        return new Intl.DateTimeFormat('vi-VN', options).format(date);
    } catch (error) {
        // Fallback nếu timezone không được hỗ trợ
        const vietnamTime = getVietnamTime();
        return vietnamTime.toLocaleString('vi-VN');
    }
}

function formatVietnamDate(date) {
    const options = {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    };
    
    try {
        return new Intl.DateTimeFormat('vi-VN', options).format(date);
    } catch (error) {
        // Fallback
        const vietnamTime = getVietnamTime();
        return vietnamTime.toLocaleDateString('vi-VN');
    }
}

// ==================== UPDATED COPY REPORT FUNCTION ====================
function copyReportToClipboard() {
    const startFund = parseFloat(getElement('reportStartFund').value) || 0;
    const revenue = parseFloat(getElement('reportRevenue').value) || 0;
    const expenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const endFund = parseFloat(getElement('reportEndFund').value) || 0;
    const actualIncome = calculateReport();
    
    // Lấy thông tin chuyển khoản và tiền mặt
    const transferTotal = currentRevenueData ? currentRevenueData.transferTotal : 0;
    const cashAmount = currentRevenueData ? currentRevenueData.cashAmount : 0;
    
    // Sử dụng giờ Việt Nam
    const reportDate = formatVietnamDate(new Date(currentDate));
    const reportTime = formatVietnamDateTime(getVietnamTime());
    
    // Tạo nội dung báo cáo dạng text - tối ưu cho Zalo
    const reportText = `
📊 BÁO CÁO QUỸ - MILANO COFFEE
📅 Ngày: ${reportDate}
⏰ Giờ báo cáo: ${reportTime}

💰 SỐ DƯ ĐẦU: ${formatCurrency(startFund)}
📈 DOANH THU: ${formatCurrency(revenue)}
💸 CHI PHÍ: ${formatCurrency(expenses)}
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
Tổng kiểm: ${formatCurrency(startFund + revenue - expenses - endFund)}
Báo cáo được tạo lúc: ${reportTime}
    `.trim();
    
    // Copy vào clipboard với xử lý lỗi tốt hơn
    copyToClipboard(reportText, 'Báo cáo đã được copy! Bạn có thể dán vào Zalo ngay.');
}

// ==================== UPDATED INITIALIZE APP ====================
function initializeApp() {
    // Luôn set về ngày hiện tại VIỆT NAM khi khởi động
    currentDate = getVietnamDateString();
    getElement('reportDate').value = currentDate;
    
    // Reset dữ liệu
    currentExpenses = [];
    transferDetails = [];
    currentRevenueData = null;
    currentReportData = null;
    
    loadDateData();
    loadExpenseCategories();
    loadRecentReports();
    
    console.log('App initialized with Vietnam time:', currentDate);
}

// ==================== UPDATED EDIT HISTORY ====================
function displayEditHistory(history) {
    const container = getElement('editHistoryList');
    
    if (!history || history.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                Không có lịch sử chỉnh sửa
            </div>
        `;
        return;
    }

    // Sắp xếp mới nhất lên đầu
    const sortedHistory = [...history].sort((a, b) => {
        // Xử lý cả timestamp là Date object và Firestore Timestamp
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return timeB - timeA;
    });

    container.innerHTML = sortedHistory.map((record, index) => {
        // Xử lý timestamp linh hoạt và chuyển sang giờ Việt Nam
        let time;
        if (record.timestamp?.toDate) {
            time = record.timestamp.toDate(); // Firestore Timestamp
        } else {
            time = new Date(record.timestamp); // JavaScript Date
        }
        
        // Chuyển sang giờ Việt Nam
        const timeStr = time ? formatVietnamDateTime(time) : 'Không xác định';
        
        const changes = record.changes ? Object.entries(record.changes)
            .filter(([key, value]) => value.from !== value.to)
            .map(([key, value]) => `
                <div class="change-item">
                    ${getFieldLabel(key)}: ${formatCurrency(value.from)} → ${formatCurrency(value.to)}
                </div>
            `).join('') : 'Không có thay đổi cụ thể';

        return `
            <div class="history-item">
                <div class="history-header">
                    <span class="history-user">${record.userEmail || 'N/A'}</span>
                    <span class="history-time">${timeStr}</span>
                </div>
                <div class="history-action">${getActionLabel(record.action)}</div>
                ${changes ? `<div class="history-changes">${changes}</div>` : ''}
            </div>
        `;
    }).join('');
}

// ==================== COMPLETE SUBMIT REPORT FUNCTION ====================
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
    
    const startFund = parseFloat(getElement('reportStartFund').value) || 0;
    const totalExpenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const actualIncome = calculateReport();
    
    // Lưu số dư cuối cũ để so sánh butterfly effect
    const oldEndFund = currentReportData ? currentReportData.endFund : null;
    
    // Thu thập thông tin thay đổi cho lịch sử
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
        
        // So sánh expenses chi tiết
        const oldExpensesMap = new Map(currentReportData.expenses?.map(exp => [exp.id, exp.amount]) || []);
        const newExpensesMap = new Map(currentExpenses.map(exp => [exp.id, exp.amount]));
        
        // Kiểm tra expenses thay đổi
        let expensesChanged = false;
        for (const [id, amount] of newExpensesMap) {
            if (oldExpensesMap.get(id) !== amount) {
                expensesChanged = true;
                break;
            }
        }
        
        // Kiểm tra expenses bị xóa hoặc thêm mới
        if (currentReportData.expenses?.length !== currentExpenses.length) {
            expensesChanged = true;
        }
        
        if (expensesChanged) {
            changes.expenses = { 
                from: currentReportData.totalExpenses, 
                to: totalExpenses,
                detail: `Số lượng: ${currentReportData.expenses?.length || 0} → ${currentExpenses.length}`
            };
        }
        
        // So sánh revenue details
        if (currentReportData.revenueDetails) {
            const oldRevenue = currentReportData.revenueDetails;
            const newRevenue = currentRevenueData;
            
            if (newRevenue) {
                if (oldRevenue.totalRevenue !== newRevenue.totalRevenue) {
                    changes.totalRevenue = { from: oldRevenue.totalRevenue, to: newRevenue.totalRevenue };
                }
                if (oldRevenue.cashAmount !== newRevenue.cashAmount) {
                    changes.cashAmount = { from: oldRevenue.cashAmount, to: newRevenue.cashAmount };
                }
                if (oldRevenue.transferTotal !== newRevenue.transferTotal) {
                    changes.transferTotal = { from: oldRevenue.transferTotal, to: newRevenue.transferTotal };
                }
                if (oldRevenue.method !== newRevenue.method) {
                    changes.revenueMethod = { from: oldRevenue.method, to: newRevenue.method };
                }
            }
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
        
        // Xử lý created/updated timestamp
        if (currentReportData) {
            // Giữ nguyên thời gian tạo khi update
            reportData.createdAt = currentReportData.createdAt;
        } else {
            // Thêm thời gian tạo khi tạo mới
            reportData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        // Revenue details
        if (currentRevenueData) {
            reportData.revenueDetails = currentRevenueData;
        } else if (transferDetails.length > 0) {
            const transferTotal = transferDetails.reduce((sum, item) => sum + item.amount, 0);
            reportData.revenueDetails = {
                totalRevenue: revenue,
                cashAmount: revenue - transferTotal,
                transferTotal: transferTotal,
                transferDetails: transferDetails,
                method: 'detail'
            };
        }
        
        let reportId;
        const isUpdate = !!currentReportData;
        const action = isUpdate ? 'updated' : 'created';
        
        // Tạo bản ghi lịch sử chỉnh sửa với timestamp VIỆT NAM
        const editRecord = {
            timestamp: getVietnamTime(), // Sử dụng giờ Việt Nam
            userId: currentUser.uid,
            userEmail: currentUser.email,
            action: action,
            changes: changes,
            actualIncome: actualIncome,
            version: isUpdate ? (currentReportData.editHistory?.length || 0) + 1 : 1
        };
        
        // Thêm editHistory vào reportData
        if (isUpdate) {
            reportData.editHistory = [...(currentReportData.editHistory || []), editRecord];
        } else {
            reportData.editHistory = [editRecord];
        }
        
        // Lưu hoặc cập nhật report
        if (isUpdate) {
            reportId = currentReportData.id;
            await db.collection('reports').doc(reportId).update(reportData);
            console.log('Updated existing report:', reportId, 'with changes:', Object.keys(changes).length);
        } else {
            const newReport = await db.collection('reports').add(reportData);
            reportId = newReport.id;
            console.log('Created new report:', reportId);
        }
        
        // Lưu expenses riêng
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
        } else {
            // Xóa expenses document nếu không có chi phí
            try {
                await db.collection('daily_expenses')
                    .doc(`${currentDate}_milano`)
                    .delete();
            } catch (error) {
                // Bỏ qua lỗi nếu document không tồn tại
                console.log('No expenses document to delete');
            }
        }
        
        // Lưu transfer details riêng (nếu cần)
        if (transferDetails.length > 0) {
            await db.collection('daily_transfers')
                .doc(`${currentDate}_milano`)
                .set({
                    date: currentDate,
                    transfers: transferDetails,
                    total: transferDetails.reduce((sum, item) => sum + item.amount, 0),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedBy: currentUser.uid,
                    reportId: reportId
                });
        }
        
        // QUAN TRỌNG: Áp dụng butterfly effect nếu là cập nhật và số dư cuối thay đổi
        if (isUpdate && oldEndFund !== null && oldEndFund !== endFund) {
            console.log('End fund changed, applying butterfly effect');
            await updateSubsequentDays(currentDate, oldEndFund, endFund);
        }
        
        // Đóng popup trước khi hiển thị confirm
        closeReportPopup();
        
        // Reload để cập nhật dữ liệu
        await loadDateData();
        await loadRecentReports();
        
        // Nếu đang ở tab reports, reload lại danh sách
        if (document.querySelector('[data-tab="reports"]').classList.contains('active')) {
            await loadReports(currentTimeframe);
        }
        
        // HIỂN THỊ CONFIRM CHIA SẺ ZALO - với giờ Việt Nam
        const successTime = formatVietnamDateTime(getVietnamTime());
        showAlertWithConfirm(
            'Thành công', 
            `Đã gửi báo cáo lúc ${successTime}! Bạn có muốn chia sẻ qua Zalo?`,
            'Chia sẻ Zalo',
            'Để sau',
            () => {
                // Xác nhận: Copy và chia sẻ Zalo
                copyReportToClipboard();
            },
            () => {
                // Hủy: Chỉ hiển thị toast
                showToast('Báo cáo đã được lưu thành công', 'success');
            }
        );
        
    } catch (error) {
        console.error('Error submitting report:', error);
        
        // Xử lý lỗi chi tiết hơn
        if (error.code === 'failed-precondition') {
            showToast('Dữ liệu đang được cập nhật từ nơi khác. Vui lòng thử lại sau.', 'error');
        } else if (error.code === 'permission-denied') {
            showToast('Bạn không có quyền thực hiện thao tác này.', 'error');
        } else {
            handleFirestoreError(error, 'submitReport');
        }
    }
}

// ==================== ENHANCED ALERT WITH CONFIRM ====================
function showAlertWithConfirm(title, message, confirmText, cancelText, onConfirm, onCancel) {
    safeUpdate('alertTitle', title);
    safeUpdate('alertMessage', message);
    
    const alertPopup = getElement('alertPopup');
    const alertFooter = alertPopup.querySelector('.popup-footer');
    
    alertFooter.innerHTML = `
        <button onclick="handleConfirm()" class="btn-confirm">✅ ${confirmText}</button>
        <button onclick="handleCancel()" class="btn-cancel">❌ ${cancelText}</button>
    `;
    
    // Lưu callback functions
    window.handleConfirm = function() {
        closeAlert();
        if (onConfirm) onConfirm();
        // Cleanup
        window.handleConfirm = null;
        window.handleCancel = null;
    };
    
    window.handleCancel = function() {
        closeAlert();
        if (onCancel) onCancel();
        // Cleanup
        window.handleConfirm = null;
        window.handleCancel = null;
    };
    
    alertPopup.classList.add('active');
}

// ==================== VIETNAM TIME FUNCTIONS ====================
function getVietnamTime() {
    // Tạo date object với timezone Việt Nam (UTC+7)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const vietnamTime = new Date(utc + (7 * 3600000)); // UTC+7
    return vietnamTime;
}

function formatVietnamDateTime(date) {
    const options = {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    
    try {
        return new Intl.DateTimeFormat('vi-VN', options).format(date);
    } catch (error) {
        // Fallback nếu timezone không được hỗ trợ
        const vietnamTime = getVietnamTime();
        return vietnamTime.toLocaleString('vi-VN');
    }
}

// ==================== BUTTERFLY EFFECT FUNCTION ====================
async function updateSubsequentDays(startDate, originalEndFund, newEndFund) {
    // Chỉ cập nhật nếu số dư cuối thay đổi
    if (originalEndFund === newEndFund) {
        return;
    }
    
    console.log('Butterfly effect: Updating subsequent days from', startDate);
    console.log('End fund changed from', originalEndFund, 'to', newEndFund);
    
    try {
        // Lấy tất cả các ngày sau ngày hiện tại
        const subsequentReports = await db.collection('reports')
            .where('companyId', '==', 'milano')
            .where('date', '>', startDate)
            .orderBy('date', 'asc')
            .get();
        
        let currentStartFund = newEndFund;
        const batch = db.batch();
        
        // Cập nhật tuần tự từng ngày
        for (const doc of subsequentReports.docs) {
            const report = doc.data();
            const reportDate = report.date;
            
            console.log('Updating report for:', reportDate, 'start fund from', report.startFund, 'to', currentStartFund);
            
            // Cập nhật số dư đầu = số dư cuối của ngày trước
            batch.update(doc.ref, {
                startFund: currentStartFund,
                actualIncome: report.revenue - report.totalExpenses,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Số dư cuối của ngày này trở thành số dư đầu của ngày sau
            currentStartFund = report.endFund;
        }
        
        if (subsequentReports.docs.length > 0) {
            await batch.commit();
            console.log('Butterfly effect: Updated', subsequentReports.docs.length, 'subsequent days');
            showToast(`Đã cập nhật ${subsequentReports.docs.length} ngày tiếp theo`, 'info');
        }
        
    } catch (error) {
        console.error('Error in butterfly effect update:', error);
        handleFirestoreError(error, 'updateSubsequentDays');
    }
}

// ==================== TOAST NOTIFICATION SYSTEM ====================
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
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}

// Thêm CSS toast
const toastCSS = `
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

.toast-success {
    border-left: 4px solid #28a745;
}

.toast-error {
    border-left: 4px solid #dc3545;
}

.toast-info {
    border-left: 4px solid #17a2b8;
}

.toast-warning {
    border-left: 4px solid #ffc107;
}

.toast-content {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.toast-message {
    flex: 1;
    font-size: 14px;
}

.toast-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #666;
    margin-left: 10px;
}

@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
`;

// Inject CSS
const style = document.createElement('style');
style.textContent = toastCSS;
document.head.appendChild(style);

// ==================== ENHANCED DATE CHANGE LOGIC ====================
async function loadDateData() {
    const selectedDate = getElement('reportDate').value;
    console.log('Loading data for date:', selectedDate);
    
    // Nếu đã là ngày hiện tại, vẫn reload để cập nhật
    currentDate = selectedDate;
    
    // Reset dữ liệu cũ
    currentExpenses = [];
    transferDetails = [];
    currentRevenueData = null;
    currentReportData = null;
    
    try {
        // Load các dữ liệu song song
        const [startFund, expenses, reportData] = await Promise.all([
            calculateStartFund(currentDate),
            loadExpensesForDate(currentDate),
            loadReportData(currentDate)
        ]);
        
        // Sau khi load xong, kiểm tra và cập nhật revenue data
        if (currentReportData && currentReportData.revenueDetails) {
            currentRevenueData = currentReportData.revenueDetails;
            transferDetails = currentReportData.revenueDetails.transferDetails || [];
        }
        
        console.log('Data loaded successfully for:', currentDate);
        console.log('Start fund:', startFund);
        console.log('Expenses:', currentExpenses.length);
        console.log('Transfers:', transferDetails.length);
        
        updateMainDisplay();
        
    } catch (error) {
        console.error('Error loading date data:', error);
        updateMainDisplay();
    }
}

// ==================== DELETE REPORT WITH BUTTERFLY EFFECT ====================
async function deleteReport(reportId) {
    if (!isManager()) {
        showAlert('Lỗi', 'Bạn không có quyền xóa báo cáo');
        return;
    }
    
    if (confirm('Bạn có chắc muốn xóa báo cáo này? Thao tác này sẽ ảnh hưởng đến các ngày sau.')) {
        try {
            const reportDoc = await db.collection('reports').doc(reportId).get();
            if (!reportDoc.exists) return;
            
            const report = reportDoc.data();
            const reportDate = report.date;
            
            // Xóa báo cáo
            await db.collection('reports').doc(reportId).delete();
            
            // Áp dụng butterfly effect: các ngày sau cần tính lại start fund
            await updateSubsequentDaysAfterDelete(reportDate);
            
            showAlert('Thành công', 'Đã xóa báo cáo và cập nhật các ngày sau');
            loadReports(currentTimeframe);
            
        } catch (error) {
            handleFirestoreError(error, 'deleteReport');
        }
    }
}

async function updateSubsequentDaysAfterDelete(deletedDate) {
    try {
        // Lấy ngày trước ngày bị xóa để lấy số dư cuối
        const prevDate = new Date(deletedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];
        
        const prevReport = await db.collection('reports')
            .where('date', '==', prevDateStr)
            .where('companyId', '==', 'milano')
            .get();
            
        let newStartFund = 469000; // Mặc định
        
        if (!prevReport.empty) {
            newStartFund = prevReport.docs[0].data().endFund;
        }
        
        // Cập nhật các ngày sau
        await updateSubsequentDays(deletedDate, 0, newStartFund);
        
    } catch (error) {
        console.error('Error updating after delete:', error);
    }
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
            const totalExpenses = data.expenses ? data.expenses.reduce((sum, exp) => sum + exp.amount, 0) : 0;

            return {
                id: doc.id,
                ...data,
                reportDate: new Date(data.date),
                totalExpenses: totalExpenses
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



function closeAlert() {
    getElement('alertPopup').classList.remove('active');
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
        
        await db.collection('expense_categories').doc('milano').delete();
        
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





function openRevenuePopup() {
    console.log('Opening revenue popup for date:', currentDate);
    
    // Reset form
    getElement('totalRevenue').value = '';
    getElement('cashAmount').value = '';
    
    // Nếu có revenue data của ngày hiện tại, hiển thị
    if (currentRevenueData) {
        currentRevenueMethod = currentRevenueData.method || 'total';
        if (currentRevenueMethod === 'total') {
            getElement('totalRevenue').value = currentRevenueData.totalRevenue;
        } else {
            getElement('cashAmount').value = currentRevenueData.cashAmount;
        }
    } else {
        currentRevenueMethod = 'total';
    }
    
    updateRevenueInputStates();
    recalculateRevenue();
    
    getElement('revenuePopup').classList.add('active');
}
// ==================== EXPENSE POPUP NAVIGATION ====================
function openTransferPopupFromExpense() {
    closeExpensePopup();
    setTimeout(openTransferPopup, 300);
}

// ==================== ZALO SHARE FUNCTIONALITY ====================
function shareToZalo() {
    const startFund = parseFloat(getElement('reportStartFund').value) || 0;
    const revenue = parseFloat(getElement('reportRevenue').value) || 0;
    const expenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const endFund = parseFloat(getElement('reportEndFund').value) || 0;
    const actualIncome = calculateReport();
    
    const transferTotal = currentRevenueData ? currentRevenueData.transferTotal : 0;
    const cashAmount = currentRevenueData ? currentRevenueData.cashAmount : 0;
    
    const reportDate = new Date(currentDate).toLocaleDateString('vi-VN');
    
    // Tạo nội dung báo cáo cho Zalo
    const reportText = `
📊 BÁO CÁO QUỸ - MILANO COFFEE
📅 Ngày: ${reportDate}

💰 SỐ DƯ ĐẦU: ${formatCurrency(startFund)}
📈 DOANH THU: ${formatCurrency(revenue)}
💸 CHI PHÍ: ${formatCurrency(expenses)}
🏦 SỐ DƯ CUỐI: ${formatCurrency(endFund)}
💵 THỰC LÃNH: ${formatCurrency(actualIncome)}

💳 CHI TIẾT DOANH THU:
💵 Tiền mặt: ${formatCurrency(cashAmount)}
🏦 Chuyển khoản: ${formatCurrency(transferTotal)}

📋 CHI TIẾT CHI PHÍ:
${currentExpenses.length > 0 ? 
  currentExpenses.map(exp => `• ${exp.category}: ${formatCurrency(exp.amount)}`).join('\\n') : 
  '• Không có chi phí'}

📋 CHI TIẾT CHUYỂN KHOẢN:
${transferDetails.length > 0 ? 
  transferDetails.map(transfer => `• ${transfer.description}: ${formatCurrency(transfer.amount)}`).join('\\n') : 
  '• Không có chuyển khoản'}

---
Tổng kiểm: ${formatCurrency(startFund + revenue - expenses - endFund)}
    `.trim();
    
    // Copy vào clipboard
    copyToClipboard(reportText);
    
    // Hiển thị hướng dẫn mở Zalo
    showZaloShareGuide();
}



function showZaloShareGuide() {
    const guideHTML = `
        <div class="zalo-guide">
            <h3>📤 Chia sẻ qua Zalo</h3>
            <p>Nội dung báo cáo đã được copy vào clipboard!</p>
            <div class="zalo-steps">
                <p><strong>👉 Các bước chia sẻ:</strong></p>
                <ol>
                    <li>Mở ứng dụng Zalo</li>
                    <li>Chọn cuộc trò chuyện muốn gửi</li>
                    <li>Dán nội dung (nhấn giữ → Dán)</li>
                    <li>Nhấn gửi</li>
                </ol>
            </div>
            <div class="zalo-actions">
                <button onclick="openZaloApp()" class="btn-zalo">📱 Mở Zalo</button>
                <button onclick="closeZaloGuide()" class="btn-cancel">Đóng</button>
            </div>
        </div>
    `;
    
    // Tạo popup hướng dẫn
    const guidePopup = document.createElement('div');
    guidePopup.className = 'popup active';
    guidePopup.innerHTML = `
        <div class="popup-content" style="max-width: 400px;">
            <div class="popup-header">
                <h2>📤 Chia Sẻ Zalo</h2>
                <button onclick="closeZaloGuide()" class="btn-close">×</button>
            </div>
            <div class="popup-body">
                ${guideHTML}
            </div>
        </div>
    `;
    
    guidePopup.id = 'zaloGuidePopup';
    document.body.appendChild(guidePopup);
}

function openZaloApp() {
    // Deep link để mở Zalo
    const zaloURL = 'zalo://';
    window.location.href = zaloURL;
    
    // Fallback mở App Store/Google Play nếu không mở được Zalo
    setTimeout(() => {
        if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
            window.location.href = 'https://apps.apple.com/vn/app/zalo/id579523206';
        } else {
            window.location.href = 'https://play.google.com/store/apps/details?id=com.zing.zalo';
        }
    }, 500);
}

function closeZaloGuide() {
    const guidePopup = getElement('zaloGuidePopup');
    if (guidePopup) {
        guidePopup.remove();
    }
}



// Sửa hàm showAlert để hỗ trợ confirm
function showAlert(title, message, showConfirm = false, showCancel = false) {
    safeUpdate('alertTitle', title);
    safeUpdate('alertMessage', message);
    
    const alertPopup = getElement('alertPopup');
    const alertFooter = alertPopup.querySelector('.popup-footer');
    
    if (showConfirm && showCancel) {
        alertFooter.innerHTML = `
            <button onclick="shareToZalo(); closeAlert();" class="btn-confirm">✅ Chia sẻ Zalo</button>
            <button onclick="closeAlert()" class="btn-cancel">❌ Không chia sẻ</button>
        `;
    } else {
        alertFooter.innerHTML = '<button onclick="closeAlert()" class="btn-confirm">✅ OK</button>';
    }
    
    alertPopup.classList.add('active');
}
// ==================== REPORT POPUP NAVIGATION ====================
function openReportPopup() {
    console.log('Opening report popup for date:', currentDate);
    
    const totalExpenses = currentExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    safeUpdate('reportExpenses', formatCurrency(totalExpenses));
    
    // Hiển thị thông tin doanh thu, chuyển khoản, tiền mặt
    if (currentRevenueData) {
        getElement('reportRevenue').value = currentRevenueData.totalRevenue;
        safeUpdate('reportTransferDisplay', formatCurrency(currentRevenueData.transferTotal));
        safeUpdate('reportCashDisplay', formatCurrency(currentRevenueData.cashAmount));
    } else if (currentReportData) {
        getElement('reportRevenue').value = currentReportData.revenue;
        getElement('reportEndFund').value = currentReportData.endFund;
        
        if (currentReportData.revenueDetails) {
            safeUpdate('reportTransferDisplay', formatCurrency(currentReportData.revenueDetails.transferTotal));
            safeUpdate('reportCashDisplay', formatCurrency(currentReportData.revenueDetails.cashAmount));
        } else {
            safeUpdate('reportTransferDisplay', '0 ₫');
            safeUpdate('reportCashDisplay', '0 ₫');
        }
    } else {
        getElement('reportRevenue').value = '';
        getElement('reportEndFund').value = '';
        safeUpdate('reportTransferDisplay', '0 ₫');
        safeUpdate('reportCashDisplay', '0 ₫');
    }
    
    calculateReport();
    getElement('reportPopup').classList.add('active');
}

function openTransferPopupFromReport() {
    closeReportPopup();
    setTimeout(openTransferPopup, 300);
}

function closeExpensePopup() {
    getElement('expensePopup').classList.remove('active');
}



// ==================== TRANSFER POPUP NAVIGATION ====================
function openTransferPopup() {
    console.log('Opening transfer popup for date:', currentDate);
    updateTransferDisplay();
    getElement('transferPopup').classList.add('active');
}

function closeTransferPopup() {
    getElement('transferPopup').classList.remove('active');
}

function openReportPopupFromTransfer() {
    closeTransferPopup();
    setTimeout(openReportPopup, 300);
}



function closeRevenuePopup() {
    getElement('revenuePopup').classList.remove('active');
}







// Hàm copy chung có thể tái sử dụng
function copyToClipboard(text, successMessage = 'Đã copy vào clipboard!') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(successMessage, 'success');
            
            // Tự động hiển thị hướng dẫn Zalo trên mobile
            if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                setTimeout(showZaloShareGuide, 1000);
            }
            
        }).catch(err => {
            console.error('Clipboard API error:', err);
            useFallbackCopy(text, successMessage);
        });
    } else {
        // Fallback cho trình duyệt cũ
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
            
            // Tự động hiển thị hướng dẫn Zalo trên mobile
            if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                setTimeout(showZaloShareGuide, 1000);
            }
        } else {
            showToast('Không thể copy tự động. Vui lòng copy thủ công.', 'error');
            // Hiển thị text để user copy thủ công
            showManualCopyDialog(text);
        }
    } catch (err) {
        document.body.removeChild(textArea);
        showToast('Không thể copy tự động. Vui lòng copy thủ công.', 'error');
        showManualCopyDialog(text);
    }
}

function showManualCopyDialog(text) {
    const manualCopyHTML = `
        <div class="manual-copy-dialog">
            <h3>📋 Copy Thủ Công</h3>
            <p>Vui lòng copy nội dung bên dưới:</p>
            <textarea class="copy-textarea" readonly>${text}</textarea>
            <div class="copy-actions">
                <button onclick="selectCopyText()" class="btn-primary">Chọn tất cả</button>
                <button onclick="closeManualCopyDialog()" class="btn-cancel">Đóng</button>
            </div>
        </div>
    `;
    
    const dialog = document.createElement('div');
    dialog.className = 'popup active';
    dialog.innerHTML = `
        <div class="popup-content" style="max-width: 500px;">
            <div class="popup-header">
                <h2>Copy Báo Cáo</h2>
                <button onclick="closeManualCopyDialog()" class="btn-close">×</button>
            </div>
            <div class="popup-body">
                ${manualCopyHTML}
            </div>
        </div>
    `;
    
    dialog.id = 'manualCopyDialog';
    document.body.appendChild(dialog);
}

function selectCopyText() {
    const textarea = document.querySelector('.copy-textarea');
    if (textarea) {
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        showToast('Đã chọn văn bản, vui lòng copy (Ctrl+C)', 'info');
    }
}

function closeManualCopyDialog() {
    const dialog = document.getElementById('manualCopyDialog');
    if (dialog) {
        dialog.remove();
    }
}

// ==================== REMOVE REVENUE BUTTON ====================
// Xóa nút doanh thu khỏi action buttons trong HTML
// Trong file HTML, thay đổi phần action-buttons thành 3 nút

function closeReportPopup() {
    getElement('reportPopup').classList.remove('active');
}

// ==================== POPUP NAVIGATION ====================
function openExpensePopupFromReport() {
    closeReportPopup();
    setTimeout(openExpensePopup, 300);
}

function openRevenuePopupFromReport() {
    closeReportPopup();
    setTimeout(openRevenuePopup, 300);
}

function openRevenuePopupFromTransfer() {
    closeTransferPopup();
    setTimeout(openRevenuePopup, 300);
}

function openTransferPopupFromRevenue() {
    closeRevenuePopup();
    setTimeout(openTransferPopup, 300);
}

function openReportPopupFromExpense() {
    closeExpensePopup();
    setTimeout(openReportPopup, 300);
}

// ==================== REPORT DETAIL & HISTORY ====================
let currentDetailReport = null;

function viewReportDetails(reportId) {
    openReportDetailPopup(reportId);
}

async function openReportDetailPopup(reportId) {
    try {
        const reportDoc = await db.collection('reports').doc(reportId).get();
        if (!reportDoc.exists) {
            showAlert('Lỗi', 'Không tìm thấy báo cáo');
            return;
        }

        const report = reportDoc.data();
        currentDetailReport = { id: reportId, ...report };

        // Hiển thị thông tin cơ bản
        safeUpdate('detailDate', formatDisplayDate(report.date));
        safeUpdate('detailCreator', report.creatorEmail || 'N/A');
        safeUpdate('detailStartFund', formatCurrency(report.startFund));
        safeUpdate('detailRevenue', formatCurrency(report.revenue));
        safeUpdate('detailExpenses', formatCurrency(report.totalExpenses));
        safeUpdate('detailEndFund', formatCurrency(report.endFund));
        safeUpdate('detailActualIncome', formatCurrency(report.actualIncome));

        // Hiển thị chi tiết doanh thu nếu có
        const revenueSection = getElement('revenueDetailsSection');
        if (report.revenueDetails) {
            revenueSection.style.display = 'block';
            safeUpdate('detailCash', formatCurrency(report.revenueDetails.cashAmount));
            safeUpdate('detailTransfer', formatCurrency(report.revenueDetails.transferTotal));
        } else {
            revenueSection.style.display = 'none';
        }

        // Hiển thị lịch sử chỉnh sửa
        displayEditHistory(report.editHistory);

        getElement('reportDetailPopup').classList.add('active');

    } catch (error) {
        handleFirestoreError(error, 'openReportDetailPopup');
    }
}



function getFieldLabel(field) {
    const labels = {
        revenue: 'Doanh thu',
        endFund: 'Số dư cuối',
        startFund: 'Số dư đầu',
        totalExpenses: 'Chi phí'
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

function closeReportDetailPopup() {
    getElement('reportDetailPopup').classList.remove('active');
    currentDetailReport = null;
}