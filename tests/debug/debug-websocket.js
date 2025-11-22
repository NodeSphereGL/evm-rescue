#!/usr/bin/env node

/**
 * Debug WebSocket Connection Issues
 */

const { ethers } = require('ethers');
require('dotenv').config();

async function debugWebSocket() {
  console.log('🔧 WebSocket Debug Tool');
  console.log('======================');

  try {
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.COMPROMISED_PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
      throw new Error('Missing RPC_URL or COMPROMISED_PRIVATE_KEY');
    }

    console.log('📡 Testing RPC URL:', rpcUrl);
    console.log('🔑 Wallet Address:', new ethers.Wallet(privateKey).address);

    // Test 1: Basic RPC connectivity
    console.log('\n1️⃣ Testing Basic RPC Connectivity...');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    console.log('✅ RPC Connected:', network.name, '(chainId:', network.chainId + ')');

    // Test 2: Wallet balance
    console.log('\n2️⃣ Testing Balance Query...');
    const wallet = new ethers.Wallet(privateKey, provider);
    const balance = await provider.getBalance(wallet.address);
    console.log('✅ Current Balance:', ethers.formatEther(balance), 'ETH');

    // Test 3: WebSocket connection
    console.log('\n3️⃣ Testing WebSocket Connection...');
    let wsProvider;

    // Try WebSocket URL
    let wsUrl = rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    console.log('🔗 Trying WebSocket URL:', wsUrl);

    try {
      wsProvider = new ethers.WebSocketProvider(wsUrl);

      // Set up event listeners
      wsProvider.on('error', (error) => {
        console.log('❌ WebSocket Error:', error.message);
      });

      wsProvider.on('close', () => {
        console.log('🔌 WebSocket Closed');
      });

      wsProvider.on('open', () => {
        console.log('✅ WebSocket Opened');
      });

      // Wait a bit for connection
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Test block subscription
      console.log('\n4️⃣ Testing Block Subscription...');
      let blockCount = 0;

      wsProvider.on('block', (blockNumber) => {
        blockCount++;
        console.log('📦 Block received:', blockNumber, `(count: ${blockCount})`);

        // Check balance on each block
        provider.getBalance(wallet.address).then(newBalance => {
          console.log('💰 Balance at block', blockNumber + ':', ethers.formatEther(newBalance), 'ETH');
        });
      });

      console.log('⏳ Listening for blocks (will stop after 3 blocks or 60 seconds)...');

      // Wait for blocks or timeout
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('⏱️ Timeout reached');
          resolve();
        }, 60000);

        const checkBlocks = setInterval(() => {
          if (blockCount >= 3) {
            clearTimeout(timeout);
            clearInterval(checkBlocks);
            console.log('✅ Received 3 blocks, stopping...');
            resolve();
          }
        }, 1000);
      });

      wsProvider.removeAllListeners();

    } catch (wsError) {
      console.log('❌ WebSocket Failed:', wsError.message);

      // Fallback to polling test
      console.log('\n🔄 Testing Fallback Polling...');

      let pollCount = 0;
      const lastBalance = balance;

      const pollInterval = setInterval(async () => {
        pollCount++;
        const newBalance = await provider.getBalance(wallet.address);
        console.log(`📊 Poll #${pollCount}:`, ethers.formatEther(newBalance), 'ETH');

        if (newBalance !== lastBalance) {
          console.log('🚨 BALANCE CHANGED!');
          console.log('   Old:', ethers.formatEther(lastBalance), 'ETH');
          console.log('   New:', ethers.formatEther(newBalance), 'ETH');
          console.log('   Change:', ethers.formatEther(newBalance - lastBalance), 'ETH');
        }

        if (pollCount >= 10) {
          clearInterval(pollInterval);
          console.log('✅ Polling test complete');
        }
      }, 5000); // Poll every 5 seconds
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugWebSocket().catch(console.error);