import { useState } from 'react';
import { Transaction } from '../types';

/**
 * Custom hook for transaction CRUD operations and logic.
 */
export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Migration of handlers will follow
  return { transactions, setTransactions };
}
