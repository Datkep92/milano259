// Authentication and user management
let appUser = null; // Đổi tên từ currentUser thành appUser
const ADMIN_PASSWORD = '123123';
const DEVICE_ID_KEY = 'cafe_device_id';

// Generate device ID
function generateDeviceId() {
    return 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Get or create device ID
function getDeviceId() {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = generateDeviceId();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
}

// Check if user is logged in
function checkAuth() {
    const userData = localStorage.getItem('currentUser');
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (userData && deviceId) {
        appUser = JSON.parse(userData);
        return true;
    }
    return false;
}

// Login function
async function login(phone, password = '') {
    const deviceId = getDeviceId();
    
    // Validate input
    if (!phone) {
        return { success: false, message: 'Vui lòng nhập số điện thoại' };
    }
    
    // Admin login
    if (password === ADMIN_PASSWORD) {
        appUser = {
            employeeId: 'admin',
            name: 'Quản trị viên',
            phone: phone,
            role: 'admin',
            deviceId: deviceId,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('currentUser', JSON.stringify(appUser));
        return { success: true, user: appUser };
    }
    
    // Employee login - check if employee exists
    try {
        const employees = await dbGetAll('employees');
        const employee = employees.find(emp => 
            emp.phone === phone && emp.status === 'active'
        );
        
        if (employee) {
            appUser = {
                employeeId: employee.employeeId,
                name: employee.name,
                phone: employee.phone,
                role: 'employee',
                deviceId: deviceId,
                loginTime: new Date().toISOString()
            };
            
            localStorage.setItem('currentUser', JSON.stringify(appUser));
            return { success: true, user: appUser };
        } else {
            // Tự động tạo nhân viên mới nếu không tồn tại
            if (password === '') { // Chỉ tạo khi login không có password
                const newEmployee = {
                    employeeId: 'NV' + Date.now().toString().slice(-4),
                    name: 'Nhân viên ' + phone,
                    phone: phone,
                    baseSalary: 0, // Có thể set mặc định
                    role: 'employee',
                    status: 'active',
                    createdBy: 'system',
                    createdAt: new Date().toISOString()
                };
                
await dbAdd('employees', newEmployee);                
                appUser = {
                    employeeId: newEmployee.employeeId,
                    name: newEmployee.name,
                    phone: newEmployee.phone,
                    role: 'employee',
                    deviceId: deviceId,
                    loginTime: new Date().toISOString()
                };
                
                localStorage.setItem('currentUser', JSON.stringify(appUser));
                return { 
                    success: true, 
                    user: appUser,
                    message: 'Đã tạo tài khoản nhân viên mới'
                };
            } else {
                return { 
                    success: false, 
                    message: 'Số điện thoại không tồn tại' 
                };
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        return { 
            success: false, 
            message: 'Lỗi hệ thống. Vui lòng thử lại.' 
        };
    }
}

// Logout function
function logout() {
    appUser = null;
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Check if user is admin
function isAdmin() {
    return appUser && appUser.role === 'admin';
}

// Get current user info
function getCurrentUser() {
    return appUser;
}

// Hàm khởi tạo rỗng
async function initializeSampleData() {
    console.log('No sample data - starting with empty database');
    // Không tạo dữ liệu mẫu, để database trống
}

// Expose functions to window
if (typeof window !== 'undefined') {
    window.checkAuth = checkAuth;
    window.getCurrentUser = getCurrentUser;
    window.login = login;
    window.logout = logout;
    window.isAdmin = isAdmin;
    window.initializeSampleData = initializeSampleData;
}