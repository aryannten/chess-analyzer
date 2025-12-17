import React from 'react';

/**
 * MoveHistory Component
 * Displays the game's move history with navigation
 */
const MoveHistory = ({ 
  moveHistory, 
  historyIndex, 
  onJumpToPosition, 
  showMoveHistory 
}) => {
  if (!showMoveHistory || moveHistory.length === 0) return null;

  return (
    <div className="move-history-panel">
      <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2rem', color: '#2c3e50', fontWeight: '700' }}>
        📜 Move History
      </h3>
      <div style={{ fontSize: '12px' }}>
        {moveHistory.map((entry, index) => (
          <div
            key={index}
            className={`move-history-item ${index === historyIndex ? 'active' : ''}`}
            onClick={() => onJumpToPosition(entry, index)}
            title={`Jump to move ${Math.floor(index / 2) + 1}${index % 2 === 0 ? '.' : '...'}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>
                {Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : '...'} {entry.san}
              </span>
              <span style={{ fontSize: '10px', color: '#666' }}>
                {entry.captured && `×${entry.captured}`}
                {entry.isCheck && ' +'}
                {entry.isCheckmate && ' #'}
              </span>
            </div>
            {entry.captured && (
              <div style={{ fontSize: '10px', color: '#888' }}>
                Captured: {entry.captured}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoveHistory;
