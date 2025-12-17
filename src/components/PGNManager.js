import React, { useState } from 'react';

const PGNManager = ({ 
  game, 
  moveHistory, 
  onLoadPGN, 
  onExportPGN,
  onSaveGame,
  onLoadGame 
}) => {
  const [pgnText, setPgnText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [savedGames, setSavedGames] = useState([]);
  const [gameName, setGameName] = useState('');

  // Load saved games from localStorage on component mount
  React.useEffect(() => {
    const saved = localStorage.getItem('chess-analyzer-saved-games');
    if (saved) {
      try {
        setSavedGames(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved games:', error);
      }
    }
  }, []);

  const handleImportPGN = async () => {
    if (!pgnText.trim()) return;
    
    setIsImporting(true);
    try {
      await onLoadPGN(pgnText);
      setPgnText('');
      setShowImportDialog(false);
    } catch (error) {
      console.error('Error importing PGN:', error);
      alert('Error importing PGN: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportPGN = async () => {
    setIsExporting(true);
    try {
      const pgn = await onExportPGN();
      setPgnText(pgn);
      setShowExportDialog(true);
    } catch (error) {
      console.error('Error exporting PGN:', error);
      alert('Error exporting PGN: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveGame = () => {
    if (!gameName.trim()) {
      alert('Please enter a game name');
      return;
    }

    const gameData = {
      id: Date.now(),
      name: gameName,
      pgn: game.pgn(),
      fen: game.fen(),
      moveHistory: moveHistory,
      timestamp: new Date().toISOString()
    };

    const updatedSavedGames = [...savedGames, gameData];
    setSavedGames(updatedSavedGames);
    localStorage.setItem('chess-analyzer-saved-games', JSON.stringify(updatedSavedGames));
    
    setGameName('');
    setShowSaveDialog(false);
    alert('Game saved successfully!');
  };

  const handleLoadGame = (gameData) => {
    try {
      onLoadPGN(gameData.pgn);
      setShowLoadDialog(false);
    } catch (error) {
      console.error('Error loading game:', error);
      alert('Error loading game: ' + error.message);
    }
  };

  const handleDeleteGame = (gameId) => {
    const updatedSavedGames = savedGames.filter(game => game.id !== gameId);
    setSavedGames(updatedSavedGames);
    localStorage.setItem('chess-analyzer-saved-games', JSON.stringify(updatedSavedGames));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pgnText).then(() => {
      alert('PGN copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  return (
    <div className="pgn-manager">
      <div className="pgn-controls">
        <button
          onClick={() => setShowImportDialog(true)}
          className="control-button import-button"
          title="Import PGN from text"
        >
          📥 Import PGN
        </button>
        
        <button
          onClick={handleExportPGN}
          disabled={isExporting}
          className="control-button export-button"
          title="Export current game as PGN"
        >
          {isExporting ? '⏳' : '📤'} Export PGN
        </button>
        
        <button
          onClick={() => setShowSaveDialog(true)}
          className="control-button save-button"
          title="Save current game"
        >
          💾 Save Game
        </button>
        
        <button
          onClick={() => setShowLoadDialog(true)}
          className="control-button load-button"
          title="Load saved game"
        >
          📂 Load Game
        </button>
      </div>

      {/* Import PGN Dialog */}
      {showImportDialog && (
        <div className="pgn-dialog">
          <div className="pgn-dialog-content">
            <h3>Import PGN</h3>
            <textarea
              value={pgnText}
              onChange={(e) => setPgnText(e.target.value)}
              placeholder="Paste PGN text here..."
              rows={8}
              className="pgn-textarea"
            />
            <div className="pgn-dialog-buttons">
              <button
                onClick={handleImportPGN}
                disabled={isImporting || !pgnText.trim()}
                className="control-button primary"
              >
                {isImporting ? 'Importing...' : 'Import'}
              </button>
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setPgnText('');
                }}
                className="control-button secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export PGN Dialog */}
      {showExportDialog && (
        <div className="pgn-dialog">
          <div className="pgn-dialog-content">
            <h3>Export PGN</h3>
            <textarea
              value={pgnText}
              readOnly
              rows={8}
              className="pgn-textarea"
            />
            <div className="pgn-dialog-buttons">
              <button
                onClick={copyToClipboard}
                className="control-button primary"
              >
                📋 Copy to Clipboard
              </button>
              <button
                onClick={() => setShowExportDialog(false)}
                className="control-button secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Game Dialog */}
      {showSaveDialog && (
        <div className="pgn-dialog">
          <div className="pgn-dialog-content">
            <h3>Save Game</h3>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="Enter game name..."
              className="pgn-input"
            />
            <div className="pgn-dialog-buttons">
              <button
                onClick={handleSaveGame}
                disabled={!gameName.trim()}
                className="control-button primary"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setGameName('');
                }}
                className="control-button secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Game Dialog */}
      {showLoadDialog && (
        <div className="pgn-dialog">
          <div className="pgn-dialog-content">
            <h3>Load Saved Game</h3>
            {savedGames.length === 0 ? (
              <p>No saved games found.</p>
            ) : (
              <div className="saved-games-list">
                {savedGames.map((game) => (
                  <div key={game.id} className="saved-game-item">
                    <div className="saved-game-info">
                      <div className="saved-game-name">{game.name}</div>
                      <div className="saved-game-date">
                        {new Date(game.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="saved-game-actions">
                      <button
                        onClick={() => handleLoadGame(game)}
                        className="control-button small primary"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteGame(game.id)}
                        className="control-button small danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="pgn-dialog-buttons">
              <button
                onClick={() => setShowLoadDialog(false)}
                className="control-button secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PGNManager;
