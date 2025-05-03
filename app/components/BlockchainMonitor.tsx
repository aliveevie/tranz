'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, webSocket, http, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';

export default function BlockchainMonitor() {
  const { address, isConnected } = useAccount();
  const [pendingTxs, setPendingTxs] = useState<Set<string>>(new Set());
  const [confirmedTxs, setConfirmedTxs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isConnected || !address) return;

    console.log(`Starting blockchain monitoring for wallet: ${address}`);

    // Register the wallet with the notification system
    if (process.env.GMAIL_ACCOUNT) {
      fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: process.env.GMAIL_ACCOUNT,
          walletAddress: address,
        }),
      }).then(response => {
        if (response.ok) {
          console.log('Wallet registered for notifications');
        } else {
          console.warn('Failed to register wallet for notifications');
        }
      }).catch(error => {
        console.error('Error registering wallet:', error);
      });
    }

    // Try multiple RPC endpoints for better reliability
    const endpoints = [
      'https://sepolia.base.org',
      'https://base-sepolia-rpc.publicnode.com',
      'https://sepolia.base.meowrpc.com'
    ];
    
    let transport;
    try {
      // Try WebSocket first
      transport = webSocket('wss://sepolia.base.org');
      console.log('Using WebSocket connection for real-time monitoring');
    } catch (error) {
      console.log('WebSocket not available, falling back to HTTP');
      // Try multiple endpoints
      for (const endpoint of endpoints) {
        try {
          transport = http(endpoint);
          console.log(`Connected to ${endpoint}`);
          break;
        } catch (err) {
          console.warn(`Failed to connect to ${endpoint}`);
        }
      }
      
      // If all endpoints fail, use the first one
      if (!transport) {
        transport = http(endpoints[0]);
        console.log(`Fallback to ${endpoints[0]}`);
      }
    }

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport,
    });

    // Function to send notification for transaction events
    const notifyTransaction = async (tx: any, status: string, blockNumber?: string) => {
      const isSender = tx.from.toLowerCase() === address.toLowerCase();
      const isReceiver = tx.to?.toLowerCase() === address.toLowerCase();
      
      if (!isSender && !isReceiver) return;
      
      console.log(`Transaction ${status}: ${tx.hash}`);
      
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
              value: tx.value?.toString() || '0',
              blockNumber: blockNumber || 'pending',
              timestamp: Date.now(),
              type: isSender ? 'sent' : 'received',
              status: status,
            },
          }),
        });
      } catch (error) {
        console.error('Failed to notify backend:', error);
      }
    };

    // Watch for pending transactions
    const unwatchPending = publicClient.watchPendingTransactions({
      onTransactions: async (hashes) => {
        for (const hash of hashes) {
          try {
            // Check if we've already processed this transaction
            if (pendingTxs.has(hash) || confirmedTxs.has(hash)) continue;
            
            // Get transaction details
            const tx = await publicClient.getTransaction({ hash });
            
            const isSender = tx.from.toLowerCase() === address.toLowerCase();
            const isReceiver = tx.to?.toLowerCase() === address.toLowerCase();
            
            if (isSender || isReceiver) {
              // Add to pending set
              setPendingTxs(prev => new Set(prev).add(hash));
              
              // Notify about pending transaction
              await notifyTransaction(tx, 'pending');
            }
          } catch (error) {
            console.error(`Error processing pending transaction ${hash}:`, error);
          }
        }
      },
      onError: (error) => {
        console.error('Error watching pending transactions:', error);
      },
    });

    // Watch for confirmed transactions in blocks
    const unwatchBlocks = publicClient.watchBlocks({
      onBlock: async (block) => {
        try {
          // Get full block with transactions
          const fullBlock = await publicClient.getBlock({
            blockHash: block.hash,
            includeTransactions: true,
          });
          
          if (!fullBlock.transactions) return;
          
          // Check if any transactions involve the user's address
          for (const tx of fullBlock.transactions) {
            if (typeof tx === 'string') continue; // Skip if tx is just a hash
            
            const txHash = tx.hash.toString();
            const isSender = tx.from.toLowerCase() === address.toLowerCase();
            const isReceiver = tx.to?.toLowerCase() === address.toLowerCase();
            
            if (isSender || isReceiver) {
              // Check if this was a pending transaction
              const wasPending = pendingTxs.has(txHash);
              
              // Add to confirmed set and remove from pending
              setConfirmedTxs(prev => new Set(prev).add(txHash));
              setPendingTxs(prev => {
                const newSet = new Set(prev);
                newSet.delete(txHash);
                return newSet;
              });
              
              // Notify about confirmed transaction
              await notifyTransaction(tx, 'confirmed', block.number.toString());
            }
          }
        } catch (error) {
          console.error('Error processing block:', error);
        }
      },
      onError: (error) => {
        console.error('Error watching blocks:', error);
      },
    });
    
    // Cleanup function
    return () => {
      unwatchPending();
      unwatchBlocks();
      console.log('Blockchain monitoring stopped');
    };
  }, [address, isConnected]);

  // This component doesn't render anything visible
  return null;
}
