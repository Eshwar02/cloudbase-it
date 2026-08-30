import { renderHook, act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { useUpload } from "./useUpload";

test("runs init -> put -> complete and marks done", async () => {
  const seen: string[] = [];
  server.use(
    http.post("/api/files/init-upload", async () => {
      seen.push("init");
      return HttpResponse.json({ file_id: "f1", upload_url: "https://storage.test/put/f1", storage_key: "k" });
    }),
    http.put("https://storage.test/put/f1", () => { seen.push("put"); return new HttpResponse(null, { status: 200 }); }),
    http.post("/api/files/complete-upload", () => {
      seen.push("complete");
      return HttpResponse.json({ id: "f1", name: "a.txt", size_bytes: 3, status: "ready" });
    }),
  );

  const onDone = vi.fn();
  const { result } = renderHook(() => useUpload(null, onDone));
  const file = new File(["abc"], "a.txt", { type: "text/plain" });
  await act(async () => { await result.current.upload([file]); });

  await waitFor(() => expect(Object.values(result.current.uploads)[0].status).toBe("done"));
  expect(seen).toEqual(["init", "put", "complete"]);
  expect(onDone).toHaveBeenCalled();
});
