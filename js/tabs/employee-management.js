/**
 * EmployeeManagementTab - Xử lý tab quản lý nhân viên và tính lương
 */

class EmployeeManagementTab {
    constructor() {
        this.currentMonth = dateUtils.formatDate(new Date()).substring(0, 7); // YYYY-MM
        this.employees = [];
        this.selectedEmployee = null;
        this.isLoading = false;
    }

    /**
     * Khởi tạo tab quản lý nhân viên
     */
    async init() {
        await this.loadEmployees();
        this.render();
        this.bindEvents();
    }

    /**
     * Load danh sách nhân viên
     */
    async loadEmployees() {
        this.showLoading();
        
        try {
            this.employees = await dbManager.getAll('employees');
            
            // Load dữ liệu lương cho tháng hiện tại
            await this.loadSalaryData();
            
        } catch (error) {
            console.error('Lỗi load nhân viên:', error);
            this.showError('Không thể tải danh sách nhân viên: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Load dữ liệu lương
     */
    async loadSalaryData() {
        const salaryRecords = await dbManager.getAll('salary_records');
        const currentMonthRecords = salaryRecords.filter(record => 
            record.month === this.currentMonth
        );

        // Gán dữ liệu lương cho nhân viên
        this.employees.forEach(employee => {
            const salaryRecord = currentMonthRecords.find(record => 
                record.employee_id === employee.id
            );
            
            if (salaryRecord) {
                employee.salary_data = salaryRecord;
            } else {
                // Tạo record lương mới nếu chưa có
                employee.salary_data = this.createDefaultSalaryRecord(employee);
            }
        });
    }

    /**
     * Tạo record lương mặc định
     */
    createDefaultSalaryRecord(employee) {
        return {
            id: formatter.generateId('salary'),
            employee_id: employee.id,
            month: this.currentMonth,
            basic_salary: employee.basic_salary || 0,
            off_days: 0,
            overtime_days: 0,
            bonus: 0,
            penalty: 0,
            actual_salary: employee.basic_salary || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }

    /**
 * Render giao diện
 */
render() {
    console.log('🎨 Rendering employee management...');
    
    const container = document.getElementById('employee-management');
    if (!container) {
        console.error('❌ Employee management container not found!');
        return;
    }
    
    container.innerHTML = this.getTemplate();
    
    this.renderEmployeeList();
    this.renderMonthFilter();
    
    console.log('✅ Employee management rendered');
    console.log('👥 Employees count:', this.employees.length);
}

    /**
     * Template chính
     */
    getTemplate() {
        return `
            <div class="employee-management-container">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">👥 Quản Lý Nhân Viên</h2>
                        <div class="header-controls">
                            <select id="month-filter" class="form-input">
                                <!-- Options sẽ được thêm bằng JavaScript -->
                            </select>
                            <button id="add-employee-btn" class="btn btn-primary">
                                ➕ Thêm Nhân Viên
                            </button>
                        </div>
                    </div>

                    <!-- Danh sách nhân viên -->
                    <div class="employee-list" id="employee-list">
                        <!-- Employee cards will be rendered here -->
                    </div>
                </div>

                <!-- Modal chi tiết nhân viên -->
                <div id="employee-detail-modal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Chi Tiết Nhân Viên</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body" id="employee-detail-content">
                            <!-- Nội dung chi tiết sẽ được render ở đây -->
                        </div>
                    </div>
                </div>

                <!-- Modal thêm/sửa nhân viên -->
                <div id="employee-form-modal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="employee-form-title">Thêm Nhân Viên</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="employee-form">
                                <div class="form-group">
                                    <label class="form-label">Tên nhân viên</label>
                                    <input type="text" id="employee-name" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Lương cơ bản (30 ngày)</label>
                                    <input type="text" id="employee-salary" class="form-input currency" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Số điện thoại</label>
                                    <input type="tel" id="employee-phone" class="form-input">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Vị trí</label>
                                    <input type="text" id="employee-position" class="form-input">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Ngày bắt đầu</label>
                                    <input type="date" id="employee-start-date" class="form-input">
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">Lưu</button>
                                    <button type="button" class="btn btn-outline modal-close">Hủy</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Modal chấm công -->
                <div id="attendance-modal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="attendance-modal-title">Chấm Công</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="attendance-calendar"></div>
                            <div class="attendance-legend">
                                <div class="legend-item">
                                    <span class="legend-color normal"></span>
                                    <span>Bình thường</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-color off"></span>
                                    <span>Nghỉ (OFF)</span>
                                </div>
                                <div class="legend-item">
                                    <span class="legend-color overtime"></span>
                                    <span>Tăng ca</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal thưởng/phạt -->
                <div id="bonus-penalty-modal" class="modal hidden">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Thưởng/Phạt</h3>
                            <button class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label class="form-label">Số tiền thưởng/phạt</label>
                                <input type="text" id="bonus-penalty-amount" class="form-input currency" 
                                       placeholder="Số tiền (phạt nhập số âm)">
                                <small class="form-text">Nhập số dương để thưởng, số âm để phạt</small>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Lý do</label>
                                <textarea id="bonus-penalty-reason" class="form-input" 
                                         placeholder="Lý do thưởng/phạt..."></textarea>
                            </div>
                            <div class="form-actions">
                                <button id="save-bonus-penalty-btn" class="btn btn-primary">Lưu</button>
                                <button type="button" class="btn btn-outline modal-close">Hủy</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render dropdown lọc tháng
     */
    renderMonthFilter() {
        const monthFilter = document.getElementById('month-filter');
        const monthOptions = dateUtils.getMonthOptions(12);
        
        monthFilter.innerHTML = monthOptions.map(option => 
            `<option value="${option.value}" ${option.value === this.currentMonth ? 'selected' : ''}>
                ${option.label}
            </option>`
        ).join('');
    }

    /**
 * Render danh sách nhân viên
 */
renderEmployeeList() {
    const container = document.getElementById('employee-list');
    
    if (!container) {
        console.error('❌ Employee list container not found!');
        return;
    }
    
    if (this.employees.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Chưa có nhân viên nào</p>
                <button id="add-first-employee" class="btn btn-primary">Thêm nhân viên đầu tiên</button>
            </div>
        `;
        console.log('📭 Empty state rendered');
        return;
    }

    container.innerHTML = this.employees.map(employee => 
        this.getEmployeeCardTemplate(employee)
    ).join('');
    
    console.log('✅ Employee list rendered with', this.employees.length, 'employees');
}

    /**
 * Template card nhân viên
 */
getEmployeeCardTemplate(employee) {
    const salaryData = employee.salary_data || {};
    const actualSalary = salaryData.actual_salary || employee.basic_salary || 0;
    
    return `
        <div class="employee-card" data-employee-id="${employee.id}">
            <div class="employee-card-header">
                <h4 class="employee-name">${employee.name}</h4>
                <div class="employee-actions">
                    <button class="btn btn-sm btn-outline edit-employee-btn" title="Sửa" data-employee-id="${employee.id}">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-danger delete-employee-btn" title="Xoá" data-employee-id="${employee.id}">
                        🗑️
                    </button>
                </div>
            </div>
            
            <div class="employee-card-body">
                <div class="employee-salary">
                    <span class="salary-label">Thực lãnh:</span>
                    <span class="salary-amount">${formatter.formatCurrency(actualSalary)}</span>
                </div>
                
                <div class="employee-stats">
                    <div class="stat-item">
                        <span class="stat-label">OFF:</span>
                        <span class="stat-value">${salaryData.off_days || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Tăng ca:</span>
                        <span class="stat-value">+${salaryData.overtime_days || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Thưởng/Phạt:</span>
                        <span class="stat-value ${(salaryData.bonus || 0) - (salaryData.penalty || 0) >= 0 ? 'text-success' : 'text-danger'}">
                            ${formatter.formatCurrency((salaryData.bonus || 0) - (salaryData.penalty || 0))}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="employee-card-footer">
                <button class="btn btn-sm btn-outline view-detail-btn" data-employee-id="${employee.id}">
                    Xem chi tiết
                </button>
                <button class="btn btn-sm btn-outline manage-attendance-btn" data-employee-id="${employee.id}">
                    📅 Chấm công
                </button>
                <button class="btn btn-sm btn-outline manage-bonus-btn" data-employee-id="${employee.id}">
                    💰 Thưởng/Phạt
                </button>
            </div>
        </div>
    `;
}

    /**
 * Bind events
 */
bindEvents() {
    console.log('🔄 Binding events for employee management...');
    
    // Đợi một chút để DOM render xong
    setTimeout(() => {
        this.bindMonthFilter();
        this.bindAddEmployee();
        this.bindEmployeeForm();
        this.bindModalCloses();
        this.bindEmployeeList();
        this.bindBonusPenalty();
        this.bindFirstEmployee();
    }, 100);
}

/**
 * Bind lọc tháng
 */
bindMonthFilter() {
    const monthFilter = document.getElementById('month-filter');
    if (monthFilter) {
        monthFilter.addEventListener('change', (e) => {
            this.currentMonth = e.target.value;
            this.loadEmployees();
        });
        console.log('✅ Month filter bound');
    } else {
        console.warn('❌ Month filter not found');
    }
}

/**
 * Bind nút thêm nhân viên
 */
bindAddEmployee() {
    const addBtn = document.getElementById('add-employee-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => this.showEmployeeForm());
        console.log('✅ Add employee button bound');
    } else {
        console.warn('❌ Add employee button not found');
    }
}

/**
 * Bind form nhân viên
 */
bindEmployeeForm() {
    const employeeForm = document.getElementById('employee-form');
    if (employeeForm) {
        employeeForm.addEventListener('submit', (e) => this.saveEmployee(e));
        console.log('✅ Employee form bound');
    } else {
        console.warn('❌ Employee form not found');
    }
}

/**
 * Bind đóng modal
 */
bindModalCloses() {
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            this.closeModal(modal);
        });
    });
    console.log('✅ Modal close buttons bound');
}

