import React from 'react';
import { Chessboard } from 'react-chessboard';

/**
 * ChessBoard Component
 * Handles the visual chess board display and user interactions
 */
const ChessBoard = ({ 
  gamePosition, 
  onDrop, 
  onSquareClick, 
  customSquareStyles, 
  boardWidth = 400 
}) => {
  return (
    <div className="chessboard-container">
      <Chessboard
        position={gamePosition}
        onPieceDrop={onDrop}
        onSquareClick={onSquareClick}
        customSquareStyles={customSquareStyles}
        boardWidth={boardWidth}
        showBoardNotation={true}
        boardOrientation="white"
        animationDuration={200}
        areArrowsAllowed={false}
        arePiecesDraggable={true}
        customBoardStyle={{
          borderRadius: '4px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
        }}
        customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
        customDarkSquareStyle={{ backgroundColor: '#b58863' }}
      />
    </div>
  );
};

export default ChessBoard;
