'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, webSocket, http } from 'viem';
import { baseSepolia } from 'viem/chains';

export default function BlockchainMonitor() {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected || !address) return;

    // Use a reliable public RPC endpoint for Base Sepolia
    // Note: Public endpoints typically don't support WebSocket, so we'll use HTTP
    const transport = http('https://sepolia.base.org');

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport,
    });

    // Set up event listeners for the user's address
    const unwatch = publicClient.watchBlocks({
      onBlock: async (block) => {
        if (!block.transactions) return;
        
        // Get full block with transactions
        const fullBlock = await publicClient.getBlock({
          blockHash: block.hash,
          includeTransactions: true,
        });
        
        if (!fullBlock.transactions) return;
        
        // Check if any transactions involve the user's address
        for (const tx of fullBlock.transactions) {
          if (typeof tx === 'string') continue; // Skip if tx is just a hash
          
          const isSender = tx.from.toLowerCase() === address.toLowerCase();
          const isReceiver = tx.to?.toLowerCase() === address.toLowerCase();
          
          if (isSender || isReceiver) {
            console.log(`Transaction detected: ${tx.hash}`);
            
            // Notify the backend to send an email
            try {
              await fetch('/api/notify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  walletAddress: address,
                  transaction: {
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    value: tx.value.toString(),
                    blockNumber: block.number.toString(),
                    timestamp: Date.now(),
                    type: isSender ? 'sent' : 'received',
                  },
                }),
              });
            } catch (error) {
              console.error('Failed to notify backend:', error);
            }
          }
        }
      },
      onError: (error) => {
        console.error('Error watching blocks:', error);
      },
    });

    // Cleanup function
    return () => {
      unwatch();
    };
  }, [address, isConnected]);

  // This component doesn't render anything visible
  return null;
}
