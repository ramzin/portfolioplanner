import { useState } from 'react';

export interface Allocation {
  equity: number;
  bond: number;
  cash: number;
}

export function usePercentageAllocation(initial: Allocation) {
  const [allocation, setAllocation] = useState<Allocation>(initial);

  const setAllocationPercent = (key: keyof Allocation, value: number) => {
    const clampedValue = Math.max(0, Math.min(100, Math.round(value)));
    const remaining = 100 - clampedValue;

    const otherKeys = (Object.keys(allocation) as Array<keyof Allocation>).filter(
      (k) => k !== key
    );

    const [keyA, keyB] = otherKeys;
    const prevA = allocation[keyA];
    const prevB = allocation[keyB];
    const sumOther = prevA + prevB;

    let newA = 0;
    let newB = 0;

    if (sumOther > 0) {
      newA = Math.round(remaining * (prevA / sumOther));
      newB = remaining - newA; // Ensures sum equals exactly the remaining percentage
    } else {
      newA = Math.round(remaining / 2);
      newB = remaining - newA;
    }

    setAllocation(() => {
      const nextAllocation = {} as Allocation;
      nextAllocation[key] = clampedValue;
      nextAllocation[keyA] = newA;
      nextAllocation[keyB] = newB;
      return nextAllocation;
    });
  };

  return {
    allocation,
    setAllocationPercent,
  };
}
