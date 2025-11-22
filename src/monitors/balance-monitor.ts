import { JsonRpcProvider, Wallet } from 'ethers';
import { logger } from '../utils/logger';
import { withRetry, sleep } from '../utils/retry';
import { AlchemyWebSocketProvider } from '../utils/alchemy-websocket';

export type BalanceChangeCallback = (balance: bigint) => Promise<void>;

export class BalanceMonitor {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private checkIntervalMs: number;
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private lastBalance: bigint = BigInt(0);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelayMs = 5000;
  private isWebSocketConnected = false;
  private wsProvider?: AlchemyWebSocketProvider;
  private rpcUrl: string;

  constructor(provider: JsonRpcProvider, wallet: Wallet, checkIntervalMs: number, rpcUrl?: string) {
    this.provider = provider;
    this.wallet = wallet;
    this.checkIntervalMs = checkIntervalMs;
    this.rpcUrl = rpcUrl || '';
  }

  /**
   * Start monitoring wallet balance
   */
  async start(onBalanceChange: BalanceChangeCallback): Promise<void> {
    if (this.isRunning) {
      logger.warn('Balance monitor already running');
      return;
    }

    this.isRunning = true;
    logger.info(`Starting balance monitor for ${this.wallet.address}`);
    logger.info(`Check interval: ${this.checkIntervalMs}ms (~${this.checkIntervalMs / 1000}s)`);

    // Initial balance check
    await this.checkBalance(onBalanceChange);

    // Set up polling interval
    this.intervalId = setInterval(async () => {
      try {
        await this.checkBalance(onBalanceChange);
      } catch (error) {
        logger.error('Error in balance check interval', error);
      }
    }, this.checkIntervalMs);
  }

  /**
   * Start monitoring using WebSocket for real-time updates
   */
  async startWebSocket(onBalanceChange: BalanceChangeCallback): Promise<void> {
    if (this.isRunning) {
      logger.warn('Balance monitor already running');
      return;
    }

    this.isRunning = true;
    logger.info(`Starting WebSocket balance monitor for ${this.wallet.address}`);

    // Initial balance check
    await this.checkBalance(onBalanceChange);

    // Start WebSocket connection with reconnection logic
    await this.connectWebSocket(onBalanceChange);
  }

