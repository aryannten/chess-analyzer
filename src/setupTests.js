// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

jest.mock('react-chessboard', () => {
	const ReactLib = require('react');
	const React = ReactLib.default || ReactLib;

	const MockChessboard = React.forwardRef((props, ref) => {
		const { onSquareClick, onPieceDrop, boardWidth, position } = props;
		const lastSelectedRef = React.useRef(null);

		const handleClick = () => {
			if (!lastSelectedRef.current) {
				lastSelectedRef.current = 'e2';
				onSquareClick?.('e2');
				return;
			}

			const fromSquare = lastSelectedRef.current;
			const toSquare = 'e4';
			lastSelectedRef.current = null;
			onSquareClick?.(toSquare);
			onPieceDrop?.(fromSquare, toSquare);
		};

		return React.createElement('div', {
			ref,
			'aria-label': 'mock-chessboard',
			'data-testid': 'chessboard',
			style: {
				width: boardWidth || 400,
				height: boardWidth || 400
			},
			onClick: handleClick
		});
	});

	MockChessboard.displayName = 'MockChessboard';

	return { Chessboard: MockChessboard };
});

const createDefaultMockWorker = () => {
	const listeners = {};

	const safeEmit = (type, payload) => {
		if (listeners[type]) {
			listeners[type]({ data: { timestamp: Date.now(), ...payload } });
		}
	};

	return {
		addEventListener: jest.fn((event, handler) => {
			listeners[event] = handler;
		}),
		removeEventListener: jest.fn((event) => {
			delete listeners[event];
		}),
		postMessage: jest.fn((message = {}) => {
			switch (message.type) {
				case 'INIT':
					safeEmit('message', { type: 'ENGINE_READY', ready: true, analyzing: false });
					break;
				case 'HEALTH_CHECK':
					safeEmit('message', {
						type: 'HEALTH_STATUS',
						ready: true,
						analyzing: false,
						requestId: message.requestId || null
					});
					break;
				case 'ANALYZE_POSITION':
					safeEmit('message', {
						type: 'ANALYSIS_STARTED',
						requestId: message.requestId || null
					});
					safeEmit('message', {
						type: 'ANALYSIS_RESULT',
						requestId: message.requestId || null,
						bestMove: 'e2e4',
						evaluation: '+0.20',
						fen: message.fen,
						depth: message.depth,
						analysesCompleted: 1,
						analysisTime: 25,
						nodesEvaluated: 128
					});
					break;
				case 'STOP_ANALYSIS':
					safeEmit('message', {
						type: 'ANALYSIS_STOPPED',
						requestId: message.requestId || null
					});
					break;
				case 'PING':
					safeEmit('message', { type: 'PONG', ready: true });
					break;
				case 'GET_STATUS':
					safeEmit('message', {
						type: 'STATUS',
						ready: true,
						analyzing: false,
						analysesCompleted: 1
					});
					break;
				default:
					safeEmit('message', {
						type: 'ENGINE_ERROR',
						error: `Unhandled mock message type: ${message.type}`
					});
			}
		}),
		terminate: jest.fn()
	};
};

const mockCreateEngineWorker = jest.fn(() => {
	console.info('mockCreateEngineWorker invoked');
	let instance;

	if (typeof global.__createEngineWorkerMock === 'function') {
		try {
			instance = global.__createEngineWorkerMock();
		} catch (error) {
			console.error('Mock engine worker factory (custom) threw an error:', error);
		}
	}

	if (!instance && typeof global.Worker === 'function') {
		try {
			instance = new global.Worker();
		} catch (error) {
			// fall through to default mock
		}
	}

	if (!instance) {
		instance = createDefaultMockWorker();
	}

	if (!instance || typeof instance.postMessage !== 'function') {
		console.error('Mock engine worker factory produced invalid instance', instance);
	}

	return instance;
});

    jest.mock('./workers/engineWorkerFactory.js', () => ({
	    __esModule: true,
	    createEngineWorker: (...args) => mockCreateEngineWorker(...args)
    }));

	beforeEach(() => {
		mockCreateEngineWorker.mockClear();
		global.__createEngineWorkerMock = () => createDefaultMockWorker();
});

Object.defineProperty(global, '__getCreateEngineWorkerMock', {
		value: () => mockCreateEngineWorker,
	configurable: true
});
