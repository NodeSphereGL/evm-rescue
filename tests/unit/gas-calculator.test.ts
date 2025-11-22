import { JsonRpcProvider } from 'ethers';
import { GasCalculator } from '../../src/rescue/gas-calculator';

// Mock ethers provider
jest.mock('ethers');

describe('GasCalculator', () => {
  let mockProvider: jest.Mocked<JsonRpcProvider>;
  let gasCalculator: GasCalculator;

  beforeEach(() => {
    mockProvider = {
      getFeeData: jest.fn(),
    } as unknown as jest.Mocked<JsonRpcProvider>;

    gasCalculator = new GasCalculator(mockProvider, 2);
  });

  describe('calculateGasParams', () => {
    it('should calculate gas parameters correctly', async () => {
      const mockFeeData = {
        maxFeePerGas: BigInt('50000000000'), // 50 gwei
        maxPriorityFeePerGas: BigInt('2000000000'), // 2 gwei
        gasPrice: BigInt('50000000000'),
        toJSON: () => ({})
      };

      mockProvider.getFeeData.mockResolvedValue(mockFeeData);

      const result = await gasCalculator.calculateGasParams();

      expect(result.gasLimit).toBe(BigInt(21000));
      expect(result.maxPriorityFeePerGas).toBe(BigInt('2000000000')); // 2 gwei
      expect(result.totalGasCost).toBeGreaterThan(BigInt(0));
    });

    it('should throw error when fee data unavailable', async () => {
      mockProvider.getFeeData.mockResolvedValue({
        maxFeePerGas: null,
        maxPriorityFeePerGas: null,
        gasPrice: null,
        toJSON: () => ({})
      });

      await expect(gasCalculator.calculateGasParams()).rejects.toThrow();
    });
  });

  describe('calculateSweepAmount', () => {
    it('should calculate sweep amount correctly', () => {
      const balance = BigInt('100000000000000000'); // 0.1 ETH
      const gasCost = BigInt('10000000000000000'); // 0.01 ETH

      const sweepAmount = gasCalculator.calculateSweepAmount(balance, gasCost);

      // Should be balance - gasCost - 10% safety buffer
      const expectedBuffer = gasCost / BigInt(10);
      const expected = balance - gasCost - expectedBuffer;

      expect(sweepAmount).toBe(expected);
    });

    it('should throw error when balance too low', () => {
      const balance = BigInt('5000000000000000'); // 0.005 ETH
      const gasCost = BigInt('10000000000000000'); // 0.01 ETH (more than balance)

      expect(() => gasCalculator.calculateSweepAmount(balance, gasCost)).toThrow(
        'Insufficient balance to cover gas costs'
      );
    });
  });

  describe('isRescueViable', () => {
    it('should return true when rescue is viable', () => {
      const balance = BigInt('100000000000000000'); // 0.1 ETH
      const minAmount = BigInt('5000000000000000'); // 0.005 ETH
      const gasCost = BigInt('10000000000000000'); // 0.01 ETH

      const result = gasCalculator.isRescueViable(balance, minAmount, gasCost);

      expect(result).toBe(true);
    });

    it('should return false when sweep amount too small', () => {
      const balance = BigInt('12000000000000000'); // 0.012 ETH
      const minAmount = BigInt('50000000000000000'); // 0.05 ETH (too high)
      const gasCost = BigInt('10000000000000000'); // 0.01 ETH

      const result = gasCalculator.isRescueViable(balance, minAmount, gasCost);

      expect(result).toBe(false);
    });

    it('should return false when balance insufficient for gas', () => {
      const balance = BigInt('5000000000000000'); // 0.005 ETH
      const minAmount = BigInt('1000000000000000'); // 0.001 ETH
      const gasCost = BigInt('10000000000000000'); // 0.01 ETH (more than balance)

      const result = gasCalculator.isRescueViable(balance, minAmount, gasCost);

      expect(result).toBe(false);
    });
  });
});
