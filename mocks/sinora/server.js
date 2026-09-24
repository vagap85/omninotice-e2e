import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const events = [];

app.post('/api/v1/events', (req, res) => {
  const { event_id, type, payload } = req.body;

  if (!event_id || !type || !payload) {
    return res.status(400).json({
      error: 'Invalid contract',
      required: ['event_id', 'type', 'payload'],
    });
  }

  if (type !== 'notification.request') {
    return res.status(422).json({ error: 'Unsupported event type' });
  }

  events.push({ event_id, type, payload, received_at: new Date().toISOString() });
  console.log(`[Sinora] Event received: ${event_id}`);

  res.status(202).json({ status: 'accepted', event_id });
});

app.get('/api/v1/events', (_req, res) => {
  res.json({ events, count: events.length });
});

app.post('/api/v1/events/reset', (_req, res) => {
  events.length = 0;
  res.json({ status: 'reset' });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`[Sinora mock] listening on :${PORT}`));