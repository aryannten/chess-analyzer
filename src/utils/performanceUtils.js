/**
 * Performance optimization utilities
 */

/**
 * Memoize function results to avoid redundant calculations
 * @param {Function} fn - Function to memoize
 * @param {Function} keyGenerator - Function to generate cache key
 * @returns {Function} - Memoized function
 */
export const memoize = (fn, keyGenerator = (...args) => JSON.stringify(args)) => {
  const cache = new Map();
  
  return (...args) => {
    const key = keyGenerator(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 1000) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
};

/**
 * Debounce function calls to limit execution frequency
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (fn, delay) => {
  let timeoutId;
  
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

/**
 * Throttle function calls to limit execution frequency
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export const throttle = (fn, limit) => {
  let inThrottle;
  
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Create a performance monitor for measuring function execution time
 * @param {string} name - Name of the operation being monitored
 * @returns {Object} - Performance monitor object
 */
export const createPerformanceMonitor = (name) => {
  const startTime = performance.now();
  
  return {
    end: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      return duration;
    }
  };
};

/**
 * Batch DOM updates to improve performance
 * @param {Function} updateFn - Function containing DOM updates
 */
export const batchDOMUpdates = (updateFn) => {
  requestAnimationFrame(() => {
    updateFn();
  });
};

/**
 * Create a simple LRU cache
 * @param {number} maxSize - Maximum cache size
 * @returns {Object} - LRU cache object
 */
export const createLRUCache = (maxSize = 100) => {
  const cache = new Map();
  
  return {
    get: (key) => {
      if (cache.has(key)) {
        // Move to end (most recently used)
        const value = cache.get(key);
        cache.delete(key);
        cache.set(key, value);
        return value;
      }
      return undefined;
    },
    
    set: (key, value) => {
      if (cache.has(key)) {
        cache.delete(key);
      } else if (cache.size >= maxSize) {
        // Remove least recently used (first item)
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(key, value);
    },
    
    clear: () => cache.clear(),
    
    size: () => cache.size
  };
};

/**
 * Optimize array operations for better performance
 */
export const arrayUtils = {
  /**
   * Efficiently remove duplicates from array
   * @param {Array} arr - Input array
   * @param {Function} keyFn - Function to extract key for comparison
   * @returns {Array} - Array with duplicates removed
   */
  unique: (arr, keyFn = x => x) => {
    const seen = new Set();
    return arr.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  },
  
  /**
   * Efficiently group array items by key
   * @param {Array} arr - Input array
   * @param {Function} keyFn - Function to extract grouping key
   * @returns {Object} - Grouped items
   */
  groupBy: (arr, keyFn) => {
    return arr.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {});
  }
};

/**
 * Memory management utilities
 */
export const memoryUtils = {
  /**
   * Check if we're approaching memory limits
   * @returns {boolean} - True if memory usage is high
   */
  isMemoryHigh: () => {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const total = performance.memory.totalJSHeapSize;
      return (used / total) > 0.8; // 80% threshold
    }
    return false;
  },
  
  /**
   * Force garbage collection if available
   */
  forceGC: () => {
    if (window.gc) {
      window.gc();
    }
  },
  
  /**
   * Monitor memory usage
   * @returns {Object} - Memory usage information
   */
  getMemoryInfo: () => {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }
};
