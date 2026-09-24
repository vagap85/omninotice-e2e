# OmniNotice E2E — FR-09

[![E2E Tests](https://github.com/vagap85/omninotice-e2e/actions/workflows/e2e.yml/badge.svg)](https://github.com/vagap85/omninotice-e2e/actions/workflows/e2e.yml)

# OmniNotice E2E — FR-09

E2E-тесты для сценария **«Приём события от Синоры и доставка уведомления в Doocot, с записью лога в сервис Журнал (Летопись)»**.

Пока SSH-секреты для DEV-стенда не получены (SUPPORT-210), тесты работают **на заглушках (моках)** — три Express-сервера эмулируют внешние сервисы.

## Стек

- **Playwright** — E2E и API-тесты
- **Express** — мок-серверы
- **Node 22** — рантайм

## Структура

- `mocks/sinora` — источник событий (принимает и валидирует)
- `mocks/doocot` — получатель уведомлений (Голубиная почта)
- `mocks/letopis` — журнал (Летопись), Basic Auth

## Запуск

```bash
npm install
npx playwright install chromium
npm test

## HTML - Отсчёт https://yadi.sk/d/3Si0pfGpVOSxyQ
