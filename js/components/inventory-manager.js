/**
 * InventoryManager - Quản lý kho hàng
 */

class InventoryManager {
    constructor() {
        this.inventory = [];
        this.isLoading = false;
    }

    /**
     * Load inventory từ database
     */
    async loadInventory() {
        try {
            this.inventory = await dbManager.getAll('inventory');
            return this.inventory;
        } catch (error) {
            console.error('Lỗi load inventory:', error);
            return [];
        }
    }

    /**
     * Lấy thông tin sản phẩm theo ID
     */
    getProductById(productId) {
        return this.inventory.find(item => item.id === productId);
    }

    /**
     * Lấy sản phẩm theo tên
     */
    getProductByName(productName) {
        return this.inventory.find(item => 
            item.name.toLowerCase() === productName.toLowerCase()
        );
    }

    /**
     * Cập nhật số lượng tồn kho
     */
    async updateStock(productId, quantityChange) {
        try {
            const product = this.getProductById(productId);
            if (!product) {
                throw new Error('Không tìm thấy sản phẩm');
            }

            const newStock = product.current_stock + quantityChange;
            
            if (newStock < 0) {
                throw new Error('Số lượng tồn kho không thể âm');
            }

            product.current_stock = newStock;
            product.updated_at = new Date().toISOString();

            await dbManager.update('inventory', product);
            
            // Cập nhật trong cache
            const index = this.inventory.findIndex(item => item.id === productId);
            if (index !== -1) {
                this.inventory[index] = product;
            }

            return product;
        } catch (error) {
            console.error('Lỗi cập nhật tồn kho:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra số lượng tồn kho
     */
    checkStockAvailability(productId, requiredQuantity) {
        const product = this.getProductById(productId);
        if (!product) {
            return {
                available: false,
                message: 'Không tìm thấy sản phẩm'
            };
        }

        if (product.current_stock < requiredQuantity) {
            return {
                available: false,
                message: `Chỉ còn ${product.current_stock} ${product.unit} trong kho`
            };
        }

        return {
            available: true,
            message: 'Đủ số lượng'
        };
    }

    /**
     * Thêm sản phẩm mới
     */
    async addProduct(productData) {
        try {
            // Validate dữ liệu
            const validation = this.validateProduct(productData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Kiểm tra trùng tên
            const existingProduct = this.getProductByName(productData.name);
            if (existingProduct) {
                throw new Error(`Sản phẩm "${productData.name}" đã tồn tại`);
            }

            const newProduct = {
                id: formatter.generateId('inv'),
                name: productData.name.trim(),
                current_stock: productData.current_stock || 0,
                unit: productData.unit.trim(),
                unit_price: productData.unit_price,
                category: productData.category || null,
                min_stock: productData.min_stock || 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            await dbManager.add('inventory', newProduct);
            this.inventory.push(newProduct);

            return newProduct;
        } catch (error) {
            console.error('Lỗi thêm sản phẩm:', error);
            throw error;
        }
    }

    /**
     * Cập nhật sản phẩm
     */
    async updateProduct(productId, updateData) {
        try {
            const product = this.getProductById(productId);
            if (!product) {
                throw new Error('Không tìm thấy sản phẩm');
            }

            // Validate dữ liệu
            const validation = this.validateProduct(updateData, true);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Cập nhật thông tin
            Object.assign(product, updateData);
            product.updated_at = new Date().toISOString();

            await dbManager.update('inventory', product);
            
            // Cập nhật trong cache
            const index = this.inventory.findIndex(item => item.id === productId);
            if (index !== -1) {
                this.inventory[index] = product;
            }

            return product;
        } catch (error) {
            console.error('Lỗi cập nhật sản phẩm:', error);
            throw error;
        }
    }

    /**
     * Xóa sản phẩm
     */
    async deleteProduct(productId) {
        try {
            const product = this.getProductById(productId);
            if (!product) {
                throw new Error('Không tìm thấy sản phẩm');
            }

            if (product.current_stock > 0) {
                throw new Error('Không thể xóa sản phẩm còn tồn kho');
            }

            await dbManager.delete('inventory', productId);
            
            // Xóa khỏi cache
            this.inventory = this.inventory.filter(item => item.id !== productId);

            return true;
        } catch (error) {
            console.error('Lỗi xóa sản phẩm:', error);
            throw error;
        }
    }

    /**
     * Validate dữ liệu sản phẩm
     */
    validateProduct(productData, isUpdate = false) {
        const errors = [];
        
        if (!isUpdate || productData.name !== undefined) {
            if (!productData.name || productData.name.trim() === '') {
                errors.push('Tên sản phẩm không được để trống');
            }
        }
        
        if (!isUpdate || productData.unit !== undefined) {
            if (!productData.unit || productData.unit.trim() === '') {
                errors.push('Đơn vị tính không được để trống');
            }
        }
        
        if (!isUpdate || productData.unit_price !== undefined) {
            if (!productData.unit_price || productData.unit_price <= 0) {
                errors.push('Đơn giá phải lớn hơn 0');
            }
        }
        
        if (!isUpdate || productData.current_stock !== undefined) {
            if (productData.current_stock < 0) {
                errors.push('Số lượng tồn kho không được âm');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Lấy sản phẩm sắp hết hàng
     */
    getLowStockProducts(threshold = 10) {
        return this.inventory.filter(item => 
            item.current_stock <= threshold && item.current_stock > 0
        );
    }

    /**
     * Lấy sản phẩm hết hàng
     */
    getOutOfStockProducts() {
        return this.inventory.filter(item => item.current_stock === 0);
    }

    /**
     * Tính tổng giá trị tồn kho
     */
    calculateTotalInventoryValue() {
        return this.inventory.reduce((total, item) => {
            return total + (item.current_stock * item.unit_price);
        }, 0);
    }

    /**
     * Tìm kiếm sản phẩm
     */
    searchProducts(keyword) {
        if (!keyword) return this.inventory;
        
        const searchTerm = keyword.toLowerCase();
        return this.inventory.filter(item =>
            item.name.toLowerCase().includes(searchTerm) ||
            (item.category && item.category.toLowerCase().includes(searchTerm))
        );
    }

    /**
     * Lấy thống kê tồn kho
     */
    getInventoryStats() {
        const totalProducts = this.inventory.length;
        const totalValue = this.calculateTotalInventoryValue();
        const lowStockCount = this.getLowStockProducts().length;
        const outOfStockCount = this.getOutOfStockProducts().length;

        return {
            totalProducts,
            totalValue,
            lowStockCount,
            outOfStockCount,
            inStockCount: totalProducts - outOfStockCount
        };
    }
/**
 * Lấy toàn bộ inventory
 */
getInventory() {
    return this.inventory || [];
}
    /**
     * Export dữ liệu tồn kho
     */
    exportInventory() {
        return this.inventory.map(item => ({
            'Tên sản phẩm': item.name,
            'Tồn kho': item.current_stock,
            'Đơn vị': item.unit,
            'Đơn giá': item.unit_price,
            'Thành tiền': item.current_stock * item.unit_price,
            'Danh mục': item.category || 'Khác'
        }));
    }
}

const inventoryManager = new InventoryManager();