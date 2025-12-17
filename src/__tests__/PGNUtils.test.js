/**
 * Tests for PGN utility functions
 */

import { loadPGN, exportPGN, validatePGN, extractPGNMetadata, pgnToFENPositions } from '../utils/pgnUtils';
import { Chess } from 'chess.js';

describe('PGN Utilities', () => {
  const samplePGN = `[Event "Test Game"]
[Date "2025-09-30"]
[White "Player 1"]
[Black "Player 2"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 *`;

  const shortPGN = '1. e4 e5 2. Nf3 *';

  test('should load valid PGN correctly', () => {
    const result = loadPGN(samplePGN);
    
    expect(result.game).toBeInstanceOf(Chess);
    expect(result.moveHistory).toHaveLength(10); // 10 moves total
    expect(result.historyIndex).toBe(9); // Last move index
    expect(result.game.fen()).toContain('r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1');
  });

  test('should export PGN with metadata', () => {
    const game = new Chess();
    game.move('e4');
    game.move('e5');
    
    const moveHistory = [
      {
        move: { san: 'e4' },
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
      },
      {
        move: { san: 'e5' },
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
      }
    ];
    
    const pgn = exportPGN(game, moveHistory);
    
    expect(pgn).toContain('[Event "Chess Analyzer Game"]');
    expect(pgn).toContain('1. e4 e5');
    // Date format may vary, just check it exists
    expect(pgn).toMatch(/\[Date "\d{4}-\d{2}-\d{2}"\]/);
  });

  test('should validate PGN correctly', () => {
    const validResult = validatePGN(samplePGN);
    expect(validResult.valid).toBe(true);
    expect(validResult.error).toBeNull();
    
    const invalidResult = validatePGN('invalid pgn string');
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toBeTruthy();
  });

  test('should extract PGN metadata', () => {
    const metadata = extractPGNMetadata(samplePGN);
    
    expect(metadata.Event).toBe('Test Game');
    expect(metadata.Date).toBe('2025-09-30');
    expect(metadata.White).toBe('Player 1');
    expect(metadata.Black).toBe('Player 2');
    expect(metadata.Result).toBe('*');
  });

  test('should convert PGN to FEN positions', () => {
    const positions = pgnToFENPositions(shortPGN);
    
    expect(positions.length).toBeGreaterThanOrEqual(3); // At least starting position + 2 moves
    expect(positions[0]).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(positions[1]).toContain('4P3'); // After e4
    expect(positions[2]).toContain('4p3'); // After e5
  });

  test('should handle empty PGN', () => {
    // Empty PGN should result in empty game, not throw
    const result = loadPGN('');
    expect(result.moveHistory).toHaveLength(0);
    expect(result.historyIndex).toBe(-1);
  });

  test('should handle malformed PGN', () => {
    expect(() => loadPGN('1. e4 invalid-move')).toThrow('Failed to load PGN');
  });

  test('should handle PGN with no moves', () => {
    const emptyGamePGN = `[Event "Empty Game"]
[Result "*"]

*`;
    
    const result = loadPGN(emptyGamePGN);
    expect(result.moveHistory).toHaveLength(0);
    expect(result.historyIndex).toBe(-1);
  });
});