import { test, expect, buildPayload, DISPATCH_ENDPOINT } from './fixtures';

test.describe('2.8 · POST /api/v1/dispatches · идемпотентность', () => {
  test('повторный request_id → 200 и already_applied=true', async ({ api }) => {
    const p = buildPayload();

    const first = await api.post(DISPATCH_ENDPOINT, { data: p });
    console.log('[idem repeat] first status:', first.status());
    console.log('[idem repeat] first body:', await first.text());

    await new Promise((r) => setTimeout(r, 150));

    const second = await api.post(DISPATCH_ENDPOINT, { data: p });
    console.log('[idem repeat] second status:', second.status());
    const secondText = await second.text();
    console.log('[idem repeat] second body:', secondText);

    expect(second.status()).toBe(200);

    const body = JSON.parse(secondText);
    const alreadyApplied =
      body.data?.already_applied === true ||
      body.already_applied === true ||
      body.detail?.already_applied === true;

    expect(alreadyApplied).toBe(true);
    expect(body.data?.status).toBe('replayed');
  });

  test('разные request_id → оба проходят (не идемпотентность)', async ({ api }) => {
    const p1 = buildPayload();
    const p2 = buildPayload();

    console.log('[idem diff] p1.request_id =', p1.request_id);
    console.log('[idem diff] p2.request_id =', p2.request_id);
    console.log('[idem diff] request_ids equal?', p1.request_id === p2.request_id);

    const first = await api.post(DISPATCH_ENDPOINT, { data: p1 });
    console.log('[idem diff] first status:', first.status());
    console.log('[idem diff] first body:', await first.text());

    const second = await api.post(DISPATCH_ENDPOINT, { data: p2 });
    console.log('[idem diff] second status:', second.status());
    const secondText = await second.text();
    console.log('[idem diff] second body:', secondText);

    expect([200, 201, 202]).toContain(first.status());
    expect([200, 201, 202]).toContain(second.status());

    const secondBody = JSON.parse(secondText);
    const applied =
      secondBody.data?.already_applied === true ||
      secondBody.already_applied === true;

    expect(applied).not.toBe(true);
  });
});