import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getBaseUrl } from '../api/http';
import { useNotification } from '../context/NotificationContext';
import {
  clearNotifications,
  pollNotifications,
  receiveRealtimeNotification,
} from '../store/slices/notificationsSlice';
import { fetchCustomerOrders } from '../store/slices/ordersSlice';
import { fetchAvailableOrders, fetchMyBids } from '../store/slices/bidsSlice';
import { fetchTransporterOrders } from '../store/slices/transporterOrdersSlice';
import tokenStorage from '../utils/token';
import { handleTokenRefresh } from '../utils/tokenRefresh';

const WS_RECONNECT_DELAY_MS = 3000;

const toWsUrl = (baseUrl) => {
  if (baseUrl.startsWith('https://')) return `${baseUrl.replace('https://', 'wss://')}/ws`;
  return `${baseUrl.replace('http://', 'ws://')}/ws`;
};

const resolveWsBaseUrl = () => {
  const baseUrl = getBaseUrl();
  if (baseUrl) return toWsUrl(baseUrl);

  // In production split-deploy mode, websocket must target the backend domain.
  // If API base URL is missing, avoid noisy reconnect loops and let polling continue.
  if (!import.meta.env.DEV) {
    return null;
  }

  return 'ws://localhost:3000/ws';
};

const getValidAccessToken = async () => {
  const accessToken = tokenStorage.getAccessToken();
  if (!accessToken) return null;

  if (!tokenStorage.isTokenExpired(accessToken)) {
    return accessToken;
  }

  try {
    await handleTokenRefresh();
    return tokenStorage.getAccessToken();
  } catch {
    return null;
  }
};

const shouldRefreshOrders = (type = '') => {
  return [
    'bid.placed',
    'bid.accepted',
    'trip.created',
    'trip.started',
    'trip.pickup.confirmed',
    'trip.delivery.confirmed',
    'order.cancelled',
    'payment.completed',
    'chat.message',
  ].includes(type);
};

export function useRealtimeNotifications() {
  const dispatch = useDispatch();
  const { showInfo } = useNotification();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const reconnectTimerRef = useRef(null);
  const socketRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  useEffect(() => {
    const role = user?.role || user?.type;

    if (!isAuthenticated || !role) {
      dispatch(clearNotifications());
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    let isDisposed = false;

    const connect = async () => {
      const wsBase = resolveWsBaseUrl();
      if (!wsBase) {
        dispatch(pollNotifications());
        return;
      }

      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        dispatch(clearNotifications());
        return;
      }

      const wsUrl = `${wsBase}?token=${encodeURIComponent(accessToken)}`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        dispatch(pollNotifications());
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type !== 'notification:new') return;

          const notification = payload?.data;
          if (!notification) return;

          dispatch(receiveRealtimeNotification(notification));
          window.dispatchEvent(new CustomEvent('cargolink:notification', { detail: notification }));
          if (notification?.message) {
            showInfo(notification.message);
          }

          const nType = notification?.type || '';
          if (role === 'customer' && shouldRefreshOrders(nType)) {
            dispatch(fetchCustomerOrders());
          }
          if (role === 'transporter') {
            if (nType === 'bid.accepted' || nType === 'order.cancelled' || nType.startsWith('trip.')) {
              dispatch(fetchTransporterOrders());
            }
            if (nType === 'order.cancelled' || nType === 'trip.created') {
              dispatch(fetchAvailableOrders());
            }
            if (nType === 'bid.accepted') {
              dispatch(fetchMyBids());
            }
          }
        } catch (err) {
          console.error('Failed to parse websocket notification', err);
        }
      };

      ws.onclose = async (event) => {
        if (isDisposed) return;

        // Auth failure (token expired/revoked) — try one refresh before retrying.
        if (event?.code === 4401 && reconnectAttemptsRef.current < 1) {
          reconnectAttemptsRef.current += 1;
          try {
            await handleTokenRefresh();
          } catch {
            return;
          }
        }

        reconnectTimerRef.current = setTimeout(() => {
          void connect();
        }, WS_RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    void connect();

    return () => {
      isDisposed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [dispatch, isAuthenticated, showInfo, user]);
}

export default useRealtimeNotifications;
