// Development utilities for cache clearing and debugging

export const clearWorkerCache = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Clearing worker cache in development mode...');
    
    // Clear any cached workers
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('worker') || cacheName.includes('engine')) {
            caches.delete(cacheName);
            console.log('Cleared cache:', cacheName);
          }
        });
      });
    }
    
    // Force a hard reload after cache clear
    setTimeout(() => {
      console.log('Hard reloading to ensure fresh worker...');
      window.location.reload(true);
    }, 100);
  }
};

export const getWorkerDebugInfo = () => {
  return {
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
    userAgent: navigator.userAgent,
    workerSupport: typeof Worker !== 'undefined',
    cacheSupport: 'caches' in window,
    serviceWorkerSupport: 'serviceWorker' in navigator
  };
};

export const logWorkerDebugInfo = () => {
  const info = getWorkerDebugInfo();
  console.log('Worker Debug Info:', info);
  return info;
};