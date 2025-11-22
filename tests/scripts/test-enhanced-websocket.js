#!/usr/bin/env node

/**
 * Test Enhanced WebSocket Implementation
 */

require('dotenv').config();

async function testEnhancedWebSocket() {
  console.log('🚀 Testing Enhanced WebSocket Implementation');
  console.log('===========================================');

  try {
    // Import and test the enhanced WebSocket provider
    const { testWebSocketEnhanced } = require('./dist/fix-websocket.js');

    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) {
      throw new Error('RPC_URL not set in .env');
    }

    console.log('📡 RPC URL:', rpcUrl);

    // Test the enhanced WebSocket
    await testWebSocketEnhanced(rpcUrl);

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    // Fallback: Test basic connectivity
    console.log('\n🔄 Fallback: Testing basic WebSocket connectivity...');

    const { ethers } = require('ethers');
    const rpcUrl = process.env.RPC_URL;

    if (!rpcUrl) {
      throw new Error('RPC_URL not set');
    }

    try {
      // Convert to WebSocket URL
      const wsUrl = rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      console.log('🔗 WebSocket URL:', wsUrl);

      const wsProvider = new ethers.WebSocketProvider(wsUrl);

      wsProvider.on('open', () => {
        console.log('✅ WebSocket opened');
      });

      wsProvider.on('error', (error) => {
        console.log('❌ WebSocket error:', error.message);
      });

      wsProvider.on('block', (blockNumber) => {
        console.log('📦 Block received:', blockNumber);
      });

      // Test connectivity
      setTimeout(async () => {
        try {
          const network = await wsProvider.getNetwork();
          console.log('✅ Connected to:', network.name);
        } catch (error) {
          console.log('❌ Connectivity test failed:', error.message);
        }
        wsProvider.removeAllListeners();
      }, 5000);

    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError.message);
    }
  }
}

testEnhancedWebSocket();