from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    supabase_url: str
    supabase_service_key: str
    jwt_secret: str
    jwt_access_ttl_min: int = 15
    jwt_refresh_ttl_days: int = 7
    storage_bucket: str = "user-files"

    # AI (Mistral) — optional; features degrade gracefully when key is unset.
    mistral_api_key: str | None = None
    mistral_base_url: str = "https://api.mistral.ai"
    mistral_embed_model: str = "mistral-embed"
    mistral_chat_model: str = "mistral-large-latest"

    # Deployment / hardening
    cors_origins: str = ""
    cookie_secure: bool = False
    cookie_samesite: str = "lax"


@lru_cache
def get_settings() -> Settings:
    return Settings()
