import { useState } from 'react';
import { Debt } from '../types';

/**
 * Custom hook for debt management.
 */
export function useDebts() {
  const [debts, setDebts] = useState<Debt[]>([]);

  return { debts, setDebts };
}
