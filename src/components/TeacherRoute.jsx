import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

export default function TeacherRoute({ children }) {
  const { isTeacher } = useAuth();

  return (
    <ProtectedRoute>
      {isTeacher ? children : <Navigate to="/unauthorized" replace />}
    </ProtectedRoute>
  );
}

