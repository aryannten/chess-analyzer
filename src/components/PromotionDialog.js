import React from 'react';

/**
 * PromotionDialog Component
 * Handles pawn promotion piece selection
 */
const PromotionDialog = ({ 
  promotionDialog, 
  onPromotion, 
  onCancel 
}) => {
  if (!promotionDialog) return null;

  const pieces = [
    { piece: 'q', name: 'Queen', symbol: promotionDialog.color === 'w' ? '♕' : '♛' },
    { piece: 'r', name: 'Rook', symbol: promotionDialog.color === 'w' ? '♖' : '♜' },
    { piece: 'b', name: 'Bishop', symbol: promotionDialog.color === 'w' ? '♗' : '♝' },
    { piece: 'n', name: 'Knight', symbol: promotionDialog.color === 'w' ? '♘' : '♞' }
  ];

  return (
    <div className="promotion-dialog">
      <div className="promotion-content">
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>
          Choose Promotion Piece
        </h3>
        <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '14px' }}>
          Promoting pawn from {promotionDialog.from} to {promotionDialog.to}
        </p>
        <div className="promotion-pieces">
          {pieces.map(({ piece, name, symbol }) => (
            <button
              key={piece}
              onClick={() => onPromotion(piece)}
              className="promotion-piece"
              title={`Promote to ${name}`}
            >
              <div>{symbol}</div>
              <div className="promotion-piece-name">{name}</div>
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          style={{
            marginTop: '15px',
            padding: '8px 16px',
            backgroundColor: '#757575',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PromotionDialog;
