import { useState } from 'react';
import { Vehicle } from '../types';

/**
 * Custom hook for vehicle management.
 */
export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  return { vehicles, setVehicles };
}
