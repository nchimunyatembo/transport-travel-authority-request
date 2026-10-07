import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import CreateRequestPage from './pages/CreateRequest';
import RequestDetailsPage from './pages/RequestDetails';
import AdminUsersPage from './pages/AdminUsers';
import CreateAuthorityPage from './pages/CreateAuthority';
import EditApplicationPage from './pages/EditApplication';
import ChangePasswordPage from './pages/ChangePassword';

// Create Auth Context for global user state management
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// --- PROTECTED ROUTE WRAPPER ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading-spinner">Loading session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const NotFound = () => (
  <div className="page-container">
    <h2>404 - Page Not Found</h2>
    <Link to="/dashboard">Return to Dashboard</Link>
  </div>
);

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      <Router>
        <div className="app-shell">
          <Navbar />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />

              {/* Shared Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/requests/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['APPLICANT', 'RECOMMENDER', 'ADMIN']}>
                    <EditApplicationPage />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/requests/:id" 
                element={
                  <ProtectedRoute>
                    <RequestDetailsPage />
                  </ProtectedRoute>
                } 
              />

              {/* Application Creation Routes */}
              <Route 
                path="/create-request" 
                element={
                  <ProtectedRoute allowedRoles={['APPLICANT', 'RECOMMENDER', 'APPROVER', 'ADMIN']}>
                    <CreateRequestPage />
                  </ProtectedRoute>
                } 
              />
              <Route
                path="/create-authority"
                element={
                  <ProtectedRoute allowedRoles={['APPLICANT', 'RECOMMENDER', 'APPROVER', 'ADMIN']}>
                    <CreateAuthorityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account/password"
                element={
                  <ProtectedRoute>
                    <ChangePasswordPage />
                  </ProtectedRoute>
                }
              />

              {/* Default Redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}