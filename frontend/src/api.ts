import axios, { type InternalAxiosRequestConfig } from "axios";

const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://PFProgramacionWebG11.onrender.com" // fallback en Render
    : "http://127.0.0.1:8000");                       // fallback en local

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
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