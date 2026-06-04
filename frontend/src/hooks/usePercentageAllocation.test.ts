import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePercentageAllocation } from './usePercentageAllocation';

describe('usePercentageAllocation hook', () => {
  it('should initialize with the given percentages summing to 100', () => {
    const { result } = renderHook(() =>
      usePercentageAllocation({ equity: 50, bond: 30, cash: 20 })
    );

    expect(result.current.allocation).toEqual({ equity: 50, bond: 30, cash: 20 });
  });

  it('should adjust other categories proportionally when one category is changed', () => {
    const { result } = renderHook(() =>
      usePercentageAllocation({ equity: 50, bond: 30, cash: 20 })
    );

    act(() => {
      result.current.setAllocationPercent('equity', 60);
    });

    // Remaining 40 is split in ratio 3:2 (bond: 24, cash: 16)
    expect(result.current.allocation).toEqual({ equity: 60, bond: 24, cash: 16 });
    expect(
      result.current.allocation.equity +
        result.current.allocation.bond +
        result.current.allocation.cash
    ).toBe(100);
  });

  it('should split equally when previous other categories summed to 0', () => {
    const { result } = renderHook(() =>
      usePercentageAllocation({ equity: 100, bond: 0, cash: 0 })
    );

    act(() => {
      result.current.setAllocationPercent('equity', 50);
    });

    // Remaining 50 is split equally (bond: 25, cash: 25)
    expect(result.current.allocation).toEqual({ equity: 50, bond: 25, cash: 25 });
    expect(
      result.current.allocation.equity +
        result.current.allocation.bond +
        result.current.allocation.cash
    ).toBe(100);
  });
});
