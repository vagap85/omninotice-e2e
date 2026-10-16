import { test, expect, buildPayload, DISPATCH_ENDPOINT } from './fixtures';

test.describe('2.8 · POST /api/v1/dispatches · чанкование', () => {
  test.describe.configure({ timeout: 180_000 });

  // BLOCKED (16.10.2026): Doocot ReadTimeout на чанк 500 юзеров.
  // 41s ≈ 2×20s — похоже, чанки идут последовательно, параллельность не сработала.
  // Ждём фикс Дениса.
  test.skip(true, 'BLOCKED: Doocot ReadTimeout — ждём фикса Дениса');

  test('501 получатель → сервис нарезает по 500, ответ 2xx', async ({ api }) => {
    const recipients = Array.from({ length: 501 }, (_, i) => `user-uuid-${i}`);
    const res = await api.post(DISPATCH_ENDPOINT, {
      data: buildPayload({ recipients }),
    });
    expect([200, 201, 202]).toContain(res.status());
  });

  test('1000 получателей — лимит DEV E2E', async ({ api }) => {
    const recipients = Array.from({ length: 1000 }, (_, i) => `user-uuid-${i}`);
    const res = await api.post(DISPATCH_ENDPOINT, {
      data: buildPayload({ recipients }),
    });
    expect([200, 201, 202]).toContain(res.status());
  });
});

test.describe('2.8 · POST /api/v1/dispatches · лимит получателей', () => {
  test('5001 получатель — превышение бизнес-лимита (5000), ожидается 4xx', async ({ api }) => {
    const recipients = Array.from({ length: 5001 }, (_, i) => `user-uuid-${i}`);
    const res = await api.post(DISPATCH_ENDPOINT, {
      data: buildPayload({ recipients }),
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});