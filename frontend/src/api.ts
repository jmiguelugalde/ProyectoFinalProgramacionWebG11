import axios, { type InternalAxiosRequestConfig } from "axios";

// Forzar backend en producción (Render). Sin localhost.
const baseURL = import.meta.env.PROD
  ? "https://pfinalprogramacionwebg11.onrender.com"
  : "http://127.0.0.1:8000";

const api = axios.create({
  baseURL,
  timeout: 15000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any)["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export default api;
