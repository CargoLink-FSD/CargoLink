import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dispatchMock = vi.fn();
const showSuccessMock = vi.fn();
const showErrorMock = vi.fn();

let mockState;

vi.mock('react-redux', () => ({
  useDispatch: () => dispatchMock,
  useSelector: (selector) => selector(mockState),
}));

vi.mock('../../src/context/NotificationContext', () => ({
  useNotification: () => ({
    showSuccess: showSuccessMock,
    showError: showErrorMock,
  }),
}));

vi.mock('../../src/store/slices/bidsSlice', () => ({
  fetchAvailableOrders: vi.fn(() => ({ type: 'bids/fetchAvailableOrders' })),
  submitBid: vi.fn((payload) => ({ type: 'bids/submitBid', payload })),
}));

import { useBids } from '../../src/hooks/useBids';
import { fetchAvailableOrders, submitBid } from '../../src/store/slices/bidsSlice';

describe('hooks/useBids', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      bids: {
        availableOrders: [
          {
            _id: 'o1',
            pickup: { city: 'Mumbai' },
            delivery: { city: 'Pune' },
            truck_type: 'truck-medium',
            max_price: 10000,
          },
          {
            _id: 'o2',
            pickup: { city: 'Delhi' },
            delivery: { city: 'Jaipur' },
            truck_type: 'truck-light',
            max_price: 4000,
          },
        ],
        loading: false,
        submitting: false,
        error: null,
      },
    };

    dispatchMock.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue(undefined),
    }));
  });

  it('dispatches available orders fetch on mount', () => {
    renderHook(() => useBids());

    expect(fetchAvailableOrders).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'bids/fetchAvailableOrders' });
  });

  it('shows notification when redux error is present', () => {
    mockState.bids.error = 'failed-to-load';

    renderHook(() => useBids());

    expect(showErrorMock).toHaveBeenCalledWith('failed-to-load');
  });

  it('filters orders by location and vehicle type', () => {
    const { result } = renderHook(() => useBids());

    act(() => {
      result.current.handleFilterChange({ target: { name: 'location', value: 'mumbai' } });
      result.current.handleFilterChange({ target: { name: 'vehicleType', value: 'truck-medium' } });
    });

    expect(result.current.filteredOrders).toHaveLength(1);
    expect(result.current.filteredOrders[0]._id).toBe('o1');
  });

  it('placeBid validates amount and blocks invalid values', async () => {
    vi.spyOn(document, 'getElementById')
      .mockReturnValueOnce({ value: '0' })
      .mockReturnValueOnce({ value: 'note' });

    const { result } = renderHook(() => useBids());

    await act(async () => {
      await result.current.placeBid(0, 'o1');
    });

    expect(showErrorMock).toHaveBeenCalledWith('Enter a valid bid amount');
    expect(submitBid).not.toHaveBeenCalled();
  });

  it('placeBid submits valid payload, resets inputs, and reloads orders', async () => {
    const amountInput = { value: '5000' };
    const notesInput = { value: 'fast delivery' };
    vi.spyOn(document, 'getElementById')
      .mockReturnValueOnce(amountInput)
      .mockReturnValueOnce(notesInput);

    const { result } = renderHook(() => useBids());

    await act(async () => {
      await result.current.placeBid(0, 'o1');
    });

    expect(submitBid).toHaveBeenCalledWith({
      orderId: 'o1',
      bidAmount: 5000,
      notes: 'fast delivery',
    });
    expect(showSuccessMock).toHaveBeenCalledWith('Bid submitted successfully');
    expect(amountInput.value).toBe('');
    expect(notesInput.value).toBe('');
    expect(fetchAvailableOrders).toHaveBeenCalledTimes(2);
  });
});