/**
 * Bind danh sách nhân viên (delegation)
 */
bindEmployeeList() {
    const employeeList = document.getElementById('employee-list');
    if (employeeList) {
        employeeList.addEventListener('click', (e) => {
            console.log('🖱️ Clicked on:', e.target);
            console.log('🖱️ Clicked element class:', e.target.className);
            
            // Xử lý nút "Thêm nhân viên đầu tiên"
            if (e.target.id === 'add-first-employee' || e.target.closest('#add-first-employee')) {
                console.log('👆 Add first employee clicked');
                this.showEmployeeForm();
                return;
            }
            
            const card = e.target.closest('.employee-card');
            if (!card) {
                console.log('❌ Not an employee card');
                return;
            }
            
            const employeeId = card.dataset.employeeId;
            console.log('👤 Employee ID:', employeeId);
            
            const employee = this.employees.find(emp => emp.id === employeeId);
            if (!employee) {
                console.log('❌ Employee not found');
                return;
            }
            
            // Xác định nút được click
            if (e.target.classList.contains('view-detail-btn') || 
                e.target.closest('.view-detail-btn')) {
                console.log('📋 View detail clicked');
                this.showEmployeeDetail(employee);
                
            } else if (e.target.classList.contains('manage-attendance-btn') || 
                       e.target.closest('.manage-attendance-btn')) {
                console.log('📅 Manage attendance clicked');
                this.showAttendanceModal(employee);
                
            } else if (e.target.classList.contains('manage-bonus-btn') || 
                       e.target.closest('.manage-bonus-btn')) {
                console.log('💰 Manage bonus clicked');
                this.showBonusPenaltyModal(employee);
                
            } else if (e.target.classList.contains('edit-employee-btn') || 
                       e.target.closest('.edit-employee-btn')) {
                console.log('✏️ Edit employee clicked');
                this.showEmployeeForm(employee);
                
            } else if (e.target.classList.contains('delete-employee-btn') || 
                       e.target.closest('.delete-employee-btn')) {
                console.log('🗑️ Delete employee clicked');
                this.deleteEmployee(employee);
            }
        });
        console.log('✅ Employee list bound');
    } else {
        console.warn('❌ Employee list not found');
    }
}

