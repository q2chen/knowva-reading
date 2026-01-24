from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    google_cloud_project: str = "knowva-dev"
    use_emulator: bool = True
    firestore_emulator_host: str = "localhost:8080"
    firebase_auth_emulator_host: str = "localhost:9099"
    gemini_api_key: str = ""
    allowed_origins: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
