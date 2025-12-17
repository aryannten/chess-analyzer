import { Chess } from 'chess.js';

const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0
};

const CENTER_SQUARES = new Set(['d4', 'd5', 'e4', 'e5']);
const EXTENDED_CENTER = new Set([
  'c3', 'c4', 'c5', 'c6',
  'd3', 'd6', 'e3', 'e6',
  'f3', 'f4', 'f5', 'f6'
]);

const DEVELOPMENT_SQUARES = {
  w: ['b1', 'g1', 'c1', 'f1'],
  b: ['b8', 'g8', 'c8', 'f8']
};

const MAX_CACHE_SIZE = 128;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Calculates an optimal analysis depth based on simple heuristics.
 */
export const calculateOptimalDepth = (game, moveHistory) => {
  try {
    const moveCount = moveHistory.length;
    const totalPieces = game.board().flat().filter(Boolean).length;
    const legalMoves = game.moves().length;

    let depth = 10;

    if (moveCount < 15) {
      depth = 10;
    } else if (moveCount < 40 && totalPieces > 20) {
      depth = 12;
    } else if (totalPieces <= 12) {
      depth = 14;
    } else {
      depth = 12;
    }

    if (legalMoves > 35) {
      depth -= 2;
    } else if (legalMoves < 10) {
      depth += 1;
    }

    if (game.isCheck()) {
      depth = Math.max(depth, 12);
    }

    return clamp(depth, 8, 18);
  } catch (error) {
    console.error('Error calculating optimal depth:', error);
    return 12;
  }
};

const evaluateMaterial = (game) => {
  let score = 0;
  const board = game.board();

  for (const row of board) {
    for (const square of row) {
      if (!square) continue;
      const value = PIECE_VALUES[square.type] ?? 0;
      score += square.color === 'w' ? value : -value;
    }
  }

  return score;
};

const evaluateCenterControl = (game) => {
  let score = 0;

  for (const square of CENTER_SQUARES) {
    const piece = game.get(square);
    if (!piece) continue;

    const bonus = piece.type === 'p' ? 15 : 25;
    score += piece.color === 'w' ? bonus : -bonus;
  }

  for (const square of EXTENDED_CENTER) {
    const piece = game.get(square);
    if (!piece) continue;

    score += piece.color === 'w' ? 8 : -8;
  }

  return score;
};

const evaluateKingSafety = (game) => {
  const board = game.board();
  let whiteKing, blackKing;
  let totalPieces = 0;

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = board[rank][file];
      if (!square) continue;
      totalPieces += 1;
      if (square.type === 'k') {
        const fileChar = String.fromCharCode(97 + file);
        const rankChar = (8 - rank).toString();
        const data = { file: fileChar, rank: rankChar, color: square.color };
        if (square.color === 'w') {
          whiteKing = data;
        } else {
          blackKing = data;
        }
      }
    }
  }

  if (!whiteKing || !blackKing) {
    return 0;
  }

  let score = 0;

  const isEndgame = totalPieces <= 12;

  if (isEndgame) {
    const centerFiles = { d: 1, e: 1 }; // Encourage centralization
    const centerRanks = { '4': 1, '5': 1 };

    if (centerFiles[whiteKing.file]) score += 20;
    if (centerFiles[blackKing.file]) score -= 20;
    if (centerRanks[whiteKing.rank]) score += 20;
    if (centerRanks[blackKing.rank]) score -= 20;
  } else {
    const castledFiles = ['c', 'g'];
    if (castledFiles.includes(whiteKing.file)) score += 30;
    if (castledFiles.includes(blackKing.file)) score -= 30;
  }

  return score;
};

const evaluateDevelopment = (game) => {
  const moveNumber = game.moveNumber();
  if (moveNumber > 10) {
    return 0;
  }

  let score = 0;
  for (const square of DEVELOPMENT_SQUARES.w) {
    const piece = game.get(square);
    if (!piece || (piece.type !== 'n' && piece.type !== 'b')) {
      score += 10;
    }
  }

  for (const square of DEVELOPMENT_SQUARES.b) {
    const piece = game.get(square);
    if (!piece || (piece.type !== 'n' && piece.type !== 'b')) {
      score -= 10;
    }
  }

  return score;
};

