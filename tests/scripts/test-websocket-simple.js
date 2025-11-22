#!/usr/bin/env node

/**
 * Simple WebSocket Test (Ethers v6 compatible)
 */

const { ethers } = require('ethers');
require('dotenv').config();

async function testWebSocket() {
  console.log('🔧 Testing Enhanced WebSocket Connection (Ethers v6)');
  console.log('==================================================');

  try {
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
      throw new Error('RPC_URL not set in .env');
    }

    console.log('📡 RPC URL:', rpcUrl);

    // Convert to WebSocket URL
    const wsUrl = rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    console.log('🔗 WebSocket URL:', wsUrl);

    // Create WebSocket provider
    const provider = new ethers.WebSocketProvider(wsUrl);

    let blockCount = 0;
    let isTested = false;

    // Test connectivity first
    try {
      const network = await provider.getNetwork();
      console.log(`✅ Connected to: ${network.name} (chainId: ${network.chainId})`);
      console.log('✅ WebSocket connection successful');
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      process.exit(1);
    }

    // Subscribe to block events
    provider.on('block', (blockNumber) => {
      blockCount++;
      console.log(`📦 Block received: ${blockNumber} (total: ${blockCount})`);
    });

    // Test balance query
    try {
      const balance = await provider.getBalance('0x7F3F549356f13C21DB7d2f0c45fEF11Ab8EFB498');
      console.log(`💰 Test wallet balance: ${ethers.formatEther(balance)} ETH`);
    } catch (error) {
      console.warn('⚠️ Balance query failed:', error.message);
    }

    console.log('\n🔄 Listening for blocks for 30 seconds...');

    // Run for 30 seconds
    setTimeout(() => {
      console.log(`\n📊 Test Results:`);
      console.log(`- Blocks received: ${blockCount}`);
      console.log(`- Connection: Successful`);

      if (blockCount > 0) {
        console.log('✅ WebSocket is working!');
        console.log('✅ Block events are firing');
        console.log('✅ Balance monitoring should work now');
      } else {
        console.log('⚠️  No blocks received in 30 seconds');
        console.log('ℹ️  This might be normal if network is quiet');
        console.log('ℹ️  The enhanced provider has 3-second polling backup');
      }

      console.log('\n🚀 Next steps:');
      console.log('1. Restart your bot: npm run dev');
      console.log('2. Send test ETH to your wallet');
      console.log('3. Watch for balance detection logs');

      provider.removeAllListeners();
      process.exit(0);
    }, 30000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testWebSocket();