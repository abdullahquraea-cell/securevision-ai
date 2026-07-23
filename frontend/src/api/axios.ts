import axios from "axios";

// أثناء التطوير: يتصل بجهازك. على الإنترنت: يستخدم /api (يوجّهه الخادم للـ backend).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
});

// إرفاق التوكن تلقائياً مع كل طلب
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;