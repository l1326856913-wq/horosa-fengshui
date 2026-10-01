# Horosa FengShui AR

这是一个实时风水堪舆系统的完整原型项目，基于 Python FastAPI 和原生 iOS PWA 构建。

## 目录结构

```
horosa-fengshui/
├── backend/
│   ├── main.py            # FastAPI 服务端，集成 Gemini/Deepseek/GLM 及 horosa-skill 引擎
│   └── requirements.txt   # 后端依赖
└── frontend/
    ├── index.html         # iOS PWA 响应式前端与 AR 界面
    └── manifest.json      # PWA 配置文件
```

## 运行方式

### 1. 启动后端

```bash
cd backend
pip install -r requirements.txt

# 设置对应 API 密钥 (根据你选择的模型)
export GEMINI_API_KEY="your_api_key"
export DEEPSEEK_API_KEY="your_api_key"
export ZHIPU_API_KEY="your_api_key"

# 启动服务
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. 启动前端

```bash
cd frontend
# 运行一个本地服务器，例如使用 python 的 http.server
python -m http.server 8080
```

*注意：要获取手机摄像头与罗盘权限，如果不是 localhost 访问，必须使用 HTTPS 环境（可以通过 ngrok 代理暴露服务）。*

## 核心实现
1. **阶段1：后端中间件** - `backend/main.py` 实现了通过 Subprocess 调用 `horosa-skill` 进行理气排盘。
2. **阶段2：iOS PWA** - `frontend/index.html` 实现了 `<video>` 获取摄像头流、EMA 滤波解决罗盘抖动、停顿 1.5 秒抽帧、以及科技玄学暗黑风格 AR HUD。
3. **阶段3：精细化指令** - 在 `backend/main.py` 中内置了 `SYSTEM_INSTRUCTION` 并同时集成了 Gemini 3.1 Pro、DeepSeek、GLM-4V 的流式分析接口。
