import React from 'react';

/**
 * Helper function to get health status color
 */
const getHealthStatusColor = (status) => {
  switch (status) {
    case 'healthy': return '#4caf50';
    case 'degraded': return '#ff9800';
    case 'restarting': return '#2196f3';
    case 'failed': return '#d32f2f';
    case 'initializing': return '#9c27b0';
    default: return '#757575';
  }
};

/**
 * Helper function to get health status icon
 */
const getHealthStatusIcon = (status) => {
  switch (status) {
    case 'healthy': return '✅';
    case 'degraded': return '⚠️';
    case 'restarting': return '🔄';
    case 'failed': return '❌';
    case 'initializing': return '⏳';
    default: return '❓';
  }
};

/**
 * EngineStatus Component
 * Displays chess engine status and analysis results with enhanced error recovery
 */
const EngineStatus = ({
  isEngineReady,
  isAnalyzing,
  bestMove,
  evaluation,
  engineError,
  showMoveHints,
  onToggleHints,
  onMakeSuggestedMove,
  onRetryEngine,
  formatMove,
  getEvaluationColor,
  // Enhanced engine telemetry
  engineHealthStatus = 'unknown',
  workerRestartCount = 0,
  engineStats = {},
  lastEngineError = null,
  onForceRestart,
  onHealthCheck,
  showEngineStatus = false,
  onToggleEngineStatus
}) => {
  const {
    analysesCompleted = 0,
    lastAnalysisTime = null,
    lastNodesEvaluated = null
  } = engineStats || {};

  const formattedAnalysisTime = typeof lastAnalysisTime === 'number'
    ? `${lastAnalysisTime} ms`
    : '—';

  const formattedNodesEvaluated = typeof lastNodesEvaluated === 'number'
    ? lastNodesEvaluated.toLocaleString()
    : '—';

  const renderDetailButton = () => {
    if (!onToggleEngineStatus) return null;
    return (
      <button
        onClick={onToggleEngineStatus}
        style={{
          backgroundColor: '#757575',
          color: 'white',
          border: 'none',
          padding: '4px 8px',
          borderRadius: '3px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        {showEngineStatus ? '📊 Hide Details' : '📊 Show Details'}
      </button>
    );
  };

  return (
    <div className="engine-status-panel">
      <h3 className="engine-title">
        Reliable Chess Engine
      </h3>

      {/* Enhanced Engine Status with Health Monitoring */}
      {engineError ? (
        <div style={{
          color: '#d32f2f',
          backgroundColor: '#ffebee',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          marginBottom: '10px',
          border: `2px solid ${getHealthStatusColor(engineHealthStatus)}`
        }}>
          <div style={{ marginBottom: '8px' }}>
            {getHealthStatusIcon(engineHealthStatus)} {engineError}
          </div>
          <div className="engine-controls" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button
              onClick={onRetryEngine}
              style={{
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              🔄 Retry
            </button>
            {engineHealthStatus === 'degraded' && onForceRestart && (
              <button
                onClick={onForceRestart}
                style={{
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '3px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                title="Force engine restart"
              >
                🔧 Force Restart
              </button>
            )}
            {onHealthCheck && (
              <button
                onClick={onHealthCheck}
                style={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '3px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
                title="Check engine health"
              >
                🏥 Health Check
              </button>
            )}
            {renderDetailButton()}
          </div>
          
          {showEngineStatus && (
            <div className="engine-status-details" style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderRadius: '3px',
              fontSize: '12px'
            }}>
              <div><strong>Health Status:</strong> <span style={{ color: getHealthStatusColor(engineHealthStatus) }}>
                {engineHealthStatus.toUpperCase()}
              </span></div>
              <div><strong>Restart Count:</strong> {workerRestartCount}</div>
              <div><strong>Analyses Completed:</strong> {analysesCompleted}</div>
              <div><strong>Last Analysis Time:</strong> {formattedAnalysisTime}</div>
              <div><strong>Last Nodes Evaluated:</strong> {formattedNodesEvaluated}</div>
              {lastEngineError && (
                <div><strong>Last Error:</strong> {lastEngineError.message} 
                  <span style={{ color: lastEngineError.recoverable ? '#4caf50' : '#d32f2f' }}>
                    ({lastEngineError.recoverable ? 'recoverable' : 'permanent'})
                  </span>
                </div>
              )}
              <div><strong>Timestamp:</strong> {new Date().toLocaleTimeString()}</div>
            </div>
          )}
        </div>
      ) : !isEngineReady ? (
        <div style={{
          color: '#ff9800',
          backgroundColor: '#fff3e0',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          marginBottom: '10px'
        }}>
          🔄 Loading engine...
        </div>
      ) : (
        <div style={{
          color: '#388e3c',
          backgroundColor: '#e8f5e8',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          marginBottom: '10px'
        }}>
          Engine ready
          {onHealthCheck && (
            <button
              onClick={onHealthCheck}
              style={{
                marginLeft: '8px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
              title="Check engine health"
            >
              🏥 Health Check
            </button>
          )}
          {engineHealthStatus !== 'healthy' && onForceRestart && (
            <button
              onClick={onForceRestart}
              style={{
                marginLeft: '4px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
              title="Force engine restart"
            >
              🔧 Force Restart
            </button>
          )}
          {onToggleEngineStatus && (
            <span style={{ marginLeft: '4px' }}>{renderDetailButton()}</span>
          )}
        </div>
      )}

      {/* Analysis Status */}
      {isEngineReady && !engineError && (
        <div>
          {isAnalyzing ? (
            <div style={{
              color: '#1976d2',
              backgroundColor: '#e3f2fd',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span className="analyzing-spinner">⏳</span>
              Analyzing position...
            </div>
            ) : bestMove ? (
              <div className="analysis-result">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px'
              }}>
                  <div>
                    💡 <span className="best-move">
                      {formatMove(bestMove)}
                    </span>
                  </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={onToggleHints}
                    style={{
                      backgroundColor: showMoveHints ? '#ff9800' : '#757575',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    title={showMoveHints ? 'Hide board hints' : 'Show board hints'}
                  >
                    {showMoveHints ? '👁️' : '🚫'}
                  </button>
                  <button
                    onClick={onMakeSuggestedMove}
                    style={{
                      backgroundColor: '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                    title="Play suggested move (Enter)"
                  >
                    Play Move
                  </button>
                </div>
              </div>
                {evaluation && (
                  <div className="evaluation">
                    Eval: <span style={{
                      color: getEvaluationColor(evaluation)
                    }}>
                      {evaluation}
                    </span>
                    <span style={{ marginLeft: '4px', fontSize: '11px' }}>
                      {evaluation.startsWith('M') ? '(mate)' : 'pawns'}
                    </span>
                  </div>
                )}
              {showMoveHints && (
                <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                  🔵 From square • 🟢 To square
                </div>
              )}
            </div>
          ) : (
            <div style={{
              color: '#666',
              fontSize: '14px',
              fontStyle: 'italic'
            }}>
              Make a move to see analysis
            </div>
          )}
        </div>
      )}

      {showEngineStatus && !engineError && (
        <div className="engine-status-details" style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderRadius: '3px',
          fontSize: '12px'
        }}>
          <div><strong>Health Status:</strong> <span style={{ color: getHealthStatusColor(engineHealthStatus) }}>
            {engineHealthStatus.toUpperCase()}
          </span></div>
          <div><strong>Restart Count:</strong> {workerRestartCount}</div>
          <div><strong>Analyses Completed:</strong> {analysesCompleted}</div>
          <div><strong>Last Analysis Time:</strong> {formattedAnalysisTime}</div>
          <div><strong>Last Nodes Evaluated:</strong> {formattedNodesEvaluated}</div>
          {lastEngineError && (
            <div><strong>Last Error:</strong> {lastEngineError.message}
              <span style={{ color: lastEngineError.recoverable ? '#4caf50' : '#d32f2f', marginLeft: '4px' }}>
                ({lastEngineError.recoverable ? 'recoverable' : 'permanent'})
              </span>
            </div>
          )}
          <div><strong>Timestamp:</strong> {new Date().toLocaleTimeString()}</div>
        </div>
      )}
    </div>
  );
};

export default EngineStatus;
