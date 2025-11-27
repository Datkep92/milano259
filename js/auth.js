/**
 * Authentication System - Hệ thống xác thực và phân quyền
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.deviceId = this.getDeviceId();
        this.adminDeviceId = 'admin_device';
        console.log('🔄 AuthManager constructor called');
    }

    getDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('device_id', deviceId);
            console.log('📱 New device ID created:', deviceId);
        }
        return deviceId;
    }

    async init() {
        console.log('🔄 AuthManager init started');
        try {
            console.log('Device ID:', this.deviceId);
            
            if (this.deviceId === this.adminDeviceId) {
                console.log('🔑 Admin device detected');
                this.currentUser = {
                    id: 'admin',
                    name: 'Quản trị viên',
                    phone: '123123',
                    role: 'admin',
                    deviceId: this.adminDeviceId,
                    loginCount: 1,
                    firstLogin: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };
                this.isAuthenticated = true;
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                return;
            }

            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                const user = JSON.parse(savedUser);
                if (user.deviceId === this.deviceId) {
                    this.currentUser = user;
                    this.isAuthenticated = true;
                    console.log('✅ Session restored:', this.currentUser);
                    return;
                } else {
                    console.log('🔄 Device ID mismatch, requiring re-login');
                    localStorage.removeItem('currentUser');
                }
            }

            console.log('❌ No active session found');
            
        } catch (error) {
            console.error('❌ Auth init error:', error);
            this.isAuthenticated = false;
            this.currentUser = null;
        }
    }

    async login(credentials) {
        console.log('🔄 Login attempt:', credentials);
        try {
            if (!credentials.name || !credentials.phone) {
                throw new Error('Vui lòng nhập đầy đủ tên và số điện thoại');
            }

            if (credentials.name === 'admin' && credentials.phone === '123123') {
                console.log('🔑 Admin login detected');
                localStorage.setItem('device_id', this.adminDeviceId);
                this.deviceId = this.adminDeviceId;
                
                this.currentUser = {
                    id: 'admin',
                    name: 'Quản trị viên',
                    phone: credentials.phone,
                    role: 'admin',
                    deviceId: this.adminDeviceId,
                    loginCount: 1,
                    firstLogin: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };
            } else {
                console.log('👤 Employee login detected');
                
                if (!this.validatePhone(credentials.phone)) {
                    throw new Error('Số điện thoại không hợp lệ');
                }

                if (!dbManager.db) {
                    console.log('🔄 Initializing dbManager...');
                    await dbManager.init();
                }

                let user = await this.findUserByPhone(credentials.phone);
                console.log('📋 Found user:', user);
                
                if (user) {
                    user.name = credentials.name;
                    user.lastLogin = new Date().toISOString();
                    user.loginCount = (user.loginCount || 0) + 1;
                    user.deviceId = this.deviceId;
                    await dbManager.update('users', user);
                } else {
                    user = {
                        id: formatter.generateId('user'),
                        name: credentials.name.trim(),
                        phone: credentials.phone.trim(),
                        role: 'employee',
                        deviceId: this.deviceId,
                        loginCount: 1,
                        firstLogin: new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    await dbManager.add('users', user);
                }
                
                this.currentUser = user;
            }

            this.isAuthenticated = true;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            console.log('✅ Login successful:', this.currentUser);
            return this.currentUser;

        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        }
    }

    validatePhone(phone) {
        if (phone === '123123') return true;
        const cleanPhone = phone.toString().replace(/\s+/g, '');
        return /^0[3-9][0-9]{8,9}$/.test(cleanPhone);
    }

    logout() {
        localStorage.removeItem('currentUser');
        this.currentUser = null;
        this.isAuthenticated = false;
        console.log('✅ Logged out');
    }

    hardReset() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('device_id');
        this.currentUser = null;
        this.isAuthenticated = false;
        this.deviceId = this.getDeviceId();
        console.log('🔄 Hard reset completed');
    }

    isAdmin() {
        return this.isAuthenticated && this.currentUser?.role === 'admin';
    }

    isEmployee() {
        return this.isAuthenticated && this.currentUser?.role === 'employee';
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }

    async findUserByPhone(phone) {
        try {
            if (!dbManager.db) {
                await dbManager.init();
            }
            const allUsers = await dbManager.getAll('users');
            return allUsers.find(user => user.phone === phone.trim());
        } catch (error) {
            console.error('❌ Find user error:', error);
            return null;
        }
    }
}

// Tạo instance toàn cục
console.log('🔄 Creating global authManager instance...');
const authManager = new AuthManager();
window.authManager = authManager;
console.log('✅ authManager ready:', authManager);