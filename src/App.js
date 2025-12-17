import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Chess } from "chess.js";
import "./App.css";

// Hooks
import { useChessGame } from "./hooks/useChessGame";
import { useChessEngine } from "./hooks/useChessEngine";

// Utils
import { validateMove, validatePosition } from "./utils/chessValidation";
import { calculateOptimalDepth } from "./utils/chessAnalysis";
import { loadPGN, exportPGN } from "./utils/pgnUtils";
import { logWorkerDebugInfo } from "./utils/devUtils";

// Lazy load components for better performance
const ChessBoard = lazy(() => import("./components/ChessBoard"));
const GameControls = lazy(() => import("./components/GameControls"));
const GameInfo = lazy(() => import("./components/GameInfo"));
const EngineStatus = lazy(() => import("./components/EngineStatus"));
const PromotionDialog = lazy(() => import("./components/PromotionDialog"));
const MoveHistory = lazy(() => import("./components/MoveHistory"));
const PGNManager = lazy(() => import("./components/PGNManager"));
const AdvancedAnalysis = lazy(() => import("./components/AdvancedAnalysis"));

function App() {
  // Game state
  const {
    game,
    setGame,
    gamePosition,
    setGamePosition,
    moveHistory,
    setMoveHistory,
    historyIndex,
    setHistoryIndex,
    selectedSquare,
    setSelectedSquare,
    possibleMoves,
    setPossibleMoves,
    gameStatus,
    resetGame,
    updateGameStatus
  } = useChessGame();

  // Engine state
  const {
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
    initializeEngine,
    cleanupEngine,
    retryEngine,
    toggleHints,
    clearAnalysis,
    requestAnalysis: requestEngineAnalysis,
    requestHealthCheck,
    forceRestart
  } = useChessEngine();

  // UI state
  const [moveValidationError, setMoveValidationError] = useState(null);
  const [gameStateValidationError, setGameStateValidationError] = useState(null);
  const [promotionDialog, setPromotionDialog] = useState(null);
  const [showMoveHistory, setShowMoveHistory] = useState(false);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [analysisDepth, setAnalysisDepth] = useState(15);
  const [showEngineStatusDetails, setShowEngineStatusDetails] = useState(false);

  // Define functions first
  const requestAnalysis = useCallback(() => {
    if (isAnalyzing) return;

    try {
      clearAnalysis();
      const optimalDepth = calculateOptimalDepth(game, moveHistory);
      requestEngineAnalysis(gamePosition, optimalDepth);
    } catch (error) {
      console.error('Failed to request analysis:', error);
    }
  }, [isAnalyzing, game, moveHistory, gamePosition, clearAnalysis, requestEngineAnalysis]);

  const validateGameState = useCallback(() => {
    try {
      const positionCheck = validatePosition(gamePosition);
      if (!positionCheck.valid) {
        return { valid: false, error: `Invalid position: ${positionCheck.error}` };
      }

      if (moveHistory.length > 0) {
        const lastHistoryEntry = moveHistory[historyIndex];
        if (lastHistoryEntry && lastHistoryEntry.fen !== gamePosition) {
          return { valid: false, error: "Position doesn't match move history" };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error("Game state validation error:", error);
      return { valid: false, error: "Game state validation failed" };
    }
  }, [gamePosition, moveHistory, historyIndex]);

  const makeAMove = useCallback((move) => {
    console.log("Attempting move:", move);

    try {
      const validation = validateMove(move, game);
      if (!validation.valid) {
        console.log("Move validation failed:", validation.error);
        setMoveValidationError(validation.error);
        setTimeout(() => setMoveValidationError(null), 3000);
        return false;
      }

      setMoveValidationError(null);
      const { moveResult, newPosition } = validation;

      const positionValidation = validatePosition(newPosition.fen());
      if (!positionValidation.valid) {
        console.error("Resulting position is invalid:", positionValidation.error);
        return false;
      }

      const newHistory = moveHistory.slice(0, historyIndex + 1);
      const historyEntry = {
        move: moveResult,
        fen: newPosition.fen(),
        previousFen: game.fen(),
        timestamp: Date.now(),
        moveNumber: Math.floor(newHistory.length / 2) + 1,
        turn: game.turn() === 'w' ? 'White' : 'Black',
        san: moveResult.san,
        from: moveResult.from,
        to: moveResult.to,
        piece: moveResult.piece,
        captured: moveResult.captured || null,
        promotion: moveResult.promotion || null,
        flags: moveResult.flags || '',
        isCheck: newPosition.isCheck(),
        isCheckmate: newPosition.isCheckmate(),
        isStalemate: newPosition.isStalemate(),
        isDraw: newPosition.isDraw(),
        legalMoves: newPosition.moves().length
      };

      newHistory.push(historyEntry);
      setMoveHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setGame(newPosition);
      setGamePosition(newPosition.fen());
      updateGameStatus(newPosition);
      clearAnalysis();

      console.log("Move successful:", moveResult);
      return true;
    } catch (error) {
      console.error("Error in makeAMove:", error);
      return false;
    }
  }, [game, moveHistory, historyIndex, setMoveHistory, setHistoryIndex, setGame, setGamePosition, updateGameStatus, clearAnalysis, setMoveValidationError]);

  const onDrop = useCallback((sourceSquare, targetSquare) => {
    console.log("onDrop called:", sourceSquare, "->", targetSquare);

    try {
      const piece = game.get(sourceSquare);
      if (piece && piece.type === 'p') {
        const targetRank = targetSquare[1];
        const isPromotion = (piece.color === 'w' && targetRank === '8') ||
          (piece.color === 'b' && targetRank === '1');

        if (isPromotion) {
          setPromotionDialog({
            from: sourceSquare,
            to: targetSquare,
            color: piece.color
          });
          return false;
        }
      }

      const moveSuccess = makeAMove({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      setSelectedSquare(null);
      setPossibleMoves([]);
      return moveSuccess;
    } catch (error) {
      console.error("Error in onDrop:", error);
      setSelectedSquare(null);
      setPossibleMoves([]);
      return false;
    }
  }, [game, makeAMove, setSelectedSquare, setPossibleMoves, setPromotionDialog]);

  const onSquareClick = useCallback((square) => {
    try {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      if (selectedSquare) {
        const piece = game.get(selectedSquare);
        if (piece && piece.type === 'p') {
          const targetRank = square[1];
          const isPromotion = (piece.color === 'w' && targetRank === '8') ||
            (piece.color === 'b' && targetRank === '1');

          if (isPromotion) {
            setPromotionDialog({
              from: selectedSquare,
              to: square,
              color: piece.color
            });
            setSelectedSquare(null);
            setPossibleMoves([]);
            return;
          }
        }

        makeAMove({
          from: selectedSquare,
          to: square,
          promotion: 'q',
        });

        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        try {
          const moves = game.moves({ square, verbose: true });
          setPossibleMoves(moves.map(move => move.to));
          console.log(`Selected ${piece.type} on ${square}, ${moves.length} possible moves`);
        } catch (error) {
          console.error("Error getting possible moves:", error);
          setPossibleMoves([]);
        }
      } else {
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    } catch (error) {
      console.error("Error in onSquareClick:", error);
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  }, [selectedSquare, game, makeAMove, setSelectedSquare, setPossibleMoves, setPromotionDialog]);

  const undoMove = useCallback(() => {
    try {
      if (historyIndex >= 0) {
        const previousIndex = historyIndex - 1;
        let targetFen;

        if (previousIndex >= 0) {
          const previousState = moveHistory[previousIndex];
          targetFen = previousState.fen;
        } else {
          targetFen = new Chess().fen();
        }

        const positionValidation = validatePosition(targetFen);
        if (!positionValidation.valid) {
          console.error("Cannot undo to invalid position:", positionValidation.error);
          return false;
        }

        const newGame = positionValidation.game;
        setGame(newGame);
        setGamePosition(targetFen);
        setHistoryIndex(previousIndex);
        setSelectedSquare(null);
        setPossibleMoves([]);
        updateGameStatus(newGame);
        clearAnalysis();

        console.log("Undo successful to position:", targetFen);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error in undoMove:", error);
      return false;
    }
  }, [historyIndex, moveHistory, setGame, setGamePosition, setHistoryIndex, setSelectedSquare, setPossibleMoves, updateGameStatus, clearAnalysis]);

  const redoMove = useCallback(() => {
    try {
      if (historyIndex < moveHistory.length - 1) {
        const nextIndex = historyIndex + 1;
        const nextState = moveHistory[nextIndex];

        const positionValidation = validatePosition(nextState.fen);
        if (!positionValidation.valid) {
          console.error("Cannot redo to invalid position:", positionValidation.error);
          return false;
        }

        const newGame = positionValidation.game;
        setGame(newGame);
        setGamePosition(nextState.fen);
        setHistoryIndex(nextIndex);
        setSelectedSquare(null);
        setPossibleMoves([]);
        updateGameStatus(newGame);
        clearAnalysis();

        console.log("Redo successful to position:", nextState.fen);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error in redoMove:", error);
      return false;
    }
  }, [historyIndex, moveHistory, setGame, setGamePosition, setHistoryIndex, setSelectedSquare, setPossibleMoves, updateGameStatus, clearAnalysis]);

  const makeSuggestedMove = useCallback(() => {
    if (!bestMove) return;

    const fromSquare = bestMove.slice(0, 2);
    const toSquare = bestMove.slice(2, 4);
    const promotion = bestMove.slice(4);

    const moveSuccess = makeAMove({
      from: fromSquare,
      to: toSquare,
      promotion: promotion || 'q'
    });

    if (moveSuccess) {
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  }, [bestMove, makeAMove, setSelectedSquare, setPossibleMoves]);

  // Initialize engine on mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 App initializing in development mode');
      logWorkerDebugInfo();
    }
    initializeEngine();
    return () => {
      cleanupEngine();
    };
  }, [initializeEngine, cleanupEngine]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || promotionDialog) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'u':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            undoMove();
          }
          break;
        case 'r':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            redoMove();
          }
          break;
        default:
          // No action for other keys
          break;
        case 'n':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            resetGame();
          }
          break;
        case 'h':
          if (!event.ctrlKey && !event.metaKey) {
            toggleHints();
          }
          break;
        case 'escape':
          setSelectedSquare(null);
          setPossibleMoves([]);
          if (promotionDialog) {
            setPromotionDialog(null);
          }
          break;
        case 'enter':
          if (bestMove && !isAnalyzing) {
            makeSuggestedMove();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [bestMove, isAnalyzing, promotionDialog, toggleHints, undoMove, redoMove, resetGame, makeSuggestedMove, setSelectedSquare, setPossibleMoves]);

  // Analysis debouncing
  useEffect(() => {
    if (isEngineReady && !isAnalyzing && gamePosition) {
      const moveCount = moveHistory.length;
      const isOpening = moveCount < 20;
      const isEndgame = moveCount > 60;

      let debounceTime = 300;
      if (isOpening) {
        debounceTime = 200;
      } else if (isEndgame) {
        debounceTime = 150;
      } else {
        debounceTime = 400;
      }

      const timer = setTimeout(() => {
        requestAnalysis();
      }, debounceTime);

      return () => clearTimeout(timer);
    }
  }, [gamePosition, isEngineReady, isAnalyzing, moveHistory, requestAnalysis]);

  // Game state validation
  useEffect(() => {
    const validateState = () => {
      const validation = validateGameState();
      if (!validation.valid) {
        console.error("Game state validation failed:", validation.error);
        setGameStateValidationError(validation.error);
        setTimeout(() => setGameStateValidationError(null), 5000);
      } else {
        setGameStateValidationError(null);
      }
    };

    validateState();
    const validationInterval = setInterval(validateState, 30000);
    return () => clearInterval(validationInterval);
  }, [gamePosition, moveHistory, historyIndex, validateGameState]);

  const handlePromotion = (piece) => {
    if (!promotionDialog) return;

    const moveSuccess = makeAMove({
      from: promotionDialog.from,
      to: promotionDialog.to,
      promotion: piece,
    });

    setPromotionDialog(null);
    console.log("Promotion move result:", moveSuccess);
  };

  const cancelPromotion = () => {
    setPromotionDialog(null);
  };

  const getCustomSquareStyles = () => {
    const styles = {};

    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: "rgba(255, 255, 0, 0.4)"
      };
    }

    possibleMoves.forEach(square => {
      styles[square] = {
        background: "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        borderRadius: "50%"
      };
    });

    if (bestMove && !isAnalyzing && showMoveHints) {
      const fromSquare = bestMove.slice(0, 2);
      const toSquare = bestMove.slice(2, 4);

      styles[fromSquare] = {
        backgroundColor: "rgba(33, 150, 243, 0.6)",
        border: "3px solid #1976d2"
      };

      styles[toSquare] = {
        backgroundColor: "rgba(76, 175, 80, 0.6)",
        border: "3px solid #388e3c"
      };
    }

    return styles;
  };

  const getMoveHistorySummary = () => {
    if (moveHistory.length === 0) return "No moves played";

    const totalMoves = moveHistory.length;
    const currentMove = historyIndex + 1;
    const lastMove = moveHistory[historyIndex];

    if (lastMove) {
      return `Move ${currentMove}/${totalMoves}: ${lastMove.move.san}`;
    }

    return `Position: Start (${currentMove}/${totalMoves})`;
  };

  const formatMove = (move) => {
    if (!move) return '';

    if (move.length === 4) {
      return `${move.slice(0, 2)}-${move.slice(2, 4)}`;
    } else if (move.length === 5) {
      return `${move.slice(0, 2)}-${move.slice(2, 4)}=${move.slice(4).toUpperCase()}`;
    }

    return move;
  };

  const getEvaluationColor = (evaluation) => {
    if (!evaluation) return '#666';

    if (evaluation.startsWith('M')) {
      return '#d32f2f';
    }

    const numValue = parseFloat(evaluation);
    if (numValue > 1) return '#2e7d32';
    if (numValue > 0) return '#388e3c';
    if (numValue < -1) return '#d32f2f';
    if (numValue < 0) return '#f57c00';

    return '#666';
  };

  const onJumpToPosition = (entry, index) => {
    const targetGame = new Chess(entry.fen);
    setGame(targetGame);
    setGamePosition(entry.fen);
    setHistoryIndex(index);
    updateGameStatus(targetGame);
    clearAnalysis();
  };

  // PGN handling functions
  const handleLoadPGN = useCallback(async (pgnString) => {
    try {
      const { game: newGame, moveHistory: newMoveHistory, historyIndex: newHistoryIndex } = loadPGN(pgnString);
      
      setGame(newGame);
      setGamePosition(newGame.fen());
      setMoveHistory(newMoveHistory);
      setHistoryIndex(newHistoryIndex);
      setSelectedSquare(null);
      setPossibleMoves([]);
      updateGameStatus(newGame);
      clearAnalysis();
      
      console.log('PGN loaded successfully');
    } catch (error) {
      console.error('Error loading PGN:', error);
      throw error;
    }
  }, [setGame, setGamePosition, setMoveHistory, setHistoryIndex, setSelectedSquare, setPossibleMoves, updateGameStatus, clearAnalysis]);

  const handleExportPGN = useCallback(async () => {
    try {
      const pgn = exportPGN(game, moveHistory);
      return pgn;
    } catch (error) {
      console.error('Error exporting PGN:', error);
      throw error;
    }
  }, [game, moveHistory]);

  // Advanced analysis functions
  const handleAnalyzePosition = useCallback(() => {
    requestAnalysis();
  }, [requestAnalysis]);

  const handleSetAnalysisDepth = useCallback((depth) => {
    setAnalysisDepth(depth);
  }, []);

  const handleToggleAdvancedMode = useCallback(() => {
    setIsAdvancedMode(prev => !prev);
  }, []);

  const LoadingSpinner = () => (
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>Loading component...</p>
    </div>
  );

  return (
    <div className="App">
      <div className="app-header">
        <h1 className="app-title">♟ Chess Analyzer</h1>
        <p className="app-subtitle">Advanced chess analysis with AI-powered insights</p>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <GameControls
          onUndo={undoMove}
          onRedo={redoMove}
          onReset={resetGame}
          canUndo={historyIndex >= 0}
          canRedo={historyIndex < moveHistory.length - 1}
        />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <PGNManager
          game={game}
          moveHistory={moveHistory}
          onLoadPGN={handleLoadPGN}
          onExportPGN={handleExportPGN}
        />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <AdvancedAnalysis
          isAnalyzing={isAnalyzing}
          bestMove={bestMove}
          evaluation={evaluation}
          onAnalyzePosition={handleAnalyzePosition}
          onSetAnalysisDepth={handleSetAnalysisDepth}
          analysisDepth={analysisDepth}
          onToggleAdvancedMode={handleToggleAdvancedMode}
          isAdvancedMode={isAdvancedMode}
        />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <ChessBoard
          gamePosition={gamePosition}
          onDrop={onDrop}
          onSquareClick={onSquareClick}
          customSquareStyles={getCustomSquareStyles()}
          boardWidth={400}
        />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <GameInfo
          game={game}
          moveHistory={moveHistory}
          historyIndex={historyIndex}
          getMoveHistorySummary={getMoveHistorySummary}
          showMoveHistory={showMoveHistory}
          onToggleMoveHistory={() => setShowMoveHistory(!showMoveHistory)}
        />
      </Suspense>

      {gameStatus && (
        <div className={`game-status ${
          gameStatus.includes('Check') ? 'check' :
          gameStatus.includes('Checkmate') ? 'checkmate' :
          gameStatus.includes('Draw') || gameStatus.includes('Stalemate') ? 'draw' : 'normal'
        }`}>
          {gameStatus}
        </div>
      )}

      {moveValidationError && (
        <div className="error-message">
          <strong>Invalid Move:</strong> {moveValidationError}
        </div>
      )}

      {gameStateValidationError && (
        <div className="error-message">
          <strong>Game State Error:</strong> {gameStateValidationError}
        </div>
      )}

      <Suspense fallback={<LoadingSpinner />}>
        <EngineStatus
          isEngineReady={isEngineReady}
          isAnalyzing={isAnalyzing}
          bestMove={bestMove}
          evaluation={evaluation}
          engineError={engineError}
          showMoveHints={showMoveHints}
          onToggleHints={toggleHints}
          onMakeSuggestedMove={makeSuggestedMove}
          onRetryEngine={retryEngine}
          formatMove={formatMove}
          getEvaluationColor={getEvaluationColor}
          engineHealthStatus={engineHealthStatus}
          workerRestartCount={workerRestartCount}
          engineStats={engineStats}
          lastEngineError={lastEngineError}
          onHealthCheck={requestHealthCheck}
          onForceRestart={forceRestart}
          showEngineStatus={showEngineStatusDetails}
          onToggleEngineStatus={() => setShowEngineStatusDetails(prev => !prev)}
        />
      </Suspense>

      {selectedSquare && (
        <div style={{
          color: '#666',
          fontSize: '14px',
          marginTop: '10px',
          padding: '8px',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
          maxWidth: '400px',
          margin: '10px auto'
        }}>
          <div><strong>Selected:</strong> {selectedSquare}</div>
          <div><strong>Possible moves:</strong> {possibleMoves.length}</div>
          {possibleMoves.length > 0 && (
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              <strong>Valid targets:</strong> {possibleMoves.join(', ')}
            </div>
          )}
        </div>
      )}

      <Suspense fallback={<LoadingSpinner />}>
        <PromotionDialog
          promotionDialog={promotionDialog}
          onPromotion={handlePromotion}
          onCancel={cancelPromotion}
        />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <MoveHistory
          moveHistory={moveHistory}
          historyIndex={historyIndex}
          onJumpToPosition={onJumpToPosition}
          showMoveHistory={showMoveHistory}
        />
      </Suspense>

      <div style={{
        marginTop: '20px',
        fontSize: '11px',
        color: '#999',
        maxWidth: '400px',
        margin: '20px auto'
      }}>
        <strong>Keyboard shortcuts:</strong> Ctrl+U (Undo), Ctrl+R (Redo), Ctrl+N (New Game), H (Toggle Hints), Enter (Play Suggestion), Esc (Clear Selection)
      </div>
    </div>
  );
}

export default App;
