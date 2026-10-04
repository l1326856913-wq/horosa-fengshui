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

/**
 * 玄空运界按立春换算（第二阶段加固第 8 项）。
 *
 * 背景：mingyu-core 的 resolveXuanKongPeriod(year) 按公历年整年切分三元九运，
 * 引擎自身在 @soul-atelier/core/period.ts 的注释里承认这是近似——
 * 「the boundary is technically 立春 of the start year, not Jan 1」。
 * 于是每年 1 月 1 日 ~ 立春（约 34 天）建造的房子会被判入下一运，
 * 而同项目的八宅命卦却严格按立春判定，造成两套时间标准自相矛盾。
 *
 * 本函数不修改依赖包（AGPL 传染 + node_modules 不可入库），
 * 而是在调用引擎前把传入年份修正到正确的运界，并把判定依据显式返回给前端。
 *
 * @param {number} year  用户填写的建造年
 * @param {number|null} month 建造月（1-12），缺省则不修正
 * @param {number|null} day   建造日（1-31），缺省则不修正
 * @returns {Promise<{year:number, adjusted:boolean, lichunBoundary:boolean, note:string|null}>}
 */
async function resolvePeriodByLichun(year, month, day) {
  const hasFullDate = Number.isFinite(Number(month)) && Number.isFinite(Number(day));
  if (!hasFullDate) {
    return {
      year,
      adjusted: false,
      lichunBoundary: false,
      note: '未提供建造月日，运界按公历年判定。若住宅建于 1 月 1 日至立春之间（约占每年 34 天），可能被误判入下一运，请补填建造月日。',
    };
  }
  // 动态导入 tyme4ts（mingyu-core 的八宅模块已依赖它，此处复用同一份天文算法）
  const { SolarTerm } = await import('tyme4ts');
  const m = Number(month);
  const d = Number(day);
  // SolarTerm.fromIndex(year, 3) === 该年立春（0=冬至, 1=大寒, 2=雨水, 3=立春）
  const lichun = SolarTerm.fromIndex(year, 3).getJulianDay().getSolarTime();
  const beforeLichun = m < lichun.getMonth() || (m === lichun.getMonth() && d < lichun.getDay());
  // 立春当日按已过立春处理：时刻极精确，日期粒度无法区分当天早晚，故取保守（归本运）口径
  const note = `运界已按立春换算：${year} 年立春为 ${lichun.getMonth()}月${lichun.getDay()}日 `
    + `${String(lichun.getHour()).padStart(2, '0')}:${String(lichun.getMinute()).padStart(2, '0')}:${String(lichun.getSecond()).padStart(2, '0')}，`
    + `所填 ${year}-${m}-${d} ${beforeLichun ? '早于立春，仍属' : '晚于立春，已属'} ${beforeLichun ? year - 1 : year} 年运界。`;
  if (!beforeLichun) {
    return { year, adjusted: false, lichunBoundary: true, note };
  }
  return { year: year - 1, adjusted: true, lichunBoundary: true, note };
}


/**
 * 紫白流年盘按立春换年校正。
 *
 * 背景：引擎 `resolveYearFlyingStar(year)` 内部走 `SixtyCycleYear.fromYear(year)`，
 * 只接受年份参数，而干支年本身以立春换界（实测 fromYear(2024) 返回甲辰年而非甲子年）。
 * 结果是每年 1/1 至立春之间（约 34 天）所排流年盘错一星：
 *   实测 2026-01-15 —— 现状给一白（丙午年），立春 2026-02-04 04:02 前应仍为
 *   乙巳年二黑。此错与已修复的运界缺陷同源，若不同步修正，同一张盘会出现两套时间标准。
 *
 * 引擎在同时给出 flowYear + flowMonth + flowDay 时会走节气年路径
 * （resolveXuanKongFlowStars → monthPlate.solarTermYear），该路径本身是正确的，
 * 因此这里只需补齐月日；不补月日则保持公历年行为并显式告警。
 */
