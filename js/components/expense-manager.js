/**
 * ExpenseManager - Quản lý chi phí và categories
 */

class ExpenseManager {
    constructor() {
        this.categories = [];
        this.isLoading = false;
    }

    /**
     * Load categories từ database
     */
    async loadCategories() {
        try {
            this.categories = await dbManager.getAll('expense_categories');
            return this.categories;
        } catch (error) {
            console.error('Lỗi load categories:', error);
            return [];
        }
    }

    /**
     * Lấy gợi ý categories dựa trên input
     */
    getSuggestions(inputText, limit = 5) {
        if (!inputText || inputText.length < 2) {
            return [];
        }

        const searchTerm = inputText.toLowerCase();
        
        // Tìm categories phù hợp
        const matchedCategories = this.categories.filter(category =>
            category.name.toLowerCase().includes(searchTerm)
        );

        // Sắp xếp theo usage_count (tần suất sử dụng)
        return matchedCategories
            .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
            .slice(0, limit)
            .map(category => category.name);
    }

    /**
     * Thêm hoặc cập nhật category
     */
    async addOrUpdateCategory(categoryName) {
        if (!categoryName || categoryName.trim() === '') {
            return null;
        }

        const name = categoryName.trim();
        
        // Tìm category đã tồn tại
        let existingCategory = this.categories.find(cat => 
            cat.name.toLowerCase() === name.toLowerCase()
        );

        try {
            if (existingCategory) {
                // Cập nhật category đã tồn tại
                existingCategory.usage_count = (existingCategory.usage_count || 0) + 1;
                existingCategory.last_used = dateUtils.getToday();
                existingCategory.updated_at = new Date().toISOString();
                
                await dbManager.update('expense_categories', existingCategory);
                return existingCategory;
            } else {
                // Tạo category mới
                const newCategory = {
                    id: formatter.generateId('cat'),
                    name: name,
                    usage_count: 1,
                    last_used: dateUtils.getToday(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                await dbManager.add('expense_categories', newCategory);
                this.categories.push(newCategory);
                return newCategory;
            }
        } catch (error) {
            console.error('Lỗi lưu category:', error);
            return null;
        }
    }

    /**
     * Tạo dropdown categories
     */
    renderCategoriesDropdown(container, onSelectCallback) {
        if (!container) return;

        container.innerHTML = this.categories
            .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
            .map(category => `
                <option value="${category.name}">
                    ${category.name} (${category.usage_count || 0})
                </option>
            `).join('');
    }

    /**
     * Phân tích và gợi ý category tự động
     */
    suggestCategory(expenseContent) {
        if (!expenseContent) return null;

        const content = expenseContent.toLowerCase();
        const categoryKeywords = {
            'cafe': ['cafe', 'cà phê', 'trà', 'nước'],
            'ăn uống': ['ăn', 'uống', 'cơm', 'bún', 'phở', 'cháo'],
            'điện thoại': ['điện thoại', 'topup', 'thẻ', 'sim'],
            'văn phòng phẩm': ['giấy', 'bút', 'vpp', 'văn phòng'],
            'di chuyển': ['xăng', 'xe', 'grab', 'taxi', 'bus'],
            'bảo trì': ['sửa', 'bảo trì', 'bảo dưỡng', 'thay thế']
        };

        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => content.includes(keyword))) {
                return category;
            }
        }

        return null;
    }

    /**
     * Lấy thống kê chi phí theo category
     */
    async getExpenseStats(startDate, endDate) {
        try {
            const reports = await dbManager.getAll('daily_reports');
            const filteredReports = reports.filter(report => 
                dateUtils.isDateInRange(report.date, startDate, endDate)
            );

            const stats = {};
            
            filteredReports.forEach(report => {
                if (report.expenses && Array.isArray(report.expenses)) {
                    report.expenses.forEach(expense => {
                        const category = this.suggestCategory(expense.content) || 'khác';
                        
                        if (!stats[category]) {
                            stats[category] = {
                                total: 0,
                                count: 0,
                                average: 0
                            };
                        }
                        
                        stats[category].total += expense.amount;
                        stats[category].count += 1;
                    });
                }
            });

            // Tính average
            Object.keys(stats).forEach(category => {
                stats[category].average = stats[category].total / stats[category].count;
            });

            return stats;
        } catch (error) {
            console.error('Lỗi tính thống kê chi phí:', error);
            return {};
        }
    }

    /**
     * Validate chi phí
     */
    validateExpense(expense) {
        const errors = [];
        
        if (!expense.content || expense.content.trim() === '') {
            errors.push('Nội dung chi phí không được để trống');
        }
        
        if (!expense.amount || expense.amount <= 0) {
            errors.push('Số tiền chi phí phải lớn hơn 0');
        }
        
        if (expense.amount > 100000000) { // 100 triệu
            errors.push('Số tiền chi phí quá lớn');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Format chi phí để hiển thị
     */
    formatExpenseForDisplay(expense) {
        return {
            content: expense.content,
            amount: formatter.formatCurrency(expense.amount),
            category: this.suggestCategory(expense.content) || 'Khác',
            date: expense.date || dateUtils.getToday()
        };
    }
}

const expenseManager = new ExpenseManager();