import { NextRequest, NextResponse } from 'next/server';
import { sendTransactionAlert } from '../../utils/emailService';
import { registrations } from '../register/route';
import { getEmailByWallet, recordNotification } from '../../utils/supabaseService';

// Keep track of transactions we've already notified about to prevent duplicate emails
const notifiedTransactions = new Set<string>();

// For debugging purposes, log all registered wallets
console.log('Currently registered wallets:');
registrations.forEach((email, wallet) => {
  console.log(`- ${wallet}: ${email}`);
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, transaction } = body;

    if (!walletAddress || !transaction) {
      return NextResponse.json(
        { message: 'Wallet address and transaction details are required' },
        { status: 400 }
      );
    }

    // For debugging
    console.log('Notification request received:', { walletAddress, transaction });

    // First check Supabase for the registered email
    const userResult = await getEmailByWallet(walletAddress.toLowerCase());
    
    // Fallback to in-memory map for backward compatibility
    let email = userResult.success ? userResult.email : registrations.get(walletAddress.toLowerCase());
    let userId = userResult.success ? userResult.userId : null;
    
    // For testing purposes, if no registration exists but we have a Gmail account,
    // use that to ensure notifications work during development
    if (!email && process.env.GMAIL_ACCOUNT) {
      email = process.env.GMAIL_ACCOUNT;
      console.log(`No registration found for ${walletAddress}, using test email: ${email}`);
    }
    
    if (!email) {
      return NextResponse.json(
        { message: 'No registered email for this wallet' },
        { status: 404 }
      );
    }

    // Determine transaction type and status
    const transactionType = transaction.from?.toLowerCase() === walletAddress.toLowerCase() ? 'sent' : 'received';
    const transactionStatus = transaction.status || 'unknown';
    
    // Create a unique identifier for this transaction event
    // This helps prevent duplicate notifications for the same state
    const txEventId = `${transaction.hash}-${transactionStatus}`;
    
    // Check if we've already sent a notification for this exact transaction state
    // First check in Supabase if we have a user ID
    let isDuplicate = false;
    
    if (userId) {
      // Check in Supabase for duplicate notification
      const notificationResult = await recordNotification(
        userId,
        transaction.hash,
        transactionType,
        transactionStatus
      );
      
      isDuplicate = !notificationResult.success && notificationResult.isDuplicate === true;
    } else {
      // Fallback to in-memory check for backward compatibility
      isDuplicate = notifiedTransactions.has(txEventId);
      
      if (!isDuplicate) {
        // Add to notified set before sending to prevent duplicates even if sending fails
        notifiedTransactions.add(txEventId);
        
        // Limit the size of the notified transactions set to prevent memory leaks
        if (notifiedTransactions.size > 1000) {
          // Keep only the most recent 500 transactions
          const entries = Array.from(notifiedTransactions);
          const toKeep = entries.slice(entries.length - 500);
          notifiedTransactions.clear();
          toKeep.forEach(entry => notifiedTransactions.add(entry));
        }
      }
    }
    
    if (isDuplicate) {
      console.log(`Skipping duplicate notification for transaction: ${txEventId}`);
      return NextResponse.json(
        { message: 'Notification already sent for this transaction state' },
        { status: 200 }
      );
    }

    // Send notification email
    await sendTransactionAlert(email, transaction);

    console.log(`Alert sent successfully to ${email} for transaction ${transaction.hash}`);
    
    return NextResponse.json(
      { message: 'Alert sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// We're now using the email service from utils/emailService.ts
