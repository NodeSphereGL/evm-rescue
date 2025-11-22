#!/bin/bash

echo "🚀 EVM Rescue Bot - Sepolia Setup Script"
echo "=========================================="

# Check if .env exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backup created as .env.backup"
    cp .env .env.backup
fi

# Copy test environment
echo "📋 Setting up test environment..."
cp .env.example .env

echo ""
echo "🔧 Next Steps:"
echo "============="
echo ""
echo "1. Get RPC Provider API Key:"
echo "   - Alchemy: https://www.alchemy.com/"
echo "   - Infura: https://infura.io/"
echo ""
echo "2. Get Test Wallets:"
echo "   npx ethers wallet  # Generate test wallet"
echo "   npx ethers wallet  # Generate safe wallet"
echo ""
echo "3. Fund Test Wallet with Sepolia ETH:"
echo "   - Sepolia Faucet: https://sepoliafaucet.com/"
echo "   - Alchemy Faucet: https://sepoliafaucet.com/"
echo ""
echo "4. Edit .env file with your values:"
echo "   nano .env"
echo ""
echo "5. Run tests:"
echo "   npm run test:unit        # Unit tests"
echo "   npm run test:sepolia     # Integration tests"
echo ""
echo "6. Start testing:"
echo "   npm run dev              # Manual testing"
echo ""
echo "📖 Full guide: SEPOLIA-SETUP.md"
echo ""
echo "✅ Setup complete! Follow the steps above to configure your test environment."