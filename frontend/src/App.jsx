import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { NotificationToast } from './components/common';

/**
 * Main App Component
 * Simple routing for home, login, and signup pages
 */
function App() {
  return (
    <BrowserRouter>
      <NotificationToast />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
