# 人生IF线生成器 - 使用指南

## 快速开始

### 1. 启动服务

```bash
cd /home/rashomon/projects/IF_I
python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### 2. 访问应用

浏览器打开：**http://localhost:8000**

---

## 环境配置

确保 `.env` 文件配置正确：

```env
OPENAI_API_KEY="your-api-key-1"
OPENAI_BASE_URL=http://localhost:8317/v1
```

**注意**：需要先启动 8317 端口的 API 代理服务（cli2api）

---

## 使用流程

1. **欢迎页** - 点击"开始探索"
2. **填写表单** - 4 步收集人生信息
3. **生成中** - AI 流式生成故事
4. **查看结果** - 阅读你的 IF 线人生

---

## 核心玩法

- **稳定人生**（已婚有娃+铁饭碗+有房）→ 生成**刺激冒险**的故事
- **漂泊人生**（单身+自由职业+租房）→ 生成**安稳顺遂**的故事

---

## 技术栈

- **前端**: HTML + CSS + JavaScript
- **后端**: FastAPI + OpenAI SDK
- **AI**: gemini-3-flash-preview (via cli2api)

---

## 故障排查

### 问题：没有生成文字

**检查清单**：
1. ✅ 8317 端口 API 服务是否启动
2. ✅ `.env` 文件是否正确配置
3. ✅ 浏览器 F12 查看 Network 请求是否有错误

**测试 API**：
```bash
curl -s http://localhost:8317/v1/chat/completions \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{"model":"gemini-3-flash-preview","messages":[{"role":"user","content":"你好"}]}'
```

应该返回包含 "你好" 的 JSON 响应。
