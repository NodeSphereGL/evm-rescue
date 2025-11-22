import { JsonRpcProvider, Wallet, ethers } from 'ethers';
import { FlashbotsBundleProvider, FlashbotsBundleResolution, FlashbotsBundleTransaction } from '@flashbots/ethers-provider-bundle';
import { GasCalculator } from './gas-calculator';
import { BundleBuilder } from './bundle-builder';
import { logger } from '../utils/logger';
import { withRetry, withTimeout, CircuitBreaker } from '../utils/retry';

export interface RescueResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  amountRescued?: bigint;
  error?: string;
}

export class FlashbotsRescue {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private flashbotsProvider?: FlashbotsBundleProvider;
  private gasCalculator: GasCalculator;
  private bundleBuilder: BundleBuilder;
  private safeWalletAddress: string;
  private minRescueAmount: bigint;
  private targetBlocks: number;
  private flashbotsRpcUrl: string;
  private circuitBreaker: CircuitBreaker;

  constructor(
    provider: JsonRpcProvider,
    wallet: Wallet,
    safeWalletAddress: string,
    minRescueAmount: bigint,
    targetBlocks: number,
    maxPriorityFeeGwei: number,
    flashbotsRpcUrl: string
  ) {
    this.provider = provider;
    this.wallet = wallet;
    this.safeWalletAddress = safeWalletAddress;
    this.minRescueAmount = minRescueAmount;
    this.targetBlocks = targetBlocks;
    this.flashbotsRpcUrl = flashbotsRpcUrl;
    this.gasCalculator = new GasCalculator(provider, maxPriorityFeeGwei);
    this.bundleBuilder = new BundleBuilder(wallet, safeWalletAddress);
    this.circuitBreaker = new CircuitBreaker(3, 120000, 'FlashbotsRescue'); // 3 failures, 2min timeout
  }

  /**
   * Initialize Flashbots provider
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Flashbots provider...');

      this.flashbotsProvider = await FlashbotsBundleProvider.create(
        this.provider,
        this.wallet,
        this.flashbotsRpcUrl,
        'mainnet'
      );

      logger.info('Flashbots provider initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Flashbots provider', error);
      throw error;
    }
  }

  /**
   * Execute rescue operation
   */
  async executeRescue(balance: bigint): Promise<RescueResult> {
    return this.circuitBreaker.execute(async () => {
      try {
        logger.info('='.repeat(60));
        logger.info('STARTING RESCUE OPERATION');
        logger.info('='.repeat(60));

        if (!this.flashbotsProvider) {
          await withRetry(
            () => this.initialize(),
            'initialize Flashbots provider',
            { maxAttempts: 3, baseDelayMs: 2000 }
          );
        }

        // Calculate gas parameters with retry
        const gasEstimate = await this.gasCalculator.calculateGasParams();

        // Check economic viability
        if (!this.gasCalculator.isRescueViable(balance, this.minRescueAmount, gasEstimate.totalGasCost)) {
          return {
            success: false,
            error: 'Rescue not economically viable',
          };
        }

        // Calculate sweep amount
        const sweepAmount = this.gasCalculator.calculateSweepAmount(balance, gasEstimate.totalGasCost);

        // Build rescue bundle
        const bundle = await withRetry(
          () => this.bundleBuilder.buildRescueBundle(balance, sweepAmount, gasEstimate),
          'build rescue bundle',
          { maxAttempts: 2, baseDelayMs: 500 }
        );

        // Get current block number with retry
        const currentBlock = await withRetry(
          () => withTimeout(
            () => this.provider.getBlockNumber(),
            5000,
            'getBlockNumber timeout'
          ),
          'get current block number',
          { maxAttempts: 3, baseDelayMs: 1000 }
        );

        logger.info(`Current block: ${currentBlock}`);

        // Submit bundle to multiple future blocks with retry
        logger.info(`Submitting bundle to next ${this.targetBlocks} blocks...`);

        const results = await Promise.allSettled(
          Array.from({ length: this.targetBlocks }, (_, i) => {
            const targetBlock = currentBlock + i + 1;
            return this.submitBundleWithRetry(bundle, targetBlock);
          })
        );

      // Check if any bundle was included
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          logger.info('='.repeat(60));
          logger.info('RESCUE SUCCESSFUL!');
          logger.info('='.repeat(60));
          logger.info(`Transaction hash: ${result.value.txHash}`);
          logger.info(`Block number: ${result.value.blockNumber}`);
          logger.info(`Amount rescued: ${this.formatEther(sweepAmount)} ETH`);
          logger.info('='.repeat(60));

          return {
            success: true,
            txHash: result.value.txHash,
            blockNumber: result.value.blockNumber,
            amountRescued: sweepAmount,
          };
        }
      }

      logger.warn('Bundle not included in any target block');
      return {
        success: false,
        error: 'Bundle not included in target blocks',
      };
      } catch (error) {
        logger.error('Rescue operation failed', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });
  }

  /**
   * Submit bundle to specific block
   */
  private async submitBundle(bundle: FlashbotsBundleTransaction[], targetBlock: number): Promise<RescueResult> {
    try {
      if (!this.flashbotsProvider) {
        throw new Error('Flashbots provider not initialized');
      }

      logger.info(`Submitting bundle for block ${targetBlock}...`);

      const bundleResponse = await this.flashbotsProvider.sendBundle(
        bundle,
        targetBlock
      );

      // Check if sendBundle returned an error
      if ('error' in bundleResponse) {
        logger.error(`✗ Bundle submission error for block ${targetBlock}: ${bundleResponse.error.message}`);
        return {
          success: false,
          error: bundleResponse.error.message,
        };
      }

      // Wait for bundle inclusion
      const resolution = await bundleResponse.wait();

      if (resolution === FlashbotsBundleResolution.BundleIncluded) {
        logger.info(`✓ Bundle included in block ${targetBlock}`);

        // Get transaction receipts
        const receipts = await bundleResponse.receipts();
        const txHash = receipts[0]?.hash || 'unknown';

        return {
          success: true,
          txHash,
          blockNumber: targetBlock,
        };
      } else if (resolution === FlashbotsBundleResolution.BlockPassedWithoutInclusion) {
        logger.debug(`✗ Block ${targetBlock} passed without inclusion`);
      } else if (resolution === FlashbotsBundleResolution.AccountNonceTooHigh) {
        logger.error(`✗ Account nonce too high for block ${targetBlock}`);
      }

      return {
        success: false,
        error: `Resolution: ${resolution}`,
      };
    } catch (error) {
      logger.error(`Failed to submit bundle for block ${targetBlock}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Submit bundle with retry logic
   */
  private async submitBundleWithRetry(bundle: FlashbotsBundleTransaction[], targetBlock: number): Promise<RescueResult> {
    return withRetry(
      () => this.submitBundle(bundle, targetBlock),
      `submit bundle for block ${targetBlock}`,
      {
        maxAttempts: 2, // Only retry once for bundles
        baseDelayMs: 200,
        maxDelayMs: 1000,
      }
    );
  }

  private formatEther(wei: bigint): string {
    return ethers.formatEther(wei);
  }
}
