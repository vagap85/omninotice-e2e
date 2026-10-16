import { test, expect, buildPayload, DISPATCH_ENDPOINT } from './fixtures';

test.describe('2.8 · POST /api/v1/dispatches · авторизация', () => {
  test('без токена вообще (пустой delegated_token, нет Authorization) → 401', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL ?? 'https://vishenka.skroy.ru',
    });

    const res = await ctx.post(DISPATCH_ENDPOINT, {
      data: buildPayload({ delegated_token: '' }),
    });
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('мусорный токен → 422 FAILED / TOKEN_INCORRECT (сервис оборачивает 401 от Doocot)', async ({ api }) => {
    const res = await api.post(DISPATCH_ENDPOINT, {
      data: buildPayload({ delegated_token: 'obviously-not-a-jwt' }),
    });

    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.detail?.code).toBe('FAILED');
    expect(String(body.detail?.message ?? '')).toMatch(/Doocot|TOKEN_INCORRECT|401/i);
  });
});