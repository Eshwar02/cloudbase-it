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

  it("calls refresh exactly once when two requests 401 concurrently", async () => {
    let refreshCalls = 0;
    // Each endpoint 401s on first call then succeeds
    const endpoint1Calls = { n: 0 };
    const endpoint2Calls = { n: 0 };

    server.use(
      http.get("/api/files/a", () => {
        endpoint1Calls.n += 1;
        if (endpoint1Calls.n === 1) return new HttpResponse(null, { status: 401 });
        return HttpResponse.json({ id: "a" });
      }),
      http.get("/api/files/b", () => {
        endpoint2Calls.n += 1;
        if (endpoint2Calls.n === 1) return new HttpResponse(null, { status: 401 });
        return HttpResponse.json({ id: "b" });
      }),
      http.post("/api/auth/refresh", () => {
        refreshCalls += 1;
        return HttpResponse.json({ status: "refreshed" });
      }),
    );

    const [res1, res2] = await Promise.all([
      api.get("/files/a"),
      api.get("/files/b"),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // With shared promise, refresh is called exactly once
    // With old boolean flag, the second concurrent 401 would skip the await
    // and retry before refresh completes — but crucially both would still
    // trigger the refresh since the second request could also find !refreshing
    // momentarily, OR skip it but retry too early and get another 401.
    // The shared promise guarantees exactly 1 call.
    expect(refreshCalls).toBe(1);
  });
});
