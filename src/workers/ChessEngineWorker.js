import { Chess } from 'chess.js';
import { analyzePosition } from '../utils/chessAnalysis';
/* global globalThis */

const DEFAULT_STOCKFISH_SCRIPT = 'https://cdn.jsdelivr.net/npm/stockfish@17.1.0/src/stockfish-17.1-lite-single-03e3232.js';
const DEFAULT_STOCKFISH_WASM = 'https://cdn.jsdelivr.net/npm/stockfish@17.1.0/src/stockfish-17.1-lite-single-03e3232.wasm';

let isReady = false;
let isAnalyzing = false;
let analysesCompleted = 0;

let engineMode = 'uninitialised'; // 'stockfish' | 'fallback' | 'failed'
let stockfishWorker = null;
let stockfishReady = false;
let pendingAnalysis = null;
let latestInfo = null;
let lastStockfishError = null;

const workerContext = (() => {
  if (typeof globalThis !== 'undefined') {
    return globalThis;
  }
  if (typeof global !== 'undefined') {
    return global;
  }
  if (typeof window !== 'undefined') {
    return window;
  }
  return undefined;
})();

if (workerContext && typeof process !== 'undefined' && process.env?.JEST_WORKER_ID) {
  const ensureMockable = (target) => {
    if (!target || typeof target !== 'object') {
      return;
    }

    const existing = target.postMessage;
    if (typeof existing === 'function' && typeof existing.mockClear === 'function') {
      return;
    }

    const calls = [];
    const stub = (...args) => {
      calls.push(args);
    };
    stub.mock = { calls };
    stub.mockClear = () => {
      calls.length = 0;
    };

    try {
      Object.defineProperty(target, 'postMessage', {
        value: stub,
        writable: true,
        configurable: true
      });
    } catch (error) {
      target.postMessage = stub;
    }
  };

  ensureMockable(workerContext);
  if (workerContext && 'self' in workerContext && workerContext['self'] !== workerContext) {
    ensureMockable(workerContext['self']);
  }
}

const post = (payload) => {
  const message = {
    timestamp: Date.now(),
    ...payload
  };

  const targetContext = (workerContext && 'self' in workerContext && typeof workerContext['self'].postMessage === 'function')
    ? workerContext['self']
    : workerContext;

  if (!targetContext || typeof targetContext.postMessage !== 'function') {
    throw new Error('Worker context is unavailable');
  }

  const postMessageFn = targetContext.postMessage;

  if (postMessageFn.length >= 2) {
    postMessageFn.call(targetContext, message, '*');
  } else {
    postMessageFn.call(targetContext, message);
  }
};

const validateFen = (fen) => {
  try {
    const candidate = new Chess(fen);
    candidate.board();
    return true;
  } catch (error) {
    return false;
  }
};

const normalisePerspective = (value, perspective) => {
  return perspective === 'w' ? value : -value;
};

const teardownStockfish = () => {
  if (stockfishWorker) {
    stockfishWorker.terminate?.();
    stockfishWorker = null;
  }
  stockfishReady = false;
  pendingAnalysis = null;
  latestInfo = null;
};

const notifyReady = () => {
  if (!isReady) {
    isReady = true;
  }
  post({ type: 'ENGINE_READY', analysesCompleted });
};

function parseInfoLine(line) {
  const tokens = line.split(/\s+/);
  const info = {};

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    switch (token) {
      case 'depth':
        info.depth = parseInt(tokens[++i], 10);
        break;
      case 'seldepth':
        info.seldepth = parseInt(tokens[++i], 10);
        break;
      case 'score': {
        const type = tokens[++i];
        const raw = parseInt(tokens[++i], 10);
        if (type === 'cp') {
          info.cp = raw;
        } else if (type === 'mate') {
          info.mate = raw;
        }
        break;
      }
      case 'nodes':
        info.nodes = parseInt(tokens[++i], 10);
        break;
      case 'nps':
        info.nps = parseInt(tokens[++i], 10);
        break;
      case 'time':
        info.time = parseInt(tokens[++i], 10);
        break;
      case 'pv': {
        info.pv = tokens.slice(i + 1).join(' ');
        i = tokens.length;
        break;
      }
      default:
        break;
    }
  }

  return info;
}

