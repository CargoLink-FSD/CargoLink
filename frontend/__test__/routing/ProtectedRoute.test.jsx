import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

let authState;
const dispatchMock = vi.fn();

vi.mock('react-redux', () => ({
  useDispatch: () => dispatchMock,
  useSelector: (selector) => selector({ auth: authState }),
}));

vi.mock('../../src/store/slices/authSlice', () => ({
  refreshAccessToken: vi.fn(() => ({ type: 'auth/refresh' })),
}));

vi.mock('../../src/utils/redirectUser', () => ({
  getRedirectPath: vi.fn(() => '/customer/dashboard'),
}));

vi.mock('../../src/utils/token', () => ({
  default: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    isTokenExpired: vi.fn(),
  },
}));

import ProtectedRoute from '../../src/routes/ProtectedRoute';
import tokenStorage from '../../src/utils/token';
import { refreshAccessToken } from '../../src/store/slices/authSlice';

function LoginLocation() {
  const location = useLocation();
  return <div data-testid="login-location">{`${location.pathname}${location.search}`}</div>;
}

describe('routing/ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      isAuthenticated: false,
      user: null,
      loading: false,
    };
    dispatchMock.mockImplementation(() => ({
      unwrap: vi.fn().mockResolvedValue(undefined),
    }));

    tokenStorage.getAccessToken.mockReturnValue(null);
    tokenStorage.getRefreshToken.mockReturnValue(null);
    tokenStorage.isTokenExpired.mockReturnValue(false);
  });

  it('shows loading while auth is loading', () => {
    authState.loading = true;

    render(
      <MemoryRouter initialEntries={['/customer/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
            <Route path="/customer/dashboard" element={<div>Customer Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to role-specific login with redirect query', async () => {
    render(
      <MemoryRouter initialEntries={['/transporter/dashboard?tab=active']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['transporter']} />}>
            <Route path="/transporter/dashboard" element={<div>Transporter Dashboard</div>} />
          </Route>
          <Route path="/login" element={<LoginLocation />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      const loc = screen.getByTestId('login-location').textContent;
      expect(loc).toContain('/login?');
      expect(loc).toContain('type=transporter');
      expect(loc).toContain('redirect=%2Ftransporter%2Fdashboard%3Ftab%3Dactive');
    });
  });

  it('renders outlet for authenticated user with allowed role', async () => {
    authState = {
      isAuthenticated: true,
      user: { role: 'customer' },
      loading: false,
    };

    render(
      <MemoryRouter initialEntries={['/customer/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
            <Route path="/customer/dashboard" element={<div>Customer Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Customer Dashboard')).toBeInTheDocument();
  });

  it('redirects authenticated users with disallowed role to role home path', async () => {
    authState = {
      isAuthenticated: true,
      user: { role: 'driver' },
      loading: false,
    };

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
          </Route>
          <Route path="/customer/dashboard" element={<div>Redirect Target</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Redirect Target')).toBeInTheDocument();
  });

  it('tries refresh when access token is expired but refresh token is valid', async () => {
    authState = {
      isAuthenticated: true,
      user: { role: 'customer' },
      loading: false,
    };

    tokenStorage.getAccessToken.mockReturnValue('expired-access');
    tokenStorage.getRefreshToken.mockReturnValue('valid-refresh');
    tokenStorage.isTokenExpired.mockImplementation((token) => token === 'expired-access');

    render(
      <MemoryRouter initialEntries={['/customer/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
            <Route path="/customer/dashboard" element={<div>Customer Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('Customer Dashboard');
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'auth/refresh' });
  });
});
