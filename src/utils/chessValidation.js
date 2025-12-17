import { Chess } from 'chess.js';

/**
 * Validates a chess move
 */
export const validateMove = (move, game) => {
  try {
    if (!move || typeof move !== 'object') {
      return { valid: false, error: "Invalid move object" };
    }

    if (!move.from || !move.to) {
      return { valid: false, error: "Missing from or to square" };
    }

    const squareRegex = /^[a-h][1-8]$/;
    if (!squareRegex.test(move.from) || !squareRegex.test(move.to)) {
      return { valid: false, error: "Invalid square notation" };
    }

    if (move.from === move.to) {
      return { valid: false, error: "Cannot move to the same square" };
    }

    const piece = game.get(move.from);
    if (!piece) {
      return { valid: false, error: "No piece on source square" };
    }

    if (piece.color !== game.turn()) {
      return { valid: false, error: "Not your turn" };
    }

    const targetPiece = game.get(move.to);
    if (targetPiece && targetPiece.color === piece.color) {
      return { valid: false, error: "Cannot capture your own piece" };
    }

    const gameCopy = new Chess(game.fen());
    const result = gameCopy.move(move);

    if (!result) {
      const moves = game.moves({ square: move.from, verbose: true });
      const validTargets = moves.map(m => m.to);

      if (moves.length === 0) {
        return { valid: false, error: "No legal moves from this square" };
      } else if (!validTargets.includes(move.to)) {
        return { valid: false, error: "Invalid move for this piece" };
      }

      return { valid: false, error: "Illegal move" };
    }

    if (result.flags) {
      if (result.flags.includes('k') || result.flags.includes('q')) {
        if (game.isCheck()) {
          return { valid: false, error: "Cannot castle while in check" };
        }
      }

      if (result.flags.includes('p')) {
        if (!move.promotion || !['q', 'r', 'b', 'n'].includes(move.promotion)) {
          return { valid: false, error: "Invalid promotion piece" };
        }
      }
    }

    return { valid: true, moveResult: result, newPosition: gameCopy };
  } catch (error) {
    console.error("Move validation error:", error);
    return { valid: false, error: "Move validation failed" };
  }
};

/**
 * Validates a chess position (FEN)
 */
export const validatePosition = (fen) => {
  try {
    if (!fen || typeof fen !== 'string') {
      return { valid: false, error: "Invalid FEN string" };
    }

    const fenParts = fen.trim().split(' ');
    if (fenParts.length !== 6) {
      return { valid: false, error: "FEN must have exactly 6 parts" };
    }

    const testGame = new Chess(fen);
    const board = testGame.board();
    let whiteKingCount = 0;
    let blackKingCount = 0;
    let whitePawnCount = 0;
    let blackPawnCount = 0;

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          if (piece.type === 'k') {
            if (piece.color === 'w') whiteKingCount++;
            else blackKingCount++;
          } else if (piece.type === 'p') {
            if (piece.color === 'w') whitePawnCount++;
            else blackPawnCount++;

            if (rank === 0 || rank === 7) {
              return { valid: false, error: "Pawns cannot be on first or last rank" };
            }
          }
        }
      }
    }

    if (whiteKingCount !== 1 || blackKingCount !== 1) {
      return { valid: false, error: "Each side must have exactly one king" };
    }

    if (whitePawnCount > 8 || blackPawnCount > 8) {
      return { valid: false, error: "Too many pawns for one side" };
    }

    const turn = fenParts[1];
    if (turn !== 'w' && turn !== 'b') {
      return { valid: false, error: "Invalid turn indicator" };
    }

    const castling = fenParts[2];
    if (!/^(-|[KQkq]+)$/.test(castling)) {
      return { valid: false, error: "Invalid castling rights format" };
    }

    const enPassant = fenParts[3];
    if (enPassant !== '-' && !/^[a-h][36]$/.test(enPassant)) {
      return { valid: false, error: "Invalid en passant square format" };
    }

    return { valid: true, game: testGame };
  } catch (error) {
    console.error("Position validation error:", error);
    return { valid: false, error: "Invalid chess position" };
  }
};
