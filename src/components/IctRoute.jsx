import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

export default function IctRoute({ children }) {
  const { isIct } = useAuth();

  return (
    <ProtectedRoute>
      {isIct ? children : <Navigate to="/unauthorized" replace />}
    </ProtectedRoute>
  );
}

