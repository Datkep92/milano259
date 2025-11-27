/**
 * ZaloIntegration - Xử lý tích hợp gửi báo cáo qua Zalo
 */

class ZaloIntegration {
    constructor() {
        this.zaloDeepLink = 'zalo://';
    }

    /**
     * Tạo nội dung báo cáo ngày
     */
    createDailyReportContent(reportData, inventoryData = []) {
        const {
            date,
            opening_balance,
            revenue,
            expenses,
            transfers,
            closing_balance,
            actual_profit
        } = reportData;

        let content = `📊 BÁO CÁO NGÀY ${dateUtils.formatDisplayDate(date)}\n\n`;
        
        content += `💰 Số dư đầu kỳ: ${formatter.formatCurrency(opening_balance)}\n`;
        content += `📈 Doanh thu: ${formatter.formatCurrency(revenue)}\n`;
        content += `💸 Chi phí: ${formatter.formatCurrency(this.calculateTotalExpenses(expenses))}\n`;
        content += `🏦 Chuyển khoản: ${formatter.formatCurrency(this.calculateTotalTransfers(transfers))}\n`;
        content += `💰 Số dư cuối kỳ: ${formatter.formatCurrency(closing_balance)}\n`;
        content += `🎯 Thực lãnh: ${formatter.formatCurrency(actual_profit)}\n\n`;

        // Chi tiết chi phí
        if (expenses && expenses.length > 0) {
            content += `📋 Chi tiết chi phí:\n`;
            expenses.forEach(expense => {
                content += `• ${expense.content}: ${formatter.formatCurrency(expense.amount)}\n`;
            });
            content += `\n`;
        }

        // Xuất kho
        if (inventoryData && inventoryData.length > 0) {
            content += `📦 Xuất kho:\n`;
            inventoryData.forEach(item => {
                content += `• ${item.product_name}: ${item.quantity}\n`;
            });
        }

        return content;
    }

    /**
     * Tính tổng chi phí
     */
    calculateTotalExpenses(expenses) {
        if (!expenses || !Array.isArray(expenses)) return 0;
        return expenses.reduce((total, expense) => total + (expense.amount || 0), 0);
    }

    /**
     * Tính tổng chuyển khoản
     */
    calculateTotalTransfers(transfers) {
        if (!transfers || !Array.isArray(transfers)) return 0;
        return transfers.reduce((total, transfer) => total + (transfer.amount || 0), 0);
    }

    /**
     * Copy nội dung vào clipboard
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback cho các trình duyệt cũ
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            }
        } catch (err) {
            console.error('Lỗi copy clipboard:', err);
            return false;
        }
    }

    /**
     * Mở Zalo và gửi tin nhắn
     */
    async sendToZalo(reportData, inventoryData = []) {
        try {
            // Tạo nội dung báo cáo
            const reportContent = this.createDailyReportContent(reportData, inventoryData);
            
            // Copy vào clipboard
            const copySuccess = await this.copyToClipboard(reportContent);
            
            if (!copySuccess) {
                throw new Error('Không thể copy nội dung vào clipboard');
            }

            // Mở Zalo
            this.openZalo();
            
            // Hiển thị thông báo
            this.showNotification('Đã copy báo cáo vào clipboard. Mở Zalo và paste để gửi!', 'success');
            
            return true;
        } catch (error) {
            console.error('Lỗi gửi Zalo:', error);
            this.showNotification('Lỗi khi gửi báo cáo: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * Mở ứng dụng Zalo
     */
    openZalo() {
        // Thử mở ứng dụng Zalo
        window.location.href = this.zaloDeepLink;
        
        // Fallback: sau 2 giây, mở web Zalo nếu ứng dụng không mở được
        setTimeout(() => {
            window.open('https://zalo.me', '_blank');
        }, 2000);
    }

    /**
     * Hiển thị thông báo
     */
    showNotification(message, type = 'info') {
        // Tạo thông báo tạm thời
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Thêm CSS cho notification
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    z-index: 10000;
                    min-width: 300px;
                    max-width: 500px;
                    animation: slideIn 0.3s ease;
                }
                .notification-success { border-left: 4px solid #28a745; }
                .notification-error { border-left: 4px solid #dc3545; }
                .notification-info { border-left: 4px solid #17a2b8; }
                .notification-content {
                    padding: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    color: #6c757d;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Tự động xóa sau 5 giây
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        // Cho phép đóng thủ công
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    /**
     * Tạo nội dung báo cáo tổng quan tháng
     */
    createMonthlyReportContent(monthlyData) {
        const {
            month,
            total_revenue,
            total_expenses,
            total_operation_costs,
            total_salaries,
            net_profit
        } = monthlyData;

        let content = `📈 BÁO CÁO TỔNG QUAN ${dateUtils.getVietnameseMonth(month)} ${new Date(month).getFullYear()}\n\n`;
        
        content += `💰 Tổng doanh thu: ${formatter.formatCurrency(total_revenue)}\n`;
        content += `💸 Chi phí báo cáo: ${formatter.formatCurrency(total_expenses)}\n`;
        content += `🏪 Chi phí vận hành: ${formatter.formatCurrency(total_operation_costs)}\n`;
        content += `👥 Chi phí lương: ${formatter.formatCurrency(total_salaries)}\n`;
        content += `🎯 Lợi nhuận ròng: ${formatter.formatCurrency(net_profit)}\n\n`;
        
        content += `Tỷ suất lợi nhuận: ${formatter.formatPercent((net_profit / total_revenue) * 100)}`;

        return content;
    }
}

const zaloIntegration = new ZaloIntegration();/**
 * ZaloIntegration - Xử lý tích hợp gửi báo cáo qua Zalo
 */



