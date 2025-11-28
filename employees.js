// Employees tab functionality
let currentEmployeeMonth = formatDate().substring(0, 7); // YYYY-MM

// Initialize employees tab
function initializeEmployeesTab() {
    loadEmployeesTab();
    setupEmployeesEventListeners();
}

// Load employees tab content
async function loadEmployeesTab() {
    const container = document.getElementById('employees');
    if (!container) return;

    const employees = await dbGetAll('employees');
    renderEmployeesTab(container, employees);
}

// Setup event listeners for employees tab
function setupEmployeesEventListeners() {
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-action="change-month"]')) {
            changeEmployeeMonth(e.target.dataset.direction);
        } else if (e.target.matches('[data-action="add-employee"]')) {
            showAddEmployeePopup();
        } else if (e.target.matches('[data-action="show-employee"]')) {
            showEmployeeDetailPopup(e.target.dataset.employeeId);
        }
    });
}

// Change employee month
function changeEmployeeMonth(direction) {
    const [year, month] = currentEmployeeMonth.split('-').map(Number);
    
    let newYear = year;
    let newMonth = month;
    
    if (direction === 'prev') {
        newMonth--;
        if (newMonth === 0) {
            newMonth = 12;
            newYear--;
        }
    } else if (direction === 'next') {
        newMonth++;
        if (newMonth === 13) {
            newMonth = 1;
            newYear++;
        }
    }
    
    currentEmployeeMonth = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    loadEmployeesTab();
}

