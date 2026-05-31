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
  const { password, data } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required' });
  if (!data) return res.status(400).json({ error: 'Data is required' });
  try {
    const key = `expenses:${hashPassword(password)}`;
    const savedAt = Date.now();
    await redis.set(key, JSON.stringify({ data, savedAt }));
    return res.status(200).json({ ok: true, savedAt });
  } catch (e) {
    console.error('Redis save error:', e);
    return res.status(500).json({ error: 'Failed to save data', detail: e.message });
  }
}
