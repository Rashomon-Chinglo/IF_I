# 人生IF线生成器 - 使用指南

## 项目简介

一个基于 AI 的平行宇宙人生故事生成器，根据你的真实人生状态，生成一个完全不同的 IF 线人生故事。

- **稳定人生**（已婚有娃+铁饭碗+有房）→ 生成**刺激冒险**的故事
- **漂泊人生**（单身+自由职业+租房）→ 生成**安稳顺遂**的故事

---

## 快速开始

### 1. 环境准备

确保已安装 **uv** 包管理器：

```bash
# 安装 uv（如果未安装）
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. 首次部署

```bash
# 克隆项目
git clone https://github.com/Rashomon-Chinglo/IF_I if_i
cd if_i

# 创建虚拟环境
~/.local/bin/uv venv

# 安装依赖
~/.local/bin/uv pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 API 配置
```

### 3. 配置环境变量

编辑 `.env` 文件：

```env
OPENAI_API_KEY="your-api-key-1"
OPENAI_BASE_URL=http://localhost:8317/v1
```

**注意**：需要先启动 8317 端口的 API 代理服务（cli2api）

---

## 服务管理

### 启动服务

```bash
# 开发模式（自动重载）
~/.local/bin/uv run uvicorn server:app --host 0.0.0.0 --port 8000 --reload

# 生产模式
~/.local/bin/uv run uvicorn server:app --host 0.0.0.0 --port 8000
```

### 停止服务

在运行服务的终端按 `Ctrl+C` 即可停止。

### 后台运行

```bash
# 使用 nohup 后台运行
nohup ~/.local/bin/uv run uvicorn server:app --host 0.0.0.0 --port 8000 > server.log 2>&1 &

# 查看日志
tail -f server.log

# 查找进程
ps aux | grep uvicorn

# 停止后台服务
kill <进程ID>
```

### 使用 systemd 管理（推荐）

创建服务文件 `/etc/systemd/system/if_i.service`：

```ini
[Unit]
Description=IF_I Life Story Generator
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/Project/if_i
Environment="PATH=/root/.local/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=/root/.local/bin/uv run uvicorn server:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

管理命令：

```bash
# 启动服务
systemctl start if_i

# 停止服务
systemctl stop if_i

# 重启服务
systemctl restart if_i

# 查看状态
systemctl status if_i

# 开机自启
systemctl enable if_i

# 查看日志
journalctl -u if_i -f
```

---

## 访问地址

- **本地访问**: http://localhost:8000
- **公网访问**: https://apps.rashomon.me/if_i/

---

## 技术栈

- **前端**: HTML + CSS + JavaScript
- **后端**: FastAPI + OpenAI SDK
- **包管理**: uv
- **AI 模型**: gemini-3-flash-preview (via cli2api)
- **反向代理**: Nginx

---

## 使用流程

1. **欢迎页** - 点击"开始探索"
2. **填写表单** - 4 步收集人生信息
3. **生成中** - AI 流式生成故事
4. **查看结果** - 阅读你的 IF 线人生

---

## 故障排查

### 问题：服务无法启动

**检查清单**：
1. ✅ 确认虚拟环境已创建（`.venv` 目录存在）
2. ✅ 确认依赖已安装（`~/.local/bin/uv pip list`）
3. ✅ 确认端口 8000 未被占用（`lsof -i :8000`）
4. ✅ 检查 `.env` 文件是否存在

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

### 问题：Nginx 404 错误

- ✅ 确保 Nginx 配置正确转发 `/if_i/` 路径到后端服务
- ✅ 完整 API 地址示例：`https://apps.rashomon.me/if_i/api/generate/stream`

---

## 开发说明

### 更新依赖

```bash
# 添加新依赖
~/.local/bin/uv pip install <package-name>

# 更新 requirements.txt
~/.local/bin/uv pip freeze > requirements.txt
```

### 代码修改

开发模式下（`--reload`），修改代码后服务会自动重启。

### 查看日志

```bash
# 如果使用 systemd
journalctl -u if_i -f

# 如果使用 nohup
tail -f server.log
```

---

## 许可证

MIT License
