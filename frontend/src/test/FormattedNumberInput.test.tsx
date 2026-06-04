import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FormattedNumberInput } from '../App';
import React from 'react';

const TestWrapper = ({ initialValue = 1000 }: { initialValue?: number }) => {
  const [value, setValue] = React.useState(initialValue);
  return (
    <div>
      <span data-testid="value-display">{value}</span>
      <FormattedNumberInput value={value} onChange={setValue} />
    </div>
  );
};

describe('FormattedNumberInput', () => {
  it('should format initial values correctly', () => {
    render(<TestWrapper initialValue={1000} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('1,000');
  });

  it('should format input with commas as user types', () => {
    render(<TestWrapper initialValue={1000} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    
    fireEvent.focus(input);
    
    // Simulate user typing '5' at the end
    fireEvent.change(input, {
      target: {
        value: '1,0005',
        selectionStart: 6,
        selectionEnd: 6
      }
    });
    
    expect(input.value).toBe('10,005');
    expect(screen.getByTestId('value-display').textContent).toBe('10005');
  });

  it('should place cursor correctly when typing at the end', () => {
    render(<TestWrapper initialValue={1000} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    
    fireEvent.focus(input);
    
    fireEvent.change(input, {
      target: {
        value: '1,0005',
        selectionStart: 6,
        selectionEnd: 6
      }
    });
    
    expect(input.selectionStart).toBe(6);
    expect(input.selectionEnd).toBe(6);
  });

  it('should place cursor correctly when typing in the middle', () => {
    render(<TestWrapper initialValue={1000} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    
    fireEvent.focus(input);
    
    // Original: 1,000
    // Cursor after the first 0 (index 3, which is '1,0')
    // Type 7: 1,0700
    fireEvent.change(input, {
      target: {
        value: '1,0700',
        selectionStart: 4,
        selectionEnd: 4
      }
    });
    
    // Formatted should be 10,700
    // The typed character '7' is now at index 3 in '10,700'
    // So selectionStart should be 4 (right after '7')
    expect(input.value).toBe('10,700');
    expect(input.selectionStart).toBe(4);
    expect(input.selectionEnd).toBe(4);
  });

  it('should keep cursor position when typing invalid characters', () => {
    render(<TestWrapper initialValue={1000} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    
    fireEvent.focus(input);
    
    // Original: 1,000
    // Cursor after 1 (index 1)
    // Type 'a': 1a,000
    fireEvent.change(input, {
      target: {
        value: '1a,000',
        selectionStart: 2,
        selectionEnd: 2
      }
    });
    
    // Formatted should be 1,000 (invalid 'a' stripped)
    // Selection range should be restored to after 1 (index 1)
    expect(input.value).toBe('1,000');
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(1);
  });
});