// SỬA hàm renderEmployeesTab
async function renderEmployeesTab(container, employees) {
    const monthDisplay = formatMonthDisplay(currentEmployeeMonth);
    
    // Tính lương cho tất cả nhân viên trước
    const employeesWithSalary = [];
    for (const employee of employees.filter(emp => emp.status === 'active')) {
        const salary = await calculateEmployeeSalary(employee.employeeId, currentEmployeeMonth);
        employeesWithSalary.push({ ...employee, currentSalary: salary });
    }
    
    container.innerHTML = `
        <div class="section">
            <h2>👥 Quản lý Nhân viên - ${monthDisplay}</h2>
            
            <div class="month-selector">
                <button class="nav-btn" data-action="change-month" data-direction="prev">‹</button>
                <div class="month-input">${monthDisplay}</div>
                <button class="nav-btn" data-action="change-month" data-direction="next">›</button>
            </div>

            ${isAdmin() ? `
                <div class="action-buttons">
                    <button class="btn btn-primary" data-action="add-employee">
                        + Thêm nhân viên
                    </button>
                </div>
            ` : ''}

            <div class="employee-list">
                ${employeesWithSalary.map(employee => `
                    <div class="employee-item" data-action="show-employee" data-employee-id="${employee.employeeId}">
                        <div class="item-info">
                            <strong>${employee.name}</strong>
                            <div>SĐT: ${employee.phone}</div>
                        </div>
                        <div class="item-actions">
                            <span>Lương: ${formatCurrency(employee.currentSalary.actualSalary || 0)}</span>
                            <span>›</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// HOÀN THIỆN hàm calculateEmployeeSalary
async function calculateEmployeeSalary(employeeId, month) {
    try {
        const employee = await dbGet('employees', employeeId);
        if (!employee) return { actualSalary: 0 };
        
        // Lấy dữ liệu chấm công
        const attendance = await getEmployeeAttendance(employeeId, month);
        
        const offDays = attendance.filter(a => a.attendanceType === 'off').length;
        const overtimeDays = attendance.filter(a => a.attendanceType === 'overtime').length;
        const normalDays = 30 - offDays; // Giả định 30 ngày chuẩn
        
        const dailySalary = employee.baseSalary / 30;
        const baseSalary = (normalDays + overtimeDays) * dailySalary;
        
        // Trong thực tế, bonus/penalty nên lấy từ database
        const bonus = 0;
        const penalty = 0;
        const actualSalary = baseSalary + bonus - penalty;
        
        return {
            baseSalary: baseSalary,
            actualSalary: actualSalary,
            offDays: offDays,
            overtimeDays: overtimeDays,
            actualDays: normalDays + overtimeDays,
            bonus: bonus,
            penalty: penalty
        };
    } catch (error) {
        console.error('Error calculating salary:', error);
        return { actualSalary: 0 };
    }
}
// Format month display
function formatMonthDisplay(monthString) {
    const [year, month] = monthString.split('-');
    return `Tháng ${month}/${year}`;
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
                <input type="number" id="newEmployeeSalary" placeholder="Nhập lương cơ bản">
            </div>
            
            <div class="popup-actions">
                <button class="btn btn-secondary" data-action="close-popup">Hủy</button>
                <button class="btn btn-primary" data-action="save-employee">Lưu</button>
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
    setupAddEmployeeEventListeners();
}

// Setup add employee event listeners
function setupAddEmployeeEventListeners() {
    document.addEventListener('click', async function(e) {
        if (e.target.matches('[data-action="save-employee"]')) {
            const name = document.getElementById('newEmployeeName').value.trim();
            const phone = document.getElementById('newEmployeePhone').value.trim();
            const salary = parseFloat(document.getElementById('newEmployeeSalary').value);
            
            if (!name || !phone || !salary) {
                showMessage('Vui lòng nhập đầy đủ thông tin', 'error');
                return;
            }
            
            if (salary <= 0) {
                showMessage('Lương phải lớn hơn 0', 'error');
                return;
            }
            
            try {
                const employeeId = 'NV' + Date.now().toString().slice(-4);
                
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
                loadEmployeesTab();
                
            } catch (error) {
                console.error('Error adding employee:', error);
                showMessage('Lỗi khi thêm nhân viên', 'error');
            }
        }
    });
}

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
        <div class="popup" style="max-width: 600px;">
            <button class="close-popup" data-action="close-popup">×</button>
            <h3>👤 ${employee.name}</h3>
            
            <div class="form-group">
                <label>Tên nhân viên:</label>
                <input type="text" value="${employee.name}" ${!isAdmin() ? 'readonly' : ''}>
            </div>
            
            <div class="form-group">
                <label>Số điện thoại:</label>
                <input type="tel" value="${employee.phone}" readonly>
            </div>
            
            <div class="form-group">
                <label>Lương cơ bản:</label>
                <input type="number" id="baseSalaryInput" value="${employee.baseSalary}" 
                       ${!isAdmin() ? 'readonly' : ''}>
            </div>
            
            <div class="salary-info">
                <p><strong>Lương 1 ngày:</strong> ${formatCurrency(employee.baseSalary / 30)}</p>
            </div>
            
            <div class="section">
                <h4>📅 Lịch làm việc - ${formatMonthDisplay(currentEmployeeMonth)}</h4>
                <div class="calendar" id="employeeCalendar">
                    ${generateCalendar(attendance, employeeId)}
                </div>
            </div>
            
            <div class="section">
                <h4>💰 Thưởng - Phạt</h4>
                <div class="input-group">
                    <label>Thưởng:</label>
                    <input type="number" id="bonusInput" value="${salaryData.bonus || 0}">
                </div>
                <div class="input-group">
                    <label>Phạt:</label>
                    <input type="number" id="penaltyInput" value="${salaryData.penalty || 0}">
                </div>
            </div>
            
            <div class="section" style="background: #e8f5e8;">
                <h4>🧮 Tính lương thực tế</h4>
                <div class="salary-calculation">
                    <p>Công chuẩn: 30 ngày</p>
                    <p>Ngày OFF: ${salaryData.offDays || 0}</p>
                    <p>Ngày tăng ca: ${salaryData.overtimeDays || 0}</p>
                    <p>Lương 1 ngày: ${formatCurrency(employee.baseSalary / 30)}</p>
                    <p>Công thực tế: ${salaryData.actualDays || 0} ngày</p>
                    <p>Lương công: ${formatCurrency(salaryData.baseSalary || 0)}</p>
                    <p><strong>LƯƠNG THỰC TẾ: ${formatCurrency(salaryData.actualSalary || 0)}</strong></p>
                </div>
            </div>
            
            <div class="popup-actions">
                ${isAdmin() ? `
                    <button class="btn btn-danger" data-action="delete-employee" data-employee-id="${employeeId}">
                        Xóa nhân viên
                    </button>
                ` : ''}
                <button class="btn btn-secondary" data-action="close-popup">Đóng</button>
                ${isAdmin() ? `
                    <button class="btn btn-primary" data-action="save-employee-details" data-employee-id="${employeeId}">
                        Lưu cập nhật
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    showPopup(popupHTML);
    setupEmployeeDetailEventListeners(employee);
}

// Generate calendar for employee
function generateCalendar(attendance, employeeId) {
    const [year, month] = currentEmployeeMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    
    let calendarHTML = '';
    
    // Add empty cells for days before the first day of month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayAttendance = attendance.find(a => a.date === dateString);
        let dayClass = 'calendar-day';
        let dayTitle = 'Bình thường';
        
        if (dayAttendance) {
            if (dayAttendance.attendanceType === 'off') {
                dayClass += ' off';
                dayTitle = 'OFF';
            } else if (dayAttendance.attendanceType === 'overtime') {
                dayClass += ' overtime';
                dayTitle = 'Tăng ca';
            }
        }
        
        calendarHTML += `
            <div class="${dayClass}" data-action="toggle-attendance" 
                 data-date="${dateString}" data-employee-id="${employeeId}" title="${dayTitle}">
                ${day}
            </div>
        `;
    }
    
    return calendarHTML;
}

// Get employee attendance for month
async function getEmployeeAttendance(employeeId, month) {
    try {
        const range = IDBKeyRange.bound(
            month + '-01',
            month + '-31'
        );
        
        const attendance = await dbGetAll('attendance', 'date', range);
        return attendance.filter(a => a.employeeId === employeeId);
    } catch (error) {
        console.error('Error getting attendance:', error);
        return [];
    }
}

// Calculate employee salary
async function calculateEmployeeSalary(employeeId, month) {
    try {
        const employee = await dbGet('employees', employeeId);
        if (!employee) return { actualSalary: 0 };
        
        const attendance = await getEmployeeAttendance(employeeId, month);
        
        const offDays = attendance.filter(a => a.attendanceType === 'off').length;
        const overtimeDays = attendance.filter(a => a.attendanceType === 'overtime').length;
        const normalDays = 30 - offDays; // Assuming 30 days standard
        
        const dailySalary = employee.baseSalary / 30;
        const baseSalary = (normalDays + overtimeDays) * dailySalary;
        
        // For demo, using fixed bonus/penalty
        const bonus = 0;
        const penalty = 0;
        const actualSalary = baseSalary + bonus - penalty;
        
        return {
            baseSalary: baseSalary,
            actualSalary: actualSalary,
            offDays: offDays,
            overtimeDays: overtimeDays,
            actualDays: normalDays + overtimeDays,
            bonus: bonus,
            penalty: penalty
        };
    } catch (error) {
        console.error('Error calculating salary:', error);
        return { actualSalary: 0 };
    }
}

// Setup employee detail event listeners
function setupEmployeeDetailEventListeners(employee) {
    document.addEventListener('click', async function(e) {
        if (e.target.matches('[data-action="toggle-attendance"]')) {
            await toggleAttendance(
                e.target.dataset.employeeId,
                e.target.dataset.date
            );
            // Refresh the popup
            showEmployeeDetailPopup(employee.employeeId);
            
        } else if (e.target.matches('[data-action="delete-employee"]')) {
            await deleteEmployee(e.target.dataset.employeeId);
            
        } else if (e.target.matches('[data-action="save-employee-details"]')) {
            await saveEmployeeDetails(employee.employeeId);
        }
    });
}

// Toggle attendance
async function toggleAttendance(employeeId, date) {
    try {
        const existingAttendance = await dbGetAll('attendance', 'date', IDBKeyRange.only(date));
        const existingRecord = existingAttendance.find(a => a.employeeId === employeeId);
        
        if (existingRecord) {
            // Cycle through attendance types: normal -> off -> overtime -> normal
            let newType = 'normal';
            if (existingRecord.attendanceType === 'normal') {
                newType = 'off';
            } else if (existingRecord.attendanceType === 'off') {
                newType = 'overtime';
            }
            
            if (newType === 'normal') {
                // Delete record if back to normal
                await dbDelete('attendance', existingRecord.attendanceId);
            } else {
                // Update record
                await dbUpdate('attendance', existingRecord.attendanceId, {
                    attendanceType: newType
                });
            }
        } else {
            // Create new record
            const newAttendance = {
                employeeId: employeeId,
                date: date,
                month: currentEmployeeMonth,
                attendanceType: 'off', // Start with OFF
                createdBy: getCurrentUser().employeeId,
                createdAt: new Date().toISOString()
            };
            
            await dbAdd('attendance', newAttendance);
        }
        
    } catch (error) {
        console.error('Error toggling attendance:', error);
        showMessage('Lỗi khi cập nhật lịch làm việc', 'error');
    }
}

// Delete employee
async function deleteEmployee(employeeId) {
    if (!confirm('Bạn có chắc muốn xóa nhân viên này?')) {
        return;
    }
    
    try {
        // Soft delete by setting status to inactive
        await dbUpdate('employees', employeeId, {
            status: 'inactive',
            updatedAt: new Date().toISOString()
        });
        
        showMessage('Đã xóa nhân viên thành công', 'success');
        closePopup();
        loadEmployeesTab();
        
    } catch (error) {
        console.error('Error deleting employee:', error);
        showMessage('Lỗi khi xóa nhân viên', 'error');
    }
}

// Save employee details
async function saveEmployeeDetails(employeeId) {
    try {
        const baseSalary = parseFloat(document.getElementById('baseSalaryInput').value);
        const bonus = parseFloat(document.getElementById('bonusInput').value) || 0;
        const penalty = parseFloat(document.getElementById('penaltyInput').value) || 0;
        
        if (baseSalary <= 0) {
            showMessage('Lương phải lớn hơn 0', 'error');
            return;
        }
        
        // Update base salary
        await dbUpdate('employees', employeeId, {
            baseSalary: baseSalary,
            updatedAt: new Date().toISOString()
        });
        
        // In a real app, you would save bonus/penalty to a separate store
        showMessage('Đã cập nhật thông tin nhân viên', 'success');
        closePopup();
        loadEmployeesTab();
        
    } catch (error) {
        console.error('Error saving employee details:', error);
        showMessage('Lỗi khi cập nhật thông tin', 'error');
    }
}