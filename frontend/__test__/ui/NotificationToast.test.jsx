import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hideNotificationMock = vi.fn();
let mockNotification = null;

vi.mock('../../src/context/NotificationContext', () => ({
  useNotification: () => ({
    notification: mockNotification,
    hideNotification: hideNotificationMock,
  }),
}));

import NotificationToast from '../../src/components/common/NotificationToast';

describe('components/NotificationToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotification = null;
  });

  it('renders nothing when notification is null', () => {
    const { container } = render(<NotificationToast />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders notification message and dismisses on click', () => {
    mockNotification = { message: 'Saved successfully', type: 'success' };

    render(<NotificationToast />);

    expect(screen.getByRole('status')).toHaveTextContent('Saved successfully');

    fireEvent.click(screen.getByRole('button', { name: /dismiss notification/i }));
    expect(hideNotificationMock).toHaveBeenCalledTimes(1);
  });
});
