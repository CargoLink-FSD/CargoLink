import { renderHook } from '@testing-library/react';
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

vi.mock('../../src/store/slices/customerSlice', () => ({
  fetchCustomerProfile: vi.fn(() => ({ type: 'customer/fetchProfile' })),
  updateCustomerField: vi.fn(),
  updateCustomerPassword: vi.fn(),
  addCustomerAddress: vi.fn(),
  deleteCustomerAddress: vi.fn(),
  uploadCustomerProfilePicture: vi.fn(),
  clearError: vi.fn(() => ({ type: 'customer/clearError' })),
  clearUpdateSuccess: vi.fn(() => ({ type: 'customer/clearUpdateSuccess' })),
}));

import { useCustomerProfile } from '../../src/hooks/useCustomerProfile';
import {
  clearError,
  clearUpdateSuccess,
  fetchCustomerProfile,
} from '../../src/store/slices/customerSlice';

describe('hooks/useCustomerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState = {
      customer: {
        profile: { _id: 'c1', firstName: 'Alice' },
        addresses: [],
        loading: false,
        error: null,
        updateSuccess: false,
      },
    };
    dispatchMock.mockReturnValue({});
  });

  it('dispatches profile fetch on mount', () => {
    renderHook(() => useCustomerProfile());

    expect(fetchCustomerProfile).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'customer/fetchProfile' });
  });

  it('on update success, shows notification and clears success flag', () => {
    mockState.customer.updateSuccess = true;

    renderHook(() => useCustomerProfile());

    expect(showSuccessMock).toHaveBeenCalledWith('Update successful!');
    expect(clearUpdateSuccess).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'customer/clearUpdateSuccess' });
  });

  it('on error, shows notification and clears error state', () => {
    mockState.customer.error = 'update failed';

    renderHook(() => useCustomerProfile());

    expect(showErrorMock).toHaveBeenCalledWith('update failed');
    expect(clearError).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'customer/clearError' });
  });
});
