import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  withCredentials: true,
});

let refreshPromise: Promise<unknown> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthRefresh = original?.url?.includes("/auth/refresh");
    if (status === 401 && !original?._retry && !isAuthRefresh) {
      original._retry = true;
      try {
        refreshPromise ??= api.post("/auth/refresh").finally(() => { refreshPromise = null; });
        await refreshPromise;
        return api(original);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);
