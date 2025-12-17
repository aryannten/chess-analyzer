import React, { useState } from 'react';

const AdvancedAnalysis = ({
  isAnalyzing,
  bestMove,
  evaluation,
  onAnalyzePosition,
  onSetAnalysisDepth,
  analysisDepth,
  onToggleAdvancedMode,
  isAdvancedMode
}) => {
  const [customDepth, setCustomDepth] = useState(analysisDepth || 15);

  const handleDepthChange = (newDepth) => {
    setCustomDepth(newDepth);
    onSetAnalysisDepth(newDepth);
  };

  const analysisOptions = [
    { depth: 10, label: 'Quick (10)', description: 'Fast analysis for quick moves' },
    { depth: 15, label: 'Standard (15)', description: 'Balanced speed and accuracy' },
    { depth: 20, label: 'Deep (20)', description: 'Thorough analysis for important positions' },
    { depth: 25, label: 'Expert (25)', description: 'Maximum depth for critical positions' }
  ];

  return (
    <div className="advanced-analysis">
      <div className="advanced-analysis-header">
        <h3>🔬 Advanced Analysis</h3>
        <button
          onClick={onToggleAdvancedMode}
          className={`control-button ${isAdvancedMode ? 'active' : ''}`}
          title={isAdvancedMode ? 'Disable advanced mode' : 'Enable advanced mode'}
        >
          {isAdvancedMode ? '⚙️ Advanced ON' : '⚙️ Advanced OFF'}
        </button>
      </div>

      {isAdvancedMode && (
        <div className="advanced-analysis-content">
          <div className="analysis-depth-section">
            <h4>Analysis Depth</h4>
            <div className="depth-options">
              {analysisOptions.map(option => (
                <button
                  key={option.depth}
                  onClick={() => handleDepthChange(option.depth)}
                  className={`depth-option ${analysisDepth === option.depth ? 'selected' : ''}`}
                  title={option.description}
                >
                  <div className="depth-label">{option.label}</div>
                  <div className="depth-description">{option.description}</div>
                </button>
              ))}
            </div>
            
            <div className="custom-depth">
              <label htmlFor="custom-depth">Custom Depth:</label>
              <input
                id="custom-depth"
                type="number"
                min="5"
                max="30"
                value={customDepth}
                onChange={(e) => setCustomDepth(parseInt(e.target.value) || 15)}
                className="depth-input"
              />
              <button
                onClick={() => handleDepthChange(customDepth)}
                className="control-button small"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="analysis-actions">
            <button
              onClick={onAnalyzePosition}
              disabled={isAnalyzing}
              className="control-button analyze-button"
            >
              {isAnalyzing ? '⏳ Analyzing...' : '🔍 Analyze Position'}
            </button>
          </div>

          {bestMove && evaluation && (
            <div className="analysis-details">
              <h4>Analysis Results</h4>
              <div className="analysis-metrics">
                <div className="metric">
                  <span className="metric-label">Best Move:</span>
                  <span className="metric-value">{bestMove}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Evaluation:</span>
                  <span className="metric-value">{evaluation}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Depth:</span>
                  <span className="metric-value">{analysisDepth}</span>
                </div>
              </div>
            </div>
          )}

          <div className="analysis-tips">
            <h4>💡 Analysis Tips</h4>
            <ul>
              <li>Higher depth = more accurate but slower analysis</li>
              <li>Use quick analysis for opening moves</li>
              <li>Use deep analysis for tactical positions</li>
              <li>Expert depth is best for endgame studies</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAnalysis;
