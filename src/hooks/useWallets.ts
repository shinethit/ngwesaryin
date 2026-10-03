import { useState } from 'react';
import { Wallet } from '../types';

/**
 * Custom hook for wallet management.
 */
export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);

  return { wallets, setWallets };
}
