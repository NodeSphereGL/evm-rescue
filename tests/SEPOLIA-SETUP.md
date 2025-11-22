# Sepolia Testnet Setup Guide

This guide walks you through setting up the EVM Rescue Bot for testing on Sepolia testnet before moving to mainnet.

## 🎯 Overview

Sepolia is Ethereum's primary testnet for:
- Testing Flashbots bundle submissions
- Validating WebSocket reconnection logic
- End-to-end rescue workflow validation
- Gas calculation accuracy
- Integration testing with real network conditions

## 📋 Prerequisites

### 1. Get Sepolia Test ETH
You'll need test ETH in two wallets:
- **Test Wallet** (compromised wallet simulation): ~0.02 ETH
- **Safe Wallet** (destination): Any amount

**Sepolia Faucets:**
- [Sepolia Faucet](https://sepoliafaucet.com/) - 0.5 ETH daily
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/) - Requires Alchemy account
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia) - Requires Infura account

### 2. Get RPC Provider
Choose one (free tier sufficient for testing):

**Alchemy (Recommended):**
1. Go to [https://www.alchemy.com/](https://www.alchemy.com/)
2. Create free account
3. Create new app → Ethereum → Sepolia
4. Copy API key

**Infura:**
1. Go to [https://infura.io/](https://infura.io/)
2. Create free account
3. Create new project → Ethereum → Sepolia
4. Copy API key

**QuickNode:**
1. Go to [https://www.quicknode.com/](https://www.quicknode.com/)
2. Create free account
3. Create endpoint → Ethereum → Sepolia
4. Copy endpoint URL

## 🔧 Environment Setup

### Step 1: Copy Test Configuration
```bash
cp .env.example .env
```

### Step 2: Configure Sepolia Settings

Edit `.env` file with the following settings:

```bash
# ================================
# SEPOLIA TESTNET CONFIGURATION
# ================================

# RPC Provider (choose one)
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
# OR: RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY

# Flashbots Relay (Sepolia - may not always be available)
FLASHBOTS_RPC_URL=https://relay-sepolia.flashbots.net

# Test Wallet (the "compromised" wallet to rescue FROM)
# Create with: npx ethers wallet
COMPROMISED_PRIVATE_KEY=0xYOUR_TEST_WALLET_PRIVATE_KEY

# Safe Wallet (the destination wallet to rescue TO)
SAFE_WALLET_ADDRESS=0xYOUR_SAFE_WALLET_ADDRESS

# Monitoring Settings
CHECK_INTERVAL_MS=12000  # 12 seconds
MIN_RESCUE_AMOUNT_ETH=0.005  # 0.005 ETH minimum for rescue
TARGET_BLOCKS=5  # Submit to next 5 blocks
MAX_PRIORITY_FEE_GWEI=2  # 2 gwei priority fee

# Optional: Telegram Notifications
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Logging
LOG_LEVEL=INFO
```

### Step 3: Generate Test Wallets

**Option A: Use existing wallets**
```bash
# If you already have wallets with Sepolia ETH, just import their private keys
```

**Option B: Create new test wallets**
```bash
# Install ethers CLI if not already installed
npm install -g ethers

# Generate test wallet (compromised simulation)
npx ethers wallet
# Output will show:
# - Address: 0x...
# - Private Key: 0x... (copy this to COMPROMISED_PRIVATE_KEY)

# Generate safe wallet (destination)
npx ethers wallet
# Copy the address to SAFE_WALLET_ADDRESS
```

## 💰 Funding Your Test Wallets

### 1. Fund the Test Wallet (Compromised)
Send ~0.02 ETH to the test wallet address for rescue testing:

```bash
# Get your test wallet address
npx ethers wallet --address YOUR_PRIVATE_KEY
# OR check the address from wallet generation

# Use faucets to get Sepolia ETH:
# https://sepoliafaucet.com/
# https://faucet.sepolia.dev/
```

### 2. Safe Wallet (Optional)
The safe wallet only needs to receive ETH, so you can use any wallet:
- Your existing Ethereum wallet
- MetaMask wallet (get address from MetaMask)
- Generate new wallet with `npx ethers wallet`

## 🧪 Testing Procedures

### Step 4: Run Unit Tests
```bash
npm run test:unit
# Expected: 15/16 tests passing (1 minor test issue is ok)
```

### Step 5: Run Sepolia Integration Tests

**Option A: Full Integration Test Suite**
```bash
npm run test:sepolia
# This will:
# - Connect to Sepolia
# - Test gas calculations
# - Validate WebSocket monitoring
# - Simulate Flashbots bundles
# - Run end-to-end workflow
```

**Option B: Manual Testing with Environment Variables**
```bash
# Set environment variables
export SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
export TEST_PRIVATE_KEY="0xYOUR_TEST_WALLET_PRIVATE_KEY"
export SAFE_PRIVATE_KEY="0xYOUR_SAFE_WALLET_PRIVATE_KEY"  # Optional

# Run integration tests
npm run test:integration
```

### Step 6: Manual Live Testing
```bash
# Start the bot in development mode
npm run dev

# Expected output:
# [INFO] Loading configuration...
# [INFO] Configuration loaded successfully
# [INFO] Safe wallet: 0x...
# [INFO] RPC URL: https://eth-sepolia.g.alchemy.com/v2/...
# [INFO] Monitoring wallet: 0x...
# [INFO] Connected to network: sepolia (chainId: 11155111)
# [INFO] Starting WebSocket balance monitor...
# [INFO] Rescue bot is running. Press Ctrl+C to stop.
```

## 🎯 Testing Scenarios

### 1. Basic Connection Test
- Verify bot connects to Sepolia
- Check WebSocket connection establishment
- Confirm balance monitoring works

### 2. Rescue Simulation
- Send small amount of ETH (0.01) to your test wallet
- Watch bot detect balance change
- Observe gas calculation and bundle submission
- Note: Flashbots on Sepolia may have limited success rates

### 3. WebSocket Reconnection Test
- Start the bot
- Disconnect your internet briefly
- Verify automatic reconnection attempts
- Confirm fallback to polling mode

### 4. Error Handling Test
- Test with invalid RPC URL
- Test with invalid private key
- Verify graceful error handling and retry logic

## 🔍 Validation Checklist

### ✅ Before Moving to Mainnet:

**Configuration:**
- [ ] RPC URL connects successfully to Sepolia
- [ ] Test wallet has Sepolia ETH (>0.01)
- [ ] Safe wallet address is valid
- [ ] All environment variables set correctly

**Functionality:**
- [ ] Unit tests pass: `npm run test:unit`
- [ ] Integration tests run: `npm run test:sepolia`
- [ ] Bot starts without errors: `npm run dev`
- [ ] WebSocket connection established
- [ ] Balance monitoring works
- [ ] Gas calculation returns valid values

**Rescue Logic:**
- [ ] Detects balance increases
- [ ] Calculates gas parameters correctly
- [ ] Builds rescue bundles without errors
- [ ] Handles WebSocket disconnections gracefully
- [ ] Retry logic works for failed operations

## 🚨 Troubleshooting

### Common Issues:

**"Invalid COMPROMISED_PRIVATE_KEY"**
```bash
# Solution: Ensure private key is 66 characters (0x + 64 hex chars)
echo "0xYOUR_64_CHARACTER_HEX_KEY" | wc -c
# Should return: 67
```

**"WebSocket connection failed"**
```bash
# Solution: Verify RPC URL supports WebSocket
# Alchemy URLs work: wss://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
# Regular HTTPS URLs fall back to polling automatically
```

**"Insufficient balance for gas"**
```bash
# Solution: Add more Sepolia ETH to test wallet
# Current balance can be checked with:
npx ethers wallet --address YOUR_PRIVATE_KEY
```

**"Bundle not included"**
```bash
# Normal behavior on Sepolia:
# - Flashbots relay may have limited validator support
# - Success rates lower than mainnet
# - Focus on testing the workflow, not bundle inclusion
```

### Debug Mode:
```bash
# Enable detailed logging
export LOG_LEVEL=DEBUG
npm run dev

# Run tests with detailed output
npm run test:sepolia -- --verbose
```

## 📋 Test Results Template

Copy this template to document your Sepolia testing results:

```markdown
## Sepolia Test Results

### Environment:
- RPC Provider: Alchemy/Infura/Other
- Test Wallet: 0x... (Balance: 0.01 ETH)
- Safe Wallet: 0x...
- Date: YYYY-MM-DD

### Unit Tests:
- ✅/❌ npm run test:unit
- Results: 15/16 passing

### Integration Tests:
- ✅/❌ npm run test:sepolia
- Network connectivity: ✅
- Gas calculations: ✅
- WebSocket monitoring: ✅
- Bundle simulation: ✅

### Manual Testing:
- Bot startup: ✅/❌
- WebSocket connection: ✅/❌
- Balance monitoring: ✅/❌
- Rescue detection: ✅/❌

### Issues Found:
- [List any issues encountered]

### Ready for Mainnet:
- ✅/❌ All critical functionality working
- ✅/❌ Error handling tested
- ✅/❌ Performance acceptable
```

## 🎉 Ready for Mainnet

Once you've completed Sepolia testing with successful results, you can proceed to mainnet by:

1. **Switching RPC URL** to mainnet
2. **Using real compromised wallet** credentials
3. **Using hardware wallet** for safe destination
4. **Starting with small amounts** for initial testing

The Phase 1 reliability features (retry logic, circuit breakers, WebSocket reconnection) will provide the same protection on mainnet.