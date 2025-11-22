import { loadConfig, validateConfig } from '../../src/config/config';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load configuration from environment variables', () => {
      process.env.RPC_URL = 'https://eth-mainnet.example.com';
      process.env.COMPROMISED_PRIVATE_KEY = '0x1234567890abcdef';
      process.env.SAFE_WALLET_ADDRESS = '0xabcdef1234567890abcdef1234567890abcdef12';

      const config = loadConfig();

      expect(config.rpcUrl).toBe('https://eth-mainnet.example.com');
      expect(config.compromisedPrivateKey).toBe('0x1234567890abcdef');
      expect(config.safeWalletAddress).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    });

    it('should use default values for optional parameters', () => {
      process.env.RPC_URL = 'https://eth-mainnet.example.com';
      process.env.COMPROMISED_PRIVATE_KEY = '0x1234567890abcdef';
      process.env.SAFE_WALLET_ADDRESS = '0xabcdef1234567890abcdef1234567890abcdef12';

      const config = loadConfig();

      expect(config.checkIntervalMs).toBe(12000);
      expect(config.targetBlocks).toBe(5);
      expect(config.flashbotsRpcUrl).toBe('https://relay.flashbots.net');
    });

    it('should throw error for missing required variables', () => {
      delete process.env.RPC_URL;

      expect(() => loadConfig()).toThrow('Missing required environment variable: RPC_URL');
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const config = {
        rpcUrl: 'https://eth-mainnet.example.com',
        flashbotsRpcUrl: 'https://relay.flashbots.net',
        compromisedPrivateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        safeWalletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        checkIntervalMs: 12000,
        minRescueAmountWei: BigInt('5000000000000000'),
        targetBlocks: 5,
        maxPriorityFeeGwei: 2,
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should reject invalid RPC URL', () => {
      const config = {
        rpcUrl: 'invalid-url',
        flashbotsRpcUrl: 'https://relay.flashbots.net',
        compromisedPrivateKey: '0x1234567890abcdef',
        safeWalletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        checkIntervalMs: 12000,
        minRescueAmountWei: BigInt('5000000000000000'),
        targetBlocks: 5,
        maxPriorityFeeGwei: 2,
      };

      expect(() => validateConfig(config)).toThrow('Invalid RPC_URL');
    });

    it('should reject invalid private key', () => {
      const config = {
        rpcUrl: 'https://eth-mainnet.example.com',
        flashbotsRpcUrl: 'https://relay.flashbots.net',
        compromisedPrivateKey: 'invalid-key',
        safeWalletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        checkIntervalMs: 12000,
        minRescueAmountWei: BigInt('5000000000000000'),
        targetBlocks: 5,
        maxPriorityFeeGwei: 2,
      };

      expect(() => validateConfig(config)).toThrow('Invalid COMPROMISED_PRIVATE_KEY');
    });

    it('should reject invalid wallet address', () => {
      const config = {
        rpcUrl: 'https://eth-mainnet.example.com',
        flashbotsRpcUrl: 'https://relay.flashbots.net',
        compromisedPrivateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        safeWalletAddress: 'invalid-address',
        checkIntervalMs: 12000,
        minRescueAmountWei: BigInt('5000000000000000'),
        targetBlocks: 5,
        maxPriorityFeeGwei: 2,
      };

      expect(() => validateConfig(config)).toThrow('Invalid SAFE_WALLET_ADDRESS');
    });

    it('should reject interval less than 1000ms', () => {
      const config = {
        rpcUrl: 'https://eth-mainnet.example.com',
        flashbotsRpcUrl: 'https://relay.flashbots.net',
        compromisedPrivateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        safeWalletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        checkIntervalMs: 500,
        minRescueAmountWei: BigInt('5000000000000000'),
        targetBlocks: 5,
        maxPriorityFeeGwei: 2,
      };

      expect(() => validateConfig(config)).toThrow('CHECK_INTERVAL_MS must be at least 1000ms');
    });

    it('should reject invalid target blocks', () => {
      const config = {
        rpcUrl: 'https://eth-mainnet.example.com',
        flashbotsRpcUrl: 'https://relay.flashbots.net',
        compromisedPrivateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        safeWalletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        checkIntervalMs: 12000,
        minRescueAmountWei: BigInt('5000000000000000'),
        targetBlocks: 15,
        maxPriorityFeeGwei: 2,
      };

      expect(() => validateConfig(config)).toThrow('TARGET_BLOCKS must be between 1 and 10');
    });
  });
});
