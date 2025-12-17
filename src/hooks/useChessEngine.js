import { useState, useCallback, useRef, useEffect } from 'react';
import { analyzePosition, createAnalysisCache } from '../utils/chessAnalysis';

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Custom hook responsible for coordinating with the web worker chess engine.
 * Falls back to synchronous heuristic analysis when a worker is unavailable.
 */
export const useChessEngine = () => {
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [bestMove, setBestMove] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [engineError, setEngineError] = useState(null);
  const [showMoveHints, setShowMoveHints] = useState(true);
  const [engineHealthStatus, setEngineHealthStatus] = useState('unknown');
  const [workerRestartCount, setWorkerRestartCount] = useState(0);
  const [engineStats, setEngineStats] = useState({
    analysesCompleted: 0,
    lastAnalysisTime: null,
    lastNodesEvaluated: null
  });
  const [lastEngineError, setLastEngineError] = useState(null);

  const workerRef = useRef(null);
  const cacheRef = useRef(createAnalysisCache());
  const pendingRequestRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const workerFactoryPromiseRef = useRef(null);
  const isMountedRef = useRef(true);

  const disposeWorker = useCallback(() => {
    const worker = workerRef.current;
    if (worker) {
      if (typeof worker.removeEventListener === 'function') {
        if (worker.__engineMessageHandler) {
          worker.removeEventListener('message', worker.__engineMessageHandler);
        }
        if (worker.__engineErrorHandler) {
          worker.removeEventListener('error', worker.__engineErrorHandler);
        }
      }

      if (typeof worker.terminate === 'function') {
        worker.terminate();
      }

      workerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    isMountedRef.current = false;
    disposeWorker();
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }
  }, [disposeWorker]);

  const applyCachedResult = useCallback((cacheEntry) => {
    setBestMove(cacheEntry.bestMove);
    setEvaluation(cacheEntry.evaluation);
    setIsAnalyzing(false);
  }, []);

  const cacheResult = useCallback((fen, depth, result) => {
    cacheRef.current.set(fen, depth, {
      ...result,
      storedAt: Date.now()
    });
  }, []);

  const runFallbackAnalysis = useCallback((fen, depth) => {
    setIsAnalyzing(true);
    setEngineHealthStatus('degraded');

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }

    fallbackTimerRef.current = setTimeout(() => {
      try {
        const result = analyzePosition(fen, depth);
        setBestMove(result.bestMove);
        setEvaluation(result.evaluation);
        setIsAnalyzing(false);
        setEngineError(null);
        setEngineHealthStatus('healthy');
        setLastEngineError(null);
        setEngineStats(prev => ({
          analysesCompleted: prev.analysesCompleted + 1,
          lastAnalysisTime: result.analysisTime,
          lastNodesEvaluated: result.nodesEvaluated
        }));
        cacheResult(fen, depth, {
          bestMove: result.bestMove,
          evaluation: result.evaluation
        });
      } catch (error) {
        setEngineError(error.message || 'Fallback analysis failed');
        setIsAnalyzing(false);
        setEngineHealthStatus('failed');
        setLastEngineError({
          message: error.message || 'Fallback analysis failed',
          recoverable: false,
          timestamp: Date.now()
        });
      }
    }, 0);
  }, [cacheResult]);

  const handleWorkerError = useCallback((error) => {
    console.error('Engine worker error:', error);
    setEngineError(error.message || 'Engine worker error');
    setEngineHealthStatus('failed');
    setIsEngineReady(false);
    setIsAnalyzing(false);
    setLastEngineError({
      message: error.message || 'Engine worker error',
      recoverable: false,
      timestamp: Date.now()
    });
    disposeWorker();
  }, [disposeWorker]);

  const loadWorkerFactory = useCallback(() => {
    if (workerFactoryPromiseRef.current) {
      return workerFactoryPromiseRef.current;
    }

    workerFactoryPromiseRef.current = import('../workers/engineWorkerFactory.js')
      .then((module) => {
        if (module && typeof module.createEngineWorker === 'function') {
          return module.createEngineWorker;
        }
        throw new Error('createEngineWorker export is not available');
      })
      .catch((error) => {
        workerFactoryPromiseRef.current = null;
        throw error;
      });

    return workerFactoryPromiseRef.current;
  }, []);

  const sendAnalysisRequest = useCallback((fen, depth) => {
    const worker = workerRef.current;
    if (!worker) {
      return false;
    }

    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    pendingRequestRef.current = {
      id: requestId,
      fen,
      depth,
      requestedAt: Date.now()
    };

    setIsAnalyzing(true);
    worker.postMessage({
      type: 'ANALYZE_POSITION',
      fen,
      depth,
      requestId
    });
    return true;
  }, []);

  const handleWorkerMessage = useCallback((event) => {
    const message = event.data || {};
    switch (message.type) {
      case 'ENGINE_READY': {
        console.log('%c Engine ready message received!', 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;', message);
        if (message.version) {
          console.log('%c Worker version: ' + message.version, 'color: #2196F3; font-weight: bold;');
        }
        setIsEngineReady(true);
        setEngineError(null);
        setEngineHealthStatus('healthy');
        setLastEngineError(null);

        if (pendingRequestRef.current && !pendingRequestRef.current.id) {
          const { fen, depth } = pendingRequestRef.current;
          sendAnalysisRequest(fen, depth);
        }
        break;
      }
      case 'ANALYSIS_STARTED': {
        setIsAnalyzing(true);
        setEngineError(null);
        setEngineHealthStatus('healthy');
        break;
      }
      case 'ANALYSIS_RESULT': {
        const pending = pendingRequestRef.current;
        if (!pending || (message.requestId && message.requestId !== pending.id)) {
          break;
        }

        setBestMove(message.bestMove);
        setEvaluation(message.evaluation);
        setIsAnalyzing(false);
        setEngineError(null);
        setEngineHealthStatus('healthy');
        setLastEngineError(null);
        setEngineStats(prev => ({
          analysesCompleted: message.analysesCompleted ?? prev.analysesCompleted + 1,
          lastAnalysisTime: message.analysisTime ?? prev.lastAnalysisTime,
          lastNodesEvaluated: message.nodesEvaluated ?? prev.lastNodesEvaluated
        }));

        cacheResult(message.fen, message.depth, {
          bestMove: message.bestMove,
          evaluation: message.evaluation
        });

        pendingRequestRef.current = null;
        break;
      }
      case 'ANALYSIS_STOPPED': {
        setIsAnalyzing(false);
        break;
      }
      case 'ENGINE_ERROR': {
        console.error('Engine error:', message.error);
        setEngineError(message.error || 'Engine error');
        setIsAnalyzing(false);
        setEngineHealthStatus('failed');
        setLastEngineError({
          message: message.error || 'Engine error',
          recoverable: false,
          timestamp: Date.now()
        });
        pendingRequestRef.current = null;
        break;
      }
      case 'STATUS':
      case 'HEALTH_STATUS': {
        if (typeof message.ready === 'boolean') {
          setIsEngineReady(message.ready);
        }
        if (typeof message.analyzing === 'boolean') {
          setIsAnalyzing(message.analyzing);
        }
        if (typeof message.analysesCompleted === 'number') {
          setEngineStats(prev => ({
            ...prev,
            analysesCompleted: message.analysesCompleted
          }));
        }
        break;
      }
      default: {
        console.warn('Unhandled engine worker message', message);
        break;
      }
    }
  }, [cacheResult, sendAnalysisRequest]);

  const initialiseWorker = useCallback(() => {
    if (workerRef.current) {
      return;
    }

    if (typeof Worker === 'undefined') {
      setEngineHealthStatus('degraded');
      return;
    }

  setEngineHealthStatus('initializing');

    loadWorkerFactory()
      .then((createWorker) => {
        if (!isMountedRef.current || workerRef.current) {
          return;
        }

        const workerInstance = createWorker();

        const hasMessagingInterface =
          workerInstance && typeof workerInstance.postMessage === 'function';

        if (!hasMessagingInterface) {
          console.error('Worker factory returned an invalid instance', workerInstance);
          workerFactoryPromiseRef.current = null;
          workerRef.current = null;
          setEngineHealthStatus('degraded');
          setEngineError('Engine unavailable — using fallback analysis');
          setIsEngineReady(false);
          setIsAnalyzing(false);
          setLastEngineError({
            message: 'Worker factory returned an invalid instance',
            recoverable: true,
            timestamp: Date.now()
          });

          const pending = pendingRequestRef.current;
          if (pending) {
            runFallbackAnalysis(pending.fen, pending.depth);
            pendingRequestRef.current = null;
          }

          return;
        }

        workerRef.current = workerInstance;

        if (typeof workerInstance.addEventListener === 'function') {
          workerInstance.addEventListener('message', handleWorkerMessage);
          workerInstance.addEventListener('error', handleWorkerError);
          workerInstance.__engineMessageHandler = handleWorkerMessage;
          workerInstance.__engineErrorHandler = handleWorkerError;
        } else {
          workerInstance.onmessage = handleWorkerMessage;
          workerInstance.onerror = handleWorkerError;
        }

        if (typeof workerInstance.postMessage === 'function') {
          workerInstance.postMessage({ type: 'INIT' });
        }
      })
      .catch((error) => {
        if (!isMountedRef.current) {
          return;
        }

        console.error('Failed to initialise chess engine worker:', error);
        setEngineError(error.message || 'Failed to initialise engine');
        setEngineHealthStatus('failed');
        setLastEngineError({
          message: error.message || 'Failed to initialise engine',
          recoverable: true,
          timestamp: Date.now()
        });
      });
  }, [handleWorkerError, handleWorkerMessage, loadWorkerFactory, runFallbackAnalysis]);

  useEffect(() => {
    initialiseWorker();
  }, [initialiseWorker]);

  const requestAnalysis = useCallback((fen, depth) => {
    if (!fen) return;

    const cacheEntry = cacheRef.current.get(fen, depth);
    if (cacheEntry && Date.now() - cacheEntry.storedAt < CACHE_TTL_MS) {
      applyCachedResult(cacheEntry);
      return;
    }

    setEngineError(null);

    if (workerRef.current && isEngineReady) {
      sendAnalysisRequest(fen, depth);
    } else if (typeof Worker !== 'undefined') {
      pendingRequestRef.current = { fen, depth };
      initialiseWorker();
    } else {
      runFallbackAnalysis(fen, depth);
    }
  }, [applyCachedResult, initialiseWorker, isEngineReady, runFallbackAnalysis, sendAnalysisRequest]);

  const cleanupEngine = useCallback(() => {
    disposeWorker();
    pendingRequestRef.current = null;
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setIsEngineReady(false);
    setIsAnalyzing(false);
    setBestMove(null);
    setEvaluation(null);
    setEngineError(null);
    setEngineHealthStatus('unknown');
  }, [disposeWorker]);

  const retryEngine = useCallback(() => {
    cleanupEngine();
    setWorkerRestartCount(prev => prev + 1);
    initialiseWorker();
  }, [cleanupEngine, initialiseWorker]);

  const toggleHints = useCallback(() => {
    setShowMoveHints(prev => !prev);
  }, []);

  const clearAnalysis = useCallback(() => {
    setBestMove(null);
    setEvaluation(null);
  }, []);

  const requestHealthCheck = useCallback(() => {
    const worker = workerRef.current;
    if (worker) {
      worker.postMessage({ type: 'HEALTH_CHECK' });
    }
  }, []);

  const forceRestart = useCallback(() => {
    retryEngine();
  }, [retryEngine]);

  return {
    isEngineReady,
  isAnalyzing,
  bestMove,
    evaluation,
    engineError,
    showMoveHints,
    workerRestartCount,
    engineHealthStatus,
    engineStats,
    lastEngineError,
    initializeEngine: initialiseWorker,
    cleanupEngine,
    retryEngine,
    toggleHints,
    clearAnalysis,
    requestAnalysis,
    requestHealthCheck,
    forceRestart,
    setEngineError,
    setIsAnalyzing
  };
};
