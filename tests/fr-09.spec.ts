import { test, expect, request } from '@playwright/test';

const SINORA_URL = 'http://localhost:4001';
const DOOCOT_URL = 'http://localhost:4002';
const LETOPIS_URL = 'http://localhost:4003';

const LETOPIS_AUTH = 'Basic ' + Buffer.from('omninotice:secret').toString('base64');

test.describe('FR-09: Sinora → Doocot → Letopis', () => {
  test.beforeEach(async () => {
    const api = await request.newContext();
    await api.post(`${SINORA_URL}/api/v1/events/reset`);
    await api.post(`${DOOCOT_URL}/api/v1/dispatches/reset`);
    await api.post(`${LETOPIS_URL}/api/v1/records/reset`, {
      headers: { Authorization: LETOPIS_AUTH },
    });
    await api.dispose();
  });

  test('полный happy path: событие принято, доставлено, залогировано', async () => {
    const api = await request.newContext();
    const eventId = `evt_${Date.now()}`;
    const requestId = `req_${Date.now()}`;

    const sinoraRes = await api.post(`${SINORA_URL}/api/v1/events`, {
      data: {
        event_id: eventId,
        type: 'notification.request',
        payload: {
          request_id: requestId,
          channel: 'popup',
          title: 'Test notification',
          body: 'Hello from E2E',
          audience_type: 'all',
          recipient_ids: [],
        },
      },
    });
    expect(sinoraRes.status()).toBe(202);

    const doocotRes = await api.post(`${DOOCOT_URL}/api/v1/dispatches`, {
      data: {
        request_id: requestId,
        channel: 'popup',
        title: 'Test notification',
        body: 'Hello from E2E',
        audience_type: 'all',
        recipient_ids: [],
      },
    });
    expect(doocotRes.status()).toBe(201);

    const letopisRes = await api.post(`${LETOPIS_URL}/api/v1/records`, {
      headers: { Authorization: LETOPIS_AUTH },
      data: {
        request_id: requestId,
        event_type: 'notification.delivered',
        payload: { channel: 'popup', status: 'ok' },
      },
    });
    expect(letopisRes.status()).toBe(201);

    const sinoraEvents = await (await api.get(`${SINORA_URL}/api/v1/events`)).json();
    expect(sinoraEvents.count).toBe(1);
    expect(sinoraEvents.events[0].event_id).toBe(eventId);

    const doocotDispatches = await (await api.get(`${DOOCOT_URL}/api/v1/dispatches`)).json();
    expect(doocotDispatches.count).toBe(1);
    expect(doocotDispatches.dispatches[0].request_id).toBe(requestId);

    const letopisRecords = await (
      await api.get(`${LETOPIS_URL}/api/v1/records`, {
        headers: { Authorization: LETOPIS_AUTH },
      })
    ).json();
    expect(letopisRecords.count).toBe(1);
    expect(letopisRecords.records[0].request_id).toBe(requestId);

    await api.dispose();
  });

  test('валидация контракта: битое событие отклонено', async () => {
    const api = await request.newContext();

    const res = await api.post(`${SINORA_URL}/api/v1/events`, {
      data: { type: 'notification.request' },
    });
    expect(res.status()).toBe(400);

    const res2 = await api.post(`${SINORA_URL}/api/v1/events`, {
      data: { event_id: 'evt_x', type: 'unknown.type', payload: {} },
    });
    expect(res2.status()).toBe(422);

    await api.dispose();
  });

  test('идемпотентность: повторный dispatch не дублируется', async () => {
    const api = await request.newContext();
    const requestId = `req_idempotent_${Date.now()}`;

    const payload = {
      request_id: requestId,
      channel: 'popup',
      title: 'Idempotent test',
      body: 'Same request',
      audience_type: 'all',
      recipient_ids: [],
    };

    const first = await api.post(`${DOOCOT_URL}/api/v1/dispatches`, { data: payload });
    expect(first.status()).toBe(201);

    const second = await api.post(`${DOOCOT_URL}/api/v1/dispatches`, { data: payload });
    expect(second.status()).toBe(200);

    const all = await (await api.get(`${DOOCOT_URL}/api/v1/dispatches`)).json();
    expect(all.count).toBe(1);

    await api.dispose();
  });

  test('Летопись: Basic Auth защищает запись', async () => {
    const api = await request.newContext();

    const noAuth = await api.post(`${LETOPIS_URL}/api/v1/records`, {
      data: { request_id: 'req_x', event_type: 'test' },
    });
    expect(noAuth.status()).toBe(401);

    const wrongAuth = await api.post(`${LETOPIS_URL}/api/v1/records`, {
      headers: {
        Authorization: 'Basic ' + Buffer.from('wrong:creds').toString('base64'),
      },
      data: { request_id: 'req_x', event_type: 'test' },
    });
    expect(wrongAuth.status()).toBe(403);

    const okAuth = await api.post(`${LETOPIS_URL}/api/v1/records`, {
      headers: { Authorization: LETOPIS_AUTH },
      data: { request_id: 'req_x', event_type: 'test' },
    });
    expect(okAuth.status()).toBe(201);

    await api.dispose();
  });

  test('чанкованная доставка: несколько чанков для individual', async () => {
    const api = await request.newContext();
    const requestId = `req_chunk_${Date.now()}`;

    const chunks = [
      { chunk: 1, recipients: ['u1', 'u2', 'u3'] },
      { chunk: 2, recipients: ['u4', 'u5'] },
    ];

    for (const c of chunks) {
      const res = await api.post(`${DOOCOT_URL}/api/v1/dispatches`, {
        data: {
          request_id: `${requestId}_c${c.chunk}`,
          channel: 'popup',
          title: 'Chunked',
          body: `Chunk ${c.chunk}`,
          audience_type: 'selected',
          recipient_ids: c.recipients,
        },
      });
      expect(res.status()).toBe(201);
    }

    const all = await (await api.get(`${DOOCOT_URL}/api/v1/dispatches`)).json();
    expect(all.count).toBe(2);
    expect(all.dispatches[0].recipient_ids).toEqual(['u1', 'u2', 'u3']);
    expect(all.dispatches[1].recipient_ids).toEqual(['u4', 'u5']);

    await api.dispose();
  });
});