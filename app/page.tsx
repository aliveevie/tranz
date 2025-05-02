'use client';

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownLink,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import { useAccount } from 'wagmi';
import EmailRegistration from './components/EmailRegistration';
import TransactionMonitor from './components/TransactionMonitor';
import BlockchainMonitor from './components/BlockchainMonitor';

export default function App() {
  const { isConnected } = useAccount();
  
  return (
    <div className="flex flex-col min-h-screen font-sans dark:bg-gray-900 dark:text-white bg-gray-50 text-gray-900">
      {/* Hidden blockchain monitor component */}
      <BlockchainMonitor />
      
      {/* Header with wallet connection */}
      <header className="py-4 px-6 bg-white dark:bg-gray-800 shadow-md">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">TranzAntions</h1>
          <div className="wallet-container">
            <Wallet>
              <ConnectWallet>
                <Avatar className="h-8 w-8 mr-2" />
                <Name />
              </ConnectWallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                  <Address />
                  <EthBalance />
                </Identity>
                <WalletDropdownLink
                  icon="wallet"
                  href="https://keys.coinbase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Wallet
                </WalletDropdownLink>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Hero section */}
          <section className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl overflow-hidden shadow-xl">
            <div className="p-8 md:p-12">
              <div className="max-w-3xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Transaction Alert System</h2>
                <p className="text-xl text-white/90 mb-8">
                  Get instant email notifications for all your wallet activities on Base Sepolia.
                </p>
                {!isConnected ? (
                  <div className="inline-flex">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-6 py-3 text-white">
                      Connect your wallet to start monitoring transactions
                    </div>
                  </div>
                ) : (
                  <div className="inline-flex">
                    <div className="bg-green-500/20 backdrop-blur-sm border border-green-500/30 rounded-lg px-6 py-3 text-white flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Wallet connected! Register your email below for alerts
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
          
          {/* Email registration */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 dark:text-white">Register for Transaction Alerts</h3>
              <EmailRegistration />
            </div>
          </section>
          
          {/* Transaction history */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 dark:text-white">Your Transaction History</h3>
              <TransactionMonitor />
            </div>
          </section>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-6 px-6 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4 md:mb-0">
              © {new Date().getFullYear()} TranzAntions | Base Batch Africa
            </p>
            <div className="flex space-x-6">
              <a 
                href="https://docs.base.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
              >
                Base Docs
              </a>
              <a 
                href="https://sepolia.basescan.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
              >
                Base Sepolia Explorer
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
