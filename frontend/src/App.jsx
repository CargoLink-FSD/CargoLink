import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { restoreSession } from './store/slices/authSlice';
import AppRoutes from './routes/AppRoutes';
import { NotificationToast } from './components/common';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Restore auth session from stored tokens on app mount
    dispatch(restoreSession());
  }, [dispatch]);

  return (
    <BrowserRouter>
      <NotificationToast />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
