import { request, FullConfig } from '@playwright/test';

export default async function globalSetup(_config: FullConfig) {
  const login = process.env.DAV_LOGIN;
  const password = process.env.DAV_PASSWORD;

  if (!login || !password) {
    console.warn('[global-setup] DAV_LOGIN / DAV_PASSWORD не заданы — пропускаю авто-логин');
    return;
  }

  console.log('[global-setup] Логинюсь в usercenter…');
  const api = await request.newContext();
  const res = await api.post('https://api.users.skroy.ru/auth/login', {
    form: {
      login,
      password,
      // Возможно, нужны project-id, user-agent — см. headers из Network
    },
    headers: {
      'project-id': '092a3e5a-c341-472b-abc3-245d4445b944',
      'origin': 'https://omni.skroy.ru',
      'referer': 'https://omni.skroy.ru/',
    },
  });

  if (!res.ok()) {
    throw new Error(`[global-setup] login failed: ${res.status()} ${await res.text()}`);
  }

  const body = await res.json();
  const token = body?.data?.[0]?.access_token;
  if (!token || token.length < 100) {
    throw new Error(`[global-setup] access_token не получен: ${JSON.stringify(body).slice(0, 300)}`);
  }

  console.log(`[global-setup] OK, token len = ${token.length}`);
  process.env.DELEGATED_TOKEN = token;
  await api.dispose();
}