
import { kv } from '@vercel/kv';
import crypto from 'crypto';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const key = `expenses:${hashPassword(password)}`;
    const data = await kv.get(key);

    if (data === null) {
      return res.status(404).json({ error: 'No data found for this password' });
    }

    return res.status(200).json({ data });
  } catch (e) {
    console.error('KV load error:', e);
    return res.status(500).json({ error: 'Failed to load data' });
  }
}
