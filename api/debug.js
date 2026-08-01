import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required' });
  try {
    const hash = hashPassword(password);

    // Check meta key
    const metaRaw = await redis.get(`backupmeta:${hash}`);
    const metaType = typeof metaRaw;
    const metaIsArray = Array.isArray(metaRaw);

    // Get dates
    let dates = [];
    if (Array.isArray(metaRaw)) dates = metaRaw;
    else if (typeof metaRaw === 'string') {
      try { dates = JSON.parse(metaRaw); } catch(e) { dates = []; }
    }

    // Check first backup key if any
    let backupInfo = null;
    if (dates.length > 0) {
      const firstDate = dates[0];
      const backupRaw = await redis.get(`backup:${hash}:${firstDate}`);
      const backupType = typeof backupRaw;
      const backupIsObj = typeof backupRaw === 'object' && backupRaw !== null;
      let backupKeys = null;
      if (backupIsObj) backupKeys = Object.keys(backupRaw);
      let backupStrPreview = null;
      if (typeof backupRaw === 'string') backupStrPreview = backupRaw.slice(0, 200);
      backupInfo = { date: firstDate, type: backupType, isObject: backupIsObj, keys: backupKeys, strPreview: backupStrPreview };
    }

    return res.status(200).json({
      hash: hash.slice(0, 8) + '...',
      meta: { type: metaType, isArray: metaIsArray, value: metaRaw },
      dates,
      firstBackup: backupInfo
    });
  } catch(e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
