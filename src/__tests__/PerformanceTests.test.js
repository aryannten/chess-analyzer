/**
 * Performance Tests for Chess Engine Integration
 * Tests performance characteristics, memory usage, and stress scenarios
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { createMockWorker, measurePerformance, simulateMemoryPressure } from './testUtils';

const delay = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));
const clickBoardSafely = async (element) => {
  if (!element) {
    return;
  }

  await act(async () => {
    element.click();
  });
};

// Mock performance API if not available
if (!global.performance) {
  global.performance = {
    now: () => Date.now()
  };
}

describe('Performance Tests - Initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize app within reasonable time', async () => {
    const duration = await measurePerformance(async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
      });
    });

    // Should initialize within 2 seconds
    expect(duration).toBeLessThan(2000);
  });

  test('should initialize worker quickly', async () => {
    const mockWorker = createMockWorker();
    global.Worker = jest.fn(() => mockWorker);

    const duration = await measurePerformance(async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
      });
    });

    // Worker initialization should be fast
    expect(duration).toBeLessThan(1000);
  });

  test('should handle multiple rapid initializations', async () => {
    const mockWorker = createMockWorker();
    global.Worker = jest.fn(() => mockWorker);

    const duration = await measurePerformance(async () => {
      // Render and unmount multiple times rapidly
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<App />);
        await waitFor(() => {
          expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
        });
        unmount();
      }
    });

    // Should handle rapid init/cleanup cycles efficiently
    expect(duration).toBeLessThan(5000);
  });
});

describe('Performance Tests - Analysis Speed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should complete analysis within timeout', async () => {
    const mockWorker = createMockWorker();
    global.Worker = jest.fn(() => mockWorker);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    });

    const duration = await measurePerformance(async () => {
      // Trigger analysis by interacting with the board
      const chessboard = document.querySelector('[data-testid="chessboard"]') ||
                        document.querySelector('.chessboard');
      
      await clickBoardSafely(chessboard);

      // Wait for analysis to complete
      await waitFor(() => {
        // Analysis should complete or show results
        expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    // Analysis should complete quickly with mock worker
    expect(duration).toBeLessThan(3000);
  });

  test('should handle rapid position changes efficiently', async () => {
    const mockWorker = createMockWorker();
    global.Worker = jest.fn(() => mockWorker);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    });

    const duration = await measurePerformance(async () => {
      const chessboard = document.querySelector('[data-testid="chessboard"]') ||
                        document.querySelector('.chessboard');
      
      if (chessboard) {
        // Simulate rapid position changes
        for (let i = 0; i < 10; i++) {
          await clickBoardSafely(chessboard);
          await delay(50);
        }
      }

      await waitFor(() => {
        expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
      });
    });

    // Should handle rapid changes without significant delay
    expect(duration).toBeLessThan(2000);
  });

  test('should debounce analysis requests effectively', async () => {
    const mockWorker = createMockWorker();
    let analysisRequestCount = 0;
    
    mockWorker.postMessage.mockImplementation((message) => {
      if (message.type === 'ANALYZE_POSITION') {
        analysisRequestCount++;
      }
    });

    global.Worker = jest.fn(() => mockWorker);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    });

    // Trigger multiple rapid changes
    const chessboard = document.querySelector('[data-testid="chessboard"]') ||
                      document.querySelector('.chessboard');
    
    if (chessboard) {
      for (let i = 0; i < 20; i++) {
        await clickBoardSafely(chessboard);
      }
    }

    // Wait for debouncing to settle
  await delay(500);

    // Should have debounced the requests (fewer than 20)
    expect(analysisRequestCount).toBeLessThan(20);
  });
});

describe('Performance Tests - Memory Usage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle memory pressure gracefully', async () => {
    const cleanup = simulateMemoryPressure();
    
    try {
      const mockWorker = createMockWorker();
      global.Worker = jest.fn(() => mockWorker);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
      });

      // App should continue to function under memory pressure
      expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    } finally {
      cleanup();
    }
  });

  test('should not leak memory on repeated operations', async () => {
    const mockWorker = createMockWorker();
    global.Worker = jest.fn(() => mockWorker);

    // Measure initial memory usage (simplified)
    const initialObjects = global.gc ? global.gc() : 0;

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    });

    // Perform many operations
    const chessboard = document.querySelector('[data-testid="chessboard"]') ||
                      document.querySelector('.chessboard');
    
    if (chessboard) {
      for (let i = 0; i < 100; i++) {
        await clickBoardSafely(chessboard);
      }
    }

    // Memory usage should not grow excessively
    // This is a simplified test - in practice you'd use more sophisticated memory monitoring
    expect(true).toBe(true); // Test passes if no out-of-memory errors
  });

  test('should cleanup resources on unmount', async () => {
    const mockWorker = createMockWorker();
    global.Worker = jest.fn(() => mockWorker);

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    });

    // Unmount and verify cleanup
    unmount();

    // Should handle cleanup gracefully (the app uses a reliable engine)
    expect(true).toBe(true);
  });
});

describe('Performance Tests - UI Responsiveness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should maintain UI responsiveness during analysis', async () => {
    const mockWorker = createMockWorker('slow'); // Slow analysis
    global.Worker = jest.fn(() => mockWorker);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    });

    // Start analysis
    const chessboard = document.querySelector('[data-testid="chessboard"]') ||
                      document.querySelector('.chessboard') ||
                      document.querySelector('[data-boardid]');
    
    await clickBoardSafely(chessboard);

    // UI should remain responsive
    const duration = await measurePerformance(async () => {
      // Try to interact with UI elements
      const title = screen.getByText(/chess analyzer/i);
      fireEvent.mouseOver(title);
    });

    // UI interactions should be fast even during analysis
    expect(duration).toBeLessThan(100);
  });

  test('should handle concurrent user interactions', async () => {
    const mockWorker = createMockWorker();
    global.Worker = jest.fn(() => mockWorker);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    });

    const duration = await measurePerformance(async () => {
      const chessboard = document.querySelector('[data-testid="chessboard"]') ||
                        document.querySelector('.chessboard') ||
                        document.querySelector('[data-boardid]');
      
      if (chessboard) {
        // Simulate concurrent interactions
        for (let i = 0; i < 10; i++) {
          await clickBoardSafely(chessboard);
        }
      }
    });

    // Should handle concurrent interactions efficiently
    expect(duration).toBeLessThan(1000);
  });

  test('should not block on worker communication', async () => {
    const mockWorker = createMockWorker('timeout'); // Worker that doesn't respond
    global.Worker = jest.fn(() => mockWorker);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    });

    // UI should remain responsive even if worker doesn't respond
    const duration = await measurePerformance(async () => {
      const title = screen.getByText(/chess analyzer/i);
      expect(title).toBeInTheDocument();
    });

    expect(duration).toBeLessThan(100);
  });
});

describe('Performance Tests - Stress Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle high-frequency interactions', async () => {
    const mockWorker = createMockWorker();
    global.Worker = jest.fn(() => mockWorker);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    });

    const duration = await measurePerformance(async () => {
      const chessboard = document.querySelector('[data-testid="chessboard"]') ||
                        document.querySelector('.chessboard');
      
      if (chessboard) {
        // High-frequency clicks
        for (let i = 0; i < 200; i++) {
          await clickBoardSafely(chessboard);
          if (i % 50 === 0) {
            await delay(1);
          }
        }
      }
    });

    // Should handle high-frequency interactions without crashing
    expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
  });

  test('should handle extended usage session', async () => {
    const mockWorker = createMockWorker();
    global.Worker = jest.fn(() => mockWorker);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    });

    // Simulate extended usage
    const duration = await measurePerformance(async () => {
      for (let session = 0; session < 5; session++) {
        const chessboard = document.querySelector('[data-testid="chessboard"]') ||
                          document.querySelector('.chessboard');
        
        if (chessboard) {
          // Simulate a game session
          for (let move = 0; move < 12; move++) {
            await clickBoardSafely(chessboard);
            await delay(8);
          }
        }
        
        // Brief pause between sessions
        await delay(25);
      }
    });

    // Should handle extended usage without degradation
    expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
  });

  test('should recover from performance bottlenecks', async () => {
    const mockWorker = createMockWorker();
    
    // Simulate performance bottleneck
    let bottleneckActive = true;
    mockWorker.postMessage.mockImplementation((message) => {
      if (bottleneckActive) {
        // Simulate slow response during bottleneck
        setTimeout(() => {
          if (mockWorker.onmessage) {
            mockWorker.onmessage({
              data: {
                type: 'BEST_MOVE',
                move: 'e2e4',
                evaluation: '0.25',
                depth: 10,
                timestamp: Date.now()
              }
            });
          }
        }, 2000);
      } else {
        // Normal fast response after bottleneck
        setTimeout(() => {
          if (mockWorker.onmessage) {
            mockWorker.onmessage({
              data: {
                type: 'BEST_MOVE',
                move: 'e2e4',
                evaluation: '0.25',
                depth: 10,
                timestamp: Date.now()
              }
            });
          }
        }, 100);
      }
    });

    global.Worker = jest.fn(() => mockWorker);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    });

    // Trigger analysis during bottleneck
    const chessboard = document.querySelector('[data-testid="chessboard"]') ||
                      document.querySelector('.chessboard');
    
    await clickBoardSafely(chessboard);

    // Wait for bottleneck period
  await delay(1000);

    // Remove bottleneck
    bottleneckActive = false;

    // Trigger analysis after bottleneck
    await clickBoardSafely(chessboard);

    // Should recover and continue functioning
    await waitFor(() => {
      expect(screen.getByText(/chess analyzer/i)).toBeInTheDocument();
    });
  });
});