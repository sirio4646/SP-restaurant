import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

const getToken = () =>
  sessionStorage.getItem("jwtToken") || localStorage.getItem("jwtToken");

const clearAuthStorage = () => {
  const keysToRemove = ["jwtToken", "username", "restaurant_id", "is_customer"];

  sessionStorage.clear();
  keysToRemove.forEach((key) => localStorage.removeItem(key));
};

// Request interceptor - เพิ่ม Authorization header
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - จัดการ 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthStorage();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
