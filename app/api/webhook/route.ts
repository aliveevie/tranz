import { NextRequest, NextResponse } from 'next/server';

// In a real app, you would fetch this from a database
// This is for demonstration purposes only
const registrations: Map<string, string> = new Map();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate webhook payload
    // This structure would depend on your blockchain event listener service
    // For example, if using Alchemy's webhook service
    if (!body.event || !body.event.activity) {
      return NextResponse.json(
        { message: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    const { activity } = body.event;
    const walletAddress = activity.fromAddress || activity.toAddress;
    
    if (!walletAddress) {
      return NextResponse.json(
        { message: 'No wallet address in activity' },
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
    await sendTransactionNotification(email, activity);

    return NextResponse.json(
      { message: 'Notification sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Simulate sending a transaction notification email
async function sendTransactionNotification(email: string, activity: any) {
  // In a real application, you would use a service like SendGrid, Mailchimp, etc.
  const transactionType = activity.fromAddress ? 'sent' : 'received';
  const amount = (Number(activity.value) / 1e18).toFixed(6);
  const otherParty = activity.fromAddress || activity.toAddress;
  
  console.log(`Sending ${transactionType} transaction notification to ${email}`);
  console.log(`Transaction details: ${amount} ETH ${transactionType} ${otherParty}`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return true;
}
