# OmniNotice E2E

E2E-тесты для проверки интеграции OmniNotice с внешними сервисами.

## Что покрыто тестами

### FR-09 — Sinora → Doocot → Letopis (моки)
Сценарий «Приём события от Синоры и доставка уведомления в Doocot, с записью лога в сервис Журнал (Летопись)».
Работает на заглушках (3 Express-сервера эмулируют внешние сервисы). Тесты изолированы и работают без доступа к DEV.

### 2.8 — POST /api/v1/dispatches (живой DEV-стенд)
Тестирование эндпоинта отправки уведомлений против боевого Doocot.
Все тесты написаны для DEV-стенда `https://vishenka.skroy.ru`.

**Статус на 16.10.2026:** `10 passed / 2 skipped / 0 failed`. 
- ✅ Валидация контракта (5 кейсов) — `422 VALIDATION_ERROR`.
- ✅ Авторизация — `401` без токена, `422 FAILED / TOKEN_INCORRECT` на мусорный.
- ✅ Идемпотентность — повтор → `200 already_applied=true`, разные → `201 accepted`.
- ✅ Лимит получателей — `5001` получатель → `4xx` (бизнес-лимит 5000).
- 🚫 **Skipped:** чанкование 501/1000 — упирается в `ReadTimeout` Doocot (Баг B-6, ждём фикс Дениса).

---

## Стек
- **Playwright** — E2E и API-тесты.
- **Express** — мок-серверы.
- **Node 22** — рантайм.
- **dotenv** — чтение конфигурации из `.env.<TARGET>`.

---

## Структура
.github/workflows — CI (GitHub Actions)
mocks/
sinora/ — источник событий (принимает и валидирует)
doocot/ — получатель уведомлений
letopis/ — журнал (Летопись), Basic Auth
tests/
mocks/ — FR-09 на заглушках (5 тестов)
dev/ — E2E 2.8 против живого vishenka.skroy.ru (12 тестов)
fixtures.ts — assertValidJwt, buildPayload
dispatches.validation.spec.ts
dispatches.auth.spec.ts
dispatches.idempotency.spec.ts
dispatches.chunking.spec.ts
scripts/ — запуск моков (start-mocks.js)
playwright.config.ts
.env.dev.example — шаблон для DEV-конфига

text

---

## Запуск

### 1. Установка
```bash
npm install
npx playwright install chromium
2. Тесты на моках (FR-09)
Не требуют сети и токенов. Покрывают приём, доставку и логирование.

bash
npm run test:mocks
Ожидаемо: 5 passed.

3. Тесты на DEV (2.8)
Требуют .env.dev с живым JWT (см. ниже). Два варианта:

Чанкование 501/1000 сейчас в skip — упёрлись в ReadTimeout Doocot (баг B-6). Ждём фикс.

Если нужно прогнать всё, кроме skip — просто npm run test:dev.

Как настроить .env.dev (важно)
JWT от usercenter живёт ~2 часа. Если токен протухнет, тесты упадут с TOKEN_EXPIRED.

Скопируй шаблон:

bash
cp .env.dev.example .env.dev
Открой OmniNotice в браузере, залогинься под нужным пользователем.

DevTools → Console → выполни:

js
copy(JSON.parse(localStorage.getItem('usercenter_auth')).accessToken)
Вставь токен в .env.dev после DELEGATED_TOKEN= (без кавычек, без Bearer).

Проверь, что токен подхватился:

bash
npx playwright test --project=dev --list
# В выводе должно быть: [config] DELEGATED_TOKEN len = ~1000
.env.dev — в .gitignore. Никогда не коммить его.

Известные ограничения и баги
🚨 Блокер: Doocot ReadTimeout на чанк 500 юзеров (B-6)
Симптом:

text
503 SERVICE_UNAVAILABLE
{"detail":{"code":"SERVICE_UNAVAILABLE","message":"Doocot недоступен: ReadTimeout: "}}
Через 41s ≈ 2×20s (501/1000 получателей). Признак последовательной, а не параллельной отправки чанков в вишенке.
Статус: в работе у Дениса. Тесты chunking 501/1000 временно skip.

🟠 InMemoryIdempotencyStore без внешнего хранилища (B-4)
Стор в памяти процесса (SQLite /tmp), не distributed.

Если у вишенки несколько воркеров — каждый со своим стором → нестабильно 201 vs 200.

Для прода нужен Redis. Оговорка зафиксирована.

На DEV исправлено: TTL + strict matching + межпроцессный стор (Денис, 16.10.2026).

🟡 Doocot падает на невалидный JWT (B-5)
Битый JWT → UnicodeEncodeError → 503 (вместо 400/401). Вишенка транслирует в 503 SERVICE_UNAVAILABLE.
Рекомендация: валидировать JWT до логирования, логгер в UTF-8, не писать сырой JWT в логи.

🔴 usercenter отдаёт битый JWT (B-1)
localStorage.usercenter_auth.accessToken иногда приходит структурно битым: начинается с точки, header склеен с payload. Doocot это отвергает.
Workaround: обновить токен (перелогиниться), иногда проблема исчезает.

⏳ TTL токена ~2 часа
Для локальных прогонов — обновлять вручную. Для CI/CD нужен сервисный токен с длинным TTL (вопрос Денису).

Полезные команды
bash
# Обычный прогон на моках
npm run test:mocks

# Прогон на DEV (требует .env.dev)
npm run test:dev

# Полный прогон: mocks + dev
npm run test:all

# Посмотреть список тестов без запуска
npx playwright test --project=dev --list

# Открыть HTML-отчёт
npx playwright show-report

# Запустить только один файл
npx playwright test --project=dev tests/dev/dispatches.idempotency.spec.ts
CI
Настроен через GitHub Actions (.github/workflows):

На push в main: прогон тестов на моках (npm run test:mocks).

Для DEV: пока не настроен — нужен сервисный токен usercenter с TTL > 1 дня. Задача в бэклоге.

Контакты
Разработчик вишенки (backend): Денис — вопросы по логике, PROJECT_ID, чанкованию, идемпотентности.

DevOps: x-devops-telegram @salixtein (из headers login) — вопросы по nginx и инфраструктуре.

QA: Евгений