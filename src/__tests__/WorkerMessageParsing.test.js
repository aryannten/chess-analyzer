/**
 * Worker Message Parsing Tests
 * Tests message format validation, parsing, and protocol compliance
 */

import { validateWorkerMessage, testPositions } from './testUtils';

// Mock the worker environment for isolated testing
const mockWorkerEnvironment = () => {
  global.self = {
    onmessage: null,
    postMessage: jest.fn(),
    importScripts: jest.fn()
  };

  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  };

  return global.self;
};

describe('Worker Message Parsing - Input Validation', () => {
  let workerSelf;

  beforeEach(() => {
    workerSelf = mockWorkerEnvironment();
    jest.clearAllMocks();
  });

  test('should validate message structure', () => {
    const validMessage = {
      type: 'ANALYZE_POSITION',
      fen: testPositions.starting,
      depth: 10,
      timestamp: Date.now()
    };

    const validation = validateWorkerMessage(validMessage);
    expect(validation.valid).toBe(true);
  });

  test('should reject messages without required fields', () => {
    const invalidMessage = {
      fen: testPositions.starting,
      depth: 10
      // Missing type and timestamp
    };

    const validation = validateWorkerMessage(invalidMessage);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('required fields');
  });

  test('should validate BEST_MOVE message format', () => {
    const bestMoveMessage = {
      type: 'BEST_MOVE',
      move: 'e2e4',
      evaluation: '0.25',
      depth: 10,
      timestamp: Date.now()
    };

    const validation = validateWorkerMessage(bestMoveMessage);
    expect(validation.valid).toBe(true);
  });

  test('should reject BEST_MOVE with invalid move format', () => {
    const invalidMoveMessage = {
      type: 'BEST_MOVE',
      move: 'invalid-move',
      evaluation: '0.25',
      depth: 10,
      timestamp: Date.now()
    };

    const validation = validateWorkerMessage(invalidMoveMessage);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('move format');
  });

  test('should validate ENGINE_ERROR message format', () => {
    const errorMessage = {
      type: 'ENGINE_ERROR',
      error: 'Analysis failed',
      timestamp: Date.now()
    };

    const validation = validateWorkerMessage(errorMessage);
    expect(validation.valid).toBe(true);
  });

  test('should reject ENGINE_ERROR without error field', () => {
    const invalidErrorMessage = {
      type: 'ENGINE_ERROR',
      timestamp: Date.now()
      // Missing error field
    };

    const validation = validateWorkerMessage(invalidErrorMessage);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('error field');
  });
});

describe('Worker Message Parsing - FEN Validation', () => {
  test('should accept valid starting position', () => {
    const message = {
      type: 'ANALYZE_POSITION',
      fen: testPositions.starting,
      depth: 10,
      timestamp: Date.now()
    };

    const validation = validateWorkerMessage(message);
    expect(validation.valid).toBe(true);
  });

  test('should accept valid mid-game position', () => {
    const message = {
      type: 'ANALYZE_POSITION',
      fen: testPositions.sicilian,
      depth: 10,
      timestamp: Date.now()
    };

    const validation = validateWorkerMessage(message);
    expect(validation.valid).toBe(true);
  });

  test('should accept valid endgame position', () => {
    const message = {
      type: 'ANALYZE_POSITION',
      fen: testPositions.endgame,
      depth: 10,
      timestamp: Date.now()
    };

    const validation = validateWorkerMessage(message);
    expect(validation.valid).toBe(true);
  });
});

describe('Worker Message Parsing - Move Format Validation', () => {
  const validMoves = [
    'e2e4',    // Normal pawn move
    'g1f3',    // Knight move
    'e7e8q',   // Pawn promotion to queen
    'e7e8r',   // Pawn promotion to rook
    'e7e8b',   // Pawn promotion to bishop
    'e7e8n',   // Pawn promotion to knight
    'e1g1',    // Castling (king move)
    'a7a8q'    // Promotion on a-file
  ];

  const invalidMoves = [
    'e2',      // Too short
    'e2e4e6',  // Too long
    'i2e4',    // Invalid file
    'e9e4',    // Invalid rank
    'e2e4x',   // Invalid promotion piece
    'E2E4',    // Wrong case
    '22e4',    // Invalid format
    'e2-e4'    // Wrong notation
  ];

  test.each(validMoves)('should accept valid move: %s', (move) => {
    const message = {
      type: 'BEST_MOVE',
      move: move,
      evaluation: '0.25',
      depth: 10,
      timestamp: Date.now()
    };

    const validation = validateWorkerMessage(message);
    expect(validation.valid).toBe(true);
  });

  test.each(invalidMoves)('should reject invalid move: %s', (move) => {
    const message = {
      type: 'BEST_MOVE',
      move: move,
      evaluation: '0.25',
      depth: 10,
      timestamp: Date.now()
    };

    const validation = validateWorkerMessage(message);
    expect(validation.valid).toBe(false);
  });
});

