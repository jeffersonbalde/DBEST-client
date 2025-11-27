// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(
    () => localStorage.getItem("access_token") || null
  );
  const [userType, setUserType] = useState(
    () => localStorage.getItem("user_type") || null
  );

  // Check authentication on app start
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem("access_token");
      const storedUserType = localStorage.getItem("user_type");

      if (!storedToken || !storedUserType) {
        setLoading(false);
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
          setToken(storedToken);
          setUserType(storedUserType);
        } else {
          if (res.status === 401) {
            setUser(null);
            setToken(null);
            setUserType(null);
            localStorage.removeItem("access_token");
            localStorage.removeItem("user_type");
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
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
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("access_token", data.token);
      localStorage.setItem("user_type", data.user_type);

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
      return { success: false, error: error.message };
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

  const value = {
    user,
    login,
    logout,
    token,
    loading,
    userType,
    refreshUserData,
    isAuthenticated: !!user && !!token,
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