const evaluatePosition = (game) => {
  const material = evaluateMaterial(game);
  const center = evaluateCenterControl(game);
  const kingSafety = evaluateKingSafety(game);
  const development = evaluateDevelopment(game);

  return material + center + kingSafety + development;
};

const toEvaluationString = (score, matePly = null) => {
  if (matePly !== null) {
    return matePly > 0 ? `M${matePly}` : `M${matePly}`;
  }
  return (score / 100).toFixed(2);
};

const normaliseScoreForPerspective = (score, perspective) => {
  return perspective === 'w' ? score : -score;
};

const generateCacheKey = (fen, depth) => `${fen}|${depth}`;

/**
 * Performs a single-ply heuristic search and returns the best move suggestion.
 */
export const analyzePosition = (fen, depth = 12) => {
  const start = Date.now();
  const baseGame = new Chess(fen);
  const perspective = baseGame.turn();
  const moves = baseGame.moves({ verbose: true });

  if (moves.length === 0) {
    return {
      bestMove: null,
      bestMoveSan: null,
      evaluation: baseGame.isCheckmate() ? 'M-1' : '0.00',
      depth: depth,
      nodesEvaluated: 0,
      analysisTime: 0
    };
  }

  let bestMove = null;
  let bestScore = -Infinity;
  let bestEvaluationCp = 0;
  let mateIn = null;
  let nodes = 0;

  for (const move of moves) {
    const tempGame = new Chess(fen);
    const moveResult = tempGame.move(move);
    if (!moveResult) continue;

    nodes += 1;

    if (tempGame.isCheckmate()) {
      const score = 100000 - nodes;
      const normalised = normaliseScoreForPerspective(score, perspective);
      if (normalised > bestScore) {
        bestScore = normalised;
        bestMove = moveResult;
        bestEvaluationCp = score;
        mateIn = 1;
      }
      continue;
    }

    let score = evaluatePosition(tempGame);
    score = normaliseScoreForPerspective(score, perspective);

    if (moveResult.captured) {
      const capturedValue = PIECE_VALUES[moveResult.captured] ?? 0;
      const attackerValue = PIECE_VALUES[moveResult.piece] ?? 0;
      score += capturedValue - attackerValue / 2;
    }

    if (moveResult.promotion) {
      const promotionValue = PIECE_VALUES[moveResult.promotion] ?? 0;
      score += promotionValue - PIECE_VALUES.p;
    }

    if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
      score += 40;
    }

    if (tempGame.isCheck()) {
      score += 30;
    }

    const mobilityPenalty = tempGame.moves().length * 2;
    score -= mobilityPenalty;

    if (score > bestScore) {
      bestScore = score;
      bestMove = moveResult;
      bestEvaluationCp = score;
      mateIn = null;
    }
  }

  const evaluation = mateIn
    ? (perspective === 'w' ? `M${mateIn}` : `M-${mateIn}`)
    : toEvaluationString(bestEvaluationCp);

  return {
    bestMove: bestMove ? `${bestMove.from}${bestMove.to}${bestMove.promotion || ''}` : null,
    bestMoveSan: bestMove?.san ?? null,
    evaluation,
    depth,
    nodesEvaluated: nodes,
    analysisTime: Date.now() - start
  };
};

/**
 * Simple in-memory cache helper for consumers that want memoisation.
 */
export const createAnalysisCache = () => {
  const cache = new Map();

  return {
    get(fen, depth) {
      return cache.get(generateCacheKey(fen, depth));
    },
    set(fen, depth, value) {
      const key = generateCacheKey(fen, depth);
      if (!cache.has(key) && cache.size >= MAX_CACHE_SIZE) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
      cache.set(key, value);
    },
    clear() {
      cache.clear();
    }
  };
};

export default analyzePosition;