function buildEvaluationSummary(fen, depth) {
  const defaultSummary = {
    evaluation: '0.00',
    nodesEvaluated: latestInfo?.nodes ?? null,
    analysisTime: latestInfo?.time ?? null,
    depth: latestInfo?.depth ?? depth
  };

  if (!latestInfo) {
    return defaultSummary;
  }

  const game = new Chess(fen);
  const perspective = game.turn();

  if (typeof latestInfo.mate === 'number') {
    const mateScore = normalisePerspective(latestInfo.mate, perspective);
    return {
      evaluation: mateScore >= 0 ? `M${Math.abs(mateScore)}` : `M-${Math.abs(mateScore)}`,
      nodesEvaluated: latestInfo.nodes ?? null,
      analysisTime: latestInfo.time ?? null,
      depth: latestInfo.depth ?? depth
    };
  }

  if (typeof latestInfo.cp === 'number') {
    const cpScore = normalisePerspective(latestInfo.cp, perspective);
    return {
      evaluation: (cpScore / 100).toFixed(2),
      nodesEvaluated: latestInfo.nodes ?? null,
      analysisTime: latestInfo.time ?? null,
      depth: latestInfo.depth ?? depth
    };
  }

  return defaultSummary;
}

function finaliseStockfishAnalysis(line) {
  if (!pendingAnalysis) {
    return;
  }

  const { fen, depth, requestId } = pendingAnalysis;
  const parts = line.split(/\s+/);
  const bestMove = parts[1];

  let bestMoveSan = null;
  if (bestMove && bestMove.length >= 4) {
    try {
      const game = new Chess(fen);
      const move = game.move({
        from: bestMove.slice(0, 2),
        to: bestMove.slice(2, 4),
        promotion: bestMove.slice(4) || undefined,
        sloppy: true
      });
      bestMoveSan = move?.san ?? null;
    } catch (error) {
      bestMoveSan = null;
    }
  }

  const summary = buildEvaluationSummary(fen, depth);
  analysesCompleted += 1;
  isAnalyzing = false;

  post({
    type: 'ANALYSIS_RESULT',
    requestId,
    fen,
    depth: summary.depth ?? depth,
    bestMove: bestMove ?? null,
    bestMoveSan,
    evaluation: summary.evaluation,
    nodesEvaluated: summary.nodesEvaluated,
    analysisTime: summary.analysisTime,
    analysesCompleted
  });

  pendingAnalysis = null;
  latestInfo = null;
}

function dispatchStockfishAnalysis() {
  if (!pendingAnalysis || !stockfishWorker || !stockfishReady) {
    return;
  }

  const { fen, depth, requestId } = pendingAnalysis;

  try {
    stockfishWorker.postMessage('stop');
    stockfishWorker.postMessage('ucinewgame');
    stockfishWorker.postMessage(`position fen ${fen}`);
    stockfishWorker.postMessage(`go depth ${Math.max(1, Math.min(depth ?? 18, 28))}`);
    latestInfo = null;
    isAnalyzing = true;
    post({ type: 'ANALYSIS_STARTED', requestId, depth });
  } catch (error) {
    console.error('Failed to dispatch Stockfish analysis:', error);
    stockfishReady = false;
    teardownStockfish();
    engineMode = 'fallback';
    isAnalyzing = false;
    runFallbackAnalysis(fen, depth, requestId);
  }
}

function handleStockfishMessage(event) {
  const raw = event.data;
  if (typeof raw !== 'string') {
    return;
  }

  raw.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed === 'uciok') {
      stockfishWorker?.postMessage('isready');
      return;
    }

    if (trimmed === 'readyok') {
      stockfishReady = true;
      notifyReady();
      if (pendingAnalysis) {
        dispatchStockfishAnalysis();
      }
      return;
    }

    if (trimmed.startsWith('info ')) {
      latestInfo = parseInfoLine(trimmed);
      return;
    }

    if (trimmed.startsWith('bestmove')) {
      finaliseStockfishAnalysis(trimmed);
      return;
    }
  });
}

function handleStockfishError(error) {
  lastStockfishError = error instanceof Error ? error : new Error('Stockfish worker error');
  console.error('Stockfish worker error:', lastStockfishError);
  teardownStockfish();
  engineMode = 'fallback';
  if (!isReady) {
    notifyReady();
  }
  if (pendingAnalysis) {
    const request = pendingAnalysis;
    pendingAnalysis = null;
    runFallbackAnalysis(request.fen, request.depth, request.requestId);
  }
}

function runFallbackAnalysis(fen, depth, requestId) {
  isAnalyzing = true;
  post({ type: 'ANALYSIS_STARTED', requestId, depth });

  try {
    const result = analyzePosition(fen, depth);
    analysesCompleted += 1;
    isAnalyzing = false;

    post({
      type: 'ANALYSIS_RESULT',
      requestId,
      fen,
      depth: result.depth,
      bestMove: result.bestMove,
      bestMoveSan: result.bestMoveSan,
      evaluation: result.evaluation,
      nodesEvaluated: result.nodesEvaluated,
      analysisTime: result.analysisTime,
      analysesCompleted
    });
  } catch (error) {
    isAnalyzing = false;
    post({
      type: 'ENGINE_ERROR',
      error: error.message || 'Analysis failed',
      requestId
    });
  }
}

