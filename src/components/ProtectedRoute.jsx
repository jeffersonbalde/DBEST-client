import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Preloader from './Preloader';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Preloader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

