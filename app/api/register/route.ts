import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '../../utils/emailService';
import { registerUserEmail, getUserByWallet } from '../../utils/supabaseService';
import { supabase } from '../../utils/supabase';

// For backward compatibility - will be removed after migration
export const registrations: Map<string, string> = new Map();

// For development, add your wallet if you have a Gmail account configured
if (process.env.GMAIL_ACCOUNT) {
  // This ensures your wallet is always registered during development
  // You can replace this with your actual wallet address
  if (process.env.WALLET_ADDRESS) {
    // Register in Supabase
    registerUserEmail(process.env.GMAIL_ACCOUNT, process.env.WALLET_ADDRESS.toLowerCase())
      .then(result => {
        if (result.success || result.message === 'Wallet address already registered' || result.message === 'Email already registered') {
          console.log(`Auto-registered wallet ${process.env.WALLET_ADDRESS} with email ${process.env.GMAIL_ACCOUNT}`);
        } else {
          console.error('Failed to auto-register wallet:', result.message);
        }
      })
      .catch(error => {
        console.error('Error auto-registering wallet:', error);
      });
      
    // Also keep in memory map for backward compatibility
    registrations.set(process.env.WALLET_ADDRESS.toLowerCase(), process.env.GMAIL_ACCOUNT);
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

    // Register user in Supabase
    const result = await registerUserEmail(email, walletAddress.toLowerCase());
    
    // Also store in memory map for backward compatibility
    if (result.success || result.message === 'Wallet address already registered' || result.message === 'Email already registered') {
      registrations.set(walletAddress.toLowerCase(), email);
    }

    if (!result.success) {
      // If the email or wallet is already registered, return a 400 response
      if (result.message === 'Wallet address already registered') {
        return NextResponse.json(
          { message: 'This wallet address is already registered' },
          { status: 400 }
        );
      }
      
      if (result.message === 'Email already registered') {
        return NextResponse.json(
          { message: 'This email is already registered' },
          { status: 400 }
        );
      }
      
      // For other errors, return a 500 response
      return NextResponse.json(
        { message: 'Registration failed', error: result.message },
        { status: 500 }
      );
    }

    console.log(`Registered ${email} for wallet ${walletAddress}`);

    // Send a welcome email
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

// Get count of registered users from Supabase
export async function GET() {
  try {
    // Query Supabase for count of users
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error fetching user count:', error);
      return NextResponse.json(
        { message: 'Error fetching user count', error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { registeredUsers: count || 0 },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
