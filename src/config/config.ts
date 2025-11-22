import * as dotenv from 'dotenv';
import { parseEther, isAddress } from 'ethers';

dotenv.config();

export interface Config {
  rpcUrl: string;
  flashbotsRpcUrl: string;
  compromisedPrivateKey: string;
  safeWalletAddress: string;
  checkIntervalMs: number;
  minRescueAmountWei: bigint;
  targetBlocks: number;
  maxPriorityFeeGwei: number;
  telegramBotToken?: string;
  telegramChatId?: string;
}

function getEnvVar(key: string, required = true): string {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

export function loadConfig(): Config {
  return {
    rpcUrl: getEnvVar('RPC_URL'),
    flashbotsRpcUrl: getEnvVar('FLASHBOTS_RPC_URL', false) || 'https://relay.flashbots.net',
    compromisedPrivateKey: getEnvVar('COMPROMISED_PRIVATE_KEY'),
    safeWalletAddress: getEnvVar('SAFE_WALLET_ADDRESS'),
    checkIntervalMs: parseInt(getEnvVar('CHECK_INTERVAL_MS', false) || '12000', 10),
    minRescueAmountWei: parseEther(getEnvVar('MIN_RESCUE_AMOUNT_ETH', false) || '0.005'),
    targetBlocks: parseInt(getEnvVar('TARGET_BLOCKS', false) || '5', 10),
    maxPriorityFeeGwei: parseFloat(getEnvVar('MAX_PRIORITY_FEE_GWEI', false) || '2'),
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
  };
}

export function validateConfig(config: Config): void {
  if (!config.rpcUrl.startsWith('http')) {
    throw new Error('Invalid RPC_URL: must be a valid HTTP(S) URL');
  }

  // Validate private key format (must be 0x + 64 hex chars)
  if (!config.compromisedPrivateKey.startsWith('0x') ||
      config.compromisedPrivateKey.length !== 66 ||
      !/^0x[0-9a-fA-F]{64}$/.test(config.compromisedPrivateKey)) {
    throw new Error('Invalid COMPROMISED_PRIVATE_KEY: must be 0x followed by 64 hex characters');
  }

  // Validate safe wallet address using ethers
  if (!isAddress(config.safeWalletAddress)) {
    throw new Error('Invalid SAFE_WALLET_ADDRESS: must be a valid Ethereum address');
  }

  if (config.checkIntervalMs < 1000) {
    throw new Error('CHECK_INTERVAL_MS must be at least 1000ms');
  }

  if (config.targetBlocks < 1 || config.targetBlocks > 10) {
    throw new Error('TARGET_BLOCKS must be between 1 and 10');
  }
}
