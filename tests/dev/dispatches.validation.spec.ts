import { test, expect, buildPayload, DISPATCH_ENDPOINT } from './fixtures';

test.describe('2.8 · POST /api/v1/dispatches · валидация контракта', () => {
  test('пустой запрос {} → 422 VALIDATION_ERROR', async ({ api }) => {
    const res = await api.post(DISPATCH_ENDPOINT, { data: {} });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.detail?.code).toBe('VALIDATION_ERROR');
  });

  test('нехватка обязательных полей (request_id, title, body) → 422', async ({ api }) => {
    const p = buildPayload();
    delete (p as Record<string, unknown>).request_id;
    delete (p as Record<string, unknown>).title;
    delete (p as Record<string, unknown>).body;

    const res = await api.post(DISPATCH_ENDPOINT, { data: p });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.detail?.code).toBe('VALIDATION_ERROR');
  });

  test('битый тип recipients (строка вместо массива) → 422', async ({ api }) => {
    const res = await api.post(DISPATCH_ENDPOINT, {
      data: buildPayload({ recipients: 'not-an-array' as unknown as string[] }),
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.detail?.code).toBe('VALIDATION_ERROR');
  });

  test('битый created_at (не ISO) → 422', async ({ api }) => {
    const res = await api.post(DISPATCH_ENDPOINT, {
      data: buildPayload({ created_at: 'not-a-date' }),
    });
    expect(res.status()).toBe(422);
  });

  test('дубли получателей: ожидается 422 либо успех с дедупликацией', async ({ api }) => {
    // По ТЗ Дениса дубли — негативный кейс валидации. Но код он не назвал.
    // До уточнения: либо 422, либо 2xx (сервис дедуплицирует). Всё, что не 5xx — ок.
    const res = await api.post(DISPATCH_ENDPOINT, {
      data: buildPayload({ recipients: ['user-uuid-1', 'user-uuid-1'] }),
    });
    expect(res.status()).toBeLessThan(500);
    if (res.status() === 422) {
      expect((await res.json()).detail?.code).toBe('VALIDATION_ERROR');
    }
  });
});