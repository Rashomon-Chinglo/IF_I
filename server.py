"""
人生IF线生成器 - 后端服务
使用 FastAPI + OpenAI 兼容 API
"""

import os

from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

import json
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from openai import OpenAI
from pydantic import BaseModel

app = FastAPI(title="人生IF线生成器")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI 客户端配置
client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "your-api-key"),
    base_url=os.getenv("OPENAI_BASE_URL", "http://localhost:8317/v1"),
)

MODEL_NAME = "gemini-3-flash-preview"


class LifeInfo(BaseModel):
    """用户人生信息"""

    nickname: str
    age: int
    gender: str
    city: str
    relationship: str  # single, dating, married, complicated
    hasKids: str  # yes, no
    occupation: str
    jobStability: str  # stable, moderate, freelance, unstable
    housing: str  # owned, renting, living_with_parents
    lifestyle: str  # regular, balanced, chaotic
    lifeDesc: str
    dream: Optional[str] = ""


def analyze_life_type(info: LifeInfo) -> tuple[str, int]:
    """
    分析用户人生类型
    返回: (类型名称, 稳定分数)
    分数越高越稳定，越低越动荡
    """
    score = 0

    # 感情状态 (0-25分)
    relationship_scores = {
        "married": 25,
        "dating": 15,
        "single": 5,
        "complicated": 0,
    }
    score += relationship_scores.get(info.relationship, 10)

    # 有孩子 +15分
    if info.hasKids == "yes":
        score += 15

    # 工作稳定性 (0-25分)
    job_scores = {
        "stable": 25,
        "moderate": 15,
        "freelance": 5,
        "unstable": 0,
    }
    score += job_scores.get(info.jobStability, 10)

    # 住房 (0-20分)
    housing_scores = {
        "owned": 20,
        "living_with_parents": 10,
        "renting": 5,
    }
    score += housing_scores.get(info.housing, 10)

    # 生活节奏 (0-15分)
    lifestyle_scores = {
        "regular": 15,
        "balanced": 10,
        "chaotic": 0,
    }
    score += lifestyle_scores.get(info.lifestyle, 5)

    # 判定类型
    if score >= 60:
        return ("稳定型", score)
    elif score >= 35:
        return ("中间型", score)
    else:
        return ("漂泊型", score)


def build_prompt(info: LifeInfo, life_type: str, score: int) -> str:
    """构建 AI Prompt"""

    gender_text = {"male": "男", "female": "女", "other": "其他"}.get(info.gender, "")
    relationship_text = {
        "single": "单身",
        "dating": "恋爱中",
        "married": "已婚",
        "complicated": "感情复杂",
    }.get(info.relationship, "")
    kids_text = "有孩子" if info.hasKids == "yes" else "没有孩子"
    job_text = {
        "stable": "铁饭碗/大厂",
        "moderate": "普通稳定工作",
        "freelance": "自由职业",
        "unstable": "工作动荡",
    }.get(info.jobStability, "")
    housing_text = {
        "owned": "有房",
        "renting": "租房",
        "living_with_parents": "和父母住",
    }.get(info.housing, "")
    lifestyle_text = {
        "regular": "规律养生",
        "balanced": "比较平衡",
        "chaotic": "熬夜随性",
    }.get(info.lifestyle, "")

    # 根据人生类型决定IF线方向
    if life_type == "稳定型":
        if_direction = """
这个人的现实生活非常稳定顺遂，因此你要为TA生成一个【刺激、跌宕起伏、充满冒险】的IF线人生：
- 可能是创业、艺术、冒险、留学、gap year、自由职业等非主流选择
- 可能经历过感情的起伏波折
- 生活充满不确定性但也充满可能性
- 有过失败和挫折，但也有独特的收获和成长
"""
    else:
        if_direction = """
这个人的现实生活比较动荡不安，因此你要为TA生成一个【安稳、顺遂、符合传统"老中"观念】的IF线人生：
- 可能是稳定的体制内工作、大厂、教师、医生等
- 有稳定的感情和家庭
- 在一个城市定居，有房有车
- 生活规律，有健康的作息
- 有平凡但温馨的日常
"""

    dream_hint = f"\n\n用户曾经想过但没实现的梦想：{info.dream}" if info.dream else ""

    prompt = f"""你是一个平行宇宙的叙述者，擅长用生动、细腻、有画面感的语言讲述另一条世界线的人生故事。

## 用户当前世界线的信息

- 昵称：{info.nickname}
- 年龄：{info.age}岁
- 性别：{gender_text}
- 所在城市：{info.city}
- 感情状态：{relationship_text}，{kids_text}
- 职业：{info.occupation}
- 工作稳定性：{job_text}
- 住房情况：{housing_text}
- 生活节奏：{lifestyle_text}
- 生活描述：{info.lifeDesc}{dream_hint}

## 用户的人生类型分析

当前世界线类型：{life_type}（稳定指数：{score}/100）

{if_direction}

## 输出要求

请为 {info.nickname} 生成一段 IF 线人生故事：

1. **开头**：用一个戏剧性的分歧点开始，比如"如果当年你选择了..."或"在那个平行宇宙里..."
2. **中间**：详细描述这条IF线上的人生轨迹，包括：
   - 职业发展（具体的工作、收入、城市）
   - 感情生活（具体的人、故事）
   - 日常生活（住在哪、做什么、周末怎么过）
   - 特别的经历或转折点
3. **结尾**：用一个有画面感的场景收尾，描述IF线上的TA现在正在做什么

要求：
- 用第二人称"你"来叙述
- 语言要生动、有细节、有画面感，像朋友在描述另一个你的故事
- 故事要符合中国社会背景
- 不要太长，控制在 400-600 字
- 适当加入一些具体的细节（城市地名、年份、数字等）让故事更真实
- 语气可以带点调侃和幽默

直接输出故事内容，不要有任何前缀说明。"""

    return prompt


@app.post("/api/generate")
async def generate_if_line(info: LifeInfo):
    """生成 IF 线故事"""
    try:
        # 分析人生类型
        life_type, score = analyze_life_type(info)

        # 构建 prompt
        prompt = build_prompt(info, life_type, score)

        # 调用 AI
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.9,
            max_tokens=1500,
        )

        story = response.choices[0].message.content

        return {
            "success": True,
            "life_type": life_type,
            "stability_score": score,
            "story": story,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate/stream")
async def generate_if_line_stream(info: LifeInfo):
    """流式生成 IF 线故事"""

    async def generate():
        try:
            # 分析人生类型
            life_type, score = analyze_life_type(info)

            # 先返回分析结果
            yield f"data: {json.dumps({'type': 'analysis', 'life_type': life_type, 'stability_score': score})}\n\n"

            # 构建 prompt
            prompt = build_prompt(info, life_type, score)

            # 流式调用 AI
            stream = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.9,
                max_tokens=1500,
                stream=True,
            )

            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


# 静态文件服务
@app.get("/")
async def serve_index():
    return FileResponse("index.html")


@app.get("/{file_path:path}")
async def serve_static(file_path: str):
    if file_path in ["styles.css", "app.js"]:
        return FileResponse(file_path)
    return FileResponse("index.html")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
