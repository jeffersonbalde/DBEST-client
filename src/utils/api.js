// API helper using fetch with AuthContext token
export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem("access_token");
  const baseURL = import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api";

  const defaultHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${baseURL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_type");
        window.location.href = "/login";
      }
      throw new Error(data.message || "Request failed");
    }

    return { data, response };
  } catch (error) {
    throw error;
  }
};

// Convenience methods
export const api = {
  get: (endpoint, options = {}) => apiCall(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options = {}) =>
    apiCall(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: (endpoint, body, options = {}) =>
    apiCall(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),
  delete: (endpoint, options = {}) =>
    apiCall(endpoint, { ...options, method: "DELETE" }),
};

export default api;

