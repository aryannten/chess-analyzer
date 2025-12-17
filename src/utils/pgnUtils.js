import { Chess } from 'chess.js';

/**
 * Utility functions for PGN (Portable Game Notation) handling
 */

/**
 * Load a PGN string into a chess game
 * @param {string} pgnString - The PGN string to load
 * @returns {Object} - Object containing the game and move history
 */
export const loadPGN = (pgnString) => {
  try {
    const game = new Chess();
    
    // Try to load the PGN - loadPgn returns undefined on success
    try {
      game.loadPgn(pgnString);
    } catch (pgnError) {
      // If loadPgn fails, try to extract just the moves
      const movesOnly = pgnString.replace(/\[[^\]]*\]/g, '').trim();
      if (movesOnly) {
        game.loadPgn(movesOnly);
      } else {
        throw pgnError;
      }
    }

    // Generate move history from the loaded game
    const moveHistory = [];
    const history = game.history({ verbose: true });
    
    // Create a temporary game to replay moves and build history
    const tempGame = new Chess();
    
    history.forEach((move, index) => {
      const moveResult = tempGame.move(move);
      if (moveResult) {
        const historyEntry = {
          move: moveResult,
          fen: tempGame.fen(),
          previousFen: index > 0 ? moveHistory[index - 1].fen : new Chess().fen(),
          timestamp: Date.now(),
          moveNumber: Math.floor(index / 2) + 1,
          turn: tempGame.turn() === 'w' ? 'White' : 'Black',
          san: moveResult.san,
          from: moveResult.from,
          to: moveResult.to,
          piece: moveResult.piece,
          captured: moveResult.captured || null,
          promotion: moveResult.promotion || null,
          flags: moveResult.flags || '',
          isCheck: tempGame.isCheck(),
          isCheckmate: tempGame.isCheckmate(),
          isStalemate: tempGame.isStalemate(),
          isDraw: tempGame.isDraw(),
          legalMoves: tempGame.moves().length
        };
        moveHistory.push(historyEntry);
      }
    });

    return {
      game,
      moveHistory,
      historyIndex: moveHistory.length - 1
    };
  } catch (error) {
    throw new Error(`Failed to load PGN: ${error.message}`);
  }
};

/**
 * Export a chess game to PGN format
 * @param {Chess} game - The chess game instance
 * @param {Array} moveHistory - The move history array
 * @returns {string} - The PGN string
 */
export const exportPGN = (game, moveHistory) => {
  try {
    let pgn = game.pgn();
    
    // Add game metadata if available
    const gameInfo = {
      Event: 'Chess Analyzer Game',
      Date: new Date().toISOString().split('T')[0],
      White: 'Player 1',
      Black: 'Player 2',
      Result: getGameResult(game)
    };

    // Add metadata to PGN
    const metadata = Object.entries(gameInfo)
      .map(([key, value]) => `[${key} "${value}"]`)
      .join('\n');

    return `${metadata}\n\n${pgn}`;
  } catch (error) {
    throw new Error(`Failed to export PGN: ${error.message}`);
  }
};

/**
 * Get the game result for PGN metadata
 * @param {Chess} game - The chess game instance
 * @returns {string} - The game result
 */
const getGameResult = (game) => {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? '0-1' : '1-0';
  } else if (game.isDraw() || game.isStalemate()) {
    return '1/2-1/2';
  } else {
    return '*';
  }
};

/**
 * Validate PGN string format
 * @param {string} pgnString - The PGN string to validate
 * @returns {Object} - Validation result
 */
export const validatePGN = (pgnString) => {
  try {
    const game = new Chess();
    
    try {
      game.loadPgn(pgnString);
      return { valid: true, error: null };
    } catch (pgnError) {
      // Try with moves only
      const movesOnly = pgnString.replace(/\[[^\]]*\]/g, '').trim();
      if (movesOnly) {
        try {
          game.loadPgn(movesOnly);
          return { valid: true, error: null };
        } catch (movesError) {
          return { valid: false, error: movesError.message };
        }
      }
      return { valid: false, error: pgnError.message };
    }
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
};

/**
 * Extract game metadata from PGN
 * @param {string} pgnString - The PGN string
 * @returns {Object} - Game metadata
 */
export const extractPGNMetadata = (pgnString) => {
  const metadata = {};
  const lines = pgnString.split('\n');
  
  lines.forEach(line => {
    const match = line.match(/^\[(\w+)\s+"([^"]+)"\]$/);
    if (match) {
      const [, key, value] = match;
      metadata[key] = value;
    }
  });
  
  return metadata;
};

/**
 * Convert PGN to FEN positions
 * @param {string} pgnString - The PGN string
 * @returns {Array} - Array of FEN positions
 */
export const pgnToFENPositions = (pgnString) => {
  try {
    const game = new Chess();
    
    // Try to load PGN, fallback to moves only
    try {
      game.loadPgn(pgnString);
    } catch (pgnError) {
      const movesOnly = pgnString.replace(/\[[^\]]*\]/g, '').trim();
      if (movesOnly) {
        game.loadPgn(movesOnly);
      } else {
        throw pgnError;
      }
    }
    
    const positions = [];
    const history = game.history({ verbose: true });
    
    // Start with initial position
    const tempGame = new Chess();
    positions.push(tempGame.fen());
    
    // Add each position after each move
    history.forEach(move => {
      tempGame.move(move);
      positions.push(tempGame.fen());
    });
    
    return positions;
  } catch (error) {
    throw new Error(`Failed to convert PGN to FEN: ${error.message}`);
  }
};

/**
 * Create a PGN from move history
 * @param {Array} moveHistory - Array of move history entries
 * @returns {string} - PGN string
 */
export const createPGNFromHistory = (moveHistory) => {
  try {
    const game = new Chess();
    
    moveHistory.forEach(entry => {
      if (entry.move) {
        game.move(entry.move);
      }
    });
    
    return game.pgn();
  } catch (error) {
    throw new Error(`Failed to create PGN from history: ${error.message}`);
  }
};
