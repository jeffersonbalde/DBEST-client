import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Preloader from './Preloader';
import { getRoleHomeRoute } from '../utils/roleRoutes';

export default function PublicRoute({ children }) {
  const { isAuthenticated, loading, userType } = useAuth();

  if (loading) {
    return <Preloader />;
  }

  if (!isAuthenticated) {
    return children;
  }

  return <Navigate to={getRoleHomeRoute(userType)} replace />;
}

