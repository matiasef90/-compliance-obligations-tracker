import base64

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://compliance:compliance@localhost:5432/compliance_db"
    allowed_origins: str = "http://localhost:3000"
    base_url: str = "http://localhost:8000"
    encryption_key: str

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def encryption_key_bytes(self) -> bytes:
        key = base64.b64decode(self.encryption_key)
        if len(key) != 32:
            raise ValueError(
                f"ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256); got {len(key)}"
            )
        return key


settings = Settings()
