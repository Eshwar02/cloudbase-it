from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings


class StorageService:
    def __init__(self, client: Client, bucket: str):
        self._bucket = client.storage.from_(bucket)

    def signed_upload_url(self, key: str) -> str:
        res = self._bucket.create_signed_upload_url(key)
        return res["signed_url"]

    def signed_download_url(self, key: str, expires: int = 3600) -> str:
        res = self._bucket.create_signed_url(key, expires)
        return res["signedURL"]

    def object_exists(self, key: str) -> bool:
        prefix, _, name = key.rpartition("/")
        listed = self._bucket.list(prefix)
        return any(item["name"] == name for item in listed)

    def delete_object(self, key: str) -> None:
        self._bucket.remove([key])


@lru_cache
def get_storage() -> StorageService:
    s = get_settings()
    client = create_client(s.supabase_url, s.supabase_service_key)
    return StorageService(client, s.storage_bucket)
