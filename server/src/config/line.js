import { Client } from '@line/bot-sdk';
import { logger } from '../utils/logger.js';

// LINE Bot configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Validate LINE configuration
if (!config.channelAccessToken || !config.channelSecret) {
  logger.error('LINE Channel Access Token and Channel Secret must be set in environment variables');
  process.exit(1);
}

// Create LINE client
export const lineClient = new Client(config);

// LIFF configuration
export const liffConfig = {
  liffId: process.env.LIFF_ID,
  liffUrl: process.env.LIFF_URL,
};

// Validate LIFF configuration
if (!liffConfig.liffId) {
  logger.warn('LIFF ID not set in environment variables');
}

// LINE messaging templates
export const messageTemplates = {
  // Welcome message when user joins
  welcome: (userName) => ({
    type: 'text',
    text: `👋 Welcome ${userName}! You've successfully joined the Line Shared Expense Tracker. Start managing your shared expenses easily!`
  }),

  // Debt reminder message
  debtReminder: (debtorName, amount, itemName, creditorName) => ({
    type: 'text',
    text: `💰 Hey ${debtorName}! You still owe $${amount} to ${creditorName} for "${itemName}". Please settle your debt when convenient.`
  }),

  // Group debt reminder
  groupDebtReminder: (debtorName, amount, itemName) => ({
    type: 'text',
    text: `@${debtorName} still owes $${amount} for "${itemName}". Friendly reminder! 💸`
  }),

  // Payment confirmation
  paymentConfirmation: (amount, itemName, payerName) => ({
    type: 'text',
    text: `✅ Payment confirmed! ${payerName} paid $${amount} for "${itemName}". Thank you!`
  }),

  // New expense notification
  newExpenseNotification: (amount, itemName, payerName, groupName) => ({
    type: 'text',
    text: `💳 New expense in ${groupName}: ${payerName} paid $${amount} for "${itemName}". Check the app to see if you owe anything!`
  }),

  // Rich menu postback
  richMenuPostback: (liffUrl) => ({
    type: 'template',
    altText: 'Line Expense Tracker',
    template: {
      type: 'buttons',
      title: 'Line Expense Tracker',
      text: 'Manage your shared expenses',
      actions: [
        {
          type: 'uri',
          label: 'Open App',
          uri: liffUrl
        },
        {
          type: 'postback',
          label: 'View PromptPay QR',
          data: 'action=show_qr'
        }
      ]
    }
  }),

  // PromptPay QR Code message
  promptPayQR: (qrCodeUrl, promptPayId) => ({
    type: 'image',
    originalContentUrl: qrCodeUrl,
    previewImageUrl: qrCodeUrl,
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: 'Show PromptPay ID',
            text: `PromptPay ID: ${promptPayId}`
          }
        }
      ]
    }
  })
};

export default config;