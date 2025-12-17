import React from 'react';

/**
 * GameInfo Component
 * Displays current game state information
 */
const GameInfo = ({ 
  game, 
  moveHistory, 
  historyIndex, 
  getMoveHistorySummary,
  showMoveHistory,
  onToggleMoveHistory 
}) => {
  return (
    <div className="game-info-panel">
      <div style={{ fontSize: "14px", color: "#666", marginBottom: "5px" }}>
        <strong>Turn:</strong> {game.turn() === 'w' ? 'White' : 'Black'} |
        <strong> Move:</strong> {Math.floor(moveHistory.length / 2) + 1}
        {moveHistory.length % 2 === 1 && '.5'}
      </div>
      <div style={{ fontSize: "12px", color: "#888" }}>
        {getMoveHistorySummary()}
      </div>
      {moveHistory.length > 0 && (
        <div style={{ fontSize: "11px", color: "#999", marginTop: "3px" }}>
          History: {historyIndex + 1}/{moveHistory.length} positions
          <button
            onClick={onToggleMoveHistory}
            style={{
              marginLeft: '8px',
              padding: '2px 6px',
              fontSize: '10px',
              backgroundColor: '#e0e0e0',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            {showMoveHistory ? 'Hide' : 'Show'} History
          </button>
        </div>
      )}
    </div>
  );
};

export default GameInfo;
