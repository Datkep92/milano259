// cache.js - Cache management for Firebase
(function() {
    'use strict';
    
    const CACHE_VERSION = '1.0';
    const CACHE_PREFIX = 'cafe_cache_';
    const MAX_CACHE_ITEMS = 100;
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    // Cache storage
    const cache = {
        reports: {},
        inventory: {},
        employees: {},
        settings: {}
    };
    
    // Get cache key
    function getCacheKey(collection, key) {
        return `${CACHE_PREFIX}${CACHE_VERSION}_${collection}_${key}`;
    }
    
    // Check if cache is valid
    function isCacheValid(cacheData) {
        if (!cacheData || !cacheData.timestamp) return false;
        return Date.now() - cacheData.timestamp < CACHE_DURATION;
    }
    
    // Get from cache
    function getFromCache(collection, key) {
        try {
            const cacheKey = getCacheKey(collection, key);
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                const cacheData = JSON.parse(cached);
                if (isCacheValid(cacheData)) {
                    console.log(`📦 Lấy từ cache: ${collection}/${key}`);
                    return cacheData.data;
                } else {
                    // Remove expired cache
                    localStorage.removeItem(cacheKey);
                }
            }
        } catch (error) {
            console.warn('⚠️ Lỗi đọc cache:', error);
        }
        return null;
    }
    
    // Save to cache
    function saveToCache(collection, key, data) {
        try {
            const cacheKey = getCacheKey(collection, key);
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                version: CACHE_VERSION
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            console.log(`💾 Lưu vào cache: ${collection}/${key}`);
            
            // Clean up old cache items
            cleanupCache();
            
        } catch (error) {
            console.warn('⚠️ Lỗi lưu cache:', error);
        }
    }
    
    // Clear cache for specific collection
    function clearCache(collection = null) {
        try {
            if (collection) {
                // Clear specific collection
                const prefix = `${CACHE_PREFIX}${CACHE_VERSION}_${collection}_`;
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith(prefix)) {
                        localStorage.removeItem(key);
                    }
                }
                console.log(`🧹 Đã xóa cache: ${collection}`);
            } else {
                // Clear all cache
                const prefix = CACHE_PREFIX;
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith(prefix)) {
                        localStorage.removeItem(key);
                    }
                }
                console.log('🧹 Đã xóa toàn bộ cache');
            }
        } catch (error) {
            console.warn('⚠️ Lỗi xóa cache:', error);
        }
    }
    
    // Cleanup old cache items
    function cleanupCache() {
        try {
            const cacheItems = [];
            
            // Collect all cache items
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(CACHE_PREFIX)) {
                    try {
                        const cached = localStorage.getItem(key);
                        const cacheData = JSON.parse(cached);
                        cacheItems.push({
                            key: key,
                            timestamp: cacheData.timestamp || 0
                        });
                    } catch (e) {
                        // Remove invalid cache
                        localStorage.removeItem(key);
                    }
                }
            }
            
            // Sort by timestamp (oldest first)
            cacheItems.sort((a, b) => a.timestamp - b.timestamp);
            
            // Remove oldest items if over limit
            if (cacheItems.length > MAX_CACHE_ITEMS) {
                const toRemove = cacheItems.slice(0, cacheItems.length - MAX_CACHE_ITEMS);
                toRemove.forEach(item => {
                    localStorage.removeItem(item.key);
                });
                console.log(`🧹 Đã xóa ${toRemove.length} cache items cũ`);
            }
            
        } catch (error) {
            console.warn('⚠️ Lỗi cleanup cache:', error);
        }
    }
    
    // Batch cache operations
    const batchCache = {
        queue: [],
        timeout: null,
        BATCH_DELAY: 100, // 100ms delay
        
        add(collection, key, data) {
            this.queue.push({ collection, key, data });
            
            if (!this.timeout) {
                this.timeout = setTimeout(() => {
                    this.process();
                }, this.BATCH_DELAY);
            }
        },
        
        process() {
            const batch = [...this.queue];
            this.queue = [];
            this.timeout = null;
            
            batch.forEach(item => {
                saveToCache(item.collection, item.key, item.data);
            });
        }
    };
    
    // Export functions
    window.CacheManager = {
        get: getFromCache,
        set: saveToCache,
        setBatch: (collection, key, data) => batchCache.add(collection, key, data),
        clear: clearCache,
        isValid: isCacheValid
    };
    
    console.log('✅ cache.js đã load');
    
})();