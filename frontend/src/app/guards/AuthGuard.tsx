import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/context/AuthContext";

const AuthGuard = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default AuthGuard;