async function resolveFlowYearByLichun(year, month, day) {
  const hasFullDate = Number.isFinite(Number(month)) && Number.isFinite(Number(day));
  if (!hasFullDate) {
    return {
      year,
      month: undefined,
      day: undefined,
      adjusted: false,
      note: '未提供流年参照月日，流年盘按公历年干支判定。若所填年份为当年且勘测日期在 1 月 1 日至立春之间（约占每年 34 天），流年入中星可能错一星，可补填流年参照月日消除此误差。',
    };
  }
  const { SolarTerm } = await import('tyme4ts');
  const m = Number(month);
  const d = Number(day);
  const lichun = SolarTerm.fromIndex(year, 3).getJulianDay().getSolarTime();
  const beforeLichun = m < lichun.getMonth() || (m === lichun.getMonth() && d < lichun.getDay());
  // 与运界修正保持同一保守口径：立春当日按已过立春处理（日期粒度无法区分当天早晚）
  const note = `流年盘已按立春换算：${year} 年立春为 ${lichun.getMonth()}月${lichun.getDay()}日 `
    + `${String(lichun.getHour()).padStart(2, '0')}:${String(lichun.getMinute()).padStart(2, '0')}:${String(lichun.getSecond()).padStart(2, '0')}，`
    + `所填 ${year}-${m}-${d} ${beforeLichun ? '早于立春，仍属' : '晚于立春，已属'} ${beforeLichun ? year - 1 : year} 年干支。`;
  // 不改写 year：引擎节气年路径会自行取 solarTermYear 回退，此处只补月日
  return { year, month: m, day: d, adjusted: beforeLichun, note };
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

  // 请求体大小防护。
  // Vercel Serverless 函数体上限约 4.5MB（硬上限，平台层先于本函数拒绝），
  // 因此本守卫必须设在 4MB 以内才有效——原先设为 8MB 时永远不会被触发。
  // 多轮补拍的 base64 图片历史会累积：720px JPEG q0.8 单帧约 110KB，3 轮 24 帧约 2.6MB。
  const MAX_BODY_BYTES = 4 * 1024 * 1024;
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_BODY_BYTES) {
    const msg = '请求体过大（上限 4MB，多轮补拍的图片会累积）。请点击🔄重新勘测以清空图片历史，或减少补拍轮次。';
    // 同时给出 error 与 status/message，兼容 /api/ai（读 error）与 /api/horosa（读 message）两种消费方
    return res.status(413).json({ status: 'error', error: msg, message: msg });
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
      const { heading, northReference, lat, lng, year, flowYear, flowMonth, flowDay, birthYear, birthMonth, birthDay, gender, uncertainty, houseMonth, houseDay } = req.body || {};

      if (typeof heading !== 'number' || !Number.isFinite(heading) || heading < 0 || heading > 360) {
        return res.status(400).json({ status: 'error', message: '缺少有效的朝向角度 heading（0-360）。' });
      }
      if (!year || !Number.isFinite(Number(year))) {
        return res.status(400).json({
          status: 'error',
          message: '玄空排盘必须提供住宅建造年或起运年，请在设置中填写，不得以当前年份代替。',
        });
      }

      // 【第二阶段第 8 项】玄空运界按立春换算：引擎按公历年切分三元九运，
      // 若住宅建于 1/1~立春之间会被误判入下一运（整盘运星、顺逆、局型、城门全错）。
      // 此处先把年份修正到正确运界，再交给引擎。
      const requestedYear = parseInt(year, 10);
      const period = await resolvePeriodByLichun(requestedYear, houseMonth, houseDay);
      const effectiveYear = period.year;

      // 方位基准：地图拉线得到的是真北方位角；手机罗盘得到的是磁北方位角。
      const ref = northReference === 'true' ? 'true' : 'magnetic';
      const fengshuiInput = {
        facingDegree: heading,
        year: effectiveYear,
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

      // 【第三阶段第 1 项】紫白流年盘按立春换年。
      // 引擎只收年份时走公历干支年，而干支年以立春换界，导致 1/1~立春期间流年星错一星，
      // 与上方已按立春修正的运界口径自相矛盾。补齐参照月日即走引擎节气年路径（该路径本身正确）。
      let flowMeta = null;
      if (flowYear && Number.isFinite(Number(flowYear))) {
        const requestedFlowYear = parseInt(flowYear, 10);
        const flow = await resolveFlowYearByLichun(requestedFlowYear, flowMonth, flowDay);
        fengshuiInput.flowYear = requestedFlowYear;
        if (flow.month !== undefined) {
          fengshuiInput.flowMonth = flow.month;
          fengshuiInput.flowDay = flow.day;
        }
        flowMeta = {
          requestedFlowYear,
          flowYearAdjustedByLichun: flow.adjusted,
          flowYearBoundaryNote: flow.note,
        };
      }
      if (gender) fengshuiInput.gender = gender;

      const result = generateResidentialFengshui(fengshuiInput);

      // 【第二阶段第 10 项】把引擎的测量不确定性与口径声明透出到 meta，
      // 由前端 enginePanel 展示。此前 enginePanel 不读 hData.measurement，
      // 导致引擎诚实给出的"距分界仅 X°，可能为 A/B 两条山"被完全丢弃。
      const measurement = result?.xuankong?.measurement ?? null;
      const bazhaiMeasurement = result?.bazhai?.directionMeasurement ?? null;

      return res.status(200).json({
        status: 'success',
        meta: {
          northReference: ref,
          magneticDeclinationDegrees: fengshuiInput.magneticDeclinationDegrees ?? null,
          // 运界口径（第二阶段第 8 项）
          requestedHouseYear: requestedYear,
          effectiveHouseYear: effectiveYear,
          periodAdjustedByLichun: period.adjusted,
          periodBoundaryNote: period.note,
          // 流年口径（第三阶段第 1 项）：与运界同为立春换年标准
          ...(flowMeta || {}),
          // 命卦口径声明（第二阶段第 9 项）：
          // 引擎用"年份除九取余 + 11/4"，与民间"数字和法"结果半数不同，
          // 不声明会让用户无法与别处对照，也无法判断结论出自哪一派。
          mingGuaMethod: {
            method: 'year-mod-9（男 11−余数 / 女 4+余数，五黄男寄坤、女寄艮）',
            sourceNote: 'mingyu-core 采用年份除九取余配十一/四法，与部分流派使用的"数字和法"结果不同；本结果仅代表本引擎口径。',
          },
          // 测量不确定性（第二阶段第 10 项）
          measurement: measurement
            ? {
                sitDegree: measurement.sitDegree ?? null,
                uncertaintyDegrees: fengshuiInput.measurementUncertaintyDegrees,
                stability: measurement.stability ?? null,
                nearestBoundaryDistanceDegrees: measurement.nearestBoundaryDistanceDegrees ?? null,
                candidateMountains: measurement.candidateMountains ?? null,
                warnings: measurement.warnings ?? null,
              }
            : null,
          bazhaiMeasurement: bazhaiMeasurement
            ? {
                houseGua: bazhaiMeasurement.houseGua ?? null,
                stability: bazhaiMeasurement.stability ?? null,
                candidateHouseGua: bazhaiMeasurement.candidateHouseGua ?? bazhaiMeasurement.candidateMountains ?? null,
                warnings: bazhaiMeasurement.warnings ?? null,
              }
            : null,
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
