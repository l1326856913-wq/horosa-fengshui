import math
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Horosa FengShui AR Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HorosaRequest(BaseModel):
    heading: float
    year: int = 2024

# 二十四山 (从壬开始，中心点为 345度)
M24 = ["壬", "子", "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳", 
       "丙", "午", "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥"]

# 八卦与八宅映射
BAGUA = ["坎", "艮", "震", "巽", "离", "坤", "兑", "乾"]
EAST_GROUP = ["坎", "震", "巽", "离"]

def calculate_fengshui(heading: float, year: int):
    """
    真正的风水理气核心算法引擎：
    1. 计算二十四山与坐向
    2. 计算正向（下卦）与兼向（替卦）
    3. 八宅明镜派判定
    """
    # 修正度数在 0-360 之间
    heading = heading % 360
    
    # 1. 计算二十四山向首 (Facing)
    # 壬山的范围是 337.5 - 352.5。通过 +22.5 将壬山的起点移到 0
    facing_idx = int(((heading + 22.5) % 360) / 15)
    facing_mountain = M24[facing_idx]
    
    # 2. 计算坐山 (Sitting) - 与向首差 180 度 (即 12 个山)
    sitting_idx = (facing_idx + 12) % 24
    sitting_mountain = M24[sitting_idx]
    
    # 3. 判定正向与兼向 (下卦 vs 替卦)
    # 每一个山的中心度数
    mountain_center = (facing_idx * 15 - 15) % 360
    diff = abs(heading - mountain_center)
    if diff > 180: 
        diff = 360 - diff
        
    # 中心左右 4.5 度内为下卦（正向），之外为替卦（兼向）
    direction_type = "正向（下卦）" if diff <= 4.5 else f"兼向（替卦，偏离中心 {round(diff, 1)}°）"
    
    # 4. 八宅派计算
    # 坐山决定了宅卦。每三个山对应一个卦 (坎0,1,2 -> 艮3,4,5 ...)
    trigram_idx = int(sitting_idx / 3)
    sitting_gua = BAGUA[trigram_idx]
    mansion_type = f"{sitting_gua}宅 ({'东四宅' if sitting_gua in EAST_GROUP else '西四宅'})"
    
    # 5. 三元九运计算
    period = 9 if 2024 <= year <= 2043 else (8 if 2004 <= year <= 2023 else 1)

    return {
        "status": "success",
        "data": {
            "compass_degree": round(heading, 2),
            "sitting_facing": f"{sitting_mountain}山{facing_mountain}向",
            "precision": direction_type,
            "eight_mansions": mansion_type,
            "time_period": f"下元{period}运"
        }
    }

@app.post("/api/horosa")
async def get_horosa_endpoint(request: HorosaRequest):
    return calculate_fengshui(request.heading, request.year)

class MapProxyRequest(BaseModel):
    lng: float
    lat: float
    gaode_key: str

@app.post("/api/map")
async def fetch_map_proxy(request: MapProxyRequest):
    """
    代理获取高德静态地图，转为 Base64 传给前端，
    以此绕过浏览器的 Canvas CORS 跨域污染限制。
    """
    import httpx
    import base64
    url = f"https://restapi.amap.com/v3/staticmap?location={request.lng},{request.lat}&zoom=15&size=500*500&key={request.gaode_key}"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                img_b64 = base64.b64encode(resp.content).decode('utf-8')
                return {"status": "success", "image_base64": img_b64}
            else:
                return {"status": "error", "message": "地图获取失败"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
