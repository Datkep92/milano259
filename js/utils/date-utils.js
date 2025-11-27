/**
 * DateUtils - Tiện ích xử lý ngày tháng cho hệ thống quản lý bán hàng
 */

class DateUtils {
    constructor() {
        this.dateFormat = 'YYYY-MM-DD';
        this.locale = 'vi-VN';
    }

    /**
     * Định dạng ngày thành chuỗi YYYY-MM-DD
     */
    formatDate(date) {
        if (!date) return '';
        
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    /**
     * Định dạng ngày hiển thị cho người dùng (DD/MM/YYYY)
     */
    formatDisplayDate(date) {
        if (!date) return '';
        
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        return `${day}/${month}/${year}`;
    }

    /**
     * Lấy ngày hôm nay
     */
    getToday() {
        return this.formatDate(new Date());
    }

    /**
     * Lấy ngày hôm qua
     */
    getYesterday() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return this.formatDate(yesterday);
    }

    /**
     * Lấy ngày đầu tháng
     */
    getFirstDayOfMonth(date = new Date()) {
        const d = new Date(date);
        return this.formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }

    /**
     * Lấy ngày cuối tháng
     */
    getLastDayOfMonth(date = new Date()) {
        const d = new Date(date);
        return this.formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    }

    /**
     * Lấy ngày trước đó N ngày
     */
    getPreviousDays(date, days = 1) {
        const d = new Date(date);
        d.setDate(d.getDate() - days);
        return this.formatDate(d);
    }

    /**
     * Lấy ngày kế tiếp N ngày
     */
    getNextDays(date, days = 1) {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return this.formatDate(d);
    }

    /**
     * Lấy ngày trước đó (dùng cho số dư đầu kỳ)
     */
    getPreviousDay(date) {
        return this.getPreviousDays(date, 1);
    }

    /**
     * Kiểm tra ngày có hợp lệ để báo cáo không
     */
    isValidReportDate(date) {
        const selectedDate = new Date(date);
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        // Không cho phép chọn ngày tương lai
        if (selectedDate > today) {
            return false;
        }

        // Cho phép chọn tối đa 1 năm trước
        if (selectedDate < oneYearAgo) {
            return false;
        }

        return true;
    }

    /**
     * Tạo range ngày cho bộ lọc 20N-19N+1
     */
    get20N19NRange(date = new Date()) {
        const baseDate = new Date(date);
        const startDate = new Date(baseDate);
        startDate.setDate(startDate.getDate() - 20);
        
        const endDate = new Date(baseDate);
        endDate.setDate(endDate.getDate() + 19);
        
        return {
            start: this.formatDate(startDate),
            end: this.formatDate(endDate)
        };
    }

    /**
     * Lấy tất cả các ngày trong khoảng thời gian
     */
    getDatesInRange(startDate, endDate) {
        const dates = [];
        const currentDate = new Date(startDate);
        const end = new Date(endDate);

        while (currentDate <= end) {
            dates.push(this.formatDate(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    }

    /**
     * Tính số ngày giữa hai ngày
     */
    getDaysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Kiểm tra xem một ngày có phải là ngày cuối tuần không
     */
    isWeekend(date) {
        const d = new Date(date);
        const day = d.getDay();
        return day === 0 || day === 6; // 0 = Chủ Nhật, 6 = Thứ Bảy
    }

    /**
     * Lấy thứ trong tuần (tiếng Việt)
     */
    getVietnameseDayOfWeek(date) {
        const days = [
            'Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 
            'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'
        ];
        const d = new Date(date);
        return days[d.getDay()];
    }

    /**
     * Lấy tên tháng (tiếng Việt)
     */
    getVietnameseMonth(date) {
        const months = [
            'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
            'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
        ];
        const d = new Date(date);
        return months[d.getMonth()];
    }

    /**
     * Tạo danh sách ngày trong tháng cho lịch nhân viên
     */
    getMonthCalendar(year, month) {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const daysInMonth = lastDay.getDate();
        
        const calendar = [];
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            calendar.push({
                date: this.formatDate(date),
                day: day,
                dayOfWeek: date.getDay(),
                isWeekend: this.isWeekend(date),
                display: this.formatDisplayDate(date)
            });
        }
        
        return calendar;
    }

    /**
     * So sánh hai ngày (bỏ qua thời gian)
     */
    isSameDate(date1, date2) {
        if (!date1 || !date2) return false;
        return this.formatDate(date1) === this.formatDate(date2);
    }

    /**
     * Kiểm tra xem ngày có nằm trong range không
     */
    isDateInRange(date, startDate, endDate) {
        const d = new Date(date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return d >= start && d <= end;
    }

    /**
     * Lấy tuần của tháng
     */
    getWeekOfMonth(date) {
        const d = new Date(date);
        const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
        return Math.ceil((d.getDate() + firstDay) / 7);
    }

    /**
     * Tạo options cho dropdown chọn tháng
     */
    getMonthOptions(monthsBack = 12) {
        const options = [];
        const today = new Date();
        
        for (let i = monthsBack; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = `${this.getVietnameseMonth(date)} ${date.getFullYear()}`;
            
            options.push({ value, label });
        }
        
        return options;
    }

    /**
     * Tạo options cho dropdown chọn ngày
     */
    getDateOptions(daysBack = 30) {
        const options = [];
        const today = new Date();
        
        for (let i = daysBack; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            
            const value = this.formatDate(date);
            const label = `${this.formatDisplayDate(date)} (${this.getVietnameseDayOfWeek(date)})`;
            
            options.push({ value, label });
        }
        
        return options;
    }

    /**
     * Validate định dạng ngày YYYY-MM-DD
     */
    isValidDateFormat(dateString) {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * Chuyển đổi từ string sang Date object
     */
    parseDate(dateString) {
        if (!this.isValidDateFormat(dateString)) {
            throw new Error('Định dạng ngày không hợp lệ. Sử dụng YYYY-MM-DD');
        }
        
        const parts = dateString.split('-');
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    /**
     * Lấy thông tin chi tiết về một ngày
     */
    getDateInfo(date) {
        const d = new Date(date);
        return {
            date: this.formatDate(d),
            displayDate: this.formatDisplayDate(d),
            dayOfWeek: this.getVietnameseDayOfWeek(d),
            month: this.getVietnameseMonth(d),
            year: d.getFullYear(),
            isWeekend: this.isWeekend(d),
            weekOfMonth: this.getWeekOfMonth(d),
            isToday: this.isSameDate(d, new Date())
        };
    }
}

// Tạo instance toàn cục
const dateUtils = new DateUtils();