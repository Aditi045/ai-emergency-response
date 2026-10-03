import os
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ResQIntel AI"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    TAGLINE: str = "From scattered emergency signals to coordinated action."
    
    # Environment & Host
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    
    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "resqintel-super-secure-production-jwt-secret-key-vit-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: Optional[str] = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite+aiosqlite:///./resqintel.db"
    )
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Storage
    STORAGE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage"))
    MAX_UPLOAD_SIZE_MB: int = 50
    
    # Providers (with automatic resilient fallback)
    MAP_PROVIDER: str = os.getenv("MAP_PROVIDER", "leaflet_osm")
    GEOCODING_PROVIDER: str = os.getenv("GEOCODING_PROVIDER", "nominatim")
    ROUTING_PROVIDER: str = os.getenv("ROUTING_PROVIDER", "osrm")
    WEATHER_PROVIDER: str = os.getenv("WEATHER_PROVIDER", "open_meteo")
    WEATHER_API_KEY: Optional[str] = os.getenv("WEATHER_API_KEY", "")
    
    # AI Engine Provider
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "resqintel_multimodal_engine")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")
    
    # Genuine Computer Vision (Ultralytics YOLO)
    VISION_PROVIDER: str = os.getenv("VISION_PROVIDER", "local")
    VISION_MODEL_PATH: str = os.getenv("VISION_MODEL_PATH", "yolov8n.pt")
    VISION_CONFIDENCE_THRESHOLD: float = float(os.getenv("VISION_CONFIDENCE_THRESHOLD", "0.25"))

    # Genuine Speech-to-Text (faster-whisper)
    SPEECH_PROVIDER: str = os.getenv("SPEECH_PROVIDER", "local")
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")
    WHISPER_DEVICE: str = os.getenv("WHISPER_DEVICE", "cpu")
    WHISPER_COMPUTE_TYPE: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "uploads"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "reports"), exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "models"), exist_ok=True)
