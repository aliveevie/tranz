import { NextRequest, NextResponse } from 'next/server';
import { sendTransactionAlert } from '../../utils/emailService';

// In a real app, you would fetch this from a database
// This is for demonstration purposes only
// Sharing the same map as in the register route
const registrations: Map<string, string> = new Map();

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

    // Check if we have a registered email for this wallet
    const email = registrations.get(walletAddress.toLowerCase());
    
    if (!email) {
      return NextResponse.json(
        { message: 'No registered email for this wallet' },
        { status: 404 }
      );
    }

    // Send notification email
    await sendTransactionAlert(email, transaction);

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
