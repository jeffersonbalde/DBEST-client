import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getRoleHomeRoute } from '../utils/roleRoutes';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { userType } = useAuth();

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="text-center p-5">
        <div className="mb-4">
          <i className="fas fa-lock fa-4x text-danger mb-3"></i>
        </div>
        <h1 className="display-4 fw-bold text-danger mb-3">403</h1>
        <h2 className="h3 mb-3">Access Denied</h2>
        <p className="lead text-muted mb-4">
          You don't have permission to access this page.
        </p>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => navigate(userType ? getRoleHomeRoute(userType) : '/login')}
        >
          {userType ? 'Go to Dashboard' : 'Go to Login'}
        </button>
      </div>
    </div>
  );
}

