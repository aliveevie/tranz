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
  const { hash, from, to, value, type, timestamp, blockNumber, status } = transaction;
  const amount = (Number(value) / 1e18).toFixed(6);
  const formattedTime = new Date(timestamp).toLocaleString();
  const transactionType = type === 'sent' ? 'Sent' : 'Received';
  
  // Create a link to BaseScan
  const baseScanUrl = `https://sepolia.basescan.org/tx/${hash}`;
  
  // Determine status-specific information
  let statusText = 'Unknown';
  let statusColor = '#6c757d';
  let statusBgColor = '#f8f9fa';
  let statusBorderColor = '#dee2e6';
  let statusIcon = '⚠️';
  let statusMessage = '';
  
  switch(status?.toLowerCase()) {
    case 'pending':
      statusText = 'Pending';
      statusColor = '#f39c12';
      statusBgColor = '#fff3cd';
      statusBorderColor = '#ffeeba';
      statusIcon = '⏳';
      statusMessage = 'Your transaction has been submitted to the network and is waiting to be confirmed.';
      break;
    case 'processing':
      statusText = 'Processing';
      statusColor = '#3498db';
      statusBgColor = '#cce5ff';
      statusBorderColor = '#b8daff';
      statusIcon = '⚙️';
      statusMessage = 'Your transaction is being processed by the network.';
      break;
    case 'confirmed':
      statusText = 'Confirmed';
      statusColor = '#2ecc71';
      statusBgColor = '#d4edda';
      statusBorderColor = '#c3e6cb';
      statusIcon = '✅';
      statusMessage = 'Your transaction has been confirmed and is now on the blockchain.';
      break;
    case 'failed':
      statusText = 'Failed';
      statusColor = '#e74c3c';
      statusBgColor = '#f8d7da';
      statusBorderColor = '#f5c6cb';
      statusIcon = '❌';
      statusMessage = 'Your transaction has failed. Please check the details on BaseScan.';
      break;
    default:
      if (blockNumber && blockNumber !== 'pending') {
        statusText = 'Confirmed';
        statusColor = '#2ecc71';
        statusBgColor = '#d4edda';
        statusBorderColor = '#c3e6cb';
        statusIcon = '✅';
        statusMessage = 'Your transaction has been confirmed and is now on the blockchain.';
      } else {
        statusText = 'Processing';
        statusColor = '#3498db';
        statusBgColor = '#cce5ff';
        statusBorderColor = '#b8daff';
        statusIcon = '⚙️';
        statusMessage = 'Your transaction is being processed by the network.';
      }
  }
  
  // Determine subject line based on status
  let subjectPrefix = '';
  switch(status?.toLowerCase()) {
    case 'pending': subjectPrefix = '[Pending] '; break;
    case 'processing': subjectPrefix = '[Processing] '; break;
    case 'confirmed': subjectPrefix = '[Confirmed] '; break;
    case 'failed': subjectPrefix = '[Failed] '; break;
    default: subjectPrefix = blockNumber && blockNumber !== 'pending' ? '[Confirmed] ' : '[Processing] ';
  }
  
  // Email content
  const mailOptions = {
    from: emailConfig.gmail.from,
    to: email,
    subject: `${subjectPrefix}Transaction Alert: ${transactionType} ${amount} ETH`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #333; margin: 0; font-size: 24px;">TranzAntions</h1>
          <p style="color: #666; margin: 5px 0 0;">Transaction Monitoring Service</p>
        </div>
        
        <div style="background-color: ${statusBgColor}; border: 1px solid ${statusBorderColor}; border-radius: 4px; padding: 15px; margin-bottom: 20px;">
          <h2 style="margin-top: 0; color: ${statusColor}; display: flex; align-items: center;">
            <span style="font-size: 24px; margin-right: 10px;">${statusIcon}</span>
            ${statusText} Transaction ${transactionType}
          </h2>
          <p>${statusMessage}</p>
        </div>
        
        <h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Transaction Details</h3>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p><strong>Type:</strong> <span style="color: ${type === 'sent' ? '#e74c3c' : '#2ecc71'};">${transactionType}</span></p>
          <p><strong>Amount:</strong> ${amount} ETH</p>
          <p><strong>Status:</strong> <span style="color: ${statusColor};">${statusText}</span></p>
          <p><strong>Transaction Hash:</strong> <span style="font-family: monospace; word-break: break-all;">${hash}</span></p>
          <p><strong>From:</strong> <span style="font-family: monospace; word-break: break-all;">${from}</span></p>
          <p><strong>To:</strong> <span style="font-family: monospace; word-break: break-all;">${to || 'Contract Creation'}</span></p>
          <p><strong>Block Number:</strong> ${blockNumber || 'Pending'}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${baseScanUrl}" style="display: inline-block; background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Transaction on BaseScan
          </a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; color: #666; font-size: 14px;">
          <p>If you did not expect this transaction, please secure your wallet immediately.</p>
          <p>Best regards,<br>The TranzAntions Team</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
          <p>© ${new Date().getFullYear()} TranzAntions. All rights reserved.</p>
        </div>
      </div>
    `,
  };
  
  // Send the email
  const info = await mailer.sendMail(mailOptions);
  
  console.log(`Transaction alert sent to ${email} (Status: ${statusText})`);
  console.log(`Message ID: ${info.messageId}`);
  
  return info;
}
