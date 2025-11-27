/**
 * Calculator - Xử lý các tính toán tài chính cho hệ thống
 */

class Calculator {
    constructor() {
        this.workingDaysPerMonth = 30; // Mặc định tính lương theo 30 ngày
    }

    /**
     * Tính thực lãnh từ báo cáo ngày
     */
    calculateActualProfit(reportData) {
        const {
            opening_balance,
            revenue,
            expenses,
            transfers,
            closing_balance
        } = reportData;

        const totalExpenses = this.calculateTotalExpenses(expenses);
        const totalTransfers = this.calculateTotalTransfers(transfers);

        return opening_balance + revenue - totalExpenses - totalTransfers - closing_balance;
    }

    /**
     * Tính tổng chi phí
     */
    calculateTotalExpenses(expenses) {
        if (!expenses || !Array.isArray(expenses)) return 0;
        return expenses.reduce((total, expense) => total + (Number(expense.amount) || 0), 0);
    }

    /**
     * Tính tổng chuyển khoản
     */
    calculateTotalTransfers(transfers) {
        if (!transfers || !Array.isArray(transfers)) return 0;
        return transfers.reduce((total, transfer) => total + (Number(transfer.amount) || 0), 0);
    }

    /**
     * Tính lương nhân viên
     */
    calculateEmployeeSalary(employeeData, attendanceData) {
        const {
            basic_salary,
            off_days = 0,
            overtime_days = 0,
            bonus = 0,
            penalty = 0
        } = employeeData;

        const dailySalary = basic_salary / this.workingDaysPerMonth;
        
        let salary = basic_salary;
        
        // Trừ lương ngày off
        salary -= off_days * dailySalary;
        
        // Cộng lương tăng ca (1.5 lần lương ngày)
        salary += overtime_days * dailySalary * 1.5;
        
        // Thưởng/phạt
        salary += bonus - penalty;

        return Math.max(0, salary); // Đảm bảo lương không âm
    }

    /**
     * Tính lợi nhuận ròng
     */
    calculateNetProfit(financialData) {
        const {
            total_revenue,
            total_daily_expenses,
            total_operation_costs,
            total_salaries,
            total_transfers
        } = financialData;

        return total_revenue - total_daily_expenses - total_operation_costs - total_salaries;
    }

    /**
     * Tính tỷ suất lợi nhuận
     */
    calculateProfitMargin(netProfit, totalRevenue) {
        if (!totalRevenue || totalRevenue === 0) return 0;
        return (netProfit / totalRevenue) * 100;
    }

    /**
     * Tính số dư đầu kỳ tự động
     */
    calculateOpeningBalance(selectedDate, previousReports) {
        if (!selectedDate) return 0;

        const previousDay = dateUtils.getPreviousDay(selectedDate);
        
        // Tìm báo cáo ngày trước đó
        const previousReport = previousReports.find(report => 
            report.date === previousDay
        );

        if (previousReport && previousReport.closing_balance !== null) {
            return previousReport.closing_balance;
        }

        // Nếu không có báo cáo ngày trước, tìm báo cáo gần nhất
        const sortedReports = previousReports
            .filter(report => report.date < selectedDate && report.closing_balance !== null)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        return sortedReports.length > 0 ? sortedReports[0].closing_balance : 0;
    }

    /**
     * Tính tổng doanh thu theo khoảng thời gian
     */
    calculateTotalRevenue(reports, startDate, endDate) {
        const filteredReports = reports.filter(report => 
            dateUtils.isDateInRange(report.date, startDate, endDate)
        );
        
        return filteredReports.reduce((total, report) => total + (report.revenue || 0), 0);
    }

    /**
     * Tính tổng chi phí báo cáo ngày
     */
    calculateTotalDailyExpenses(reports, startDate, endDate) {
        const filteredReports = reports.filter(report => 
            dateUtils.isDateInRange(report.date, startDate, endDate)
        );
        
        return filteredReports.reduce((total, report) => {
            const reportExpenses = this.calculateTotalExpenses(report.expenses);
            return total + reportExpenses;
        }, 0);
    }

    /**
     * Tính tổng chuyển khoản
     */
    calculateTotalTransfersPeriod(reports, startDate, endDate) {
        const filteredReports = reports.filter(report => 
            dateUtils.isDateInRange(report.date, startDate, endDate)
        );
        
        return filteredReports.reduce((total, report) => {
            const reportTransfers = this.calculateTotalTransfers(report.transfers);
            return total + reportTransfers;
        }, 0);
    }

    /**
     * Tính giá vốn hàng bán (COGS)
     */
    calculateCOGS(inventoryUsage, inventoryPrices) {
        if (!inventoryUsage || !Array.isArray(inventoryUsage)) return 0;
        
        return inventoryUsage.reduce((total, usage) => {
            const productPrice = inventoryPrices[usage.product_id] || 0;
            return total + (usage.quantity * productPrice);
        }, 0);
    }

    /**
     * Tính hiệu quả kinh doanh
     */
    calculateBusinessEfficiency(financialData) {
        const {
            net_profit,
            total_revenue,
            total_costs
        } = financialData;

        const profitMargin = this.calculateProfitMargin(net_profit, total_revenue);
        const costRatio = total_costs / total_revenue * 100;
        const efficiency = profitMargin / costRatio * 100;

        return {
            profitMargin,
            costRatio,
            efficiency: isNaN(efficiency) ? 0 : efficiency
        };
    }

    /**
     * Validate số tiền
     */
    validateAmount(amount) {
        if (amount === null || amount === undefined) return false;
        
        const num = Number(amount);
        return !isNaN(num) && num >= 0;
    }

    /**
     * Validate số lượng
     */
    validateQuantity(quantity) {
        if (quantity === null || quantity === undefined) return false;
        
        const num = Number(quantity);
        return !isNaN(num) && num >= 0 && Number.isInteger(num);
    }

    /**
     * Tính toán hiệu ứng cánh bướm khi sửa báo cáo
     */
    calculateButterflyEffect(updatedReport, subsequentReports) {
        const effects = [];
        
        subsequentReports.forEach((report, index) => {
            const previousReport = index === 0 ? updatedReport : subsequentReports[index - 1];
            
            // Cập nhật số dư đầu kỳ = số dư cuối kỳ ngày trước
            const newOpeningBalance = previousReport.closing_balance;
            const newActualProfit = this.calculateActualProfit({
                ...report,
                opening_balance: newOpeningBalance
            });

            effects.push({
                date: report.date,
                changes: {
                    opening_balance: newOpeningBalance,
                    actual_profit: newActualProfit
                }
            });
        });

        return effects;
    }

    /**
     * Tính lương theo ngày công thực tế
     */
    calculateSalaryByWorkingDays(basicSalary, actualWorkingDays, totalWorkingDays = this.workingDaysPerMonth) {
        const dailySalary = basicSalary / totalWorkingDays;
        return dailySalary * actualWorkingDays;
    }

    /**
     * Tính phần trăm tăng trưởng
     */
    calculateGrowthPercentage(currentValue, previousValue) {
        if (!previousValue || previousValue === 0) return 0;
        return ((currentValue - previousValue) / previousValue) * 100;
    }
}

const calculator = new Calculator();
