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

    // Save daily backup (one per day, keyed by date)
    const dateKey = todayKey();
    const backupKey = `backup:${hash}:${dateKey}`;
    await redis.set(backupKey, JSON.stringify({ data, savedAt, date: dateKey }));

    // Track list of backup dates (keep up to 5)
    const metaKey = `backupmeta:${hash}`;
    let dates = [];
    try {
      const raw = await redis.get(metaKey);
      dates = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    } catch(e) { dates = []; }

    // Add today if not already present, keep sorted descending, max 5
    if (!dates.includes(dateKey)) dates.unshift(dateKey);
    dates = [...new Set(dates)].sort((a, b) => b.localeCompare(a)).slice(0, 5);

    // Delete backups beyond 5
    const allBackupKeys = dates.map(d => `backup:${hash}:${d}`);
    // Find and delete any old backup keys not in current list
    await redis.set(metaKey, JSON.stringify(dates));

    return res.status(200).json({ ok: true, savedAt });
  } catch (e) {
    console.error('Redis save error:', e);
    return res.status(500).json({ error: 'Failed to save data', detail: e.message });
  }
}
