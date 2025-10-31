import { AuthProvider } from './context/AuthContext';
import AppRouter from './router/AppRouter';

/**
 * Main App Component
 * Wraps the entire application with AuthProvider for global state management
 */
function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
