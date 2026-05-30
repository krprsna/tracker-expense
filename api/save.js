import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = Redis.fromEnv();

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
    await redis.set(key, JSON.stringify(data));
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Redis save error:', e);
    return res.status(500).json({ error: 'Failed to save data' });
  }
}
