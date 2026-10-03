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
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const img_b64 = buffer.toString('base64');
        return res.status(200).json({ status: 'success', image_base64: img_b64 });
      }
      return res.status(400).json({ status: 'error', message: '地图获取失败' });
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message });
    }
  }

  // default horosa endpoint
  if (req.method === 'POST') {
    try {
      // Dynamic import of mingyu-core
      const { generateResidentialFengshui } = await import('mingyu-core/residential-fengshui');
      const { heading, year, birthYear, gender } = req.body || {};
      
      const fengshuiInput = {
        facingDegree: heading,
        year: year || new Date().getFullYear(),
        // Default to magnetic north if heading comes from phone compass
        northReference: 'magnetic', 
        magneticDeclinationDegrees: 0 // Ideally this should be calculated from lat/lng
      };

      if (birthYear) fengshuiInput.birthYear = parseInt(birthYear);
      if (gender) fengshuiInput.gender = gender;

      const result = generateResidentialFengshui(fengshuiInput);
      
      return res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message, stack: err.stack });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
