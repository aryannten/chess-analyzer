import React from 'react';

/**
 * GameControls Component
 * Handles game control buttons (undo, redo, reset)
 */
const GameControls = ({ 
  onUndo, 
  onRedo, 
  onReset, 
  canUndo, 
  canRedo 
}) => {
  return (
    <div className="game-controls">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`control-button undo-button ${!canUndo ? 'disabled' : ''}`}
        title="Undo last move (Ctrl+U)"
      >
        ↶ Undo
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`control-button redo-button ${!canRedo ? 'disabled' : ''}`}
        title="Redo move (Ctrl+R)"
      >
        ↷ Redo
      </button>

      <button
        onClick={onReset}
        className="control-button reset-button"
        title="Start new game (Ctrl+N)"
      >
        🔄 Reset
      </button>
    </div>
  );
};

export default GameControls;
