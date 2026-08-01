import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function safeParse(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch(e) { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { password, data } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required' });
  if (!data) return res.status(400).json({ error: 'Data is required' });
  try {
    const hash = hashPassword(password);
    const savedAt = Date.now();

    // Save main data
    await redis.set(`expenses:${hash}`, JSON.stringify({ data, savedAt }));

    // Save daily backup
    const dateKey = todayKey();
    await redis.set(`backup:${hash}:${dateKey}`, JSON.stringify({ data, savedAt, date: dateKey }));

    // Update backup date list (max 5)
    const metaKey = `backupmeta:${hash}`;
    const raw = await redis.get(metaKey);
    let dates = safeParse(raw);
    dates = Array.isArray(dates) ? dates : [];
    if (!dates.includes(dateKey)) dates.unshift(dateKey);
    dates = [...new Set(dates)].sort((a, b) => b.localeCompare(a)).slice(0, 5);
    await redis.set(metaKey, JSON.stringify(dates));

    return res.status(200).json({ ok: true, savedAt });
  } catch (e) {
    console.error('Redis save error:', e);
    return res.status(500).json({ error: 'Failed to save data', detail: e.message });
  }
}