  /**
   * Connect WebSocket with reconnection logic
   */
  private async connectWebSocket(onBalanceChange: BalanceChangeCallback): Promise<void> {
    while (this.isRunning && this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        logger.info(`Connecting WebSocket (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);

        if (!this.rpcUrl) {
          throw new Error('RPC URL not provided for WebSocket connection');
        }

        // Create enhanced WebSocket provider
        this.wsProvider = new AlchemyWebSocketProvider(this.rpcUrl);

        // Connect to WebSocket
        await this.wsProvider.connect();

        // Subscribe to new blocks
        await this.wsProvider.subscribeToNewBlocks(async (blockNumber: number) => {
          try {
            logger.debug(`New block ${blockNumber}, checking balance...`);
            await this.checkBalance(onBalanceChange);
          } catch (error) {
            logger.error('Error in WebSocket balance check', error);
            this.isWebSocketConnected = false;
          }
        });

        // Reset reconnect attempts on successful connection
        this.reconnectAttempts = 0;
        this.isWebSocketConnected = true;
        logger.info('✅ Enhanced WebSocket connection established successfully');

        // Keep the connection alive (monitor for disconnections)
        await this.keepConnectionAlive(onBalanceChange);

      } catch (error) {
        this.reconnectAttempts++;
        this.isWebSocketConnected = false;

        logger.error(`WebSocket connection failed (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error);

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error('Max reconnection attempts reached. Falling back to polling mode...');
          await this.fallbackToPolling(onBalanceChange);
          return;
        }

        // Exponential backoff for reconnection
        const delay = this.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1);
        logger.info(`Retrying WebSocket connection in ${delay}ms...`);
        await sleep(Math.min(delay, 30000)); // Cap at 30 seconds
      }
    }
  }

  /**
   * Set up WebSocket event listeners
   */
  private async setupWebSocketListeners(onBalanceChange: BalanceChangeCallback): Promise<void> {
    return new Promise((resolve, reject) => {
      // Remove existing listeners
      this.provider.removeAllListeners('error');
      this.provider.removeAllListeners('block');

      // Handle WebSocket errors
      this.provider.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.isWebSocketConnected = false;
        reject(error);
      });

      // Handle new blocks
      this.provider.on('block', async (blockNumber) => {
        try {
          if (this.isWebSocketConnected) {
            logger.debug(`New block ${blockNumber}, checking balance...`);
            await this.checkBalance(onBalanceChange);
          }
        } catch (error) {
          logger.error('Error in WebSocket balance check', error);
          this.isWebSocketConnected = false;
        }
      });

      // Set a timeout to detect if connection fails
      setTimeout(() => {
        if (!this.isWebSocketConnected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);

      resolve();
    });
  }

  /**
   * Wait for WebSocket connection to be established
   */
  private async waitForConnection(): Promise<void> {
    // Check if provider is ready
    await withRetry(
      async () => {
        const network = await this.provider.getNetwork();
        logger.debug(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
      },
      'wait for WebSocket connection',
      { maxAttempts: 3, baseDelayMs: 1000 }
    );
  }

  /**
   * Keep WebSocket connection alive and handle disconnections
   */
  private async keepConnectionAlive(onBalanceChange: BalanceChangeCallback): Promise<void> {
    return new Promise((resolve, reject) => {
      // This promise will never resolve under normal operation
      // It will reject if the WebSocket disconnects
      const disconnectHandler = () => {
        logger.warn('WebSocket disconnected');
        this.isWebSocketConnected = false;
        this.provider.removeAllListeners();
        reject(new Error('WebSocket disconnected'));
      };

      // Listen for provider disconnection
      this.provider.on('error', disconnectHandler);
    });
  }

  /**
   * Fallback to polling mode if WebSocket fails
   */
  private async fallbackToPolling(onBalanceChange: BalanceChangeCallback): Promise<void> {
    logger.info('Switching to polling mode for balance monitoring');

    // Set up polling interval
    this.intervalId = setInterval(async () => {
      try {
        await this.checkBalance(onBalanceChange);
      } catch (error) {
        logger.error('Error in polling balance check', error);
      }
    }, this.checkIntervalMs);

    // Try to reconnect to WebSocket periodically
    setInterval(async () => {
      if (this.isRunning && !this.isWebSocketConnected) {
        logger.info('Attempting to reconnect to WebSocket...');
        this.reconnectAttempts = 0; // Reset attempts for reconnection

        try {
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
          }

          await this.connectWebSocket(onBalanceChange);
        } catch (error) {
          logger.error('WebSocket reconnection failed, continuing with polling:', error);
          // Re-establish polling if WebSocket reconnection fails
          if (!this.intervalId) {
            this.intervalId = setInterval(async () => {
              try {
                await this.checkBalance(onBalanceChange);
              } catch (error) {
                logger.error('Error in polling balance check', error);
              }
            }, this.checkIntervalMs);
          }
        }
      }
    }, 60000); // Try to reconnect every minute
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping balance monitor');
    this.isRunning = false;
    this.isWebSocketConnected = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Disconnect WebSocket provider
    if (this.wsProvider) {
      this.wsProvider.disconnect();
      this.wsProvider = undefined;
    }

    // Remove all listeners from original provider
    this.provider.removeAllListeners('block');
    this.provider.removeAllListeners('error');
  }

  /**
   * Check wallet balance and trigger callback if changed
   */
  private async checkBalance(onBalanceChange: BalanceChangeCallback): Promise<void> {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);

      // Only trigger callback if balance increased
      if (balance > this.lastBalance) {
        const difference = balance - this.lastBalance;
        logger.info(
          `Balance increased! New: ${this.formatEther(balance)} ETH ` +
          `(+${this.formatEther(difference)} ETH)`
        );

        this.lastBalance = balance;
        await onBalanceChange(balance);
      } else if (balance !== this.lastBalance) {
        logger.debug(`Balance unchanged or decreased: ${this.formatEther(balance)} ETH`);
        this.lastBalance = balance;
      }
    } catch (error) {
      logger.error('Failed to check balance', error);
      throw error;
    }
  }

  /**
   * Get current balance
   */
  async getCurrentBalance(): Promise<bigint> {
    return await this.provider.getBalance(this.wallet.address);
  }

  /**
   * Check if monitor is running
   */
  isMonitoring(): boolean {
    return this.isRunning;
  }

  private formatEther(wei: bigint): string {
    return (Number(wei) / 1e18).toFixed(6);
  }
}
