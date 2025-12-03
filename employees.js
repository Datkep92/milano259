let currentEmployeeMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
let currentEmployees = []; // Danh sách nhân viên tải về từ DB
let employeeSalaries = {}; // Dữ liệu lương chi tiết của nhân viên theo tháng hiện tại
let employeesEventListenersActive = false;
let currentSearchTerm = '';
let isMonthSelectorOpen = false;

/**
 * @name initializeEmployeesTab
 * @description Hàm khởi tạo chính - ĐÃ FIX
 */
function initializeEmployeesTab() {
    console.log('Initializing employees tab...');
    
    // 1. Reset các biến trạng thái
    currentSearchTerm = '';
    isMonthSelectorOpen = false;
    
    // 2. Setup event listeners (chỉ 1 lần)
    if (!employeesEventListenersActive) {
        setupEmployeesEventListeners();
        employeesEventListenersActive = true;
    }
    
    // 3. Load và render dữ liệu
    _loadEmployeesAndRender().catch(error => {
        console.error('Lỗi khởi tạo tab nhân viên:', error);
        const container = document.getElementById('employees');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <h3>⚠️ Lỗi tải dữ liệu</h3>
                    <p>Không thể tải danh sách nhân viên. Vui lòng thử lại sau.</p>
                    <button onclick="initializeEmployeesTab()">Thử lại</button>
                </div>
            `;
        }
    });
}
async function _loadEmployeesAndRender() {
    try {
        // Giả định showLoading, dbGetAll là hàm global
        if (typeof showLoading === 'function') showLoading(true);
        
        // 1. Tải dữ liệu nhân viên
        currentEmployees = await dbGetAll('employees');
        
        // 2. Tải và tính lương
        await loadCurrentMonthSalaries();
        
        // 3. Render giao diện
        await renderEmployeesTab();
        
        if (typeof showLoading === 'function') showLoading(false);
    } catch (error) {
        console.error('❌ Error loading employees data:', error);
        if (typeof showLoading === 'function') showLoading(false);
        
        const container = document.getElementById('employees');
        if (container) {
            container.innerHTML = `<div class="tab-error">Lỗi tải dữ liệu: ${error.message || 'Không thể kết nối hoặc xử lý dữ liệu.'}</div>`;
        }
    }
}
// Load employees data
async function loadEmployeesData() {
    try {
        showLoading(true);
        currentEmployees = await dbGetAll('employees');
        await loadCurrentMonthSalaries();
        renderEmployeesTab();
        showLoading(false);
    } catch (error) {
        console.error('Error loading employees:', error);
        showLoading(false);
    }
}

// Load salaries for current month
async function loadCurrentMonthSalaries() {
    employeeSalaries = {};
    const activeEmployees = currentEmployees.filter(emp => emp.status === 'active');
    
    for (const employee of activeEmployees) {
        const salaryData = await calculateEmployeeSalary(employee.employeeId, currentEmployeeMonth);
        employeeSalaries[employee.employeeId] = salaryData;
    }
}

// Setup event listeners for employees tab
function setupEmployeesEventListeners() {
    // Chỉ setup 1 lần
    if (employeesEventListenersActive) return;
    
    document.addEventListener('click', function(e) {
        const target = e.target;
        const action = target.dataset?.action || target.closest('[data-action]')?.dataset?.action;
        
        if (!action) return;
        
        console.log('Employee action clicked:', action);
        
        switch(action) {
            case 'add-employee':
                e.preventDefault();
                showAddEmployeePopup();
                break;
                
            case 'show-employee':
                e.preventDefault();
                const card = target.closest('.employee-card');
                if (card) {
                    const employeeId = card.dataset.id || card.dataset.employeeId;
                    console.log('Showing employee:', employeeId);
                    if (employeeId) {
                        showEmployeeDetailPopup(employeeId);
                    }
                }
                break;
                
            case 'toggle-month-selector':
                e.preventDefault();
                e.stopPropagation();
                isMonthSelectorOpen = !isMonthSelectorOpen;
                renderEmployeesTab();
                break;
                
            case 'change-employee-month':
                e.preventDefault();
                const monthString = target.dataset.month;
                if (monthString) {
                    changeEmployeeMonth(monthString);
                }
                break;
                
            case 'show-discipline':
                e.preventDefault();
                const employeeId = target.dataset.employeeId;
                if (employeeId) {
                    closePopup();
                    showDisciplinePopup(employeeId);
                }
                break;
                
            case 'edit-employee':
                e.preventDefault();
                const editEmployeeId = target.dataset.employeeId;
                if (editEmployeeId) {
                    closePopup();
                    showEditEmployeePopup(editEmployeeId);
                }
                break;
                
            case 'delete-employee-confirm':
                e.preventDefault();
                const deleteEmployeeId = target.dataset.employeeId;
                if (deleteEmployeeId) {
                    showDeleteConfirmPopup(deleteEmployeeId);
                }
                break;
        }
    });
    
    // Đóng month selector khi click ra ngoài
    document.addEventListener('click', function(e) {
        if (isMonthSelectorOpen && 
            !e.target.closest('.month-selector-popup') && 
            !e.target.closest('#monthSelectorDisplay')) {
            isMonthSelectorOpen = false;
            renderEmployeesTab();
        }
    });
    
    employeesEventListenersActive = true;
}

// Render employees tab
async function renderEmployeesTab() {
    const container = document.getElementById('employees');
    if (!container) return;

    const monthDisplay = formatMonthDisplay(currentEmployeeMonth);
    const stats = await calculateEmployeesStats();

    container.innerHTML = `
        <div class="employees-header">
            <div class="header-top">
                <h2>👥 NHÂN VIÊN</h2>
                <div class="month-year-selector">
                    <div class="selector-display">${monthDisplay}</div>
                    <div class="selector-arrow">▼</div>
                </div>
            </div>

            <div class="search-overview-row">
                <div class="search-box">
                    <input type="text" id="employeeSearch" placeholder="🔍 Tìm nhân viên...">
                </div>
                <div class="overview-stats">
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalEmployees}</div>
                        <div class="stat-label">TỔNG NV</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalOffDays}</div>
                        <div class="stat-label">NGÀY OFF</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalOvertimeDays}</div>
                        <div class="stat-label">TĂNG CA</div>
                    </div>
                </div>
            </div>

            <div class="total-salary">
                💰 TỔNG LƯƠNG: ${formatCurrency(stats.totalSalary)}
            </div>
        </div>

        <div class="employee-list-section">
            <div class="list-header">
                <h3>DANH SÁCH NHÂN VIÊN</h3>
                <button class="add-employee-btn" data-action="add-employee">
                    + Thêm NV
                </button>
            </div>

            <div class="employee-grid" id="employeeGrid">
                ${await renderEmployeeGrid()}
            </div>
        </div>
    `;
}

// Render employee grid
async function renderEmployeeGrid() {
    const activeEmployees = currentEmployees.filter(emp => emp.status === 'active');
    
    if (activeEmployees.length === 0) {
        return `
            <div class="empty-state">
                <p>📝 Chưa có nhân viên nào</p>
                <button class="add-employee-btn" data-action="add-employee">
                    + Thêm nhân viên đầu tiên
                </button>
            </div>
        `;
    }

    let html = '';
    for (const employee of activeEmployees) {
        const salaryData = employeeSalaries[employee.employeeId] || { 
            actualSalary: employee.baseSalary, 
            offDays: 0, 
            overtimeDays: 0 
        };
        html += `
            <div class="employee-card" data-action="show-employee" data-employee-id="${employee.employeeId}">
                <div class="employee-name">${employee.name}</div>
                <div class="employee-salary">${formatCurrency(salaryData.actualSalary)}</div>
                <div class="employee-phone">${employee.phone}</div>
                ${salaryData.offDays > 0 ? `<div class="employee-off">🔴 ${salaryData.offDays} OFF</div>` : ''}
                ${salaryData.overtimeDays > 0 ? `<div class="employee-overtime">🟢 ${salaryData.overtimeDays} TC</div>` : ''}
            </div>
        `;
    }
    
    return html;
}

// Calculate employees statistics
async function calculateEmployeesStats() {
    const activeEmployees = currentEmployees.filter(emp => emp.status === 'active');
    let totalOffDays = 0;
    let totalOvertimeDays = 0;
    let totalSalary = 0;

    for (const employee of activeEmployees) {
        const salaryData = employeeSalaries[employee.employeeId] || { 
            actualSalary: employee.baseSalary, 
            offDays: 0, 
            overtimeDays: 0 
        };
        totalOffDays += salaryData.offDays || 0;
        totalOvertimeDays += salaryData.overtimeDays || 0;
        totalSalary += salaryData.actualSalary || employee.baseSalary;
    }

    return {
        totalEmployees: activeEmployees.length,
        totalOffDays,
        totalOvertimeDays,
        totalSalary
    };
}

// Calculate employee salary
async function calculateEmployeeSalary(employeeId, month) {
    try {
        const employee = await dbGet('employees', employeeId);
        if (!employee) return { 
            actualSalary: 0, 
            offDays: 0, 
            overtimeDays: 0,
            baseSalary: 0
        };

        const baseSalary = employee.baseSalary;

        try {
            const attendance = await getEmployeeAttendance(employeeId, month);
            const offDays = attendance.filter(a => a.attendanceType === 'off').length;
            const overtimeDays = attendance.filter(a => a.attendanceType === 'overtime').length;
            const normalDays = 30 - offDays;

            const dailySalary = baseSalary / 30;
            const calculatedSalary = normalDays * dailySalary;
            const overtimeBonus = overtimeDays * dailySalary * 0.5;

            // --- MỚI: lấy discipline_records và tính bonus/penalty ---
            let bonus = 0;
            let penalty = 0;
            try {
                const allDisciplines = await dbGetAll('discipline_records');
                const records = allDisciplines.filter(r => r && r.employeeId === employeeId && r.month === month);
                for (const r of records) {
                    if (r.type === 'reward' || r.type === 'bonus') {
                        bonus += Number(r.amount) || 0;
                    } else if (r.type === 'penalty' || r.type === 'fine') {
                        penalty += Number(r.amount) || 0;
                    }
                }
            } catch (discErr) {
                console.warn('Không lấy được discipline_records:', discErr);
            }

            let actualSalary = calculatedSalary + overtimeBonus + bonus - penalty;

            // đảm bảo actualSalary không âm
            if (actualSalary < 0) actualSalary = 0;

            return {
                actualSalary,
                offDays,
                overtimeDays,
                normalDays,
                baseSalary: baseSalary,
                dailySalary: dailySalary,
                bonus,
                penalty
            };
        } catch (attendanceError) {
            console.warn('Cannot get attendance data, using base salary:', attendanceError);
            return {
                actualSalary: baseSalary,
                offDays: 0,
                overtimeDays: 0,
                normalDays: 30,
                baseSalary: baseSalary,
                dailySalary: baseSalary / 30,
                bonus: 0,
                penalty: 0
            };
        }
    } catch (error) {
        console.error('Error calculating salary:', error);
        return { 
            actualSalary: 0, 
            offDays: 0, 
            overtimeDays: 0,
            baseSalary: 0,
            bonus: 0,
            penalty: 0
        };
    }
}


// Get employee attendance
async function getEmployeeAttendance(employeeId, month) {
    try {
        const allAttendance = await dbGetAll('attendance');
        const employeeAttendance = allAttendance.filter(a => 
            a.employeeId === employeeId && a.month === month
        );
        return employeeAttendance;
    } catch (error) {
        console.error('Error getting attendance:', error);
        return [];
    }
}

// Show month year selector
function showMonthYearSelector() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const [selectedYear, selectedMonth] = currentEmployeeMonth.split('-').map(Number);
    
    let yearsHTML = '';
    let monthsHTML = '';
    
    for (let year = currentYear - 3; year <= currentYear; year++) {
        yearsHTML += `<div class="year-item ${year === selectedYear ? 'selected' : ''}" data-year="${year}">${year}</div>`;
    }
    
    const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                       'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    
    monthNames.forEach((monthName, index) => {
        const monthNum = index + 1;
        monthsHTML += `<div class="month-item ${monthNum === selectedMonth ? 'selected' : ''}" data-month="${monthNum}">${monthName}</div>`;
    });

    const popupHTML = `
        <div class="popup month-year-popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>Chọn tháng/năm</h3>
            
            <div class="selector-container">
                <div class="years-list">
                    <h4>Năm</h4>
                    <div class="years-grid">
                        ${yearsHTML}
                    </div>
                </div>
                
                <div class="months-list">
                    <h4>Tháng</h4>
                    <div class="months-grid">
                        ${monthsHTML}
                    </div>
                </div>
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-primary" data-action="apply-month-year">Áp dụng</button>
            </div>
        </div>
    `;

    showPopup(popupHTML);
    setupMonthYearSelectorListeners();
}

// Setup month year selector listeners
function setupMonthYearSelectorListeners() {
    const [currentYear, currentMonth] = currentEmployeeMonth.split('-').map(Number);
    let selectedYear = currentYear;
    let selectedMonth = currentMonth;
    
    document.addEventListener('click', function(e) {
        if (e.target.matches('.year-item')) {
            document.querySelectorAll('.year-item').forEach(item => item.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedYear = parseInt(e.target.dataset.year);
        } else if (e.target.matches('.month-item')) {
            document.querySelectorAll('.month-item').forEach(item => item.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedMonth = parseInt(e.target.dataset.month);
        } else if (e.target.matches('[data-action="apply-month-year"]')) {
            currentEmployeeMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
            closePopup();
            loadEmployeesData();
        }
    });
}

// Filter employees
function filterEmployees(searchTerm) {
    const grid = document.getElementById('employeeGrid');
    if (!grid) return;

    const cards = grid.querySelectorAll('.employee-card');
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
        cards.forEach(card => card.style.display = 'block');
        return;
    }

    cards.forEach(card => {
        const name = card.querySelector('.employee-name').textContent.toLowerCase();
        const phone = card.querySelector('.employee-phone').textContent;
        const matches = name.includes(term) || phone.includes(term);
        card.style.display = matches ? 'block' : 'none';
    });
}

// Show add employee popup
function showAddEmployeePopup() {
    if (!isAdmin()) {
        showMessage('Chỉ quản trị viên được thêm nhân viên', 'error');
        return;
    }

    const popupHTML = `
        <div class="popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>➕ Thêm nhân viên</h3>
            
            <div class="form-group">
                <label for="newEmployeeName">Tên nhân viên:</label>
                <input type="text" id="newEmployeeName" placeholder="Nhập họ tên">
            </div>
            
            <div class="form-group">
                <label for="newEmployeePhone">Số điện thoại:</label>
                <input type="tel" id="newEmployeePhone" placeholder="Nhập số điện thoại">
            </div>
            
            <div class="form-group">
                <label for="newEmployeeSalary">Lương cơ bản / tháng:</label>
                <input type="number" id="newEmployeeSalary" placeholder="Nhập lương cơ bản" value="5000000">
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-primary" data-action="save-new-employee">Lưu</button>
            </div>
        </div>
    `;

    showPopup(popupHTML);
    
    setTimeout(() => {
        setupAddEmployeeEventListeners();
    }, 100);
}

// Setup add employee event listeners
function setupAddEmployeeEventListeners() {
    const saveButton = document.querySelector('[data-action="save-new-employee"]');
    if (!saveButton) return;

    saveButton.removeEventListener('click', handleSaveNewEmployee);
    saveButton.addEventListener('click', handleSaveNewEmployee);

    async function handleSaveNewEmployee(e) {
        e.preventDefault();
        e.stopPropagation();

        const popup = e.target.closest('.popup');
        if (!popup) return;

        const nameInput = popup.querySelector('#newEmployeeName');
        const phoneInput = popup.querySelector('#newEmployeePhone');
        const salaryInput = popup.querySelector('#newEmployeeSalary');
        
        if (!nameInput || !phoneInput || !salaryInput) {
            showMessage('Lỗi: Không tìm thấy các trường dữ liệu', 'error');
            return;
        }

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const salary = parseFloat(salaryInput.value);

        if (!name || !phone || !salary) {
            showMessage('Vui lòng nhập đầy đủ thông tin', 'error');
            return;
        }

        if (salary <= 0) {
            showMessage('Lương phải lớn hơn 0', 'error');
            return;
        }

        const existingEmployee = currentEmployees.find(emp => emp.phone === phone && emp.status === 'active');
        if (existingEmployee) {
            showMessage('Số điện thoại đã tồn tại', 'error');
            return;
        }

        try {
            e.target.disabled = true;
            e.target.textContent = 'Đang thêm...';

            const employeeId = 'NV' + Date.now().toString().slice(-6);
            const newEmployee = {
                employeeId: employeeId,
                name: name,
                phone: phone,
                baseSalary: salary,
                role: 'employee',
                status: 'active',
                createdBy: getCurrentUser().employeeId,
                createdAt: new Date().toISOString()
            };

            await dbAdd('employees', newEmployee);
            showMessage('Đã thêm nhân viên thành công!', 'success');
            closePopup();
            loadEmployeesData();

        } catch (error) {
            console.error('Error adding employee:', error);
            showMessage('Lỗi khi thêm nhân viên', 'error');
            e.target.disabled = false;
            e.target.textContent = 'Lưu';
        }
    }
}

// Show attendance options popup
function showAttendanceOptionsPopup(employeeId, date, currentType) {
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    
    const popupHTML = `
        <div class="popup attendance-options-popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>📅 Chọn loại ngày ${day}/${month}/${year}</h3>
            
            <div class="attendance-options">
                <button class="attendance-option-btn normal-btn ${currentType === 'normal' ? 'selected' : ''}" 
                        data-action="set-attendance" data-type="normal" data-date="${date}" data-employee-id="${employeeId}">
                    <div class="option-icon">⚪</div>
                    <div class="option-text">Bình thường</div>
                    ${currentType === 'normal' ? '<div class="option-check">✓</div>' : ''}
                </button>
                
                <button class="attendance-option-btn off-btn ${currentType === 'off' ? 'selected' : ''}" 
                        data-action="set-attendance" data-type="off" data-date="${date}" data-employee-id="${employeeId}">
                    <div class="option-icon">🔴</div>
                    <div class="option-text">OFF</div>
                    ${currentType === 'off' ? '<div class="option-check">✓</div>' : ''}
                </button>
                
                <button class="attendance-option-btn overtime-btn ${currentType === 'overtime' ? 'selected' : ''}" 
                        data-action="set-attendance" data-type="overtime" data-date="${date}" data-employee-id="${employeeId}">
                    <div class="option-icon">🟢</div>
                    <div class="option-text">Tăng ca</div>
                    ${currentType === 'overtime' ? '<div class="option-check">✓</div>' : ''}
                </button>
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
            </div>
        </div>
    `;

    showPopup(popupHTML);
    
    setTimeout(() => {
        setupAttendanceOptionsEventListeners();
    }, 100);
}

// Setup attendance options event listeners
function setupAttendanceOptionsEventListeners() {
    const buttons = document.querySelectorAll('[data-action="set-attendance"]');
    buttons.forEach(button => {
        button.removeEventListener('click', handleSetAttendance);
        button.addEventListener('click', handleSetAttendance);
    });

    async function handleSetAttendance(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget; // đảm bảo luôn là button chứa data-*
    const employeeId = btn.dataset.employeeId;
    const date = btn.dataset.date;
    const type = btn.dataset.type;

    btn.disabled = true;
    btn.style.opacity = '0.6';

    try {
        await setEmployeeAttendance(employeeId, date, type);

        // ⭐ Refresh lại dữ liệu tab chính trước khi cập nhật popup
        //    đảm bảo các badges / tổng lương trên danh sách nhân viên cũng cập nhật
        await loadEmployeesData();

        // ⭐ Refresh popup để người dùng thấy thay đổi chi tiết
        //    (reopen popup sau khi tab đã được cập nhật)
        showEmployeeDetailPopup(employeeId);
    } catch (error) {
        console.error('Error setting attendance:', error);
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}


}

// Set employee attendance
async function setEmployeeAttendance(employeeId, date, type) {
    try {
        const allAttendance = await dbGetAll('attendance');
        const existingRecords = allAttendance.filter(a => 
            a && a.employeeId === employeeId && a.date === date
        );
        const existingRecord = existingRecords[0];

        const typeNames = {
            'normal': 'Bình thường',
            'off': 'OFF',
            'overtime': 'Tăng ca'
        };

        if (type === 'normal') {
            if (existingRecord) {
                await dbDelete('attendance', existingRecord.attendanceId);
            }
        } else {
            if (existingRecord) {
                await dbUpdate('attendance', existingRecord.attendanceId, {
                    attendanceType: type,
                    updatedAt: new Date().toISOString()
                });
            } else {
                const timestamp = Date.now() + Math.random();
                const attendanceId = `ATT_${employeeId}_${date}_${timestamp}`;
                
                const newAttendance = {
                    attendanceId: attendanceId,
                    employeeId: employeeId,
                    date: date,
                    month: currentEmployeeMonth,
                    attendanceType: type,
                    createdBy: getCurrentUser().employeeId,
                    createdAt: new Date().toISOString()
                };
                
                await dbAdd('attendance', newAttendance);
            }
        }
        
        showMessage(`Đã đổi thành: ${typeNames[type]}`, 'success');
        return true;
        
    } catch (error) {
        console.error('Error setting attendance:', error);
        
        if (error.name === 'ConstraintError') {
            await new Promise(resolve => setTimeout(resolve, 100));
            return await setEmployeeAttendance(employeeId, date, type);
        } else {
            showMessage('Lỗi khi cập nhật chấm công', 'error');
        }
        throw error;
    }
}

// Generate employee calendar
function generateEmployeeCalendar(attendance, employeeId) {
    const [year, month] = currentEmployeeMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const today = new Date().toISOString().split('T')[0];

    let calendarHTML = '';
    const startDay = firstDay.getDay();

    for (let i = 0; i < startDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayAttendance = attendance.find(a => a.date === dateString);
        const attendanceType = dayAttendance ? dayAttendance.attendanceType : 'normal';

        let dayClass = 'calendar-day';
        let dayIcon = '';
        
        if (dateString === today) dayClass += ' today';
        if (attendanceType === 'off') {
            dayClass += ' off';
            dayIcon = '🔴';
        } else if (attendanceType === 'overtime') {
            dayClass += ' overtime';
            dayIcon = '🟢';
        } else {
            dayIcon = '⚪';
        }

        calendarHTML += `
            <div class="${dayClass}" 
                 data-action="show-attendance-options" 
                 data-date="${dateString}" 
                 data-employee-id="${employeeId}"
                 data-current-type="${attendanceType}">
                <div class="day-number">${day}</div>
                <div class="day-icon">${dayIcon}</div>
            </div>
        `;
    }

    return calendarHTML;
}

// Setup employee detail event listeners
function setupEmployeeDetailEventListeners(employeeId) {
    const editButton = document.querySelector('[data-action="edit-employee"]');
    const disciplineButton = document.querySelector('[data-action="show-discipline"]');
    const closeButton = document.querySelector('[data-action="close-popup"]');
    const calendarDays = document.querySelectorAll('[data-action="show-attendance-options"]');

    if (editButton) {
        editButton.removeEventListener('click', handleEditEmployee);
        editButton.addEventListener('click', handleEditEmployee);
    }

    if (disciplineButton) {
        disciplineButton.removeEventListener('click', handleShowDiscipline);
        disciplineButton.addEventListener('click', handleShowDiscipline);
    }

    if (closeButton) {
        closeButton.removeEventListener('click', handleClosePopup);
        closeButton.addEventListener('click', handleClosePopup);
    }

    calendarDays.forEach(day => {
        day.removeEventListener('click', handleShowAttendanceOptions);
        day.addEventListener('click', handleShowAttendanceOptions);
    });

    function handleEditEmployee(e) {
        e.preventDefault();
        e.stopPropagation();
        showEditEmployeePopup(employeeId);
    }

    function handleShowDiscipline(e) {
        e.preventDefault();
        e.stopPropagation();
        showDisciplinePopup(employeeId);
    }

    function handleClosePopup(e) {
        e.preventDefault();
        e.stopPropagation();
        closePopup();
        // Cập nhật giao diện tab khi đóng popup
        setTimeout(() => {
            loadEmployeesData();
        }, 100);
    }

    function handleShowAttendanceOptions(e) {
        e.preventDefault();
        e.stopPropagation();
        const card = e.target.closest('[data-action="show-attendance-options"]');
        showAttendanceOptionsPopup(employeeId, card.dataset.date, card.dataset.currentType);
    }
}

// Show edit employee popup
async function showEditEmployeePopup(employeeId) {
    if (!isAdmin()) {
        showMessage('Chỉ quản trị viên được sửa thông tin nhân viên', 'error');
        return;
    }

    const employee = await dbGet('employees', employeeId);
    if (!employee) {
        showMessage('Không tìm thấy nhân viên', 'error');
        return;
    }

    const popupHTML = `
        <div class="popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>✏️ Sửa thông tin nhân viên</h3>
            
            <div class="form-group">
                <label for="editEmployeeName">Tên nhân viên:</label>
                <input type="text" id="editEmployeeName" value="${employee.name}" placeholder="Nhập họ tên">
            </div>
            
            <div class="form-group">
                <label for="editEmployeePhone">Số điện thoại:</label>
                <input type="tel" id="editEmployeePhone" value="${employee.phone}" placeholder="Nhập số điện thoại">
            </div>
            
            <div class="form-group">
                <label for="editEmployeeSalary">Lương cơ bản / tháng:</label>
                <input type="number" id="editEmployeeSalary" value="${employee.baseSalary}" placeholder="Nhập lương cơ bản">
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-danger" data-action="delete-employee" data-employee-id="${employeeId}">Xóa NV</button>
                <button class="btn btn-primary" data-action="save-edit-employee" data-employee-id="${employeeId}">Lưu</button>
            </div>
        </div>
    `;

    showPopup(popupHTML);
    
    setTimeout(() => {
        setupEditEmployeeEventListeners(employeeId);
    }, 100);
}

// Setup edit employee event listeners
function setupEditEmployeeEventListeners(employeeId) {
    const saveButton = document.querySelector('[data-action="save-edit-employee"]');
    const deleteButton = document.querySelector('[data-action="delete-employee"]');
    
    if (saveButton) {
        saveButton.removeEventListener('click', handleSaveEdit);
        saveButton.addEventListener('click', handleSaveEdit);
    }
    
    if (deleteButton) {
        deleteButton.removeEventListener('click', handleDelete);
        deleteButton.addEventListener('click', handleDelete);
    }
    
    async function handleSaveEdit(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const popup = e.target.closest('.popup');
        if (!popup) return;
        
        const nameInput = popup.querySelector('#editEmployeeName');
        const phoneInput = popup.querySelector('#editEmployeePhone');
        const salaryInput = popup.querySelector('#editEmployeeSalary');
        
        if (!nameInput || !phoneInput || !salaryInput) {
            showMessage('Lỗi: Không tìm thấy các trường dữ liệu', 'error');
            return;
        }
        
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const salary = parseFloat(salaryInput.value);

        if (!name || !phone || !salary) {
            showMessage('Vui lòng nhập đầy đủ thông tin', 'error');
            return;
        }

        if (salary <= 0) {
            showMessage('Lương phải lớn hơn 0', 'error');
            return;
        }

        try {
            e.target.disabled = true;
            e.target.textContent = 'Đang lưu...';
            
            await dbUpdate('employees', employeeId, {
                name: name,
                phone: phone,
                baseSalary: salary,
                updatedAt: new Date().toISOString()
            });

            showMessage('Đã cập nhật thông tin nhân viên!', 'success');
            closePopup();
            loadEmployeesData();

        } catch (error) {
            console.error('Error updating employee:', error);
            showMessage('Lỗi khi cập nhật thông tin', 'error');
            e.target.disabled = false;
            e.target.textContent = 'Lưu';
        }
    }
    
    async function handleDelete(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (confirm('Bạn có chắc muốn xóa nhân viên này?')) {
            try {
                e.target.disabled = true;
                e.target.textContent = 'Đang xóa...';
                
                await dbUpdate('employees', employeeId, {
                    status: 'inactive',
                    updatedAt: new Date().toISOString()
                });

                showMessage('Đã xóa nhân viên thành công', 'success');
                closePopup();
                loadEmployeesData();
            } catch (error) {
                console.error('Error deleting employee:', error);
                showMessage('Lỗi khi xóa nhân viên', 'error');
                e.target.disabled = false;
                e.target.textContent = 'Xóa NV';
            }
        }
    }
}

// Show discipline popup - HOẠT ĐỘNG ĐẦY ĐỦ
function showDisciplinePopup(employeeId) {
    if (!isAdmin()) {
        showMessage('Chỉ quản trị viên được thưởng/phạt nhân viên', 'error');
        return;
    }

    const popupHTML = `
        <div class="popup">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>⚖️ Chế tài nhân viên</h3>
            
            <div class="form-group">
                <label for="disciplineType">Loại chế tài:</label>
                <select id="disciplineType" class="discipline-select">
                    <option value="reward">🎁 Thưởng</option>
                    <option value="penalty">⚠️ Phạt</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="disciplineAmount">Số tiền:</label>
                <input type="number" id="disciplineAmount" placeholder="Nhập số tiền" value="0">
            </div>
            
            <div class="form-group">
                <label for="disciplineReason">Nội dung:</label>
                <input type="text" id="disciplineReason" placeholder="Nhập nội dung chế tài">
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-primary" data-action="save-discipline" data-employee-id="${employeeId}">Lưu</button>
            </div>
        </div>
    `;

    showPopup(popupHTML);
    
    setTimeout(() => {
        setupDisciplineEventListeners(employeeId);
    }, 100);
}

// Setup discipline event listeners - HOẠT ĐỘNG ĐẦY ĐỦ
function setupDisciplineEventListeners(employeeId) {
    const saveButton = document.querySelector('[data-action="save-discipline"]');
    if (!saveButton) {
        console.log('❌ Save discipline button not found');
        return;
    }

    saveButton.removeEventListener('click', handleSaveDiscipline);
    saveButton.addEventListener('click', handleSaveDiscipline);

    async function handleSaveDiscipline(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('💾 Saving discipline...');
        
        const popup = e.target.closest('.popup');
        if (!popup) {
            console.error('❌ Popup container not found');
            return;
        }
        
        const typeSelect = popup.querySelector('#disciplineType');
        const amountInput = popup.querySelector('#disciplineAmount');
        const reasonInput = popup.querySelector('#disciplineReason');
        
        if (!typeSelect || !amountInput || !reasonInput) {
            console.error('❌ Discipline form elements not found');
            showMessage('Lỗi: Không tìm thấy các trường dữ liệu', 'error');
            return;
        }
        
        const type = typeSelect.value;
        const amount = parseFloat(amountInput.value);
        const reason = reasonInput.value.trim();

        if (!amount || amount <= 0) {
            showMessage('Vui lòng nhập số tiền hợp lệ', 'error');
            return;
        }

        if (!reason) {
            showMessage('Vui lòng nhập nội dung', 'error');
            return;
        }

        try {
            e.target.disabled = true;
            e.target.textContent = 'Đang lưu...';
            
            const recordId = 'DSC' + Date.now().toString().slice(-6);
            const disciplineRecord = {
                recordId: recordId,
                employeeId: employeeId,
                type: type,
                amount: amount,
                reason: reason,
                month: currentEmployeeMonth,
                createdBy: getCurrentUser().employeeId,
                createdAt: new Date().toISOString()
            };

            // Lưu vào database - cần tạo object store 'discipline_records'
            await dbAdd('discipline_records', disciplineRecord);

            const typeText = type === 'reward' ? 'Thưởng' : 'Phạt';
            showMessage(`Đã ${typeText.toLowerCase()} thành công: ${formatCurrency(amount)}`, 'success');
            closePopup();
            loadEmployeesData();

        } catch (error) {
            console.error('Error saving discipline:', error);
            showMessage('Lỗi khi lưu thông tin chế tài', 'error');
            e.target.disabled = false;
            e.target.textContent = 'Lưu';
        }
    }
}

// Format month display
function formatMonthDisplay(monthString) {
    const [year, month] = monthString.split('-');
    return `Tháng ${month}/${year}`;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Popup management functions
function showPopup(html) {
    closePopup();
    
    const popupOverlay = document.createElement('div');
    popupOverlay.className = 'popup-overlay';
    popupOverlay.innerHTML = html;
    
    document.body.appendChild(popupOverlay);
    
    setTimeout(() => {
        popupOverlay.classList.add('active');
    }, 10);
    
    popupOverlay.addEventListener('click', function(e) {
        if (e.target === popupOverlay) {
            closePopup();
        }
    });
}

// Close popup - CẬP NHẬT GIAO DIỆN TAB
function closePopup() {
    const existingPopup = document.querySelector('.popup-overlay, .employee-detail-popup');
    if (existingPopup) {
        existingPopup.classList.remove('active');
        setTimeout(() => {
            if (existingPopup.parentNode) {
                existingPopup.parentNode.removeChild(existingPopup);
            }
            // Luôn cập nhật giao diện tab khi đóng popup
            loadEmployeesData();
        }, 300);
    }
}

// Global close popup listener
document.addEventListener('click', function(e) {
    if (e.target.matches('.close-popup') || e.target.closest('.close-popup')) {
        closePopup();
    }
});

// Show employee detail popup
async function showEmployeeDetailPopup(employeeId) {
    const employee = await dbGet('employees', employeeId);
    if (!employee) {
        showMessage('Không tìm thấy nhân viên', 'error');
        return;
    }

    const salaryData = await calculateEmployeeSalary(employeeId, currentEmployeeMonth);
    const attendance = await getEmployeeAttendance(employeeId, currentEmployeeMonth);

    const popupHTML = `
        <div class="employee-detail-popup active">
            <div class="popup-content">
                <div class="popup-header">
                    <h3 class="popup-title">${employee.name} - ${employee.phone}</h3>
                    <button class="close-popup" data-action="close-popup">×</button>
                </div>

                <!-- LƯƠNG THỰC LÃNH -->
                <div class="actual-salary-section">
                    <div class="actual-salary-amount">
                        ${formatCurrency(salaryData.actualSalary)}
                    </div>
                </div>

                <!-- LỊCH LÀM VIỆC -->
                <div class="calendar-section">
                    <div class="section-title">📅 LỊCH LÀM VIỆC - ${formatMonthDisplay(currentEmployeeMonth)}</div>
                    <div class="calendar-container">
                        <div class="calendar-header">
                            <div class="calendar-header-day">CN</div>
                            <div class="calendar-header-day">T2</div>
                            <div class="calendar-header-day">T3</div>
                            <div class="calendar-header-day">T4</div>
                            <div class="calendar-header-day">T5</div>
                            <div class="calendar-header-day">T6</div>
                            <div class="calendar-header-day">T7</div>
                        </div>
                        <div class="calendar-grid">
                            ${generateEmployeeCalendar(attendance, employeeId)}
                        </div>
                    </div>
                </div>
