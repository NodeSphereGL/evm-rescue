import { TransactionRequest, Wallet, ethers } from 'ethers';
import { FlashbotsBundleTransaction } from '@flashbots/ethers-provider-bundle';
import { GasEstimate } from './gas-calculator';
import { logger } from '../utils/logger';

export class BundleBuilder {
  private wallet: Wallet;
  private safeWalletAddress: string;

  constructor(wallet: Wallet, safeWalletAddress: string) {
    this.wallet = wallet;
    this.safeWalletAddress = safeWalletAddress;
  }

  /**
   * Build Flashbots bundle with rescue transaction
   */
  async buildRescueBundle(
    balance: bigint,
    sweepAmount: bigint,
    gasEstimate: GasEstimate
  ): Promise<FlashbotsBundleTransaction[]> {
    try {
      logger.info('Building Flashbots rescue bundle...');

      // Verify wallet has provider
      if (!this.wallet.provider) {
        throw new Error('Wallet provider not connected');
      }

      // Get network info and nonce
      const network = await this.wallet.provider.getNetwork();
      const nonce = await this.wallet.getNonce();

      // Create rescue transaction
      const rescueTx: TransactionRequest = {
        to: this.safeWalletAddress,
        value: sweepAmount,
        gasLimit: gasEstimate.gasLimit,
        maxFeePerGas: gasEstimate.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
        chainId: network.chainId,
        nonce: nonce,
        type: 2, // EIP-1559 transaction
      };

      // Sign the transaction
      const signedTx = await this.wallet.signTransaction(rescueTx);

      logger.info('Rescue transaction signed:');
      logger.info(`  From: ${this.wallet.address}`);
      logger.info(`  To: ${this.safeWalletAddress}`);
      logger.info(`  Value: ${this.formatEther(sweepAmount)} ETH`);
      logger.info(`  Gas Limit: ${gasEstimate.gasLimit.toString()}`);
      logger.info(`  Max Fee: ${this.formatGwei(gasEstimate.maxFeePerGas)} gwei`);

      // Build bundle (array of signed transactions)
      const bundle: FlashbotsBundleTransaction[] = [
        {
          transaction: rescueTx,
          signer: this.wallet,
        },
      ];

      return bundle;
    } catch (error) {
      logger.error('Failed to build rescue bundle', error);
      throw error;
    }
  }

  /**
   * Simulate bundle execution (for testing)
   */
  async simulateBundle(
    bundle: FlashbotsBundleTransaction[],
    blockNumber: number
  ): Promise<boolean> {
    try {
      logger.debug(`Simulating bundle for block ${blockNumber}...`);
      // In production, this would call flashbotsProvider.simulate()
      // For now, we'll just validate the bundle structure

      if (bundle.length === 0) {
        throw new Error('Empty bundle');
      }

      for (const tx of bundle) {
        if (!tx.transaction || !tx.signer) {
          throw new Error('Invalid transaction in bundle: must have transaction and signer');
        }
      }

      logger.debug('Bundle simulation passed');
      return true;
    } catch (error) {
      logger.error('Bundle simulation failed', error);
      return false;
    }
  }

  private formatEther(wei: bigint): string {
    return ethers.formatEther(wei);
  }

  private formatGwei(wei: bigint): string {
    return ethers.formatUnits(wei, 'gwei');
  }
}
