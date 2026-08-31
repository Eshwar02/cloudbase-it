import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/auth/me", () =>
    HttpResponse.json({ id: "u1", email: "a@b.com", display_name: "A",
      storage_used_bytes: 0, storage_quota_bytes: 100 })),
  http.post("/api/auth/refresh", () => HttpResponse.json({ status: "refreshed" })),
  http.get("/api/stars", () => HttpResponse.json([])),
  http.get("/api/shares/shared-with-me", () => HttpResponse.json([])),
];
