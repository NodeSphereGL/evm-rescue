import { JsonRpcProvider, Wallet } from 'ethers';
import { loadConfig, validateConfig } from './config/config';
import { BalanceMonitor } from './monitors/balance-monitor';
import { FlashbotsRescue } from './rescue/flashbots-rescue';
import { logger, LogLevel } from './utils/logger';

/**
 * Main rescue bot application
 */
class RescueBot {
  private isRescueInProgress = false;

  async run(): Promise<void> {
    try {
      // Load and validate configuration
      logger.info('Loading configuration...');
      const config = loadConfig();
      validateConfig(config);

      logger.info('Configuration loaded successfully');
      logger.info(`Safe wallet: ${config.safeWalletAddress}`);
      logger.info(`RPC URL: ${config.rpcUrl}`);

      // Initialize provider and wallet
      const provider = new JsonRpcProvider(config.rpcUrl);
      const wallet = new Wallet(config.compromisedPrivateKey, provider);

      logger.info(`Monitoring wallet: ${wallet.address}`);

      // Verify connection
      const network = await provider.getNetwork();
      logger.info(`Connected to network: ${network.name} (chainId: ${network.chainId})`);

      // Initialize Flashbots rescue
      const flashbotsRescue = new FlashbotsRescue(
        provider,
        wallet,
        config.safeWalletAddress,
        config.minRescueAmountWei,
        config.targetBlocks,
        config.maxPriorityFeeGwei,
        config.flashbotsRpcUrl
      );

      await flashbotsRescue.initialize();

      // Initialize balance monitor
      const balanceMonitor = new BalanceMonitor(
        provider,
        wallet,
        config.checkIntervalMs,
        config.rpcUrl
      );

      // Set up balance change handler
      const handleBalanceChange = async (balance: bigint): Promise<void> => {
        if (this.isRescueInProgress) {
          logger.warn('Rescue already in progress, skipping...');
          return;
        }

        try {
          this.isRescueInProgress = true;
          logger.info('🚨 Balance increase detected! Initiating rescue...');

          const result = await flashbotsRescue.executeRescue(balance);

          if (result.success) {
            logger.info('✓ Rescue completed successfully!');
            logger.info(`  Transaction: ${result.txHash}`);
            logger.info(`  Block: ${result.blockNumber}`);
            logger.info(`  Amount: ${this.formatEther(result.amountRescued!)} ETH`);

            // Stop monitoring after successful rescue
            balanceMonitor.stop();
            process.exit(0);
          } else {
            logger.error(`✗ Rescue failed: ${result.error}`);
          }
        } catch (error) {
          logger.error('Rescue operation error', error);
        } finally {
          this.isRescueInProgress = false;
        }
      };

      // Start monitoring using WebSocket for real-time updates
      logger.info('Starting balance monitor...');
      await balanceMonitor.startWebSocket(handleBalanceChange);

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        logger.info('Received SIGINT, shutting down...');
        balanceMonitor.stop();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        logger.info('Received SIGTERM, shutting down...');
        balanceMonitor.stop();
        process.exit(0);
      });

      logger.info('Rescue bot is running. Press Ctrl+C to stop.');
    } catch (error) {
      logger.error('Failed to start rescue bot', error);
      process.exit(1);
    }
  }

  private formatEther(wei: bigint): string {
    return (Number(wei) / 1e18).toFixed(6);
  }
}

// Main entry point
if (require.main === module) {
  // Set log level based on environment
  const logLevel = process.env.LOG_LEVEL?.toUpperCase() as keyof typeof LogLevel;
  if (logLevel && LogLevel[logLevel] !== undefined) {
    logger.setLevel(LogLevel[logLevel]);
  }

  const bot = new RescueBot();
  bot.run().catch((error) => {
    logger.error('Unhandled error', error);
    process.exit(1);
  });
}

export { RescueBot };
