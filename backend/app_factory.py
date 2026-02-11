"""FastAPI application factory."""

from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.templating import Jinja2Templates

from .config import Settings
from .models import LifeInfo
from .story_service import StoryService


def create_app(settings: Optional[Settings] = None) -> FastAPI:
    """Create and configure the FastAPI app instance."""

    app_settings = settings or Settings()
    story_service = StoryService(app_settings)
    templates = Jinja2Templates(directory="templates")
    app = FastAPI(title="人生IF线生成器")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.post("/api/generate")
    @app.post("/if_i/api/generate")
    async def generate_if_line(info: LifeInfo):
        """Generate a full IF-line story in one response."""

        try:
            return await story_service.generate_story(info)
        except Exception as exc:  # pragma: no cover - runtime safety
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    @app.post("/api/generate/stream")
    @app.post("/if_i/api/generate/stream")
    async def generate_if_line_stream(info: LifeInfo):
        """Generate IF-line story in streaming mode (SSE)."""

        async def generate():
            try:
                async for event in story_service.stream_story_events(info):
                    yield event
            except Exception as exc:
                yield story_service.build_sse({"type": "error", "message": str(exc)})

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    @app.get("/")
    async def serve_index(request: Request):
        return templates.TemplateResponse(request, "index.html")

    @app.get("/{file_path:path}")
    async def serve_static(request: Request, file_path: str):
        if file_path in app_settings.static_files:
            return FileResponse(file_path)
        return templates.TemplateResponse(request, "index.html")

    return app
