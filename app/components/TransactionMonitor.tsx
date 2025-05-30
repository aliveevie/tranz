'use client';

import { useEffect, useState } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import { Alchemy } from 'alchemy-sdk';
import { alchemyConfig } from '../config/alchemy';
import { getUserByWallet } from '../utils/supabase';
import Link from 'next/link';

interface BlockscoutTransaction {
  hash: string;
  from: {
    hash: string;
  };
  to: {
    hash: string;
  } | null;
  value: string;
  timestamp: string;
  block: number;
  method: string;
  gas_used: string;
  gas_price: string;
  fee: {
    value: string;
    decimals: number;
    symbol: string;
  };
  status: string;
}

interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  timestamp: number;
  type: 'sent' | 'received';
  blockNumber: number;
  method: string;
  status: string;
  fee: string;
}

export default function TransactionMonitor() {
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({
    address: address,
    chainId: baseSepolia.id,
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<'10days' | '30days'>('10days');
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null); // null means we haven't checked yet
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  // Check if the user is subscribed
  useEffect(() => {
    if (!isConnected || !address) {
      setIsSubscribed(null);
      return;
    }
    
    const checkSubscription = async () => {
      setCheckingSubscription(true);
      try {
        // Check if the wallet is registered in Supabase
        const userResult = await getUserByWallet(address);
        setIsSubscribed(userResult.success);
      } catch (error) {
        console.error('Error checking subscription status:', error);
        setIsSubscribed(false); // Assume not subscribed on error
      } finally {
        setCheckingSubscription(false);
      }
    };
    
    checkSubscription();
  }, [isConnected, address]);

  // Fetch transactions only if user is subscribed
  useEffect(() => {
    if (!isConnected || !address || !isSubscribed) return;

    const fetchTransactions = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Calculate date range
        const now = new Date();
        let startDate: Date;
        
        if (timeRange === '10days') {
          startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
        } else {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        
        // Initialize Alchemy client
        const alchemy = new Alchemy(alchemyConfig);
        console.log(`Fetching transactions for ${address} using Alchemy API`);
        
        // Transform Alchemy transactions to our format
        const userTransactions: Transaction[] = [];
        
        try {
          // Get transactions from Alchemy (sent transactions)
          const alchemyTransactions = await alchemy.core.getAssetTransfers({
            fromBlock: "0x0",
            toBlock: "latest",
            fromAddress: address,
            category: ["external", "erc20", "erc721", "erc1155"], // Removed 'internal' as it's not supported on Base Sepolia
            maxCount: 100,
            excludeZeroValue: false,
          });
          
          console.log(`Received ${alchemyTransactions.transfers.length} sent transactions from Alchemy`);
          console.log('Processing sent transactions:', alchemyTransactions.transfers);
          
          // Process sent transactions
          if (alchemyTransactions.transfers && alchemyTransactions.transfers.length > 0) {
            for (const tx of alchemyTransactions.transfers) {
              try {
                console.log('Processing sent transaction:', tx);
                
                // Skip transactions outside our time range
                if (tx.metadata && tx.metadata.blockTimestamp) {
                  const txTime = new Date(tx.metadata.blockTimestamp).getTime() / 1000;
                  const startTime = startDate.getTime() / 1000;
                  if (txTime < startTime) continue;
                }
                
                // Get full transaction details
                let txDetails;
                try {
                  txDetails = await alchemy.core.getTransaction(tx.hash);
                } catch (err) {
                  console.warn(`Could not get full details for transaction ${tx.hash}:`, err);
                }
                
                // Get block timestamp if not available in metadata
                let timestamp = Date.now() / 1000; // Default to current time
                
                if (tx.blockNum) {
                  try {
                    // Try to get block information to get timestamp
                    const blockInfo = await alchemy.core.getBlock(tx.blockNum);
                    if (blockInfo && blockInfo.timestamp) {
                      // Convert block timestamp to seconds
                      timestamp = Number(blockInfo.timestamp);
                    }
                  } catch (err) {
                    console.warn(`Could not get block timestamp for block ${tx.blockNum}:`, err);
                  }
                }
                
                userTransactions.push({
                  hash: tx.hash,
                  from: tx.from,
                  to: tx.to || null,
                  value: tx.value?.toString() || '0',
                  timestamp: timestamp,
                  type: 'sent',
                  blockNumber: parseInt(tx.blockNum || '0', 16),
                  method: txDetails?.data && txDetails.data !== '0x' ? 'Contract Interaction' : 'Transfer',
                  status: 'confirmed',
                  fee: '0' // We don't have fee information from this API
                });
                
                // Send notification for this transaction if it's recent (last hour)
                const isRecent = (Date.now() / 1000) - timestamp < 3600;
                if (isRecent) {
                  console.log(`Recent transaction detected: ${tx.hash}, sending notification...`);
                  // Notify about this transaction
                  fetch('/api/notify', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      walletAddress: address,
                      transaction: {
                        hash: tx.hash,
                        from: tx.from,
                        to: tx.to || null,
                        value: tx.value?.toString() || '0',
                        blockNumber: parseInt(tx.blockNum || '0', 16),
                        timestamp: timestamp * 1000,
                        type: 'sent',
                        status: 'confirmed',
                      },
                    }),
                  }).catch(err => console.error('Failed to send notification:', err));
                }
              } catch (err) {
                console.error('Error processing sent transaction:', err);
              }
            }
          }
        } catch (err) {
          console.error('Error fetching sent transactions:', err);
        }
        
        try {
          // Get transactions received by this address
          const receivedTransactions = await alchemy.core.getAssetTransfers({
            fromBlock: "0x0",
            toBlock: "latest",
            toAddress: address,
            category: ["external", "erc20", "erc721", "erc1155"], // Removed 'internal' as it's not supported on Base Sepolia
            maxCount: 100,
            excludeZeroValue: false,
          });
          
          console.log(`Received ${receivedTransactions.transfers.length} received transactions from Alchemy`);
          console.log('Processing received transactions:', receivedTransactions.transfers);
          
          // Process received transactions
          if (receivedTransactions.transfers && receivedTransactions.transfers.length > 0) {
            for (const tx of receivedTransactions.transfers) {
              try {
                console.log('Processing received transaction:', tx);
                
                // Skip transactions outside our time range
                if (tx.metadata && tx.metadata.blockTimestamp) {
                  const txTime = new Date(tx.metadata.blockTimestamp).getTime() / 1000;
                  const startTime = startDate.getTime() / 1000;
                  if (txTime < startTime) continue;
                }
                
                // Skip if we already processed this transaction (might be in both sent and received)
                if (userTransactions.some(t => t.hash === tx.hash)) continue;
                
                // Get full transaction details
                let txDetails;
                try {
                  txDetails = await alchemy.core.getTransaction(tx.hash);
                } catch (err) {
                  console.warn(`Could not get full details for transaction ${tx.hash}:`, err);
                }
                
                // Get block timestamp if not available in metadata
                let timestamp = Date.now() / 1000; // Default to current time
                
                if (tx.blockNum) {
                  try {
                    // Try to get block information to get timestamp
                    const blockInfo = await alchemy.core.getBlock(tx.blockNum);
                    if (blockInfo && blockInfo.timestamp) {
                      // Convert block timestamp to seconds
                      timestamp = Number(blockInfo.timestamp);
                    }
                  } catch (err) {
                    console.warn(`Could not get block timestamp for block ${tx.blockNum}:`, err);
                  }
                }
                
                userTransactions.push({
                  hash: tx.hash,
                  from: tx.from,
                  to: tx.to || null,
                  value: tx.value?.toString() || '0',
                  timestamp: timestamp,
                  type: 'received',
                  blockNumber: parseInt(tx.blockNum || '0', 16),
                  method: txDetails?.data && txDetails.data !== '0x' ? 'Contract Interaction' : 'Transfer',
                  status: 'confirmed',
                  fee: '0' // We don't have fee information from this API
                });
                
                // Send notification for this transaction if it's recent (last hour)
                const isRecent = (Date.now() / 1000) - timestamp < 3600;
                if (isRecent) {
                  console.log(`Recent transaction detected: ${tx.hash}, sending notification...`);
                  // Notify about this transaction
                  fetch('/api/notify', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      walletAddress: address,
                      transaction: {
                        hash: tx.hash,
                        from: tx.from,
                        to: tx.to || null,
                        value: tx.value?.toString() || '0',
                        blockNumber: parseInt(tx.blockNum || '0', 16),
                        timestamp: tx.metadata && tx.metadata.blockTimestamp ? new Date(tx.metadata.blockTimestamp).getTime() : Date.now(),
                        type: 'received',
                        status: 'confirmed',
                      },
                    }),
                  }).catch(err => console.error('Failed to send notification:', err));
                }
              } catch (err) {
                console.error('Error processing received transaction:', err);
              }
            }
          }
        } catch (err) {
          console.error('Error fetching received transactions:', err);
        }
        
        // Process transaction values and ensure timestamps are set correctly
        for (const tx of userTransactions) {
          // Make sure we're displaying the correct transaction value
          if (tx.value && typeof tx.value === 'string' && tx.value.startsWith('0x')) {
            try {
              // For hex values, use formatEther
              const ethValue = formatEther(BigInt(tx.value));
              tx.value = ethValue;
            } catch (err) {
              console.warn(`Could not format hex value ${tx.value}:`, err);
            }
          }
          
          // Ensure timestamp is a valid number
          if (!tx.timestamp || isNaN(tx.timestamp)) {
            tx.timestamp = Date.now() / 1000; // Default to current time if invalid
          }
        }
        
        // Sort transactions by timestamp (newest first)
        userTransactions.sort((a, b) => b.timestamp - a.timestamp);
        
        console.log(`Processed ${userTransactions.length} transactions for display`);
        setTransactions(userTransactions);
      } catch (err: any) {
        console.error('Error fetching transactions:', err);
        setError(err.message || 'Failed to fetch transactions');
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately on mount
    fetchTransactions();
    
    // Set up more frequent polling (every 5 seconds) to catch new transactions faster
    const intervalId = setInterval(fetchTransactions, 5000);
    
    // Also set up a listener for new blocks to trigger a refresh
    let alchemyClient: Alchemy | null = null;
    const setupBlockListener = async () => {
      try {
        alchemyClient = new Alchemy(alchemyConfig);
        alchemyClient.ws.on(
          AlchemySubscription.BLOCK,
          (blockNumber) => {
            // Only refresh on some blocks to avoid too many refreshes
            if (blockNumber % 3 === 0) {
              console.log(`New block detected (${blockNumber}), refreshing transactions...`);
              fetchTransactions();
            }
          }
        );
      } catch (err) {
        console.error('Error setting up block listener:', err);
      }
    };
    
    setupBlockListener();
    
    return () => {
      clearInterval(intervalId);
      if (alchemyClient) {
        alchemyClient.ws.removeAllListeners();
      }
    };
  }, [address, isConnected, timeRange]);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center p-6 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">No wallet connected</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Connect your wallet to view your transaction history
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Wallet Balance Card */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">CURRENT BALANCE</h3>
              <div className="mt-1 flex items-baseline">
                <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {balanceData ? parseFloat(balanceData.formatted).toFixed(6) : '0.000000'}
                </span>
                <span className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {balanceData?.symbol || 'ETH'}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {address && (
                  <a 
                    href={`https://sepolia.basescan.org/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                  >
                    View on BaseScan
                  </a>
                )}
              </p>
            </div>
            
            {/* Time Range Selector */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 flex items-center self-end">
              <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Time Range:</span>
              <div className="flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => setTimeRange('10days')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-l-md ${timeRange === '10days' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Last 10 Days
                </button>
                <button
                  type="button"
                  onClick={() => setTimeRange('30days')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-r-md ${timeRange === '30days' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  Last 30 Days
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Transaction List */}
      <div className="mb-2 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recent Transactions</h3>
        {isLoading && transactions.length > 0 && (
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <div className="animate-spin mr-2 h-4 w-4 border border-gray-500 dark:border-gray-400 border-t-transparent rounded-full"></div>
            Refreshing...
          </div>
        )}
      </div>
      
      {/* Subscription Check */}
      {isConnected && checkingSubscription ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : isConnected && isSubscribed === false ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 px-4 py-6 rounded-lg mb-6" role="alert">
          <div className="flex flex-col items-center text-center">
            <div className="flex-shrink-0 mb-4">
              <svg className="h-12 w-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Subscription Required</h3>
              <p className="text-sm mb-4">
                You need to subscribe to view your transaction history. Registration is free and allows us to send you notifications when transactions occur on your wallet.
              </p>
              <Link 
                href="/#register" 
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Register Now
              </Link>
            </div>
          </div>
        </div>
      ) : isLoading && transactions.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{error}</p>
            </div>
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex items-center justify-center p-6 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">No transactions found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No transactions found for this wallet in the {timeRange === '10days' ? 'last 10 days' : 'last 30 days'} on Base Sepolia
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Hash
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {`${transactions[0]?.type === 'sent' ? 'To' : 'From'}`}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Value (ETH)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Block
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {transactions.map((tx) => (
                <tr key={tx.hash} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                      tx.type === 'received' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                    }`}>
                      {tx.type === 'received' ? 'Received' : 'Sent'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <a 
                      href={`https://sepolia.basescan.org/tx/${tx.hash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition"
                    >
                      {`${tx.hash.substring(0, 6)}...${tx.hash.substring(tx.hash.length - 4)}`}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {tx.type === 'sent' 
                      ? tx.to 
                        ? `${tx.to.substring(0, 6)}...${tx.to.substring(tx.to.length - 4)}`
                        : 'Contract Creation'
                      : `${tx.from.substring(0, 6)}...${tx.from.substring(tx.from.length - 4)}`
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {(() => {
                      try {
                        // Handle different formats of value that might come from Alchemy API
                        if (!tx.value) return '0.000000 ETH';
                        
                        // If value is in hex format (starts with 0x)
                        if (typeof tx.value === 'string' && tx.value.startsWith('0x')) {
                          return `${parseFloat(formatEther(BigInt(tx.value))).toFixed(6)} ETH`;
                        }
                        
                        // If value is a number or can be parsed as one
                        const numValue = Number(tx.value);
                        if (!isNaN(numValue)) {
                          return `${numValue.toFixed(6)} ETH`;
                        }
                        
                        // If value is a hex string
                        if (typeof tx.value === 'string' && tx.value.startsWith('0x')) {
                          return `${parseFloat(formatEther(BigInt(tx.value))).toFixed(6)} ETH`;
                        }
                        
                        // Fallback
                        return `${tx.value || '0.000000'} ETH`;
                      } catch (err) {
                        console.warn('Error formatting transaction value:', err, tx.value);
                        return '0.000000 ETH';
                      }
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(tx.timestamp * 1000).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {tx.blockNumber ? (
                      <a 
                        href={`https://sepolia.basescan.org/block/${tx.blockNumber}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition"
                      >
                        {String(tx.blockNumber)}
                      </a>
                    ) : (
                      <span>Unknown</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