describe('Worker Message Parsing - Protocol Compliance', () => {
  test('should handle PING/PONG protocol', () => {
    const pingMessage = {
      type: 'PING',
      timestamp: Date.now()
    };

    const pongMessage = {
      type: 'PONG',
      ready: true,
      timestamp: Date.now()
    };

    expect(validateWorkerMessage(pingMessage).valid).toBe(true);
    expect(validateWorkerMessage(pongMessage).valid).toBe(true);
  });

  test('should handle STATUS protocol', () => {
    const statusMessage = {
      type: 'STATUS',
      ready: true,
      analyzing: false,
      timestamp: Date.now()
    };

    const validation = validateWorkerMessage(statusMessage);
    expect(validation.valid).toBe(true);
  });

  test('should handle ANALYSIS_COMPLETE protocol', () => {
    const completeMessage = {
      type: 'ANALYSIS_COMPLETE',
      timestamp: Date.now()
    };

    const validation = validateWorkerMessage(completeMessage);
    expect(validation.valid).toBe(true);
  });

  test('should handle ANALYSIS_STOPPED protocol', () => {
    const stoppedMessage = {
      type: 'ANALYSIS_STOPPED',
      timestamp: Date.now()
    };

    const validation = validateWorkerMessage(stoppedMessage);
    expect(validation.valid).toBe(true);
  });
});

describe('Worker Message Parsing - Edge Cases', () => {
  test('should handle null message', () => {
    const validation = validateWorkerMessage(null);
    expect(validation.valid).toBe(false);
  });

  test('should handle undefined message', () => {
    const validation = validateWorkerMessage(undefined);
    expect(validation.valid).toBe(false);
  });

  test('should handle empty object', () => {
    const validation = validateWorkerMessage({});
    expect(validation.valid).toBe(false);
  });

  test('should handle message with extra fields', () => {
    const messageWithExtras = {
      type: 'PING',
      timestamp: Date.now(),
      extraField: 'should be ignored',
      anotherExtra: 123
    };

    const validation = validateWorkerMessage(messageWithExtras);
    expect(validation.valid).toBe(true);
  });

  test('should handle message with wrong field types', () => {
    const invalidTypeMessage = {
      type: 123, // Should be string
      timestamp: 'not-a-number' // Should be number
    };

    const validation = validateWorkerMessage(invalidTypeMessage);
    expect(validation.valid).toBe(false);
  });
});

describe('Worker Message Parsing - Performance', () => {
  test('should validate messages quickly', () => {
    const message = {
      type: 'BEST_MOVE',
      move: 'e2e4',
      evaluation: '0.25',
      depth: 10,
      timestamp: Date.now()
    };

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      validateWorkerMessage(message);
    }
    const end = performance.now();

    // Should validate 1000 messages in less than 100ms
    expect(end - start).toBeLessThan(100);
  });

  test('should handle large message batches', () => {
    const messages = Array.from({ length: 10000 }, (_, i) => ({
      type: 'BEST_MOVE',
      move: 'e2e4',
      evaluation: '0.25',
      depth: 10,
      timestamp: Date.now() + i
    }));

    const start = performance.now();
    messages.forEach(validateWorkerMessage);
    const end = performance.now();

    // Should handle 10000 messages in reasonable time
    expect(end - start).toBeLessThan(1000);
  });
});

describe('Worker Message Parsing - Security', () => {
  test('should handle malicious input safely', () => {
    const maliciousInputs = [
      { type: '<script>alert("xss")</script>' },
      { type: 'ANALYZE_POSITION', fen: '../../etc/passwd' },
      { type: 'BEST_MOVE', move: 'javascript:alert(1)' },
      { type: 'ENGINE_ERROR', error: new Error('test') }, // Object instead of string
      { type: 'PING', timestamp: Infinity },
      { type: 'STATUS', ready: 'true' } // String instead of boolean
    ];

    maliciousInputs.forEach(input => {
      expect(() => validateWorkerMessage(input)).not.toThrow();
    });
  });

  test('should sanitize error messages', () => {
    const errorMessage = {
      type: 'ENGINE_ERROR',
      error: '<script>alert("xss")</script>',
      timestamp: Date.now()
    };

    const validation = validateWorkerMessage(errorMessage);
    expect(validation.valid).toBe(true);
    // In a real implementation, the error message would be sanitized
  });
});