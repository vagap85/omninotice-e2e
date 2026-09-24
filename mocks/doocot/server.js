import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const received = [];

app.post('/api/v1/dispatches', (req, res) => {
  const { request_id, channel, title, body, audience_type, recipient_ids } = req.body;

  if (!request_id || !channel) {
    return res.status(400).json({ error: 'Missing request_id or channel' });
  }

  const existing = received.find((r) => r.request_id === request_id);
  if (existing) {
    console.log(`[Doocot] Idempotent replay: ${request_id}`);
    return res.status(200).json(existing.response);
  }

  const response = {
    detail: { code: 'DISPATCH_ACCEPTED', request_id },
    accepted_at: new Date().toISOString(),
  };

  received.push({ request_id, channel, title, body, audience_type, recipient_ids, response });
  console.log(`[Doocot] Dispatch accepted: ${request_id}, audience=${audience_type}`);

  res.status(201).json(response);
});

app.get('/api/v1/dispatches', (_req, res) => {
  res.json({ dispatches: received, count: received.length });
});

app.post('/api/v1/dispatches/reset', (_req, res) => {
  received.length = 0;
  res.json({ status: 'reset' });
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`[Doocot mock] listening on :${PORT}`));