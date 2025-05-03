import nodemailer from 'nodemailer';
import { emailConfig } from './emailConfig';

// Create a transporter object
let transporter: nodemailer.Transporter;

// Initialize the transporter
export async function initializeEmailService() {
  if (!transporter) {
    // Validate Gmail credentials
    if (!process.env.GMAIL_ACCOUNT || !process.env.GMAIL_PASSWORD) {
      console.error('Gmail credentials not found in environment variables!');
      console.error('Please set GMAIL_ACCOUNT and GMAIL_PASSWORD in your .env file');
      throw new Error('Email service configuration error: Missing Gmail credentials');
    }
    
    // Always use Gmail configuration for both production and development
    transporter = nodemailer.createTransport({
      host: emailConfig.gmail.host,
      port: emailConfig.gmail.port,
      secure: emailConfig.gmail.secure,
      auth: {
        user: process.env.GMAIL_ACCOUNT,
        pass: process.env.GMAIL_PASSWORD,
      },
    });
    
    console.log('Email service initialized with Gmail settings');
  }
  
  return transporter;
}

// Function to send a welcome email
export async function sendWelcomeEmail(email: string, walletAddress: string) {
  // Make sure the transporter is initialized
  const mailer = await initializeEmailService();
  
  // Email content
  const mailOptions = {
    from: emailConfig.gmail.from,
    to: email,
    subject: 'Welcome to TranzAntions - Transaction Monitoring Service',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #333;">Welcome to TranzAntions!</h2>
        <p>Thank you for registering with our transaction monitoring service.</p>
        <p>We will now monitor the following wallet address for transactions:</p>
        <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace;">${walletAddress}</p>
        <p>You will receive email notifications whenever there is activity on this wallet.</p>
        <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
        <p>Best regards,<br>The TranzAntions Team</p>
      </div>
    `,
  };
  
  // Send the email
  const info = await mailer.sendMail(mailOptions);
  
  console.log(`Welcome email sent to ${email}`);
  console.log(`Message ID: ${info.messageId}`);
  
  return info;
}

// Function to send a transaction alert email
export async function sendTransactionAlert(email: string, transaction: any) {
  // Make sure the transporter is initialized
  const mailer = await initializeEmailService();
  
  // Extract transaction details
  const { hash, from, to, value, type, timestamp, blockNumber } = transaction;
  const amount = (Number(value) / 1e18).toFixed(6);
  const formattedTime = new Date(timestamp).toLocaleString();
  const transactionType = type === 'sent' ? 'Sent' : 'Received';
  
  // Create a link to BaseScan
  const baseScanUrl = `https://sepolia.basescan.org/tx/${hash}`;
  
  // Email content
  const mailOptions = {
    from: emailConfig.gmail.from,
    to: email,
    subject: `Transaction Alert: ${transactionType} ${amount} ETH`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: ${type === 'sent' ? '#ff6b6b' : '#4ecdc4'};">Transaction ${transactionType}</h2>
        <p>We detected a new transaction on your monitored wallet:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p><strong>Type:</strong> ${transactionType}</p>
          <p><strong>Amount:</strong> ${amount} ETH</p>
          <p><strong>Transaction Hash:</strong> <span style="font-family: monospace; word-break: break-all;">${hash}</span></p>
          <p><strong>From:</strong> <span style="font-family: monospace; word-break: break-all;">${from}</span></p>
          <p><strong>To:</strong> <span style="font-family: monospace; word-break: break-all;">${to || 'Contract Creation'}</span></p>
          <p><strong>Block Number:</strong> ${blockNumber || 'Pending'}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
        </div>
        
        <p>
          <a href="${baseScanUrl}" style="display: inline-block; background-color: #3498db; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">
            View Transaction on BaseScan
          </a>
        </p>
        
        <p>If you did not expect this transaction, please secure your wallet immediately.</p>
        <p>Best regards,<br>The TranzAntions Team</p>
      </div>
    `,
  };
  
  // Send the email
  const info = await mailer.sendMail(mailOptions);
  
  console.log(`Transaction alert sent to ${email}`);
  console.log(`Message ID: ${info.messageId}`);
  
  return info;
}
