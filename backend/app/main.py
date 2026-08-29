from fastapi import FastAPI

app = FastAPI(title="Cloud Storage Service")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
