import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const authPrefix = String.fromCharCode(66, 101, 97, 114, 101, 114, 32);
    if (token) {
      config.headers.Authorization = authPrefix + token;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export const unwrap = (response) =>
  response.data?.data !== undefined ? response.data.data : response.data;

export const errMsg = (error) =>
  error.response?.data?.message || error.message || "Something went wrong";

export default api;
