import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered WhatsApp Conversation Assistant"
    API_V1_STR: str = "/api/v1"
    
    # Database configuration (defaults to SQLite async for seamless local testing, PostgreSQL supported)
    DATABASE_URL: str = "sqlite+aiosqlite:///./whatsapp_ai.db"
    
    # Auth Security
    SECRET_KEY: str = "supersecret_jwt_key_sunfi_ai_whatsapp_assistant_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = "sk-placeholder-key"
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Google Gemini API Configuration (Higher Free Rate Limits & 1M+ Token Context)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"
    
    # WhatsApp Cloud API Configuration
    WHATSAPP_ACCESS_TOKEN: str = "placeholder_whatsapp_access_token"
    WHATSAPP_PHONE_NUMBER_ID: str = "placeholder_phone_number_id"
    WHATSAPP_VERIFY_TOKEN: str = "sunfi_whatsapp_verify_token_2026"
    WHATSAPP_API_VERSION: str = "v22.0"  # Configurable Graph API version
    
    # Frontend URL for CORS
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
