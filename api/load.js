import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = Redis.fromEnv();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required' });
  try {
    const key = `expenses:${hashPassword(password)}`;
    const raw = await redis.get(key);
    if (raw === null) return res.status(404).json({ error: 'No data found for this password' });
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return res.status(200).json({ data });
  } catch (e) {
    console.error('Redis load error:', e);
    return res.status(500).json({ error: 'Failed to load data' });
  }
}
