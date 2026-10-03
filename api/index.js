import geomagnetism from 'geomagnetism';

// 磁偏角缓存：同一位置短时间内的多次请求复用模型计算
const declinationCache = new Map();

/**
 * 按 WMM（世界地磁模型）计算指定坐标的磁偏角。
 * 返回值东偏为正、西偏为负，与 mingyu-core 的约定一致。
 */
function getDeclination(lat, lng) {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (declinationCache.has(cacheKey)) return declinationCache.get(cacheKey);
  const info = geomagnetism.model(new Date()).point([lat, lng]);
  if (!Number.isFinite(info.decl)) throw new Error('磁偏角计算失败，请检查经纬度。');
  declinationCache.set(cacheKey, info.decl);
  return info.decl;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 请求体大小防护：Vercel 函数体上限约 4.5MB，多轮图片历史可能累积超限
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > 8 * 1024 * 1024) {
    return res.status(413).json({ error: '请求体过大（>8MB），请点击🔄重新勘测以清空图片历史。' });
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (pathname === '/api/health' || pathname === '/health') {
    return res.status(200).json({ status: 'backend is alive with mingyu!' });
  }

  if (pathname === '/api/map') {
    const { lng, lat, gaode_key } = req.body || {};
    if (!lng || !lat || !gaode_key) return res.status(400).json({ error: 'Missing map params' });
    try {
      const url = `https://restapi.amap.com/v3/staticmap?location=${lng},${lat}&zoom=15&size=500*500&key=${gaode_key}`;
      const response = await fetch(url);
      const contentType = response.headers.get('content-type') || '';
      // 高德出错时返回 200 + JSON 错误体（如 INVALID_USER_KEY），必须按 content-type 区分
      if (response.ok && contentType.includes('image')) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const img_b64 = buffer.toString('base64');
        return res.status(200).json({ status: 'success', image_base64: img_b64 });
      }
      let detail = `HTTP ${response.status}`;
      try {
        const errBody = JSON.parse(await response.text());
        if (errBody.info) detail = errBody.info;
      } catch { /* 非 JSON 错误体 */ }
      return res.status(400).json({ status: 'error', message: `高德地图获取失败: ${detail}（请检查 Key 是否有效及是否开通静态地图服务）` });
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message });
    }
  }

  // AI 代理：浏览器统一请求 /api/ai，由服务端转发，规避浏览器 CORS 限制。
  // 请求体：{ provider, apiKey, payload }；响应原样透传上游 SSE 流。
  if (pathname === '/api/ai' && req.method === 'POST') {
    const { provider, apiKey, payload } = req.body || {};
    if (!provider || !apiKey || !payload) {
      return res.status(400).json({ error: 'Missing provider / apiKey / payload' });
    }
    let upstreamUrl, headers, body;
    if (provider === 'gemini') {
      upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(payload.model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
      headers = { 'Content-Type': 'application/json' };
      body = payload.body;
    } else if (provider === 'deepseek') {
      upstreamUrl = 'https://api.deepseek.com/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
      body = payload.body;
    } else if (provider === 'glm') {
      upstreamUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
      headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
      body = payload.body;
    } else {
      return res.status(400).json({ error: `未知 AI 提供商: ${provider}` });
    }
    try {
      const upstream = await fetch(upstreamUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      res.status(upstream.status);
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') res.flushHeaders();
      // 透传上游流式响应
      const reader = upstream.body.getReader();
      const pump = async () => {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      };
      await pump();
    } catch (e) {
      if (!res.headersSent) res.status(502).json({ error: `AI 上游请求失败: ${e.message}` });
      else res.end();
    }
    return;
  }

  // 堪舆排盘接口（mingyu-core：玄空飞星 + 八宅）
  if (pathname === '/api/horosa' && req.method === 'POST') {
    try {
      const { generateResidentialFengshui } = await import('mingyu-core/residential-fengshui');
      const { heading, northReference, lat, lng, year, flowYear, birthYear, birthMonth, birthDay, gender, uncertainty } = req.body || {};

      if (typeof heading !== 'number' || !Number.isFinite(heading) || heading < 0 || heading > 360) {
        return res.status(400).json({ status: 'error', message: '缺少有效的朝向角度 heading（0-360）。' });
      }
      if (!year || !Number.isFinite(Number(year))) {
        return res.status(400).json({
          status: 'error',
          message: '玄空排盘必须提供住宅建造年或起运年，请在设置中填写，不得以当前年份代替。',
        });
      }

      // 方位基准：地图拉线得到的是真北方位角；手机罗盘得到的是磁北方位角。
      const ref = northReference === 'true' ? 'true' : 'magnetic';
      const fengshuiInput = {
        facingDegree: heading,
        year: parseInt(year, 10),
        northReference: ref,
        measurementUncertaintyDegrees: Number.isFinite(Number(uncertainty)) ? Number(uncertainty) : 3,
      };

      if (ref === 'magnetic') {
        if (typeof lat !== 'number' || typeof lng !== 'number') {
          return res.status(400).json({
            status: 'error',
            message: '罗盘测向需要 GPS 坐标以计算当地磁偏角（不可硬编码为 0，否则坐向可偏差近 10°）。',
          });
        }
        fengshuiInput.magneticDeclinationDegrees = getDeclination(lat, lng);
      }

      if (birthYear) fengshuiInput.birthYear = parseInt(birthYear, 10);
      if (birthMonth) fengshuiInput.birthMonth = parseInt(birthMonth, 10);
      if (birthDay) fengshuiInput.birthDay = parseInt(birthDay, 10);
      if (flowYear && Number.isFinite(Number(flowYear))) fengshuiInput.flowYear = parseInt(flowYear, 10);
      if (gender) fengshuiInput.gender = gender;

      const result = generateResidentialFengshui(fengshuiInput);

      return res.status(200).json({
        status: 'success',
        meta: {
          northReference: ref,
          magneticDeclinationDegrees: fengshuiInput.magneticDeclinationDegrees ?? null,
        },
        data: result,
      });
    } catch (err) {
      // mingyu-core 的业务校验异常（如分界线重测提示）返回 400 与可读信息，而非 500
      return res.status(400).json({ status: 'error', message: err.message });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
