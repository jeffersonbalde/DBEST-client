// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

export const AuthContext = createContext();

// Token expiration: 1 day in milliseconds
const TOKEN_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 1 day

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(
    () => localStorage.getItem("access_token") || null
  );
  const [userType, setUserType] = useState(
    () => localStorage.getItem("user_type") || null
  );

  // Check if token is expired
  const isTokenExpired = () => {
    const tokenTimestamp = localStorage.getItem("token_timestamp");
    if (!tokenTimestamp) return true;
    
    const now = new Date().getTime();
    const tokenTime = parseInt(tokenTimestamp, 10);
    return (now - tokenTime) > TOKEN_EXPIRATION_TIME;
  };

  // Clear expired token
  const clearExpiredToken = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_type");
    localStorage.removeItem("token_timestamp");
    setToken(null);
    setUserType(null);
    setUser(null);
  };

  // Check authentication on app start
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("access_token");
      const storedUserType = localStorage.getItem("user_type");

      if (!storedToken || !storedUserType) {
        setLoading(false);
        return;
      }

      // Check if token is expired
      if (isTokenExpired()) {
        clearExpiredToken();
        setLoading(false);
        return;
      }

      // Set token and userType immediately so user is considered authenticated
      // This prevents redirect to login if API call is slow or fails temporarily
      setToken(storedToken);
      setUserType(storedUserType);

      try {
        const res = await fetch(
          `${import.meta.env.VITE_LARAVEL_API || 'http://localhost:8000/api'}/${storedUserType}/user`,
          {
            headers: {
              Authorization: `Bearer ${storedToken}`,
              Accept: "application/json",
            },
          }
        );

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          // Only clear token on 401 (Unauthorized) - token is invalid
          if (res.status === 401) {
            clearExpiredToken();
          } else {
            // For other errors (500, network issues, etc.), keep the token
            // User data will be fetched on next successful API call
            console.warn("Auth check failed with status:", res.status);
            // Keep token and userType set, but user data might be stale
          }
        }
      } catch (error) {
        // Network errors or other exceptions - don't clear token
        // Token is still valid based on expiration check
        console.error("Auth check failed (network error):", error);
        // Token and userType are already set above, so user remains authenticated
        // User data will be refreshed on next successful API call
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_LARAVEL_API || 'http://localhost:8000/api'}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ username, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 423 && data.deactivation) {
          return {
            success: false,
            error: data.message || "Your account is deactivated.",
            deactivation: data.deactivation,
          };
        }

        return {
          success: false,
          error: data.message || "Login failed",
        };
      }

      // Store token with timestamp for expiration check
      const timestamp = new Date().getTime();
      localStorage.setItem("access_token", data.token);
      localStorage.setItem("user_type", data.user_type);
      localStorage.setItem("token_timestamp", timestamp.toString());

      setToken(data.token);
      setUser(data.user);
      setUserType(data.user_type);

      return {
        success: true,
        user: data.user,
        user_type: data.user_type,
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error:
          error.message ||
          "Unable to connect to the server. Please try again later.",
      };
    }
  };

  const logout = async () => {
    try {
      if (token && userType) {
        await fetch(
          `${import.meta.env.VITE_LARAVEL_API || 'http://localhost:8000/api'}/${userType}/logout`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
      }
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_type");
      localStorage.removeItem("token_timestamp");
      setUser(null);
      setToken(null);
      setUserType(null);
    }
  };

  const refreshUserData = async () => {
    const storedToken = localStorage.getItem("access_token");
    const storedUserType = localStorage.getItem("user_type");

    if (!storedToken || !storedUserType) {
      return;
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_LARAVEL_API || 'http://localhost:8000/api'}/${storedUserType}/user`,
        {
          headers: {
            Authorization: `Bearer ${storedToken}`,
            Accept: "application/json",
          },
        }
      );

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        return userData;
      }
    } catch (error) {
      console.error("User data refresh failed:", error);
      throw error;
    }
  };

  // Compute isAuthenticated with token expiration check
  // User is authenticated if token exists, isn't expired, and userType is set
  // User data can be fetched later, so we don't require it for authentication
  const isAuthenticated = !!token && !!userType && !isTokenExpired();

  const value = {
    user,
    login,
    logout,
    token,
    loading,
    userType,
    refreshUserData,
    isAuthenticated,
    // Role helpers
    isPropertyCustodian: userType === 'property_custodian',
    isTeacher: userType === 'teacher',
    isIct: userType === 'ict',
    isAccounting: userType === 'accounting',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

