import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const logs = [];

const AUTH_USER = process.env.LETOPIS_USER || 'omninotice';
const AUTH_PASS = process.env.LETOPIS_PASS || 'secret';

function basicAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const [user, pass] = Buffer.from(encoded, 'base64').toString().split(':');
  if (user !== AUTH_USER || pass !== AUTH_PASS) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

app.post('/api/v1/records', basicAuth, (req, res) => {
  const { request_id, event_type, payload, timestamp } = req.body;

  if (!request_id || !event_type) {
    return res.status(400).json({ error: 'Missing request_id or event_type' });
  }

  const record = {
    id: `rec_${logs.length + 1}`,
    request_id,
    event_type,
    payload,
    timestamp: timestamp || new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  logs.push(record);
  console.log(`[Letopis] Record created: ${record.id} for ${request_id}`);

  res.status(201).json({ status: 'created', record_id: record.id });
});

app.get('/api/v1/records', basicAuth, (_req, res) => {
  res.json({ records: logs, count: logs.length });
});

app.post('/api/v1/records/reset', basicAuth, (_req, res) => {
  logs.length = 0;
  res.json({ status: 'reset' });
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => console.log(`[Letopis mock] listening on :${PORT}`));