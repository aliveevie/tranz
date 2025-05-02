import { NextRequest, NextResponse } from 'next/server';

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

// Simulate sending a transaction alert email
async function sendTransactionAlert(email: string, transaction: any) {
  // In a real application, you would use a service like SendGrid, Mailchimp, etc.
  const { hash, from, to, value, type, timestamp } = transaction;
  const amount = (Number(value) / 1e18).toFixed(6);
  const formattedTime = new Date(timestamp).toLocaleString();
  
  console.log(`Sending transaction alert to ${email}`);
  console.log(`Transaction details: ${type === 'sent' ? 'Sent' : 'Received'} ${amount} ETH`);
  console.log(`Transaction hash: ${hash}`);
  console.log(`From: ${from}`);
  console.log(`To: ${to || 'Contract Creation'}`);
  console.log(`Time: ${formattedTime}`);
  
  // In a real app, you would construct an HTML email with transaction details
  // and a link to view the transaction on a block explorer
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return true;
}
