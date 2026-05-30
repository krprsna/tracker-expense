
import { kv } from '@vercel/kv';
import crypto from 'crypto';

// Hash the password so the raw password is never stored in KV
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password, data } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  if (!data) {
    return res.status(400).json({ error: 'Data is required' });
  }

  try {
    const key = `expenses:${hashPassword(password)}`;
    await kv.set(key, data);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('KV save error:', e);
    return res.status(500).json({ error: 'Failed to save data' });
  }
}
