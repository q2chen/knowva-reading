import os
from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    google_cloud_project: str = "knowva-dev"
    use_emulator: bool = True
    firestore_emulator_host: str = "localhost:8080"
    firebase_auth_emulator_host: str = "localhost:9099"
    google_api_key: str = ""
    google_books_api_key: str = ""  # Google Books API用（空の場合はAPIキーなしで呼び出し）
    google_genai_use_vertexai: str = "FALSE"
    allowed_origins: Union[str, List[str]] = "http://localhost:3000"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    @field_validator("allowed_origins", mode="after")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


settings = Settings()

# ADKが参照する環境変数を設定
if settings.google_api_key:
    os.environ.setdefault("GOOGLE_API_KEY", settings.google_api_key)
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", settings.google_genai_use_vertexai)
