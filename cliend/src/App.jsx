import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './stores/authStore';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import Login from './pages/Login';
import Loading from './components/Loading';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <Loading text="Authenticating..." />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirects to dashboard if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <Loading text="Authenticating..." />;
  }
  
  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

function App() {
  const { initialize, isLoading } = useAuthStore();

  useEffect(() => {
    // Initialize auth on app start
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading text="Loading application..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              {/* Placeholder routes - will be implemented later */}
              <Route path="groups" element={<Groups />} />
              <Route path="groups/:id" element={<div className="p-8 text-center">Group Details - Coming Soon</div>} />
              <Route path="groups/new" element={<div className="p-8 text-center">New Group - Coming Soon</div>} />
              <Route path="expenses" element={<div className="p-8 text-center">Expenses page - Coming Soon</div>} />
              <Route path="expenses/new" element={<div className="p-8 text-center">New Expense - Coming Soon</div>} />
              <Route path="expenses/:id" element={<div className="p-8 text-center">Expense Details - Coming Soon</div>} />
              <Route path="debts" element={<div className="p-8 text-center">Debts page - Coming Soon</div>} />
              <Route path="profile" element={<div className="p-8 text-center">Profile page - Coming Soon</div>} />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
