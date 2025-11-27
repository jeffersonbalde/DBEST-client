import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

export default function PropertyCustodianRoute({ children }) {
  const { isPropertyCustodian } = useAuth();

  return (
    <ProtectedRoute>
      {isPropertyCustodian ? children : <Navigate to="/unauthorized" replace />}
    </ProtectedRoute>
  );
}

