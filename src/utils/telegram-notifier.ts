import TelegramBot from 'node-telegram-bot-api';
import { logger } from './logger';

export interface RescueNotification {
  success: boolean;
  walletAddress: string;
  amount?: bigint;
  amountEth?: string;
  txHash?: string;
  blockNumber?: number;
  error?: string;
  gasUsed?: bigint;
  gasCostEth?: string;
  rescueType?: 'initial' | 'retry' | 'final' | 'auto';
}

export class TelegramNotifier {
  private bot?: TelegramBot;
  private chatId?: string;
  private botToken?: string;
  private enabled: boolean;

  constructor(botToken: string, chatId: string) {
    if (!botToken || !chatId) {
      this.enabled = false;
      logger.warn('Telegram notifications disabled: missing bot token or chat ID');
      return;
    }

    this.botToken = botToken;
    this.chatId = chatId;
    this.enabled = true;
    this.bot = new TelegramBot(botToken);

    logger.info('Telegram notifications enabled');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async testConnection(): Promise<boolean> {
    if (!this.enabled || !this.bot || !this.chatId) {
      return false;
    }

    try {
      await this.bot.getMe();
      await this.bot.sendMessage(this.chatId, '🤖 EVM Rescue Bot Telegram notifications are working!');
      logger.info('✅ Telegram connection test successful');
      return true;
    } catch (error) {
      logger.error('❌ Telegram connection test failed:', error);
      return false;
    }
  }

  async sendRescueStarted(notification: RescueNotification): Promise<void> {
    if (!this.enabled || !this.bot || !this.chatId) return;

    try {
      const message = this.formatRescueStartedMessage(notification);
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      logger.info('📱 Telegram notification sent: Rescue started');
    } catch (error) {
      logger.error('Failed to send Telegram notification (rescue started):', error);
    }
  }

  async sendRescueSuccess(notification: RescueNotification): Promise<void> {
    if (!this.enabled || !this.bot || !this.chatId) return;

    try {
      const message = this.formatRescueSuccessMessage(notification);
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      logger.info('📱 Telegram notification sent: Rescue successful');
    } catch (error) {
      logger.error('Failed to send Telegram notification (rescue success):', error);
    }
  }

  async sendRescueFailed(notification: RescueNotification): Promise<void> {
    if (!this.enabled || !this.bot || !this.chatId) return;

    try {
      const message = this.formatRescueFailedMessage(notification);
      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      logger.info('📱 Telegram notification sent: Rescue failed');
    } catch (error) {
      logger.error('Failed to send Telegram notification (rescue failed):', error);
    }
  }

  async sendBotStarted(walletAddress: string): Promise<void> {
    if (!this.enabled || !this.bot || !this.chatId) return;

    try {
      const message = `🤖 *EVM Rescue Bot Started*

Monitoring wallet: \`${walletAddress}\`

Network: *Sepolia Testnet*
Status: ✅ Active
Real-time monitoring: 📡 WebSocket enabled

The bot will automatically detect balance increases and execute rescue operations within seconds.`;

      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      logger.info('📱 Telegram notification sent: Bot started');
    } catch (error) {
      logger.error('Failed to send Telegram notification (bot started):', error);
    }
  }

  async sendBotStopped(walletAddress: string): Promise<void> {
    if (!this.enabled || !this.bot || !this.chatId) return;

    try {
      const message = `🛑 *EVM Rescue Bot Stopped*

Monitoring wallet: \`${walletAddress}\`

Status: ⏹️ Inactive
Total monitoring time: Active until stop

Bot can be restarted to resume monitoring.`;

      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      logger.info('📱 Telegram notification sent: Bot stopped');
    } catch (error) {
      logger.error('Failed to send Telegram notification (bot stopped):', error);
    }
  }

  async sendConnectionIssue(error: string): Promise<void> {
    if (!this.enabled || !this.bot || !this.chatId) return;

    try {
      const message = `⚠️ *Connection Issue Detected*

Error: \`${error}\`

Attempting automatic recovery...
WebSocket reconnection active with circuit breaker protection.`;

      await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      logger.info('📱 Telegram notification sent: Connection issue');
    } catch (error) {
      logger.error('Failed to send Telegram notification (connection issue):', error);
    }
  }

  private formatRescueStartedMessage(notification: RescueNotification): string {
    const amount = notification.amountEth ||
                   (notification.amount ? `${(Number(notification.amount) / 1e18).toFixed(6)}` : 'Unknown');

    let message = `🚨 *Rescue Operation Started* 🏃‍♂️

📱 *Wallet:* \`${notification.walletAddress}\`
💰 *Amount:* \`${amount} ETH\`
🎯 *Type:* ${notification.rescueType || 'Auto'} Detection`;

    if (notification.error) {
      message += `\n⚠️ *Note:* ${notification.error}`;
    }

    message += `\n⏳ *Processing:* Building Flashbots bundle...`;

    return message;
  }

  private formatRescueSuccessMessage(notification: RescueNotification): string {
    const amount = notification.amountEth ||
                   (notification.amount ? `${(Number(notification.amount) / 1e18).toFixed(6)}` : 'Unknown');
    const gasCost = notification.gasCostEth ||
                    (notification.gasUsed ? `${(Number(notification.gasUsed) / 1e18).toFixed(6)}` : 'Unknown');

    let message = `✅ *Rescue Operation Successful* 🎉

📱 *Wallet:* \`${notification.walletAddress}\`
💰 *Rescued:* \`${amount} ETH\`
⛽ *Gas Cost:* \`${gasCost} ETH\``;

    if (notification.txHash) {
      message += `\n🔗 *Transaction:* \`${notification.txHash}\``;

      if (notification.blockNumber) {
        message += `\n📦 *Block:* \`${notification.blockNumber}\``;
      }
    }

    message += `\n⚡ *Flashbots Bundle:* Successfully included in block`;

    return message;
  }

  private formatRescueFailedMessage(notification: RescueNotification): string {
    const amount = notification.amountEth ||
                   (notification.amount ? `${(Number(notification.amount) / 1e18).toFixed(6)}` : 'Unknown');

    let message = `❌ *Rescue Operation Failed* ⚠️

📱 *Wallet:* \`${notification.walletAddress}\`
💰 *Amount Attempted:* \`${amount} ETH\``;

    if (notification.error) {
      message += `\n🚫 *Error:* \`${notification.error}\``;
    }

    message += `\n🔄 *Next Attempt:* Bot will retry with different gas parameters`;

    return message;
  }
}