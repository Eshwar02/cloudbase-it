import { api } from "../lib/axios";
import type { User } from "../types";

export const login = (email: string, password: string) =>
  api.post<User>("/auth/login", { email, password }).then((r) => r.data);

export const register = (email: string, password: string, display_name: string) =>
  api.post<User>("/auth/register", { email, password, display_name }).then((r) => r.data);

export const logout = () => api.post("/auth/logout").then((r) => r.data);

export const getMe = () => api.get<User>("/auth/me").then((r) => r.data);