/**
 * Bind thưởng/phạt
 */
bindBonusPenalty() {
    const saveBtn = document.getElementById('save-bonus-penalty-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => this.saveBonusPenalty());
        console.log('✅ Bonus penalty button bound');
    } else {
        console.warn('❌ Bonus penalty button not found');
    }
}

/**
 * Bind thêm nhân viên đầu tiên - ĐÃ ĐƯỢC XỬ LÝ TRONG bindEmployeeList
 */
bindFirstEmployee() {
    // Đã xử lý trong bindEmployeeList, có thể xóa method này
    console.log('ℹ️ First employee button handled in main delegation');
}

   /**
 * Hiển thị form thêm/sửa nhân viên
 */
showEmployeeForm(employee = null) {
    console.log('📝 Showing employee form for:', employee ? employee.name : 'new employee');
    
    this.selectedEmployee = employee;
    const modal = document.getElementById('employee-form-modal');
    const title = document.getElementById('employee-form-title');
    const form = document.getElementById('employee-form');
    
    if (!modal || !title || !form) {
        console.error('❌ Employee form elements not found!');
        this.showError('Không thể mở form nhân viên');
        return;
    }
    
    title.textContent = employee ? 'Sửa Nhân Viên' : 'Thêm Nhân Viên';
    
    if (employee) {
        // Điền dữ liệu vào form
        document.getElementById('employee-name').value = employee.name || '';
        document.getElementById('employee-salary').value = formatter.formatCurrency(employee.basic_salary || 0);
        document.getElementById('employee-phone').value = employee.phone || '';
        document.getElementById('employee-position').value = employee.position || '';
        document.getElementById('employee-start-date').value = employee.start_date || '';
    } else {
        // Reset form
        form.reset();
    }
    
    this.showModal(modal);
    console.log('✅ Employee form modal shown');
}

    /**
     * Hiển thị chi tiết nhân viên
     */
    showEmployeeDetail(employee) {
        this.selectedEmployee = employee;
        const modal = document.getElementById('employee-detail-modal');
        const content = document.getElementById('employee-detail-content');
        
        const salaryData = employee.salary_data || {};
        const dailySalary = (employee.basic_salary || 0) / 30;
        const actualSalary = calculator.calculateEmployeeSalary({
            basic_salary: employee.basic_salary || 0,
            off_days: salaryData.off_days || 0,
            overtime_days: salaryData.overtime_days || 0,
            bonus: salaryData.bonus || 0,
            penalty: salaryData.penalty || 0
        });
        
        content.innerHTML = `
            <div class="employee-detail">
                <div class="detail-section">
                    <h4>Thông tin cá nhân</h4>
                    <div class="detail-row">
                        <span class="detail-label">Tên:</span>
                        <span class="detail-value">${employee.name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">SĐT:</span>
                        <span class="detail-value">${formatter.formatPhone(employee.phone || 'Chưa có')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Vị trí:</span>
                        <span class="detail-value">${employee.position || 'Chưa có'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Ngày bắt đầu:</span>
                        <span class="detail-value">${employee.start_date ? dateUtils.formatDisplayDate(employee.start_date) : 'Chưa có'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4>Lương tháng ${dateUtils.getVietnameseMonth(this.currentMonth)}</h4>
                    <div class="detail-row">
                        <span class="detail-label">Lương cơ bản:</span>
                        <span class="detail-value">${formatter.formatCurrency(employee.basic_salary || 0)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Lương ngày:</span>
                        <span class="detail-value">${formatter.formatCurrency(dailySalary)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Ngày OFF:</span>
                        <span class="detail-value">${salaryData.off_days || 0} ngày</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Tăng ca:</span>
                        <span class="detail-value">+${salaryData.overtime_days || 0} ngày</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Thưởng:</span>
                        <span class="detail-value text-success">+${formatter.formatCurrency(salaryData.bonus || 0)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Phạt:</span>
                        <span class="detail-value text-danger">-${formatter.formatCurrency(salaryData.penalty || 0)}</span>
                    </div>
                    <div class="detail-row total">
                        <span class="detail-label">Thực lãnh:</span>
                        <span class="detail-value">${formatter.formatCurrency(actualSalary)}</span>
                    </div>
                </div>
                
                <div class="detail-actions">
                    <button class="btn btn-outline manage-attendance-btn" data-employee-id="${employee.id}">
                        📅 Quản lý chấm công
                    </button>
                    <button class="btn btn-outline manage-bonus-btn" data-employee-id="${employee.id}">
                        💰 Thưởng/Phạt
                    </button>
                </div>
            </div>
        `;
        
        // Bind events cho các nút trong modal detail
        content.querySelector('.manage-attendance-btn').addEventListener('click', () => {
            this.closeModal(modal);
            this.showAttendanceModal(employee);
        });
        
        content.querySelector('.manage-bonus-btn').addEventListener('click', () => {
            this.closeModal(modal);
            this.showBonusPenaltyModal(employee);
        });
        
        this.showModal(modal);
    }

    /**
     * Hiển thị modal chấm công
     */
    showAttendanceModal(employee) {
        this.selectedEmployee = employee;
        const modal = document.getElementById('attendance-modal');
        const title = document.getElementById('attendance-modal-title');
        const calendarContainer = document.getElementById('attendance-calendar');
        
        title.textContent = `Chấm công - ${employee.name}`;
        
        // Render lịch
        this.renderAttendanceCalendar(employee, calendarContainer);
        
        this.showModal(modal);
    }

    /**
     * Render lịch chấm công
     */
    renderAttendanceCalendar(employee, container) {
        const [year, month] = this.currentMonth.split('-');
        const calendar = dateUtils.getMonthCalendar(parseInt(year), parseInt(month));
        const attendanceData = employee.salary_data?.attendance || {};
        
        container.innerHTML = `
            <div class="attendance-calendar">
                <div class="calendar-header">
                    <span class="calendar-month">${dateUtils.getVietnameseMonth(this.currentMonth)} ${year}</span>
                </div>
                <div class="calendar-grid">
                    ${['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => 
                        `<div class="calendar-day-header">${day}</div>`
                    ).join('')}
                    ${calendar.map(day => {
                        const attendance = attendanceData[day.date];
                        let className = 'calendar-day';
                        let status = 'normal';
                        
                        if (attendance === 'off') {
                            className += ' off-day';
                            status = 'off';
                        } else if (attendance === 'overtime') {
                            className += ' overtime-day';
                            status = 'overtime';
                        }
                        
                        if (day.isWeekend) {
                            className += ' weekend';
                        }
                        
                        return `
                            <div class="${className}" data-date="${day.date}" data-status="${status}">
                                <span class="day-number">${day.day}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="calendar-actions">
                    <button class="btn btn-outline" id="clear-attendance">Xóa chấm công</button>
                </div>
            </div>
        `;
        
        // Bind events cho các ngày trong lịch
        container.querySelectorAll('.calendar-day').forEach(dayElement => {
            dayElement.addEventListener('click', () => this.toggleAttendance(dayElement));
        });
        
        // Xóa chấm công
        container.querySelector('#clear-attendance').addEventListener('click', () => this.clearAttendance(employee));
    }

    /**
     * Chuyển đổi trạng thái chấm công
     */
    toggleAttendance(dayElement) {
        const date = dayElement.dataset.date;
        const currentStatus = dayElement.dataset.status;
        let newStatus;
        
        switch (currentStatus) {
            case 'normal':
                newStatus = 'off';
                dayElement.classList.add('off-day');
                dayElement.classList.remove('overtime-day');
                break;
            case 'off':
                newStatus = 'overtime';
                dayElement.classList.remove('off-day');
                dayElement.classList.add('overtime-day');
                break;
            case 'overtime':
                newStatus = 'normal';
                dayElement.classList.remove('off-day', 'overtime-day');
                break;
        }
        
        dayElement.dataset.status = newStatus;
        this.updateAttendanceData(date, newStatus);
    }

    /**
     * Cập nhật dữ liệu chấm công
     */
    updateAttendanceData(date, status) {
        if (!this.selectedEmployee) return;
        
        const employee = this.selectedEmployee;
        if (!employee.salary_data.attendance) {
            employee.salary_data.attendance = {};
        }
        
        if (status === 'normal') {
            delete employee.salary_data.attendance[date];
        } else {
            employee.salary_data.attendance[date] = status;
        }
        
        // Tính toán lại số ngày OFF và tăng ca
        this.calculateAttendanceSummary(employee);
        
        // Tính toán lại lương
        this.calculateSalary(employee);
        
        // Lưu tự động
        this.saveSalaryData(employee);
    }

    /**
     * Tính toán tổng hợp chấm công
     */
    calculateAttendanceSummary(employee) {
        const attendance = employee.salary_data.attendance || {};
        let offDays = 0;
        let overtimeDays = 0;
        
        Object.values(attendance).forEach(status => {
            if (status === 'off') offDays++;
            if (status === 'overtime') overtimeDays++;
        });
        
        employee.salary_data.off_days = offDays;
        employee.salary_data.overtime_days = overtimeDays;
    }

    /**
     * Xóa toàn bộ chấm công
     */
    clearAttendance(employee) {
        if (!confirm('Bạn có chắc muốn xóa toàn bộ chấm công tháng này?')) return;
        
        employee.salary_data.attendance = {};
        employee.salary_data.off_days = 0;
        employee.salary_data.overtime_days = 0;
        
        this.calculateSalary(employee);
        this.saveSalaryData(employee);
        this.showAttendanceModal(employee); // Refresh modal
    }

    /**
     * Hiển thị modal thưởng/phạt
     */
    showBonusPenaltyModal(employee) {
        this.selectedEmployee = employee;
        const modal = document.getElementById('bonus-penalty-modal');
        
        // Reset form
        document.getElementById('bonus-penalty-amount').value = '';
        document.getElementById('bonus-penalty-reason').value = '';
        
        this.showModal(modal);
    }

    /**
     * Lưu thưởng/phạt
     */
    async saveBonusPenalty() {
        if (!this.selectedEmployee) return;
        
        const amount = formatter.parseCurrency(document.getElementById('bonus-penalty-amount').value);
        const reason = document.getElementById('bonus-penalty-reason').value.trim();
        
        if (amount === 0 && !reason) {
            this.showError('Vui lòng nhập số tiền hoặc lý do');
            return;
        }
        
        const employee = this.selectedEmployee;
        
        if (amount >= 0) {
            employee.salary_data.bonus = (employee.salary_data.bonus || 0) + amount;
        } else {
            employee.salary_data.penalty = (employee.salary_data.penalty || 0) + Math.abs(amount);
        }
        
        // Thêm vào lịch sử thưởng/phạt
        if (!employee.salary_data.bonus_penalty_history) {
            employee.salary_data.bonus_penalty_history = [];
        }
        
        employee.salary_data.bonus_penalty_history.push({
            date: new Date().toISOString(),
            amount: amount,
            reason: reason,
            type: amount >= 0 ? 'bonus' : 'penalty'
        });
        
        // Tính toán lại lương
        this.calculateSalary(employee);
        
        // Lưu dữ liệu
        await this.saveSalaryData(employee);
        
        this.closeModal(document.getElementById('bonus-penalty-modal'));
        this.showSuccess(amount >= 0 ? 'Đã thêm thưởng' : 'Đã thêm phạt');
    }

    /**
     * Tính toán lương
     */
    calculateSalary(employee) {
        const salaryData = employee.salary_data;
        salaryData.actual_salary = calculator.calculateEmployeeSalary({
            basic_salary: employee.basic_salary || 0,
            off_days: salaryData.off_days || 0,
            overtime_days: salaryData.overtime_days || 0,
            bonus: salaryData.bonus || 0,
            penalty: salaryData.penalty || 0
        });
    }

    /**
     * Lưu nhân viên
     */
    async saveEmployee(e) {
        e.preventDefault();
        
        const name = document.getElementById('employee-name').value.trim();
        const basic_salary = formatter.parseCurrency(document.getElementById('employee-salary').value);
        const phone = document.getElementById('employee-phone').value.trim();
        const position = document.getElementById('employee-position').value.trim();
        const start_date = document.getElementById('employee-start-date').value;
        
        if (!name || basic_salary <= 0) {
            this.showError('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }
        
        const employeeData = {
            name,
            basic_salary,
            phone: phone || null,
            position: position || null,
            start_date: start_date || null,
            updated_at: new Date().toISOString()
        };
        
        if (this.selectedEmployee) {
            // Cập nhật nhân viên
            employeeData.id = this.selectedEmployee.id;
            employeeData.created_at = this.selectedEmployee.created_at;
        } else {
            // Thêm nhân viên mới
            employeeData.id = formatter.generateId('emp');
            employeeData.created_at = new Date().toISOString();
        }
        
        try {
            await dbManager.update('employees', employeeData);
            this.closeModal(document.getElementById('employee-form-modal'));
            this.showSuccess(this.selectedEmployee ? 'Cập nhật thành công' : 'Thêm nhân viên thành công');
            await this.loadEmployees();
        } catch (error) {
            this.showError('Lỗi lưu nhân viên: ' + error.message);
        }
    }

    /**
     * Xóa nhân viên
     */
    async deleteEmployee(employee) {
        if (!confirm(`Bạn có chắc muốn xóa nhân viên "${employee.name}"?`)) return;
        
        try {
            await dbManager.delete('employees', employee.id);
            
            // Xóa cả dữ liệu lương
            const salaryRecords = await dbManager.getAll('salary_records');
            const employeeSalaryRecords = salaryRecords.filter(record => record.employee_id === employee.id);
            
            for (const record of employeeSalaryRecords) {
                await dbManager.delete('salary_records', record.id);
            }
            
            this.showSuccess('Đã xóa nhân viên');
            await this.loadEmployees();
        } catch (error) {
            this.showError('Lỗi xóa nhân viên: ' + error.message);
        }
    }

    /**
     * Lưu dữ liệu lương
     */
    async saveSalaryData(employee) {
        try {
            await dbManager.update('salary_records', employee.salary_data);
            
            // Cập nhật lại danh sách hiển thị
            await this.loadEmployees();
        } catch (error) {
            console.error('Lỗi lưu dữ liệu lương:', error);
            this.showError('Lỗi lưu dữ liệu lương');
        }
    }

    /**
     * Hiển thị modal
     */
    showModal(modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Đóng modal
     */
    closeModal(modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        this.selectedEmployee = null;
    }

    /**
     * Hiển thị loading
     */
    showLoading() {
        this.isLoading = true;
        document.getElementById('loading-overlay').classList.add('show');
    }

    /**
     * Ẩn loading
     */
    hideLoading() {
        this.isLoading = false;
        document.getElementById('loading-overlay').classList.remove('show');
    }

    /**
     * Hiển thị thông báo lỗi
     */
    showError(message) {
        alert('Lỗi: ' + message);
    }

    /**
     * Hiển thị thông báo thành công
     */
    showSuccess(message) {
        alert('Thành công: ' + message);
    }
}

// Tạo instance toàn cục
const employeeManagementTab = new EmployeeManagementTab();
       