from fastapi import FastAPI

from app.routes import auth, files, folders, search, trash

app = FastAPI(title="Cloud Storage Service")
app.include_router(auth.router)
app.include_router(folders.router)
app.include_router(files.router)
app.include_router(trash.router)
app.include_router(search.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
