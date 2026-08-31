import { api } from "../lib/axios";
import type { LinkShare, ShareGrant, SharedItem } from "../types";

type Target = { file_id: string } | { folder_id: string };

export const createShare = (
  target: Target, grantee_email: string, role: "viewer" | "editor",
) =>
  api.post<ShareGrant>("/shares", { ...target, grantee_email, role })
    .then((r) => r.data);

export const listShares = (target: Target) =>
  api.get<ShareGrant[]>("/shares", { params: target }).then((r) => r.data);

export const revokeShare = (id: string) =>
  api.delete(`/shares/${id}`).then((r) => r.data);

export const getSharedWithMe = () =>
  api.get<SharedItem[]>("/shares/shared-with-me").then((r) => r.data);

export const createPublicLink = (
  target: Target,
  opts: { role?: "viewer" | "editor"; password?: string; expires_in_hours?: number },
) =>
  api.post<LinkShare>("/public-link", { ...target, ...opts }).then((r) => r.data);
