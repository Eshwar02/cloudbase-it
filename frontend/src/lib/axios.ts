import axios from "axios";

export const api = axios.create({ baseURL: "/api", withCredentials: true });

let refreshing = false;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthRefresh = original?.url?.includes("/auth/refresh");
    if (status === 401 && !original?._retry && !isAuthRefresh) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = true;
          await api.post("/auth/refresh");
          refreshing = false;
        }
        return api(original);
      } catch (e) {
        refreshing = false;
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);
