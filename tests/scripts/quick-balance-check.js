#!/usr/bin/env node

/**
 * Quick Balance Check Script
 * Tests if your wallet received the 0.2 ETH
 */

const { ethers } = require('ethers');
require('dotenv').config();

async function checkBalance() {
  console.log('💰 Quick Balance Check');
  console.log('=======================');

  try {
    const rpcUrl = process.env.RPC_URL;
    const privateKey = process.env.COMPROMISED_PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
      throw new Error('Missing RPC_URL or COMPROMISED_PRIVATE_KEY in .env');
    }

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log('🔍 Wallet Address:', wallet.address);
    console.log('🌐 Network:', (await provider.getNetwork()).name);

    // Check current balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Current Balance:', ethers.formatEther(balance), 'ETH');

    // Check last 5 transactions
    console.log('\n📜 Recent Transactions:');
    const latestBlock = await provider.getBlockNumber();

    for (let i = 0; i < 5; i++) {
      const block = await provider.getBlock(latestBlock - i, true);
      if (block && block.transactions) {
        for (const tx of block.transactions) {
          if (typeof tx === 'object' && tx.to === wallet.address) {
            const txReceipt = await provider.getTransactionReceipt(tx.hash);
            console.log(`✅ TX Found: ${tx.hash}`);
            console.log(`   From: ${tx.from}`);
            console.log(`   Value: ${ethers.formatEther(tx.value)} ETH`);
            console.log(`   Block: ${txReceipt.blockNumber}`);
            console.log(`   Status: ${txReceipt.status === 1 ? 'Success' : 'Failed'}`);
          }
        }
      }
    }

    // Simple polling test
    console.log('\n🔄 Testing Balance Polling (10 seconds)...');
    const initialBalance = balance;

    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newBalance = await provider.getBalance(wallet.address);

      if (newBalance !== initialBalance) {
        console.log('🚨 BALANCE DETECTED!');
        console.log('   Previous:', ethers.formatEther(initialBalance), 'ETH');
        console.log('   Current:', ethers.formatEther(newBalance), 'ETH');
        console.log('   Change:', ethers.formatEther(newBalance - initialBalance), 'ETH');
        break;
      } else {
        console.log(`   Check ${i + 1}/10: ${ethers.formatEther(newBalance)} ETH`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBalance();