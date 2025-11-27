import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

export default function IctAccountingRoute({ children }) {
  const { isIct, isAccounting } = useAuth();

  return (
    <ProtectedRoute>
      {isIct || isAccounting ? children : <Navigate to="/unauthorized" replace />}
    </ProtectedRoute>
  );
}