<!-- 3 NÚT CHỨC NĂNG -->
                <div class="actions-section">
                    <div class="actions-grid">
                        <button class="action-btn edit-btn" data-action="edit-employee" data-employee-id="${employeeId}">
                            ✏️ Sửa NV
                        </button>
                        <button class="action-btn discipline-btn" data-action="show-discipline" data-employee-id="${employeeId}">
                            ⚖️ Chế tài
                        </button>
                        <button class="action-btn close-btn" data-action="close-popup">
                            Đóng
                        </button>
                    </div>
                </div>
                <!-- SỐ LIỆU THỐNG KÊ -->
                <div class="stats-section">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-label">NGÀY OFF</div>
                            <div class="stat-value off">${salaryData.offDays || 0}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">TĂNG CA</div>
                            <div class="stat-value overtime">${salaryData.overtimeDays || 0}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">THƯỞNG</div>
                            <div class="stat-value bonus">+${formatCurrency(salaryData.bonus || 0)}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">PHẠT</div>
                            <div class="stat-value penalty">-${formatCurrency(salaryData.penalty || 0)}</div>
                        </div>
                    </div>
                </div>

                
<!-- LƯƠNG CƠ BẢN -->
                <div class="basic-info">
                    <div class="salary-base">
                        <div class="salary-label">Lương cơ bản</div>
                        <div class="salary-amount">${formatCurrency(employee.baseSalary)}</div>
                    </div>
                </div>
                
            </div>
        </div>
    `;

    showPopup(popupHTML);
    setupEmployeeDetailEventListeners(employeeId);
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