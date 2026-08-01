import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function safeParse(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch(e) { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required' });
  try {
    const key = `expenses:${hashPassword(password)}`;
    const raw = await redis.get(key);
    if (raw === null || raw === undefined) return res.status(404).json({ error: 'No data found for this password' });
    const parsed = safeParse(raw);
    if (!parsed) return res.status(500).json({ error: 'Data is corrupted' });
    const data = parsed.data || parsed;
    const savedAt = parsed.savedAt || 0;
    return res.status(200).json({ data, savedAt });
  } catch (e) {
    console.error('Redis load error:', e);
    return res.status(500).json({ error: 'Failed to load data', detail: e.message });
  }
}
