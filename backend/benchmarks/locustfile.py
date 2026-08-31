"""Load / stress test for the Cloud Storage API.

Each simulated user registers, logs in (JWT stored in HttpOnly cookies that
Locust persists per-session), then exercises the read- and write-heavy paths
under concurrency.

Run against a live server:

    # 1. Start the API (needs a reachable Postgres + Supabase in .env)
    uvicorn app.main:app --port 8000

    # 2a. Headless: 50 users, spawn 5/s, for 1 minute
    locust -f benchmarks/locustfile.py --host http://localhost:8000 \
        --headless -u 50 -r 5 -t 1m

    # 2b. Or open the web UI at http://localhost:8089
    locust -f benchmarks/locustfile.py --host http://localhost:8000

Suggested acceptance targets (single small instance): p95 < 300ms for read
endpoints, < 500ms for writes, and 0% failures below ~50 concurrent users.
Auth endpoints are bcrypt-bound (~150-200ms) and rate-limited by design.
"""
import uuid

from locust import HttpUser, between, task


class DriveUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        email = f"load-{uuid.uuid4().hex[:12]}@example.com"
        self.client.post("/auth/register", json={
            "email": email, "password": "loadtest-pw", "display_name": "Load"})
        self.client.post("/auth/login", json={
            "email": email, "password": "loadtest-pw"})
        self.folder_id = None

    @task(5)
    def list_drive(self):
        self.client.get("/drive", name="GET /drive")

    @task(3)
    def search(self):
        self.client.get("/search?q=file&type=all", name="GET /search")

    @task(2)
    def list_shared(self):
        self.client.get("/shares/shared-with-me", name="GET /shares/shared-with-me")

    @task(2)
    def list_starred(self):
        self.client.get("/stars", name="GET /stars")

    @task(1)
    def create_folder_and_star(self):
        r = self.client.post("/folders", json={"name": f"load-{uuid.uuid4().hex[:6]}"},
                             name="POST /folders")
        if r.status_code == 201:
            fid = r.json()["id"]
            self.folder_id = fid
            self.client.post("/stars", json={"folder_id": fid}, name="POST /stars")

    @task(1)
    def browse_folder(self):
        if self.folder_id:
            self.client.get(f"/folders/{self.folder_id}", name="GET /folders/{id}")
