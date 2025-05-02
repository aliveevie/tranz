'use client';

import { baseSepolia } from 'viem/chains';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import type { ReactNode } from 'react';

export function Providers(props: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={baseSepolia}
      config={{ 
        appearance: { 
          mode: 'auto',
        },
        transports: {
          // Use Alchemy's public RPC for Base Sepolia
          [baseSepolia.id]: 'https://base-sepolia.g.alchemy.com/v2/demo'
        }
      }}
    >
      {props.children}
    </OnchainKitProvider>
  );
}
