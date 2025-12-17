import { jest } from '@jest/globals';

const originalConsole = global.console;
const mockConsole = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

describe('Chess Engine Worker', () => {
  let sendMessage;

  beforeAll(async () => {
    global.console = mockConsole;
    global.self = {
      postMessage: jest.fn(),
      onmessage: null
    };

    await import('../workers/ChessEngineWorker.js');

    sendMessage = (payload) => {
      global.self.onmessage({ data: payload });
    };
  });

  beforeEach(() => {
    global.self.postMessage.mockClear();
    sendMessage({ type: 'INIT' });
    global.self.postMessage.mockClear();
  });

  afterAll(() => {
    global.console = originalConsole;
  });

  const getMessagesByType = (type) =>
    global.self.postMessage.mock.calls
      .map(([message]) => message)
      .filter(message => message.type === type);

  test('initialises the engine when requested', () => {
    sendMessage({ type: 'INIT' });
    const initMessages = getMessagesByType('ENGINE_READY');
    expect(initMessages.length).toBeGreaterThan(0);
  });

  test('responds to PING with PONG', () => {
    sendMessage({ type: 'PING' });
    const [pong] = getMessagesByType('PONG');
    expect(pong).toMatchObject({ type: 'PONG', ready: expect.any(Boolean) });
  });

  test('returns status information', () => {
    sendMessage({ type: 'GET_STATUS' });
    const [status] = getMessagesByType('STATUS');
    expect(status).toMatchObject({
      type: 'STATUS',
      ready: expect.any(Boolean),
      analyzing: expect.any(Boolean),
      analysesCompleted: expect.any(Number)
    });
  });

  test('reports health status', () => {
    sendMessage({ type: 'HEALTH_CHECK', requestId: 'health-1' });
    const [health] = getMessagesByType('HEALTH_STATUS');
    expect(health).toMatchObject({
      type: 'HEALTH_STATUS',
      requestId: 'health-1',
      ready: expect.any(Boolean)
    });
  });

  test('performs analysis for a valid position', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    sendMessage({ type: 'ANALYZE_POSITION', fen, depth: 12, requestId: 'test-1' });

    const started = getMessagesByType('ANALYSIS_STARTED');
    const results = getMessagesByType('ANALYSIS_RESULT');

    expect(started.length).toBe(1);
    expect(results.length).toBe(1);
    expect(results[0]).toMatchObject({
      type: 'ANALYSIS_RESULT',
      requestId: 'test-1',
      bestMove: expect.any(String),
      evaluation: expect.any(String)
    });
  });

  test('rejects analysis requests with invalid FEN', () => {
    sendMessage({ type: 'ANALYZE_POSITION', fen: 'invalid-fen', depth: 10, requestId: 'bad' });
    const [errorMessage] = getMessagesByType('ENGINE_ERROR');
    expect(errorMessage).toMatchObject({
      type: 'ENGINE_ERROR',
      error: 'Invalid FEN position'
    });
  });

  test('stops analysis when requested', () => {
    sendMessage({ type: 'STOP_ANALYSIS', requestId: 'stop-1' });
    const [stopped] = getMessagesByType('ANALYSIS_STOPPED');
    expect(stopped).toMatchObject({ type: 'ANALYSIS_STOPPED', requestId: 'stop-1' });
  });

  test('handles unknown message types gracefully', () => {
    sendMessage({ type: 'UNKNOWN_MESSAGE' });
    const [errorMessage] = getMessagesByType('ENGINE_ERROR');
    expect(errorMessage).toMatchObject({
      type: 'ENGINE_ERROR',
      error: 'Unknown message type: UNKNOWN_MESSAGE'
    });
  });

  test('includes timestamps on all outbound messages', () => {
    sendMessage({ type: 'PING' });
    const hasTimestampsOnly = global.self.postMessage.mock.calls.every(([message]) => {
      return typeof message.timestamp === 'number';
    });
    expect(hasTimestampsOnly).toBe(true);
  });
});