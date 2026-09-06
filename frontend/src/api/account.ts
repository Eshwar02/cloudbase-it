import { api } from "../lib/axios";
import type { User, UserSettings } from "../types";

export const updateProfile = (display_name: string) =>
  api.patch<User>("/auth/me", { display_name }).then((r) => r.data);

export const changePassword = (current_password: string, new_password: string) =>
  api.post("/auth/change-password", { current_password, new_password }).then((r) => r.data);

export const updateSettings = (patch: UserSettings) =>
  api.patch<User>("/auth/settings", patch).then((r) => r.data);
