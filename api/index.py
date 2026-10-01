import asyncio
import json
import os
import subprocess
from typing import AsyncGenerator
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure you have installed: fastapi uvicorn openai google-generativeai

app = FastAPI(title="Horosa FengShui AR Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded image string")
    heading: float = Field(..., description="Compass heading (0-360)")
    year: int = Field(default=2024, description="Current year for flying stars calculation")
    ai_provider: str = Field(default="gemini", description="AI Provider: gemini, deepseek, glm")

# 阶段3：精细化 System Instruction 设计
SYSTEM_INSTRUCTION = """
你是一位通晓中国传统堪舆学（三元玄空飞星派、八宅明镜派、形势峦头学）的当代建筑环境学大师。
系统会将摄像头的实时图像与通过专业引擎【horosa-skill】精密计算得到的【理气排盘数据】同时输入给你。
你的分析必须严格遵循“峦头为体，理气为用，体用结合”的原则：
1. 严禁篡改或臆测理气数据：九运旺衰、坐向飞星、生旺退煞必须 100% 依据传入的 horosa 数据，不得自行推算飞星。
2. 视觉深度解析（峦头）：
   - 仔细审视图像中的空间结构：是否有横梁压顶、门冲、尖角冲射、缺角。
   - 观察向首（窗户/大门）的采光、视线与室外环境（水体、道路、遮挡）。
3. 峦理合参：
   - 将视觉看到的实物与飞星宫位对应（例如：画面正前方的窗户正逢向星九紫，为当旺财星到向，见开扬明堂主吉）。
4. 语言风格：
   - 专业典雅，融合经典术语（如“向首飞星”、“零正得宜”、“避凶趋吉”），但解释必须通俗易懂，符合现代人居健康与室内设计美学，避免封建迷信色彩。
"""

def get_horosa_data(heading: float, year: int) -> dict:
    """
    阶段1：集成 horosa-skill，通过 Subprocess 调用计算理气排盘数据
    """
    try:
        # 调用假想的 horosa-skill CLI
        result = subprocess.run(
            ["horosa-skill", "calc", "--heading", str(heading), "--year", str(year), "--format", "json"],
            capture_output=True,
            text=True,
            check=True
        )
        return json.loads(result.stdout)
    except FileNotFoundError:
        # 如果未安装CLI，返回Mock数据确保流程畅通
        return {
            "twenty_four_mountains": "子山午向" if 157.5 <= heading < 202.5 else "未知坐向",
            "direction_type": "正向（下卦）",
            "flying_stars": "九紫当令，向星九紫到向",
            "eight_mansions": "延年吉位"
        }
    except Exception as e:
        return {"error": str(e)}

async def stream_gemini(image_b64: str, horosa_data: dict) -> AsyncGenerator[str, None]:
    import google.generativeai as genai
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        yield "data: {\"error\": \"GEMINI_API_KEY 未设置\"}\n\n"
        return

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-pro', system_instruction=SYSTEM_INSTRUCTION)
    
    prompt = f"理气排盘数据：\n{json.dumps(horosa_data, ensure_ascii=False, indent=2)}\n\n请结合图片中的环境峦头与上述理气数据，给出具体的吉凶研判与实用的现代布局/化煞建议。"
    
    image_part = {
        "mime_type": "image/jpeg",
        "data": image_b64
    }
    
    try:
        response = await asyncio.to_thread(
            model.generate_content,
            [prompt, image_part],
            stream=True
        )
        for chunk in response:
            if chunk.text:
                data = json.dumps({"text": chunk.text})
                yield f"data: {data}\n\n"
    except Exception as e:
        yield f"data: {{\"error\": \"Gemini Error: {str(e)}\"}}\n\n"

async def stream_openai_compatible(provider: str, api_key_env: str, base_url: str, model_name: str, image_b64: str, horosa_data: dict) -> AsyncGenerator[str, None]:
    from openai import AsyncOpenAI
    api_key = os.environ.get(api_key_env)
    if not api_key:
        yield f"data: {{\"error\": \"{api_key_env} 未设置\"}}\n\n"
        return

    client = AsyncOpenAI(api_key=api_key, base_url=base_url)
    prompt = f"理气排盘数据：\n{json.dumps(horosa_data, ensure_ascii=False, indent=2)}\n\n请结合图片中的环境峦头与上述理气数据，给出具体的吉凶研判与实用的现代布局/化煞建议。"
    
    messages = [
        {"role": "system", "content": SYSTEM_INSTRUCTION},
        {"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
        ]}
    ]

    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=messages,
            stream=True
        )
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                data = json.dumps({"text": chunk.choices[0].delta.content})
                yield f"data: {data}\n\n"
    except Exception as e:
        yield f"data: {{\"error\": \"{provider.capitalize()} Error: {str(e)}\"}}\n\n"

async def stream_deepseek(image_b64: str, horosa_data: dict) -> AsyncGenerator[str, None]:
    # DeepSeek 兼容接口调用
    async for chunk in stream_openai_compatible(
        provider="deepseek",
        api_key_env="DEEPSEEK_API_KEY",
        base_url="https://api.deepseek.com/v1",
        model_name="deepseek-chat", # 请替换为深空支持视觉的最新模型名
        image_b64=image_b64,
        horosa_data=horosa_data
    ):
        yield chunk

async def stream_glm(image_b64: str, horosa_data: dict) -> AsyncGenerator[str, None]:
    # 智谱 GLM 兼容接口调用 (GLM-4V 支持视觉)
    async for chunk in stream_openai_compatible(
        provider="glm",
        api_key_env="ZHIPU_API_KEY",
        base_url="https://open.bigmodel.cn/api/paas/v4",
        model_name="glm-4v",
        image_b64=image_b64,
        horosa_data=horosa_data
    ):
        yield chunk

@app.post("/api/analyze")
async def analyze_endpoint(request: AnalyzeRequest):
    horosa_data = get_horosa_data(request.heading, request.year)
    
    img_b64 = request.image_base64
    if img_b64.startswith("data:image"):
        img_b64 = img_b64.split(",")[1]
        
    async def event_generator():
        if request.ai_provider == "gemini":
            async for chunk in stream_gemini(img_b64, horosa_data):
                yield chunk
        elif request.ai_provider == "deepseek":
            async for chunk in stream_deepseek(img_b64, horosa_data):
                yield chunk
        elif request.ai_provider == "glm":
            async for chunk in stream_glm(img_b64, horosa_data):
                yield chunk
        else:
            yield f"data: {{\"error\": \"不支持的 AI 模型: {request.ai_provider}\"}}\n\n"
        
        yield "data: [DONE]\n\n"
        
    return StreamingResponse(event_generator(), media_type="text/event-stream")
