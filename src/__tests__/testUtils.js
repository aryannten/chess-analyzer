/**
 * Test Utilities for Chess Engine Integration Tests
 * Provides common mocks, helpers, and test data
 */

// Mock Worker implementation for testing
export const createMockWorker = (behavior = 'normal') => {
  const worker = {
    postMessage: jest.fn(),
    terminate: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    onmessage: null,
    onerror: null
  };

  // Configure different behaviors for testing
  switch (behavior) {
    case 'fail-init':
      worker.postMessage.mockImplementation(() => {
        throw new Error('Worker initialization failed');
      });
      break;
    
    case 'timeout':
      worker.postMessage.mockImplementation(() => {
        // Simulate timeout by not responding
      });
      break;
    
    case 'crash':
      worker.postMessage.mockImplementation(() => {
        // Simulate worker crash
        if (worker.onerror) {
          worker.onerror(new Error('Worker crashed'));
        }
      });
      break;
    
    case 'invalid-response':
      worker.postMessage.mockImplementation(() => {
        if (worker.onmessage) {
          worker.onmessage({ data: { type: 'INVALID_RESPONSE' } });
        }
      });
      break;
    
    case 'slow':
      worker.postMessage.mockImplementation((message) => {
        setTimeout(() => {
          if (worker.onmessage && message.type === 'ANALYZE_POSITION') {
            worker.onmessage({
              data: {
                type: 'BEST_MOVE',
                move: 'e2e4',
                evaluation: '0.25',
                depth: 10,
                timestamp: Date.now()
              }
            });
          }
        }, 3000); // 3 second delay
      });
      break;
    
    default:
      // Normal behavior - simulate successful responses
      worker.postMessage.mockImplementation((message) => {
        setTimeout(() => {
          if (worker.onmessage) {
            switch (message.type) {
              case 'ANALYZE_POSITION':
                worker.onmessage({
                  data: {
                    type: 'BEST_MOVE',
                    move: 'e2e4',
                    evaluation: '0.25',
                    depth: message.depth || 10,
                    timestamp: Date.now()
                  }
                });
                worker.onmessage({
                  data: {
                    type: 'ANALYSIS_COMPLETE',
                    timestamp: Date.now()
                  }
                });
                break;
              
              case 'PING':
                worker.onmessage({
                  data: {
                    type: 'PONG',
                    ready: true,
                    timestamp: Date.now()
                  }
                });
                break;
              
              case 'GET_STATUS':
                worker.onmessage({
                  data: {
                    type: 'STATUS',
                    ready: true,
                    analyzing: false,
                    timestamp: Date.now()
                  }
                });
                break;
              
              case 'STOP_ANALYSIS':
                worker.onmessage({
                  data: {
                    type: 'ANALYSIS_STOPPED',
                    timestamp: Date.now()
                  }
                });
                break;
            }
          }
        }, 100);
      });
  }

  return worker;
};

// Test FEN positions for various scenarios
export const testPositions = {
  starting: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  afterE4: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  sicilian: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
  endgame: '8/8/8/8/8/8/4K3/4k3 w - - 0 1',
  checkmate: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
  stalemate: '8/8/8/8/8/5k2/5P2/5K2 b - - 0 1',
  invalid: 'invalid-fen-string',
  malformed: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP w KQkq - 0 1' // Missing rank
};

// Mock console for testing
export const createMockConsole = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
});

// Helper to wait for async operations
export const waitForAsync = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to simulate user interactions
export const simulateChessMove = async (user, from, to) => {
  const chessboard = document.querySelector('[data-testid="chessboard"]') ||
                    document.querySelector('.chessboard');
  
  if (chessboard) {
    // Simulate drag and drop or click sequence
    await user.click(chessboard);
    await waitForAsync(50);
    await user.click(chessboard);
  }
};

// Helper to check for error messages in the DOM
export const findErrorMessages = (screen) => {
  const errorSelectors = [
    /error/i,
    /failed/i,
    /invalid/i,
    /unavailable/i,
    /timeout/i,
    /crashed/i
  ];
  
  const errorElements = [];
  errorSelectors.forEach(selector => {
    const elements = screen.queryAllByText(selector);
    errorElements.push(...elements);
  });
  
  return errorElements;
};

// Helper to validate worker message format
export const validateWorkerMessage = (message) => {
  // Handle null/undefined messages
  if (!message || typeof message !== 'object') {
    return { valid: false, error: 'Invalid message object' };
  }

  const requiredFields = ['type', 'timestamp'];
  const hasRequiredFields = requiredFields.every(field => 
    message.hasOwnProperty(field)
  );
  
  if (!hasRequiredFields) {
    return { valid: false, error: 'Missing required fields' };
  }
  
  if (typeof message.timestamp !== 'number') {
    return { valid: false, error: 'Invalid timestamp type' };
  }
  
  // Validate specific message types
  switch (message.type) {
    case 'BEST_MOVE':
      const moveFields = ['move', 'evaluation', 'depth'];
      const hasMoveFields = moveFields.every(field => 
        message.hasOwnProperty(field)
      );
      if (!hasMoveFields) {
        return { valid: false, error: 'Missing BEST_MOVE fields' };
      }
      
      // Validate move format (basic)
      if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(message.move)) {
        return { valid: false, error: 'Invalid move format' };
      }
      break;
    
    case 'ENGINE_ERROR':
      if (!message.hasOwnProperty('error')) {
        return { valid: false, error: 'Missing error field' };
      }
      break;
  }
  
  return { valid: true };
};

// Helper to create test scenarios
export const createTestScenario = (name, setup, expectations) => ({
  name,
  setup,
  expectations,
  async run() {
    await setup();
    for (const expectation of expectations) {
      await expectation();
    }
  }
});

// Performance testing helpers
export const measurePerformance = async (operation) => {
  const start = performance.now();
  await operation();
  const end = performance.now();
  return end - start;
};

// Memory usage helpers (simplified)
export const simulateMemoryPressure = () => {
  const largeArray = new Array(100000).fill('memory-pressure-test');
  return () => {
    largeArray.length = 0;
  };
};

// Network simulation helpers
export const simulateNetworkConditions = (condition) => {
  switch (condition) {
    case 'slow':
      return (callback) => setTimeout(callback, 2000);
    case 'timeout':
      return (callback) => {}; // Never call callback
    case 'error':
      return (callback) => {
        throw new Error('Network error');
      };
    default:
      return (callback) => setTimeout(callback, 100);
  }
};

// Ensure Jest treats this utility module as having executable tests to avoid suite errors
describe('test utilities module', () => {
  test('exports helper functions', () => {
    expect(typeof createMockWorker).toBe('function');
    expect(typeof waitForAsync).toBe('function');
  });
});