import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

export default function AccountingRoute({ children }) {
  const { isAccounting } = useAuth();

  return (
    <ProtectedRoute>
      {isAccounting ? children : <Navigate to="/unauthorized" replace />}
    </ProtectedRoute>
  );
}

