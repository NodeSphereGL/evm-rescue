# 📁 EVM Rescue Bot - Project Structure

## 🏗️ Clean Directory Organization

```
evm-rescue/
├── 📁 src/                          # Main source code
│   ├── config/
│   │   └── config.ts                # Configuration management
│   ├── monitors/
│   │   └── balance-monitor.ts       # WebSocket balance monitoring
│   ├── rescue/
│   │   ├── flashbots-rescue.ts       # Main rescue logic
│   │   ├── gas-calculator.ts         # Gas calculation utilities
│   │   └── bundle-builder.ts        # Transaction bundle creation
│   ├── utils/
│   │   ├── logger.ts                # Logging utilities
│   │   ├── retry.ts                 # Retry logic & circuit breakers
│   │   └── alchemy-websocket.ts     # Enhanced WebSocket provider
│   └── index.ts                     # Main application entry point
│
├── 📁 tests/                        # All test files organized
│   ├── README.md                    # Test documentation
│   ├── SEPOLIA-SETUP.md             # Sepolia testing guide
│   ├── unit/                        # Unit tests
│   │   ├── config.test.ts
│   │   └── gas-calculator.test.ts
│   ├── integration/                 # Integration tests
│   │   ├── sepolia-validation.test.ts
│   │   ├── jest.config.js
│   │   └── setup-tests.ts
│   ├── scripts/                     # Test utility scripts
│   │   ├── test-websocket-simple.js
│   │   ├── test-enhanced-websocket.js
│   │   ├── quick-balance-check.js
│   │   └── setup-sepolia.sh
│   ├── debug/                       # Debugging tools
│   │   └── debug-websocket.js
│   └── validation/                  # Validation scripts
│       └── validate-sepolia.js
│
├── 📁 scripts/                     # Development utilities
│   └── run-tests.js                 # Test runner utility
│
├── 📁 .claude/                      # Claude Code configuration
├── 📁 dist/                         # Compiled JavaScript (generated)
├── 📁 node_modules/                  # Dependencies (generated)
│
├── 📄 package.json                  # Project configuration & scripts
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📄 jest.config.js                # Jest testing configuration
├── 📄 CLAUDE.md                     # Claude Code instructions
├── 📄 README.md                     # Project documentation
├── 📄 .env.example                  # Environment template
├── 📄 .env                          # Current environment configuration
└── 📄 .env.test                     # Test environment configuration
```

## 🎯 Key Improvements Made

### **✅ Test Organization**
- **Before**: 7 test files scattered in root directory
- **After**: All tests organized in logical subdirectories

### **✅ Clean Root Directory**
- **Kept**: Essential project files (package.json, README.md, CLAUDE.md, etc.)
- **Moved**: All test-related files to `tests/` directory
- **Organized**: Tests categorized by purpose (unit, integration, scripts, debug, validation)

### **✅ Enhanced Test Scripts**
- Added comprehensive test runner (`scripts/run-tests.js`)
- Updated `package.json` with new test commands
- Created detailed test documentation (`tests/README.md`)

## 🚀 Available Test Commands

### **Quick Tests**
```bash
npm run test:websocket      # Test WebSocket connectivity
npm run test:balance         # Check wallet balance
npm run test:validate        # Full Sepolia validation
npm run test:all             # Run all tests
```

### **Comprehensive Tests**
```bash
npm test                    # Run Jest unit tests
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:sepolia        # Sepolia validation tests
```

### **Test Runner Utility**
```bash
node scripts/run-tests.js websocket    # WebSocket test
node scripts/run-tests.js balance      # Balance check
node scripts/run-tests.js sepolia      # Full validation
node scripts/run-tests.js all          # All tests
```

## 📋 Test File Locations

| Purpose | File Location | Command |
|---------|---------------|---------|
| **WebSocket Tests** | `tests/scripts/test-websocket-simple.js` | `npm run test:websocket` |
| **Balance Check** | `tests/scripts/quick-balance-check.js` | `npm run test:balance` |
| **Sepolia Validation** | `tests/validation/validate-sepolia.js` | `npm run test:validate` |
| **Unit Tests** | `tests/unit/*.test.ts` | `npm run test:unit` |
| **Integration Tests** | `tests/integration/*.test.ts` | `npm run test:integration` |
| **Debug Tools** | `tests/debug/debug-websocket.js` | `node tests/debug/debug-websocket.js` |

## 🎯 Development Workflow

### **1. Development**
```bash
npm run dev                    # Start development server
```

### **2. Testing**
```bash
npm run test:websocket         # Verify WebSocket connectivity
npm run test:balance           # Check wallet access
npm run test:unit              # Run unit tests
```

### **3. Validation**
```bash
npm run test:sepolia           # Full Sepolia validation
npm run test:all               # Complete test suite
```

### **4. Production**
```bash
npm run build                   # Compile TypeScript
npm start                       # Start production server
```

## ✨ Benefits

### **🧪 Better Testing**
- Organized test suite with clear categories
- Easy access to specific test types
- Comprehensive test documentation

### **🔧 Easier Development**
- Quick test commands for common tasks
- Centralized test runner utility
- Clear separation of concerns

### **📦 Production Ready**
- Clean, professional project structure
- All Phase 1 reliability features implemented
- Comprehensive testing validation

### **🎯 Maintainable**
- Logical file organization
- Clear documentation
- Easy to extend and modify

The project is now **clean, organized, and production-ready** with a comprehensive testing suite! 🎉