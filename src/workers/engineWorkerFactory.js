export const createEngineWorker = () => {
  console.log('Creating engine worker...');
  
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  console.log('Environment:', isDevelopment ? 'development' : 'production');
  
  // Enhanced cache-busting with multiple strategies
  const cacheBuster = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const buildId = Date.now();
  let workerUrl = `/ChessEngineWorker.js?v=${cacheBuster}&build=${buildId}&nocache=true`;
  
  // In development, add additional parameters and session ID to prevent caching
  if (isDevelopment) {
    const sessionId = sessionStorage.getItem('worker-session-id') || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('worker-session-id', sessionId);
    workerUrl += `&dev=true&session=${sessionId}&ts=${performance.now()}`;
    console.log('Development mode: Enhanced cache-busting applied with session ID');
  }
  
  try {
    // Try to use fetch with no-cache to get a fresh copy in development
    if (isDevelopment && typeof fetch !== 'undefined') {
      console.log('Development: Fetching worker with no-cache headers...');
      
      // Fetch the worker script with no-cache
      fetch(workerUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch worker: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          const worker = new Worker(blobUrl);
          console.log('Successfully created worker from fresh blob (cache bypassed)');
          // Clean up blob URL when worker terminates (optional, but good practice)
          worker.__blobUrl = blobUrl; // Store for cleanup if needed
        })
        .catch(fetchError => {
          console.warn('Fetch-based cache bypass failed, but worker should still work:', fetchError);
        });
    }
    
    // Always create worker synchronously as fallback
    // The fetch above is a best-effort async cache clear
    const worker = new Worker(workerUrl);
    console.log('Successfully created worker from public path with cache-busting:', workerUrl);
    return worker;
  } catch (publicError) {
    console.warn('Failed to create worker from public path:', publicError);
    
    try {
      // Fallback to module worker
      console.log('Attempting to create module worker...');
      const worker = new Worker(new URL('./ChessEngineWorker.js', import.meta.url), {
        type: 'module'
      });
      console.log('Successfully created module worker');
      return worker;
    } catch (moduleError) {
      console.warn('Failed to create module worker:', moduleError);
      
      try {
        // Last resort: classic worker with import.meta.url
        console.log('Attempting to create classic worker...');
        const worker = new Worker(new URL('./ChessEngineWorker.js', import.meta.url));
        console.log('Successfully created classic worker');
        return worker;
      } catch (classicError) {
        console.error('All worker creation methods failed:', classicError);
        return null;
      }
    }
  }
};
