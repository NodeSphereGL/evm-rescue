import { JsonRpcProvider, Wallet } from 'ethers';
import { loadConfig, validateConfig } from './config/config';
import { BalanceMonitor } from './monitors/balance-monitor';
import { FlashbotsRescue } from './rescue/flashbots-rescue';
import { TelegramNotifier } from './utils/telegram-notifier';
import { logger, LogLevel } from './utils/logger';

/**
 * Main rescue bot application
 */
class RescueBot {
  private isRescueInProgress = false;
  private telegramNotifier?: TelegramNotifier;

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

      // Initialize Telegram notifications
      if (config.telegramBotToken && config.telegramChatId) {
        this.telegramNotifier = new TelegramNotifier(config.telegramBotToken, config.telegramChatId);

        // Test Telegram connection
        const telegramWorking = await this.telegramNotifier.testConnection();
        if (!telegramWorking) {
          logger.warn('Telegram notifications test failed, continuing without notifications');
          this.telegramNotifier = undefined;
        }
      }

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

          // Send rescue started notification
          if (this.telegramNotifier) {
            await this.telegramNotifier.sendRescueStarted({
              success: false,
              walletAddress: wallet.address,
              amount: balance,
              rescueType: 'auto'
            });
          }

          const result = await flashbotsRescue.executeRescue(balance);

          if (result.success) {
            logger.info('✓ Rescue completed successfully!');
            logger.info(`  Transaction: ${result.txHash}`);
            logger.info(`  Block: ${result.blockNumber}`);
            logger.info(`  Amount: ${this.formatEther(result.amountRescued!)} ETH`);

            // Send Telegram notification
            if (this.telegramNotifier) {
              await this.telegramNotifier.sendRescueSuccess({
                success: true,
                walletAddress: wallet.address,
                amount: result.amountRescued,
                txHash: result.txHash,
                blockNumber: result.blockNumber,
                rescueType: 'auto'
              });
            }

            // Stop monitoring after successful rescue
            balanceMonitor.stop();
            process.exit(0);
          } else {
            logger.error(`✗ Rescue failed: ${result.error}`);

            // Send Telegram notification
            if (this.telegramNotifier) {
              await this.telegramNotifier.sendRescueFailed({
                success: false,
                walletAddress: wallet.address,
                amount: balance,
                error: result.error,
                rescueType: 'auto'
              });
            }
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
      process.on('SIGINT', async () => {
        logger.info('Received SIGINT, shutting down...');
        if (this.telegramNotifier) {
          await this.telegramNotifier.sendBotStopped(wallet.address);
        }
        balanceMonitor.stop();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, shutting down...');
        if (this.telegramNotifier) {
          await this.telegramNotifier.sendBotStopped(wallet.address);
        }
        balanceMonitor.stop();
        process.exit(0);
      });

      // Send bot started notification
      if (this.telegramNotifier) {
        await this.telegramNotifier.sendBotStarted(wallet.address);
      }

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
