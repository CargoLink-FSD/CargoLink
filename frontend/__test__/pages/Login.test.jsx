import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

let hookState;

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess, onError }) => (
    <div>
      <button onClick={() => onSuccess?.({ credential: 'mock-cred' })}>google-success</button>
      <button onClick={() => onError?.()}>google-error</button>
    </div>
  ),
}));

vi.mock('../../src/hooks/auth/useAuthLogin', () => ({
  useAuthLogin: () => hookState,
}));

import Login from '../../src/pages/common/login';

describe('pages/Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState = {
      formData: { email: 'user@example.com', password: 'secret' },
      userType: 'customer',
      showPassword: false,
      authLoading: false,
      errors: {},
      register: vi.fn(() => ({})),
      handleSubmit: vi.fn((e) => e?.preventDefault?.()),
      toggleShowPassword: vi.fn(),
      navigate: vi.fn(),
      handleGoogleLogin: vi.fn(),
      handleGoogleError: vi.fn(),
      twoFAState: {
        active: false,
        otp: ['', '', '', '', '', ''],
        maskedEmail: 'u***@example.com',
        verifying: false,
        resending: false,
      },
      otpRefs: { current: [] },
      handleOtpChange: vi.fn(),
      handleOtpKeyDown: vi.fn(),
      handleOtpPaste: vi.fn(),
      submitOtp: vi.fn(),
      resendOtp: vi.fn(),
      cancelTwoFA: vi.fn(),
    };
  });

  it('renders normal login form and triggers back navigation', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(hookState.navigate).toHaveBeenCalledWith('/');
  });

  it('uses google callbacks from auth hook', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'google-success' }));
    fireEvent.click(screen.getByRole('button', { name: 'google-error' }));

    expect(hookState.handleGoogleLogin).toHaveBeenCalledWith({ credential: 'mock-cred' });
    expect(hookState.handleGoogleError).toHaveBeenCalledTimes(1);
  });

  it('renders 2FA verification screen and wires actions', () => {
    hookState.twoFAState = {
      active: true,
      otp: ['1', '2', '3', '4', '5', '6'],
      maskedEmail: 'u***@example.com',
      verifying: false,
      resending: false,
    };

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText('Verify Your Identity')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);

    fireEvent.click(screen.getByRole('button', { name: 'Verify & Login' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resend Code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(hookState.submitOtp).toHaveBeenCalledTimes(1);
    expect(hookState.resendOtp).toHaveBeenCalledTimes(1);
    expect(hookState.cancelTwoFA).toHaveBeenCalledTimes(1);
  });
});
