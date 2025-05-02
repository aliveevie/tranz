'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  value: bigint;
  timestamp: number;
  type: 'sent' | 'received';
}

export default function TransactionMonitor() {
  const { address, isConnected } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  useEffect(() => {
    if (!isConnected || !address) return;

    const fetchTransactions = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Get the latest block number
        const blockNumber = await publicClient.getBlockNumber();
        
        // Fetch the last 10 blocks
        const blocks = await Promise.all(
          Array.from({ length: 10 }, (_, i) => 
            publicClient.getBlock({
              blockNumber: blockNumber - BigInt(i),
              includeTransactions: true,
            })
          )
        );
        
        // Filter transactions related to the user's address
        const userTransactions: Transaction[] = [];
        
        for (const block of blocks) {
          if (!block.transactions) continue;
          
          for (const tx of block.transactions) {
            if (typeof tx === 'string') continue; // Skip if tx is just a hash
            
            const isSender = tx.from.toLowerCase() === address.toLowerCase();
            const isReceiver = tx.to?.toLowerCase() === address.toLowerCase();
            
            if (isSender || isReceiver) {
              userTransactions.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                timestamp: Number(block.timestamp),
                type: isSender ? 'sent' : 'received',
              });
            }
          }
        }
        
        setTransactions(userTransactions);
      } catch (err: any) {
        console.error('Error fetching transactions:', err);
        setError(err.message || 'Failed to fetch transactions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
    
    // Set up polling every 30 seconds
    const intervalId = setInterval(fetchTransactions, 30000);
    
    return () => clearInterval(intervalId);
  }, [address, isConnected, publicClient]);

  if (!isConnected) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 my-8">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Connect your wallet to view transactions
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 my-8">
      <h2 className="text-2xl font-bold mb-6 text-center dark:text-white">Recent Transactions</h2>
      
      {isLoading && transactions.length === 0 ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      ) : transactions.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-400">
          No transactions found for this wallet
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Hash
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {`${transactions[0]?.type === 'sent' ? 'To' : 'From'}`}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Value (ETH)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {transactions.map((tx) => (
                <tr key={tx.hash} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      tx.type === 'received' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {tx.type === 'received' ? 'Received' : 'Sent'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <a 
                      href={`https://sepolia.basescan.org/tx/${tx.hash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
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
                    {(Number(tx.value) / 1e18).toFixed(6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(tx.timestamp * 1000).toLocaleString()}
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
