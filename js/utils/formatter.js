/**
 * Formatter - Tiện ích định dạng dữ liệu cho hệ thống
 */

class Formatter {
    constructor() {
        this.currencySymbol = 'đ';
        this.locale = 'vi-VN';
    }

    /**
     * Định dạng tiền tệ
     */
    formatCurrency(amount) {
        if (amount === null || amount === undefined) return '0' + this.currencySymbol;
        
        const number = Number(amount);
        if (isNaN(number)) return '0' + this.currencySymbol;

        return new Intl.NumberFormat(this.locale).format(number) + this.currencySymbol;
    }

    /**
     * Định dạng số (không có ký hiệu tiền)
     */
    formatNumber(number) {
        if (number === null || number === undefined) return '0';
        return new Intl.NumberFormat(this.locale).format(number);
    }

    /**
     * Parse chuỗi tiền tệ thành số
     */
    parseCurrency(currencyString) {
        if (!currencyString) return 0;
        
        // Loại bỏ ký hiệu tiền và dấu chấm phân cách
        const cleaned = currencyString.replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
    }

    /**
     * Định dạng phần trăm
     */
    formatPercent(value, decimals = 1) {
        if (value === null || value === undefined) return '0%';
        return `${parseFloat(value).toFixed(decimals)}%`;
    }

    /**
     * Định dạng ngày giờ
     */
    formatDateTime(date) {
        if (!date) return '';
        
        const d = new Date(date);
        const dateStr = dateUtils.formatDisplayDate(d);
        const timeStr = d.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `${dateStr} ${timeStr}`;
    }

    /**
     * Định dạng tên người (viết hoa chữ cái đầu)
     */
    formatName(name) {
        if (!name) return '';
        return name.replace(/\w\S*/g, txt => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    /**
     * Định dạng số điện thoại
     */
    formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.length === 10) {
            return cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
        } else if (cleaned.length === 11) {
            return cleaned.replace(/(\d{4})(\d{4})(\d{3})/, '$1 $2 $3');
        }
        
        return phone;
    }

    /**
     * Rút gọn văn bản dài
     */
    truncateText(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    /**
     * Định dạng đơn vị tính
     */
    formatUnit(value, unit) {
        if (!value) return '';
        return `${this.formatNumber(value)} ${unit}`;
    }

    /**
     * Định dạng màu cho số (xanh cho dương, đỏ cho âm)
     */
    formatNumberColor(value) {
        const num = Number(value);
        if (num > 0) return 'text-success';
        if (num < 0) return 'text-danger';
        return '';
    }

    /**
     * Định dạng trạng thái
     */
    formatStatus(status) {
        const statusMap = {
            'active': { text: 'Đang hoạt động', class: 'text-success' },
            'inactive': { text: 'Ngừng hoạt động', class: 'text-danger' },
            'pending': { text: 'Chờ xử lý', class: 'text-warning' },
            'completed': { text: 'Hoàn thành', class: 'text-success' }
        };
        
        return statusMap[status] || { text: status, class: '' };
    }

    /**
     * Định dạng loại chi phí
     */
    formatExpenseType(type) {
        const typeMap = {
            'food': 'Ăn uống',
            'transport': 'Di chuyển',
            'office': 'Văn phòng phẩm',
            'phone': 'Điện thoại',
            'other': 'Khác'
        };
        
        return typeMap[type] || type;
    }

    /**
     * Tạo ID ngẫu nhiên
     */
    generateId(prefix = '') {
        const timestamp = new Date().getTime();
        const random = Math.random().toString(36).substr(2, 9);
        return `${prefix}${timestamp}_${random}`;
    }

    /**
     * Định dạng kích thước file
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Làm sạch input số
     */
    cleanNumberInput(input) {
        return input.replace(/[^\d,.-]/g, '');
    }
}

const formatter = new Formatter();  