import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Button from '../../src/components/forms/Button';

describe('components/Button', () => {
  it('calls onClick when enabled', () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Submit</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state and disables button', () => {
    render(<Button loading>Submit</Button>);

    const btn = screen.getByRole('button', { name: /loading/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Loading...');
  });
});
