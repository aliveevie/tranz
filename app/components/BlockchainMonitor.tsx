'use client';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, webSocket, http, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { Alchemy, AlchemySubscription } from 'alchemy-sdk';
import { alchemyConfig } from '../config/alchemy';

export default function BlockchainMonitor() {
  const { address, isConnected } = useAccount();
  const [pendingTxs, setPendingTxs] = useState<Set<string>>(new Set());
  const [confirmedTxs, setConfirmedTxs] = useState<Set<string>>(new Set());
  const [alchemy, setAlchemy] = useState<Alchemy | null>(null);

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

    // Initialize Alchemy client
    const alchemyClient = new Alchemy(alchemyConfig);
    setAlchemy(alchemyClient);
    console.log('Alchemy client initialized for real-time monitoring');

    // Also keep the Viem client for some operations
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(alchemyConfig.rpcUrl),
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

    // Subscribe to pending transactions with Alchemy
    const pendingTxsHandler = alchemyClient.ws.on(
      AlchemySubscription.PENDING_TRANSACTIONS,
      async (txHash) => {
        try {
          // Check if we've already processed this transaction
          if (pendingTxs.has(txHash) || confirmedTxs.has(txHash)) return;
          
          // Get transaction details
          const tx = await publicClient.getTransaction({ hash: txHash });
          
          const isSender = tx.from.toLowerCase() === address.toLowerCase();
          const isReceiver = tx.to?.toLowerCase() === address.toLowerCase();
          
          if (isSender || isReceiver) {
            // Only log important events like pending transactions
            console.log(`Pending transaction detected: ${txHash.substring(0, 10)}... (${isSender ? 'sent' : 'received'})`);
            
            // Add to pending set
            setPendingTxs(prev => new Set(prev).add(txHash));
            
            // Notify about pending transaction immediately
            await notifyTransaction(tx, 'pending');
          }
        } catch (error) {
          console.error(`Error processing pending transaction ${txHash}:`, error);
        }
      }
    );

    // Subscribe to new blocks with Alchemy
    const newBlocksHandler = alchemyClient.ws.on(
      'block', // Use the standard 'block' event instead of AlchemySubscription.BLOCK
      async (blockNumber) => {
        try {
          // Only log new blocks occasionally to reduce console spam
          if (blockNumber % 10 === 0) {
            console.log(`New block detected: ${blockNumber}`);
          } 
          // Get the block with transactions
          const block = await alchemyClient.core.getBlockWithTransactions(blockNumber);
          
          // Process each transaction in the block
          for (const tx of block.transactions) {
            const txHash = tx.hash;
            const isSender = tx.from.toLowerCase() === address.toLowerCase();
            const isReceiver = tx.to?.toLowerCase() === address.toLowerCase();
            
            if (isSender || isReceiver) {
              console.log(`Confirmed transaction in block ${blockNumber}: ${txHash.substring(0, 10)}... (${isSender ? 'sent' : 'received'})`);
              
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
              await notifyTransaction(tx, 'confirmed', blockNumber.toString());
            }
          }
        } catch (error) {
          console.error(`Error processing block ${blockNumber}:`, error);
        }
      }
    );
        // Also set up a direct address activity subscription for more reliable monitoring
    const addressActivityHandler = alchemyClient.ws.on(
      {
        method: AlchemySubscription.MINED_TRANSACTIONS,
        addresses: [{ to: address.toLowerCase(), from: address.toLowerCase() }], // Use correct object format for AlchemyMinedTransactionsAddress
        includeRemoved: true,
      },
      async (tx) => {
        try {
          // Only log important transaction events, not every activity
          const txHash = tx.transaction.hash;
          const isSender = tx.transaction.from.toLowerCase() === address.toLowerCase();
          const isReceiver = tx.transaction.to?.toLowerCase() === address.toLowerCase();
          
          // If transaction was removed (e.g., chain reorganization)
          if (tx.removed) {
            console.log(`Transaction ${txHash} was removed from the chain`);
            return;
          }
          
          // Add to confirmed set and remove from pending
          setConfirmedTxs(prev => new Set(prev).add(txHash));
          setPendingTxs(prev => {
            const newSet = new Set(prev);
            newSet.delete(txHash);
            return newSet;
          });
          
          // Log only when we're actually sending a notification
          if (isSender || isReceiver) {
            console.log(`Transaction confirmed: ${txHash} (${isSender ? 'sent' : 'received'})`);
          }
          
          // Notify about confirmed transaction
          await notifyTransaction(tx.transaction, 'confirmed', tx.transaction.blockNumber.toString());
        } catch (error) {
          console.error(`Error processing address activity: ${error}`);
        }
      }
    );
    
    // Cleanup function
    return () => {
      // Clean up all Alchemy WebSocket subscriptions
      if (alchemyClient) {
        alchemyClient.ws.removeAllListeners();
      }
      console.log('Blockchain monitoring stopped');
    };
  }, [address, isConnected]);

  // This component doesn't render anything visible
  return null;
}
