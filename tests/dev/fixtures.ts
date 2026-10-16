import { test as base, request, type APIRequestContext } from '@playwright/test';

export const DISPATCH_ENDPOINT = '/api/v1/dispatches';

/**
 * Проверяет, что токен структурно является JWT:
 * - 3 части, разделённые точкой
 * - header непустой, декодируется в JSON с полем "alg"
 */
function assertValidJwt(token: string, label = 'delegated_token'): void {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error(`${label}: JWT должен иметь 3 части, найдено ${parts.length}`);
  }
  if (!parts[0]) {
    throw new Error(
      `${label}: JWT начинается с точки — пустой header. ` +
      `Похоже, usercenter собирает токен неправильно.`
    );
  }
  let header: string;
  try {
    header = Buffer.from(parts[0].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  } catch {
    throw new Error(`${label}: header не декодируется как base64: ${parts[0].slice(0, 40)}`);
  }
  if (!header.startsWith('{') || !/"alg"\s*:/.test(header)) {
    throw new Error(`${label}: header не является JWT-header: ${header.slice(0, 60)}`);
  }
}

/**
 * Счётчик для генерации уникальных суффиксов.
 * Без него два вызова buildPayload подряд в одну миллисекунду дают
 * одинаковый Date.now() → одинаковый request_id → сервер возвращает
 * already_applied: true (баг 16.10.2026, найден в E2E).
 */
let __seq = 0;
function uniqueSuffix(): string {
  __seq += 1;
  return `${Date.now()}-${__seq}-${Math.random().toString(36).slice(2, 8)}`;
}

export type DispatchPayload = {
  request_id: string;
  event_id: string;
  event_code: string;
  application_id: string;
  account_id: string;
  delegated_token: string;
  recipients: string[];
  title: string;
  body: string;
  created_at: string;
};

export function buildPayload(over: Partial<DispatchPayload> = {}): DispatchPayload {
  const token = process.env.DELEGATED_TOKEN ?? '';

  if (token && token !== 'test-token' && !token.startsWith('obviously-')) {
    assertValidJwt(token);
  }

  const suffix = uniqueSuffix();
  return {
    request_id: `req-e2e-${suffix}`,
    event_id: `evt-e2e-${suffix}`,
    event_code: 'cherry_note_v1',
    application_id: 'omninotice',
    account_id: process.env.REAL_ACCOUNT_ID ?? 'none',
    delegated_token: token || 'test-token',
    recipients: [process.env.REAL_USER_ID ?? '9c4e2f5a-1115-4b7e-83fd-8eb64e4383b2'],
    title: 'Тестовое уведомление',
    body: 'Проверка сценария 2.8',
    created_at: new Date().toISOString(),
    ...over,
  };
}

type Fixtures = { api: APIRequestContext };

export const test = base.extend<Fixtures>({
  api: async ({}, use) => {
    const ctx = await request.newContext({
      baseURL: process.env.BASE_URL ?? 'https://vishenka.skroy.ru',
      extraHTTPHeaders: process.env.AUTH_HEADER
        ? { Authorization: process.env.AUTH_HEADER }
        : {},
    });
    await use(ctx);
    await ctx.dispose();
  },
});

export { expect } from '@playwright/test';