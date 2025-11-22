import { ethers, WebSocketProvider } from 'ethers';
import { logger } from './logger';

/**
 * Enhanced WebSocket Provider for Alchemy (Ethers v6 compatible)
 * Uses proper v6 event handling
 */
export class AlchemyWebSocketProvider {
  private provider: WebSocketProvider;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private rpcUrl: string) {
    // Convert HTTPS to WebSocket URL
    const wsUrl = rpcUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');

    logger.info(`Creating WebSocket provider: ${wsUrl}`);
    this.provider = new ethers.WebSocketProvider(wsUrl);
  }

  async connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Test connectivity by getting network info
        await this.testConnectivity();

        this.isConnected = true;
        this.reconnectAttempts = 0;

        logger.info('✅ WebSocket connection established');
        resolve();

      } catch (error) {
        logger.error('❌ WebSocket connection failed:', error);
        reject(error);
      }
    });
  }

  private async testConnectivity(): Promise<void> {
    try {
      const network = await this.provider.getNetwork();
      logger.info(`✅ WebSocket connected to: ${network.name} (chainId: ${network.chainId})`);
    } catch (error) {
      throw new Error(`WebSocket connectivity test failed: ${(error as Error).message}`);
    }
  }

  async subscribeToNewBlocks(onBlock: (blockNumber: number) => void): Promise<void> {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    logger.info('📡 Subscribing to new blocks...');

    try {
      // Method 1: Use provider.on('block') with v6 syntax
      this.provider.on('block', (blockNumber) => {
        logger.debug(`📦 New block (event): ${blockNumber}`);
        onBlock(Number(blockNumber));
      });

      logger.info('✅ Subscribed to blocks via provider.on("block")');

      // Method 2: Add backup polling for extra reliability
      this.startBlockPolling(onBlock);

      // Method 3: Monitor connection health
      this.startConnectionMonitoring();

    } catch (error) {
      logger.error('❌ WebSocket subscription failed:', error);
      throw error;
    }
  }

  private startBlockPolling(onBlock: (blockNumber: number) => void): void {
    let lastBlock = 0;

    setInterval(async () => {
      try {
        const currentBlock = await this.provider.getBlockNumber();
        if (currentBlock > lastBlock) {
          lastBlock = currentBlock;
          logger.debug(`📦 New block (polling): ${currentBlock}`);
          onBlock(currentBlock);
        }
      } catch (error) {
        logger.warn('Block polling error:', error);
        // Connection might be lost, try to reconnect
        this.handleConnectionLoss();
      }
    }, 3000); // Poll every 3 seconds
  }

  private startConnectionMonitoring(): void {
    setInterval(async () => {
      try {
        // Test connection with a lightweight call
        await this.provider.getNetwork();
      } catch (error) {
        logger.warn('Connection health check failed:', error);
        this.handleConnectionLoss();
      }
    }, 10000); // Check every 10 seconds
  }

  private async handleConnectionLoss(): Promise<void> {
    if (this.isConnected) {
      this.isConnected = false;
      logger.warn('🔌 Connection lost, attempting reconnection...');

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;

        try {
          await this.sleep(Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000));
          await this.connect();
          logger.info(`✅ Reconnection successful (attempt ${this.reconnectAttempts})`);
        } catch (error) {
          logger.error(`❌ Reconnection failed (attempt ${this.reconnectAttempts}):`, error);
        }
      } else {
        logger.error('❌ Max reconnection attempts reached');
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getBalance(address: string): Promise<bigint> {
    try {
      return await this.provider.getBalance(address);
    } catch (error) {
      logger.warn('Balance query failed:', error);
      this.handleConnectionLoss();
      throw error;
    }
  }

  async getNetwork(): Promise<ethers.Network> {
    try {
      return await this.provider.getNetwork();
    } catch (error) {
      logger.warn('Network query failed:', error);
      this.handleConnectionLoss();
      throw error;
    }
  }

  disconnect(): void {
    this.isConnected = false;
    try {
      this.provider.removeAllListeners();
      logger.info('🔌 WebSocket disconnected');
    } catch (error) {
      logger.warn('Error during disconnect:', error);
    }
  }

  isConnectionActive(): boolean {
    return this.isConnected;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}