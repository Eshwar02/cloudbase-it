import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { api } from "./axios";
import { server } from "../test/server";

describe("axios 401 refresh interceptor", () => {
  it("refreshes once on 401 then retries the original request", async () => {
    let calls = 0;
    server.use(
      http.get("/api/auth/me", () => {
        calls += 1;
        if (calls === 1) return new HttpResponse(null, { status: 401 });
        return HttpResponse.json({ id: "u1", email: "a@b.com", display_name: "A",
          storage_used_bytes: 0, storage_quota_bytes: 100 });
      }),
      http.post("/api/auth/refresh", () => HttpResponse.json({ status: "refreshed" })),
    );
    const res = await api.get("/auth/me");
    expect(res.status).toBe(200);
    expect(calls).toBe(2);
  });

  it("rejects when refresh also fails", async () => {
    server.use(
      http.get("/api/auth/me", () => new HttpResponse(null, { status: 401 })),
      http.post("/api/auth/refresh", () => new HttpResponse(null, { status: 401 })),
    );
    await expect(api.get("/auth/me")).rejects.toBeTruthy();
  });
});
