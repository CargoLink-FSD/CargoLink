import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dispatchMock = vi.fn();
let mockState;
const showNotificationMock = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => dispatchMock,
  useSelector: (selector) => selector(mockState),
}));

vi.mock('../../src/context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: showNotificationMock }),
}));

import { useCustomerOrders } from '../../src/hooks/useCustomerOrders';

describe('hooks/useCustomerOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      orders: {
        orders: [{ _id: 'o1', status: 'Placed' }],
        loading: false,
        error: null,
        filters: { searchTerm: '', statusFilter: 'all' },
      },
    };

    dispatchMock.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue(undefined),
    }));
  });

  it('dispatches initial fetch on mount', () => {
    renderHook(() => useCustomerOrders());
    expect(dispatchMock).toHaveBeenCalledTimes(1);
  });

  it('deleteOrder shows success notification on successful delete', async () => {
    const { result } = renderHook(() => useCustomerOrders());

    await act(async () => {
      await result.current.deleteOrder('o1');
    });

    expect(showNotificationMock).toHaveBeenCalledWith({
      message: 'Order deleted successfully',
      type: 'success',
    });
  });

  it('deleteOrder shows error notification and rethrows on failure', async () => {
    dispatchMock
      .mockImplementationOnce(() => ({ unwrap: vi.fn().mockResolvedValue(undefined) }))
      .mockImplementationOnce(() => ({ unwrap: vi.fn().mockRejectedValue(new Error('fail')) }));

    const { result } = renderHook(() => useCustomerOrders());

    await expect(result.current.deleteOrder('o1')).rejects.toThrow('fail');

    expect(showNotificationMock).toHaveBeenCalledWith({
      message: 'Failed to delete order',
      type: 'error',
    });
  });

  it('filterOrders dispatches only changed filter values', () => {
    const { result } = renderHook(() => useCustomerOrders());

    act(() => {
      result.current.filterOrders('', 'all');
    });

    expect(dispatchMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.filterOrders('mumbai', 'Placed');
    });

    expect(dispatchMock).toHaveBeenCalledTimes(3);
  });

  it('refresh dispatches fetch action', () => {
    const { result } = renderHook(() => useCustomerOrders());

    act(() => {
      result.current.refresh();
    });

    expect(dispatchMock).toHaveBeenCalledTimes(2);
  });
});
