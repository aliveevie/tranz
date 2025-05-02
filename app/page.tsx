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
import EmailRegistration from './components/EmailRegistration';
import TransactionMonitor from './components/TransactionMonitor';
import BlockchainMonitor from './components/BlockchainMonitor';

export default function App() {
  return (
    <div className="flex flex-col min-h-screen font-sans dark:bg-background dark:text-white bg-white text-black">
      <header className="pt-4 px-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">TranzAntions</h1>
          <div className="wallet-container">
            <Wallet>
              <ConnectWallet>
                <Avatar className="h-6 w-6" />
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

      <main className="flex-grow p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-8 mb-8 shadow-lg">
            <h2 className="text-3xl font-bold mb-4">Transaction Alert System</h2>
            <p className="text-xl mb-6">
              Get real-time email notifications for all your wallet transactions on Base Sepolia.
            </p>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg flex-1">
                <h3 className="text-lg font-semibold mb-2">1. Connect Wallet</h3>
                <p>Connect your wallet to get started with transaction monitoring</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg flex-1">
                <h3 className="text-lg font-semibold mb-2">2. Register Email</h3>
                <p>Register your email to receive transaction notifications</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-lg flex-1">
                <h3 className="text-lg font-semibold mb-2">3. Get Notified</h3>
                <p>Receive instant alerts for all your wallet transactions</p>
              </div>
            </div>
          </div>
          
          <EmailRegistration />
          <TransactionMonitor />
          <BlockchainMonitor />
        </div>
      </main>
      
      <footer className="bg-gray-100 dark:bg-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 dark:text-gray-300 mb-4 md:mb-0">
              © {new Date().getFullYear()} TranzAntions - Base Batch Africa
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://docs.base.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Base Docs
              </a>
              <a 
                href="https://sepolia.basescan.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
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
