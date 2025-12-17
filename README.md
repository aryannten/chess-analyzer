# Chess Analyzer 🏆

An interactive chess game with AI analysis and intelligent move suggestions. Built with React and featuring a powerful chess engine with instant loading and position-aware analysis.

![Chess Analyzer](https://img.shields.io/badge/Chess-Analyzer-brightgreen) ![React](https://img.shields.io/badge/React-18%2B-blue) ![Tests](https://img.shields.io/badge/Tests-110%20Passing-success) ![Engine](https://img.shields.io/badge/Engine-v2.3--cache--fix-orange)

## ✨ Features

### 🎮 Core Gameplay
- **Interactive Chess Board**: Drag-and-drop piece movement with visual feedback
- **Full Game Rules**: Complete chess rule implementation with move validation
- **Game History**: Navigate through moves with undo/redo functionality
- **Position Analysis**: Real-time evaluation of chess positions

### 🤖 AI Engine
- **Instant Loading**: Engine initializes in ~10ms (not 1-3 seconds!)
- **Smart Move Suggestions**: Position-aware recommendations based on actual chess theory
- **Opening Knowledge**: Proper opening moves (e4, d4, Nf3) and responses
- **Contextual Analysis**: Understands position patterns and suggests appropriate moves

### 📋 Game Management  
- **PGN Import/Export**: Load and save games in standard PGN format
- **Game Status Tracking**: Checkmate, stalemate, and draw detection
- **Move History**: Complete game notation and replay
- **Advanced Analysis**: Depth control and evaluation display

### 🔧 Technical Features
- **Comprehensive Testing**: 110 passing tests with full coverage
- **Performance Optimized**: Lazy loading and efficient rendering
- **Error Recovery**: Robust error handling and engine restart capabilities
- **Development Tools**: Cache-busting and debugging utilities

## 🚀 Quick Start

### Production Build (Recommended)
```bash
# Serve the optimized production build
cd build
python -m http.server 3000
# Or use the provided script
./serve-build.bat
```

### Development
```bash
# Install dependencies
npm install

# Set up environment (first time only)
cp .env.example .env

# Start development server (clean - no warnings)
npm run start:clean

# Or with standard output
npm start
```

### Testing
```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testNamePattern="Engine Integration"
npm test -- --testNamePattern="PGN"
```

## 🏗️ Architecture

### Core Components
- **`App.js`** - Main application logic and state management
- **`ChessBoard.js`** - Interactive chess board with drag-and-drop
- **`EngineStatus.js`** - AI engine status and analysis display
- **`GameControls.js`** - Game navigation and control buttons
- **`PGNManager.js`** - Import/export PGN functionality

### Engine System
- **`useChessEngine.js`** - Hook for engine communication and state
- **`ChessEngineWorker.js`** - Web Worker for chess analysis (v2.3-cache-fix)
- **`engineWorkerFactory.js`** - Worker creation with enhanced cache-busting
- **Session-based cache-busting** prevents stale worker loading in development

### Utilities
- **`chessValidation.js`** - Move and position validation
- **`pgnUtils.js`** - PGN parsing and generation  
- **`chessAnalysis.js`** - Position evaluation helpers
- **`devUtils.js`** - Development and debugging tools

## 🧪 Testing

The project includes comprehensive test coverage:

- **Engine Integration**: Worker communication and analysis flow
- **PGN Utilities**: Import/export and format validation
- **Performance**: Memory usage, response times, and stress testing
- **Error Scenarios**: Graceful handling of edge cases
- **Message Parsing**: Worker protocol validation

```bash
# Run all 110 tests
npm test -- --watchAll=false

# Performance benchmarks
npm test -- --testNamePattern="Performance"
```

## 🎯 Engine Features

### Smart Move Generation
- **Opening Theory**: Knows standard openings (King's Pawn, Queen's Pawn, King's Knight)
- **Contextual Responses**: Responds appropriately to opponent moves
- **Position Awareness**: Considers current board state for suggestions

### Performance Optimizations
- **Instant Loading**: 10ms initialization vs. previous 1-3 seconds
- **Cache-Busting**: Ensures fresh worker loading in development
- **Memory Management**: Efficient cleanup and resource handling

## 🚀 Deployment Options

### GitHub Pages
The build folder is included for easy GitHub Pages deployment:
1. Push to GitHub
2. Go to repository Settings → Pages
3. Select "Deploy from a branch" → main branch → /build folder

### Static Hosting
The production build works with any static hosting service:
- Netlify: Drag-and-drop the `build` folder
- Vercel: Connect the repository
- AWS S3: Upload build contents

## 🛠️ Development

### Cache Issues in Development
If `npm start` shows old versions or "🔄 Loading engine..." persists:
1. **Recommended**: See [CACHE_BUSTING_VERIFICATION.md](./CACHE_BUSTING_VERIFICATION.md) for detailed troubleshooting
2. Use `./start-dev-fresh.bat` (clears webpack cache)
3. Hard refresh browser (Ctrl+Shift+R)
4. Clear browser cache completely
5. Try production build: `./serve-build.bat`

### Worker Version Verification
Check browser console for styled messages:
```
 ChessEngineWorker v2.3-cache-fix loaded at [timestamp]
 Worker features: instant initialization + smart move generation + cache-fix
 If you see this message, the worker loaded successfully!
```

If you see version 2.2 or older, the worker is cached. Follow [CACHE_BUSTING_VERIFICATION.md](./CACHE_BUSTING_VERIFICATION.md).

## 📈 Recent Improvements

### Cache-Busting Fix (v2.3)
- ✅ **Session-based cache-busting** prevents loading stale worker files
- ✅ **Multiple cache-busting strategies** (timestamp, session ID, build ID, random string)
- ✅ **HTTP cache-control headers** in index.html to prevent browser caching
- ✅ **Styled console messages** for easy version verification
- ✅ **Detailed verification guide** for troubleshooting cache issues

### Engine Loading Fix
- ✅ Reduced initialization from 1-3s to 10ms
- ✅ Enhanced cache-busting with timestamps + random strings  
- ✅ Version tracking for debugging
- ✅ Development-aware worker loading

### Smart Move Analysis  
- ✅ Position-aware move suggestions
- ✅ Opening theory integration
- ✅ Contextual responses (e5 vs e4, d5 vs d4)
- ✅ Better evaluation algorithms

### Development Experience
- ✅ Comprehensive debugging tools
- ✅ Cache-clearing scripts
- ✅ Version verification
- ✅ Enhanced error reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Run the test suite: `npm test`
5. Commit changes: `git commit -m "Description"`
6. Push to branch: `git push origin feature-name`
7. Create a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- **Live Demo**: [GitHub Pages](https://aryannten.github.io/chess-analyzer/) (after deployment)
- **Repository**: [GitHub](https://github.com/aryannten/chess-analyzer)
- **Issues**: [Bug Reports & Feature Requests](https://github.com/aryannten/chess-analyzer/issues)

---

**Built with ❤️ using React, Chess.js, and modern web technologies.**
