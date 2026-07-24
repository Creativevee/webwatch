from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent  # project root, one level above backend/


class Settings(BaseSettings):
    abuseipdb_api_key: str = ""
    openai_api_key: str = ""

    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "phi3:mini"

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    database_url: str = "sqlite:///./webwatch.db"

    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
