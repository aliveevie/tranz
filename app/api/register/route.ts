import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '../../utils/emailService';

// In a real app, you would use a database to store user registrations
// This is a simple in-memory store for demonstration purposes
export const registrations: Map<string, string> = new Map();

// For development, add your wallet if you have a Gmail account configured
if (process.env.GMAIL_ACCOUNT) {
  // This ensures your wallet is always registered during development
  // You can replace this with your actual wallet address
  if (process.env.WALLET_ADDRESS) {
    registrations.set(process.env.WALLET_ADDRESS.toLowerCase(), process.env.GMAIL_ACCOUNT);
    console.log(`Auto-registered wallet ${process.env.WALLET_ADDRESS} with email ${process.env.GMAIL_ACCOUNT}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, walletAddress } = body;

    // Validate input
    if (!email || !walletAddress) {
      return NextResponse.json(
        { message: 'Email and wallet address are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { message: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Store the registration
    registrations.set(walletAddress.toLowerCase(), email);

    // In a real application, you would:
    // 1. Store in a database
    // 2. Set up a webhook or listener for the wallet
    // 3. Configure email service

    console.log(`Registered ${email} for wallet ${walletAddress}`);

    // Send a welcome email (simulated)
    await sendWelcomeEmail(email, walletAddress);

    return NextResponse.json(
      { message: 'Registration successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// We're now using the email service from utils/emailService.ts

// For demonstration purposes - in a real app, you would use a database
export function GET() {
  return NextResponse.json(
    { registeredUsers: Array.from(registrations.entries()).length },
    { status: 200 }
  );
}
