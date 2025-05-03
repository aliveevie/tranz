import { NextRequest, NextResponse } from 'next/server';
import { registrations } from '../../register/route';

// This is a proxy API route to avoid CORS issues with Blockscout API
export async function GET(request: NextRequest) {
  try {
    // Get the wallet address from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const startTimestamp = searchParams.get('start_timestamp');
    
    console.log('API route called with:', { address, startTimestamp });
    
    if (!address) {
      console.error('Missing address parameter');
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Check if this wallet is registered for notifications
    const isRegistered = registrations.has(address.toLowerCase());
    if (isRegistered) {
      console.log(`Wallet ${address} is registered for notifications`);
    } else {
      console.log(`Wallet ${address} is NOT registered for notifications`);
      // Auto-register the wallet if we have a Gmail account
      if (process.env.GMAIL_ACCOUNT) {
        registrations.set(address.toLowerCase(), process.env.GMAIL_ACCOUNT);
        console.log(`Auto-registered wallet ${address} with email ${process.env.GMAIL_ACCOUNT}`);
      }
    }

    // Blockscout API key
    const apiKey = '38dbd14b-5e82-4d6a-ba78-a4a396cc9c13';
    
    // Build the Blockscout API URL with cache busting
    let blockscoutUrl = `https://base-sepolia.blockscout.com/api/v2/addresses/${address}/transactions?filter=all&cachebust=${Date.now()}`;
    
    if (startTimestamp) {
      blockscoutUrl += `&start_timestamp=${startTimestamp}`;
    }
    
    console.log('Fetching from Blockscout URL:', blockscoutUrl);
    
    // Make the request to Blockscout API with the API key
    const response = await fetch(blockscoutUrl, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Blockscout API error response:', errorText);
      throw new Error(`Blockscout API request failed with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Blockscout API response received, items count:', data.items?.length || 0);
    
    // Ensure the data structure is as expected
    if (!data.items) {
      data.items = [];
    }
    
    // Return the data from Blockscout API
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Blockscout proxy error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch transactions from Blockscout',
        items: [] // Ensure we always return an items array even on error
      },
      { status: 500 }
    );
  }
}
