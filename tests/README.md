# Test Suite Documentation

## 📁 Test Directory Structure

```
tests/
├── README.md                    # This file
├── SEPOLIA-SETUP.md            # Sepolia testing guide
├── unit/                       # Unit tests
│   ├── config.test.ts
│   └── gas-calculator.test.ts
├── integration/                # Integration tests
│   ├── sepolia-validation.test.ts
│   ├── jest.config.js
│   └── setup-tests.ts
├── scripts/                    # Test utility scripts
│   ├── test-websocket-simple.js
│   ├── test-enhanced-websocket.js
│   ├── quick-balance-check.js
│   └── setup-sepolia.sh
├── debug/                      # Debugging tools
│   └── debug-websocket.js
└── validation/                 # Validation scripts
    └── validate-sepolia.js
```

## 🧪 Test Categories

### **Unit Tests** (`tests/unit/`)
- **Purpose**: Test individual components in isolation
- **Run**: `npm run test:unit`
- **Coverage**: Configuration, gas calculations, core logic

### **Integration Tests** (`tests/integration/`)
- **Purpose**: Test complete workflows on testnet
- **Run**: `npm run test:integration` or `npm run test:sepolia`
- **Coverage**: End-to-end rescue operations

### **Test Scripts** (`tests/scripts/`)
- **Purpose**: Utility scripts for manual testing and validation
- **Usage**: Run directly with `node tests/scripts/[script-name]`

### **Debug Tools** (`tests/debug/`)
- **Purpose**: Debugging and troubleshooting utilities
- **Usage**: Run directly with `node tests/debug/[script-name]`

### **Validation** (`tests/validation/`)
- **Purpose**: Validate setup and configuration
- **Usage**: Run directly with `node tests/validation/[script-name]`

## 🚀 Quick Test Commands

### **1. WebSocket Testing**
```bash
# Basic WebSocket test
node tests/scripts/test-websocket-simple.js

# Enhanced WebSocket test
node tests/scripts/test-enhanced-websocket.js

# WebSocket debugging
node tests/debug/debug-websocket.js
```

### **2. Balance Validation**
```bash
# Quick balance check
node tests/scripts/quick-balance-check.js

# Full Sepolia validation
node tests/validation/validate-sepolia.js
```

### **3. Automated Testing**
```bash
# Unit tests only
npm run test:unit

# Integration tests (Sepolia)
npm run test:sepolia

# All tests
npm test
```

### **4. Setup Scripts**
```bash
# Automated Sepolia setup
tests/scripts/setup-sepolia.sh
```

## 📋 Test Scripts Reference

### **WebSocket Tests**
- `test-websocket-simple.js` - Basic WebSocket connectivity test
- `test-enhanced-websocket.js` - Enhanced WebSocket with block monitoring
- `debug-websocket.js` - Detailed WebSocket debugging and diagnostics

### **Balance & Validation**
- `quick-balance-check.js` - Check current wallet balance and recent transactions
- `validate-sepolia.js` - Comprehensive Sepolia setup validation

### **Setup**
- `setup-sepolia.sh` - Automated Sepolia testnet setup script

## 🔧 Environment Configuration

Tests use the same `.env` configuration as the main application:

```env
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
COMPROMISED_PRIVATE_KEY=0xYOUR_TEST_WALLET_PRIVATE_KEY
SAFE_WALLET_ADDRESS=0xYOUR_SAFE_WALLET_ADDRESS
```

For integration tests, you can also use:
```bash
cp .env.test .env
# Then edit .env with your test configuration
```

## 📊 Test Results Interpretation

### **WebSocket Tests**
- ✅ **Blocks Received**: WebSocket connection working
- ✅ **Balance Query**: RPC connectivity confirmed
- ❌ **Connection Failed**: Check RPC URL and network connectivity

### **Balance Tests**
- ✅ **Balance Detected**: Wallet has funds and is accessible
- ✅ **Recent Transactions**: Test transactions found
- ❌ **No Balance**: Send test ETH to wallet first

### **Integration Tests**
- ✅ **All Pass**: Production-ready
- ⚠️ **Bundle Not Included**: Normal on Sepolia (low MEV-Boost adoption)
- ❌ **Connection Errors**: Check RPC configuration

## 🎯 Best Practices

1. **Before Mainnet Deployment**:
   - Run `npm run test:unit` (should pass)
   - Run `npm run test:sepolia` (validates setup)
   - Test with small amounts on Sepolia first

2. **During Development**:
   - Use `test-websocket-simple.js` to verify WebSocket connectivity
   - Use `quick-balance-check.js` to verify wallet access
   - Monitor logs for real-time balance detection

3. **Troubleshooting**:
   - Use `debug-websocket.js` for WebSocket issues
   - Use `validate-sepolia.js` for configuration problems
   - Check `.env` file for correct RPC URLs and private keys

## 📝 Test History

- **Initial Setup**: Unit tests for core functionality
- **WebSocket Enhancement**: Added real-time balance detection
- **Integration Testing**: Complete end-to-end workflows
- **Phase 1 Validation**: Retry logic, circuit breakers, reconnection

All tests are designed to validate the Phase 1 reliability features and ensure production readiness.