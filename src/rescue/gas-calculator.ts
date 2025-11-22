import { ethers, JsonRpcProvider } from 'ethers';
import { logger } from '../utils/logger';
import { withRetry, withTimeout, CircuitBreaker } from '../utils/retry';

export interface GasEstimate {
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  totalGasCost: bigint;
}

export class GasCalculator {
  private provider: JsonRpcProvider;
  private maxPriorityFeeGwei: number;
  private circuitBreaker: CircuitBreaker;

  constructor(provider: JsonRpcProvider, maxPriorityFeeGwei: number) {
    this.provider = provider;
    this.maxPriorityFeeGwei = maxPriorityFeeGwei;
    this.circuitBreaker = new CircuitBreaker(5, 60000, 'GasCalculator');
  }

  /**
   * Calculate optimal gas parameters for rescue transaction
   */
  async calculateGasParams(): Promise<GasEstimate> {
    return this.circuitBreaker.execute(async () => {
      const feeData = await withTimeout(
        () => withRetry(
          () => this.provider.getFeeData(),
          'getFeeData',
          { maxAttempts: 3, baseDelayMs: 1000 }
        ),
        10000,
        'getFeeData timeout'
      );

      if (!feeData.maxFeePerGas || !feeData.maxPriorityFeePerGas) {
        throw new Error('Failed to fetch fee data from provider');
      }

      // Use standard ETH transfer gas limit
      const gasLimit = BigInt(21000);

      // Use network fee or our max priority fee, whichever is lower
      const ourPriorityFee = ethers.parseUnits(
        this.maxPriorityFeeGwei.toString(),
        'gwei'
      );

      // Calculate maxFeePerGas = baseFee + maxPriorityFee
      // Use 2x baseFee for safety to handle next block increase
      const baseFee = feeData.maxFeePerGas! - feeData.maxPriorityFeePerGas!;
      const maxFeePerGas = (baseFee * 2n) + ourPriorityFee;
      const maxPriorityFeePerGas = ourPriorityFee;

      const totalGasCost = gasLimit * maxFeePerGas;

      logger.debug('Gas calculation:', {
        gasLimit: gasLimit.toString(),
        maxFeePerGas: this.formatGwei(maxFeePerGas) + ' gwei',
        maxPriorityFeePerGas: this.formatGwei(maxPriorityFeePerGas) + ' gwei',
        totalGasCost: ethers.formatEther(totalGasCost) + ' ETH',
      });

      return {
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        totalGasCost,
      };
    });
  }

  /**
   * Calculate amount to sweep, leaving enough for gas
   */
  calculateSweepAmount(balance: bigint, totalGasCost: bigint): bigint {
    const safetyBuffer = totalGasCost / 10n; // 10% safety margin
    const amountToSweep = balance - totalGasCost - safetyBuffer;

    if (amountToSweep <= 0n) {
      throw new Error('Insufficient balance to cover gas costs');
    }

    logger.info(`Balance: ${ethers.formatEther(balance)} ETH`);
    logger.info(`Gas cost: ${ethers.formatEther(totalGasCost)} ETH`);
    logger.info(`Safety buffer: ${ethers.formatEther(safetyBuffer)} ETH`);
    logger.info(`Amount to sweep: ${ethers.formatEther(amountToSweep)} ETH`);

    return amountToSweep;
  }

  /**
   * Check if rescue is economically viable
   */
  isRescueViable(balance: bigint, minRescueAmount: bigint, totalGasCost: bigint): boolean {
    try {
      const sweepAmount = this.calculateSweepAmount(balance, totalGasCost);
      const isViable = sweepAmount >= minRescueAmount;

      if (!isViable) {
        logger.warn(
          `Rescue not viable: sweep amount ${ethers.formatEther(sweepAmount)} ETH ` +
          `< minimum ${ethers.formatEther(minRescueAmount)} ETH`
        );
      }

      return isViable;
    } catch (error) {
      logger.warn('Rescue not viable:', error);
      return false;
    }
  }

  private formatGwei(wei: bigint): string {
    // Use ethers formatter to avoid precision loss
    return ethers.formatUnits(wei, 'gwei');
  }
}
