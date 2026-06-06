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
  const { password, date } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required' });
  if (!date) return res.status(400).json({ error: 'Date is required' });
  // Validate date format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date format' });
  try {
    const hash = hashPassword(password);
    const backupKey = `backup:${hash}:${date}`;
    const raw = await redis.get(backupKey);
    if (!raw) return res.status(404).json({ error: `No backup found for ${date}` });
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return res.status(200).json({ data: parsed.data, date: parsed.date, savedAt: parsed.savedAt });
  } catch(e) {
    console.error('Restore error:', e);
    return res.status(500).json({ error: 'Failed to restore backup', detail: e.message });
  }
}
