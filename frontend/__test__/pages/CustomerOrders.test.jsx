import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockState;
const dispatchMock = vi.fn();
const showNotificationMock = vi.fn();
let deleteResult = { cancellation: { feeAmount: 0 } };

vi.mock('react-redux', () => ({
  useDispatch: () => dispatchMock,
  useSelector: (selector) => selector(mockState),
}));

vi.mock('../../src/context/NotificationContext', () => ({
  useNotification: () => ({ showNotification: showNotificationMock }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../../src/store/slices/ordersSlice', () => ({
  fetchCustomerOrders: vi.fn((payload) => ({ type: 'orders/fetchCustomerOrders', payload })),
  deleteCustomerOrder: vi.fn((payload) => ({ type: 'orders/deleteCustomerOrder', payload })),
  selectAllOrders: (state) => state.orders.orders,
  selectOrdersLoading: (state) => state.orders.loading,
  selectOrdersError: (state) => state.orders.error,
}));

vi.mock('../../src/api/orders', () => ({
  getCancellationDues: vi.fn(),
}));

vi.mock('../../src/api/payment', () => ({
  paymentAPI: {
    initiateCancellationDuesPayment: vi.fn(),
    verifyCancellationDuesPayment: vi.fn(),
  },
}));

vi.mock('../../src/components/common/Header', () => ({
  default: () => <div data-testid="header">Header</div>,
}));

vi.mock('../../src/components/common/Footer', () => ({
  default: () => <div data-testid="footer">Footer</div>,
}));

vi.mock('../../src/components/common/OrderCard', () => ({
  default: ({ order, onCancelOrder }) => (
    <button onClick={() => onCancelOrder(order._id)}>cancel-{order._id}</button>
  ),
}));

import CustomerOrders from '../../src/pages/customer/CustomerOrders';
import { deleteCustomerOrder, fetchCustomerOrders } from '../../src/store/slices/ordersSlice';
import { getCancellationDues } from '../../src/api/orders';

describe('pages/CustomerOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockState = {
      orders: {
        orders: [{ _id: 'o1', status: 'Placed' }],
        loading: false,
        error: null,
      },
    };

    getCancellationDues.mockResolvedValue({
      outstandingCancellationDues: 123.45,
      gateMode: 'soft',
    });

    dispatchMock.mockImplementation((action) => {
      if (action.type === 'orders/deleteCustomerOrder') {
        return {
          unwrap: vi.fn().mockResolvedValue(deleteResult),
        };
      }
      return action;
    });

    vi.spyOn(window, 'prompt').mockReturnValue('Need to cancel');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads orders + cancellation dues and renders dues summary from api response', async () => {
    render(<CustomerOrders />);

    await waitFor(() => {
      expect(fetchCustomerOrders).toHaveBeenCalledWith({ search: '', status: 'all' });
      expect(getCancellationDues).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Pending Cancellation Dues')).toBeInTheDocument();
    expect(screen.getByText(/Outstanding: INR 123.45/)).toBeInTheDocument();
  });

  it('triggers debounced search fetch with latest query', async () => {
    vi.useFakeTimers();
    render(<CustomerOrders />);

    const searchInput = screen.getByPlaceholderText('Search by city...');
    fireEvent.change(searchInput, { target: { value: 'mumbai' } });

    await vi.advanceTimersByTimeAsync(400);

    expect(fetchCustomerOrders).toHaveBeenCalledWith({ search: 'mumbai', status: 'all' });
  });

  it('updates status filter immediately and requests filtered data', () => {
    render(<CustomerOrders />);

    const statusSelect = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusSelect, { target: { value: 'assigned' } });

    expect(fetchCustomerOrders).toHaveBeenCalledWith({ search: '', status: 'assigned' });
  });

  it('shows success notification with cancellation fee after delete response', async () => {
    deleteResult = { cancellation: { feeAmount: 200 } };

    render(<CustomerOrders />);

    fireEvent.click(await screen.findByRole('button', { name: 'cancel-o1' }));

    await waitFor(() => {
      expect(deleteCustomerOrder).toHaveBeenCalledWith({
        orderId: 'o1',
        reasonCode: 'customer_requested',
        reasonText: 'Need to cancel',
      });
    });

    expect(showNotificationMock).toHaveBeenCalledWith({
      type: 'success',
      message: 'Order cancelled. INR 200 added to your cancellation dues.',
    });
  });
});
