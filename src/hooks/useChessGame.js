import { useState, useCallback } from 'react';
import { Chess } from 'chess.js';

/**
 * Custom hook for managing chess game state
 */
export const useChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [gamePosition, setGamePosition] = useState(game.fen());
  const [moveHistory, setMoveHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [gameStatus, setGameStatus] = useState("");

  const resetGame = useCallback(() => {
    const newGame = new Chess();
    setGame(newGame);
    setGamePosition(newGame.fen());
    setMoveHistory([]);
    setHistoryIndex(-1);
    setSelectedSquare(null);
    setPossibleMoves([]);
    setGameStatus("");
    console.log("Game reset to starting position");
  }, []);

  const updateGameStatus = useCallback((chessGame) => {
    try {
      let status = "";
      let statusType = "normal";

      if (chessGame.isCheckmate()) {
        const winner = chessGame.turn() === 'w' ? 'Black' : 'White';
        status = `Checkmate! ${winner} wins.`;
        statusType = "mate";
      } else if (chessGame.isStalemate()) {
        status = "Stalemate! Game is a draw.";
        statusType = "draw";
      } else if (chessGame.isDraw()) {
        if (chessGame.isInsufficientMaterial()) {
          status = "Draw by insufficient material.";
        } else if (chessGame.isThreefoldRepetition()) {
          status = "Draw by threefold repetition.";
        } else {
          status = "Draw! Game Over.";
        }
        statusType = "draw";
      } else if (chessGame.isCheck()) {
        const playerInCheck = chessGame.turn() === 'w' ? 'White' : 'Black';
        status = `${playerInCheck} is in check!`;
        statusType = "check";
      } else {
        const currentPlayer = chessGame.turn() === 'w' ? 'White' : 'Black';
        const legalMoves = chessGame.moves().length;
        status = `${currentPlayer} to move (${legalMoves} legal moves)`;
        statusType = "normal";
      }

      setGameStatus(status);
      return { status, statusType };
    } catch (error) {
      console.error("Game status update error:", error);
      setGameStatus("Error determining game status");
      return { status: "Error", statusType: "error" };
    }
  }, []);

  return {
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
    setGameStatus,
    resetGame,
    updateGameStatus
  };
};
