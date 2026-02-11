"""人生IF线生成器 - 后端服务入口。"""

from backend import create_app

app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