function handleAnalysisRequest({ fen, depth = 12, requestId }) {
  if (!fen || typeof fen !== 'string') {
    post({
      type: 'ENGINE_ERROR',
      error: 'Invalid FEN parameter',
      requestId
    });
    return;
  }

  if (!validateFen(fen)) {
    post({
      type: 'ENGINE_ERROR',
      error: 'Invalid FEN position',
      requestId
    });
    return;
  }

  if (engineMode === 'uninitialised') {
    tryCreateStockfish();
  }

  if (engineMode === 'stockfish') {
    pendingAnalysis = { fen, depth, requestId };
    if (stockfishReady) {
      dispatchStockfishAnalysis();
    } else if (!isReady) {
      // handshake in progress; wait for ready
    } else {
      // handshake failed silently, fallback
      runFallbackAnalysis(fen, depth, requestId);
    }
  } else {
    engineMode = 'fallback';
    if (!isReady) {
      notifyReady();
    }
    runFallbackAnalysis(fen, depth, requestId);
  }
}

function stopCurrentAnalysis(requestId) {
  if (engineMode === 'stockfish' && stockfishWorker && isAnalyzing) {
    try {
      stockfishWorker.postMessage('stop');
    } catch (error) {
      console.error('Failed to stop Stockfish analysis:', error);
    }
  }

  isAnalyzing = false;
  pendingAnalysis = null;
  latestInfo = null;
  post({ type: 'ANALYSIS_STOPPED', requestId });
}

function handleHealthCheck({ requestId }) {
  post({
    type: 'HEALTH_STATUS',
    ready: isReady,
    analyzing: isAnalyzing,
    analysesCompleted,
    mode: engineMode,
    stockfishReady,
    lastStockfishError: lastStockfishError?.message ?? null,
    requestId
  });
}

function tryCreateStockfish() {
  if (stockfishWorker || engineMode === 'fallback' || engineMode === 'failed') {
    return stockfishWorker;
  }

  if (typeof Worker === 'undefined') {
    engineMode = 'fallback';
    return null;
  }

  try {
    const scriptSource = workerContext?.STOCKFISH_SCRIPT_URL || DEFAULT_STOCKFISH_SCRIPT;
    const wasmSource = workerContext?.STOCKFISH_WASM_URL || DEFAULT_STOCKFISH_WASM;

    const scriptUrl = new URL(scriptSource, workerContext?.location?.href || 'https://localhost/');
    scriptUrl.hash = `${wasmSource},worker`;

    const worker = new Worker(scriptUrl);
    worker.addEventListener('message', handleStockfishMessage);
    worker.addEventListener('error', handleStockfishError);
    engineMode = 'stockfish';
    stockfishReady = false;
    pendingAnalysis = null;
    latestInfo = null;
    worker.postMessage('uci');
    worker.postMessage('setoption name Threads value 1');
    worker.postMessage('setoption name Ponder value false');
    stockfishWorker = worker;
    return worker;
  } catch (error) {
    lastStockfishError = error;
    engineMode = 'failed';
    teardownStockfish();
    return null;
  }
}

function initialise() {
  if (engineMode === 'uninitialised') {
    const worker = tryCreateStockfish();
    if (!worker) {
      engineMode = 'fallback';
      notifyReady();
    }
  } else {
    notifyReady();
  }
}

if (workerContext) {
  workerContext.onmessage = (event) => {
    const message = event.data || {};
    const { type } = message;

    switch (type) {
      case 'INIT':
        initialise();
        break;
      case 'ANALYZE_POSITION':
        handleAnalysisRequest(message);
        break;
      case 'STOP_ANALYSIS':
        stopCurrentAnalysis(message.requestId);
        break;
      case 'PING':
        post({ type: 'PONG', ready: isReady });
        break;
      case 'GET_STATUS':
        post({
          type: 'STATUS',
          ready: isReady,
          analyzing: isAnalyzing,
          analysesCompleted,
          engineMode,
          stockfishReady,
          requestId: message.requestId
        });
        break;
      case 'HEALTH_CHECK':
        handleHealthCheck(message);
        break;
      default:
        post({
          type: 'ENGINE_ERROR',
          error: `Unknown message type: ${type}`,
          requestId: message.requestId
        });
    }
  };
}

initialise();
