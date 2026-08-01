fetch('/api/debug', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: 'YOUR_SYNC_PASSWORD' })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)));
