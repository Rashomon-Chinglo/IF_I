"""Application configuration and environment loading."""

import os
from dataclasses import dataclass
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    """Runtime configuration loaded from environment variables."""

    openai_api_key: str = os.getenv("OPENAI_API_KEY", "").strip()
    openai_base_url: Optional[str] = os.getenv("OPENAI_BASE_URL", "").strip() or None
    model_name: str = os.getenv("MODEL_NAME", "gemini-3-flash-preview")
    static_files: tuple[str, ...] = (
        "styles.css",
        "app.js",
        "html2canvas.min.js",
        "frontend/bootstrap.js",
        "frontend/constants.js",
        "frontend/state.js",
        "frontend/utils/dom.js",
        "frontend/ui/toast.js",
        "frontend/features/stars.js",
        "frontend/features/navigation.js",
        "frontend/features/story.js",
        "frontend/features/form.js",
        "frontend/features/share.js",
    )
