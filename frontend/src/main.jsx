/**
 * Entry Point
 * Initializes React app with Redux and Notification providers
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { NotificationProvider } from './context/NotificationContext';
import App from './App';
import './styles/styles.css';

// Render app with Redux and Notification providers
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </Provider>
  </React.StrictMode>
);