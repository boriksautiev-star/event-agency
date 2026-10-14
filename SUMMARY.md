# Саммари проекта Event Agency (обновлено 2026-10-14, вечер)

## 🎯 Что это

Приложение для управления ивент-агентством. Три роли: **director, admin, animator**. Self-hosted (свой Windows Server). Три клиента:
- **server** — Express API + PostgreSQL
- **mobile** — RN / Expo SDK 57 (dev-client)
- **admin-web** — React 19 + Vite + TanStack Query + Tailwind + Radix

Монорепо: `D:\Projects\event-agency` (workspaces: shared, server, admin-web, mobile)

## 🖥️ Окружение

- Windows Server 2022, Node v24.19.0, PostgreSQL 18.4
- PM2: `event-agency-api` (id 10, fork), порт **3100**
- БД: `event_agency` / `event` / `eventagency2026strong`
- Health: `curl.exe http://localhost:3100/api/health`
- Timezone: Russian Standard Time (UTC+3, Москва)
- Мобилка `API_URL = http://192.168.1.133:3100` (**без** `/api`, пути с `/api/...`)
- Admin-web: Vite dev `http://localhost:5173`, proxy `/api` → :3100
- Metro: `npx expo start --dev-client --host lan` (из `mobile/`)
- **ОСТОРОЖНО:** другой проект — IronAds (порт 3001, cluster, id 1-6) — НЕ трогать

## 🗄️ Стек

- **server:** TS + Express + Prisma + PostgreSQL
- **mobile:** RN + Expo + React Navigation + axios + material-top-tabs + react-native-safe-area-context
- **admin-web:** Vite + React 19 + TS + React Router v7 + axios + TanStack Query + Tailwind + Radix + lucide-react
- **shared:** роли, права, статусы, типы, ставки (`RATE_DURATIONS = [30,40,45,60,90,120,180]`, `formatDuration`, `getEffectiveDurations`)

## 🔐 Учётные записи (seed)

- Директор: `+79001234567 / superpassword123` (Иван Иванов)
- Админ: `+79002223344 / adminpass123` (Ольга Петрова)
- Аниматор: `+79007778899 / animpass123` (Анна Сидорова)
- Аниматор: `+79005556677 / animpass123` (Пётр Кузнецов)

⚠️ **UUID пользователей МЕНЯЮТСЯ после каждого `db:seed`** — не хардкодить, получать через SELECT/логин.

Seed полностью чистит БД: `cd server && npm run db:seed` (перед — `pm2 stop`, после — `pm2 start`).

Seed содержит: AgencySettings, AdminCompensation 7%, 2 клиента, 6 групп, 14 персонажей с ценами, 2 персональных шаблона ставок (Анна 34, Пётр 34), 6 категорий расходов, 5 демо-заказов, AdminAccrual 1575 + AdminPayment 500.

Cleanup в seed (порядок важен): `handoverRequest`, `orderChange`, `orderStatusHistory`, `orderPayment`, `orderAnimator`, `orderSlot`, `order`, `expense`, `expenseCategory`, `characterPriceOption`, `character`, `rateTemplateRate`, `rateTemplate`, `animatorRateOverride`, `rateGroup`, `client`, `refreshToken`, `user`, `appSetting`, `adminPayment`, `adminAccrual`, `adminCompensation`, `agencySettings`.

## 📁 Модели БД

**Заказы:** User, Client, RateGroup, Character, CharacterPriceOption, Order, OrderSlot, OrderAnimator, OrderPayment, OrderStatusHistory, OrderChange, AgencySettings, AdminCompensation, AdminAccrual, AdminPayment

**Release reasons:** enum `ReleaseReason: declined | handed_over | removed_rotation | removed_quality | order_cancelled`; `OrderAnimator.{releaseReason, releaseComment, releasedAt}`

**Handover:** enum `HandoverRequestStatus: pending_receiver | pending_approval | approved | rejected_by_receiver | rejected_by_admin | cancelled`; модель `HandoverRequest` (id, orderId, slotId, fromAnimatorId, toAnimatorId, comment, status, requestedAt, acceptedAt, resolvedAt, resolvedBy, rejectComment)

**Rate Templates:** `RateTemplate` (id, name unique, notes, isActive), `RateTemplateRate` (templateId, rateGroupId, durationMin, amount), `AnimatorRateOverride` (animatorId, characterId, durationMin, amount), `User.rateTemplateId` (nullable, SetNull)

⚠️ **Модель `Rate` УДАЛЕНА** (миграция `20261013190714_drop_rates_table`). Legacy эндпоинты `/api/rates/matrix` и `/api/rates/lookup` удалены. Legacy UI (`RateMatrixScreen`, `RatesMatrixPage`, `api/rates.ts`, `useRates.ts`) удалены.

## 🔌 API

### Rate Templates (только director)
### Handover
⚠️ `/history` регистрируется **до** `/:id` (иначе Express перехватит).

## 🎯 Логика ставок (template + override)

При назначении аниматора на слот (`RatesService.lookup`):
1. Override по (animatorId, characterId, durationMin)? → source: `"override"`
2. Иначе — шаблон аниматора по (character.rateGroupId, durationMin) → source: `"template"`
3. Иначе — payout вручную (found: false, source: null)

**Автопересчёт** будущих назначений при:
- `saveRates` (шаблон): пересчёт всех аниматоров на этом шаблоне
- `assign` (смена шаблона): пересчёт одного аниматора
- `saveOverrides`: пересчёт одного аниматора

**Условия пересчёта** (orderAnimator): `payoutSource="rate_matrix"`, `payoutPaidAt IS NULL`, `order.eventDate >= сегодня`, `order.status NOT IN (completed, cancelled)`.

**Кастомные длительности** — поддержаны через `getEffectiveDurations(characters, existingDurations)` в `shared/src/rates.ts` (union стандартных + из `priceOptions` + сохранённых в шаблоне). Динамические колонки в `RateTemplateEditPage` / `AnimatorRatesModal` (admin-web) и `RateTemplateEditScreen` / `AnimatorRatesScreen` (mobile).

## 🎯 Логика handover (три шага)

1. **Аня** создаёт заявку → Пете push
2. **Петя** подтверждает (accept) → push Ане и админам
3. **Админ/директор** approve → атомарная замена:
   - Аня → `status=removed, releaseReason=handed_over, releasedAt=now`
   - Петя → `status=invited, payout из шаблона/override`
   - Заявка → `approved`
   - `OrderChange: field=handover_approved`

Пока approve не случился — assignment НЕ меняется. Проверено curl-тестом.

**Cron напоминаний** (`jobs/handover-reminders.job.ts`):
- Каждые 30 минут
- Кому: **получателю заявки** (`toAnimatorId`)
- Текст: `"{fromName} ждёт вашего ответа: {orderTitle}"`
- Без лимита — пока заявка в `pending_receiver`
- Ручной триггер `runHandoverRemindersNow()` для тестов

## 📱 Мобилка

**Табы:**
- Аниматор: Заказы / Отчёты / Профиль
- Директор: Сводка / Заказы / Клиенты / Аниматоры / Финансы / Профиль
- Админ: Сводка / Заказы / Клиенты / Профиль

**Сводка (DashboardStack):**
- Жёлтый баннер **«📥 Заявки на передачу (N)»** — **кликабельный** (ведёт на `HandoverPending`), появляется при N>0
- 4 метрики: Заказов сегодня / Свободные аниматоры / Без аниматора / Без предоплаты (директор)
- Касса за месяц (директор)
- Ближайшие / Требуют назначения / Ожидают предоплату (директор)
- Тап на заказ → `OrderDetail` внутри стека Сводки, «Назад» возвращает в Сводку

**Handover (директор/админ)** — НОВОЕ 14.10:
- `HandoverPendingScreen` — список `pending_approval` (карточки `HandoverCard`)
- В `HandoverDetailScreen`: role-based кнопки **Подтвердить** / **Отклонить** (только для director/admin и статуса pending_approval)
- Аниматор по-прежнему видит: принять/отклонить (pending_receiver) и отозвать
- Deep-link из push `handover_pending_approval` → `HandoverDetail` → там появляются кнопки approve/reject

**Rate Templates (StaffAnimatorsStack):**
- `RateTemplatesScreen` — таб «Шаблоны» (4-й) в `StaffAnimatorsTabs`
- Действия с шаблоном (bottom-sheet, ⋯ или долгий тап): Редактировать ставки / Дублировать / Переименовать / В архив / Удалить / Отмена
- `AnimatorRatesScreen` — привязка шаблона + override (динамические строки)
- Кнопка «🎯 Шаблон и переопределения» в карточке аниматора

**Кастомные длительности (CharacterFormScreen):**
- Кнопка «+ Добавить длительность» → bottom-sheet: чипсы стандартных + input «Своя» (1-1440 мин)
- Метка «своя» для нестандартных
- Сервер принимает любые `durationMin` (валидация 1–1440)

**Push (проверено end-to-end на живом устройстве 13.10):**
- `order_*` → `navigateToOrder(orderId)`
- `handover_*` → `navigateToHandover(requestId)`
- Все 4 направления работают: assign / create handover / accept / approve + cron-reminder

## 🖥️ Admin-web

**Сайдбар:** Сводка / Заказы / Клиенты / Аниматоры / **Передачи** / Справочники / Финансы / Сотрудники(D) / Настройки(D)

**Раздел «Аниматоры» (AnimatorsLayout):**
Табы: **Аниматоры** / **Шаблоны ставок** (Матрица ставок удалена)

**RateTemplatesPage:** список + кнопки: Редактировать / Дублировать / **Архив-Распаковать** / Переименовать / Удалить; клик на бейдж статуса тоже переключает архив

**RateTemplateEditPage:** таблица строки = группы, столбцы = динамические длительности, inline-edit, показывает `affectedAssignments`

**AnimatorRatesModal** (кнопка Layers в списке аниматоров): секции «Шаблон» (dropdown + Сохранить) и «Переопределения» (таблица персонаж × длительность, placeholder = базовая ставка из шаблона)

**Handover (`/handover`)** — ОБНОВЛЕНО 14.10:
- **Табы:** Ожидают (N) / Все / Подтверждённые / Отклонённые / Отменённые
- **Фильтры:** dropdown «Все аниматоры» (по `fromAnimatorId` OR `toAnimatorId`) + диапазон дат
- Кнопки Подтвердить/Отклонить — только для строк со статусом `pending_approval`
- Колонка **Статус** с цветным бейджем и комментарием (rejectComment / comment)
- Пункт в сайдбаре «🔄 Передачи», баннер на дашборде при N>0

**Сводка (DashboardPage):** метрики, баннер, касса за месяц, ближайшие/требуют назначения/ожидают предоплату. Тап на заказ → orderDetail со `state.from=dashboard` → кнопка «←» делает `navigate(-1)`

## 💰 Предоплата — кто может

- **Сумму** (`prepaymentAmount`) — только директор
- **Отметку** (`prepaymentPaid`) — директор + админ
- **Метод финала** (`finalPaymentMethod`) — только директор
- Финальная оплата (`POST /final-payment`) — все, включая аниматора
- Сдача в кассу (`handover final`) — только директор
- В мобильном `StaffOrderEditScreen` поле суммы предоплаты заблокировано для админа

## 🇷🇺 Русский язык в истории изменений

**Admin-web OrderDetailPage:** `FIELD_LABELS`, `ENUM_VALUE_LABELS`, `translateEnum()`

**Mobile utils/labels.ts:** `CHANGE_FIELD_LABELS`, `RELEASE_REASON_LABELS`, `PAYMENT_METHOD_LABELS`, `PAYOUT_SOURCE_LABELS`, `translateChangeValue(field, raw)` — используется в `StaffOrderDetailScreen`

## ⚠️ ГРАБЛИ И РЕШЕНИЯ

### Кодировка и PowerShell
1. TS/JS-скрипты: `[System.IO.File]::WriteAllText(path, content, (New-Object System.Text.UTF8Encoding($false)))`
2. `.ps1` — ОБЯЗАТЕЛЬНО `$true` (BOM), иначе CP1251 → кракозябры
3. В here-string `@'...'@` НИКОГДА не писать двойной бэкслеш `\\uXXXX`
4. Закрывающий `'@` — в начале строки, без пробелов
5. PowerShell 5.1 НЕ понимает `&&` и `<<<`
6. Для больших файлов: `node -e "console.log(require('fs').readFileSync('path','utf8'))"`
7. **Большие SUMMARY (>300 строк) писать частями через `appendFileSync`** — здесь-string не выдерживает объём, файл молча становится пустым (проверять length!)

### Node-скрипты для патчей
8. `fs.writeFileSync` ПОСЛЕ каждого `rep()` — не в конце
9. Уникальность анкора: `src.split(oldText).length - 1 === 1`
10. Конец строки: определять через `src.includes("\r\n")` (schema.prisma и большинство — LF)
11. Точные анкоры, не regex
12. `req.user.sub`, НЕ `.id`
13. `ORDER_STATUS_LABELS` из `@event-agency/shared`
14. Prisma-миграция лочит PM2: `pm2 stop` → `prisma migrate` → `pm2 start`
15. Push в approve — ВНЕ транзакции (иначе ошибка откатит транзакцию)

### API и логика
16. API возвращает `{ items: [...] }`, не массив
17. Мобилка: API_URL без `/api`, пути с `/api/...`
18. `limit=500` в admin-web → 422. Max 200
19. На Android `Alert.alert` — МАКС 3 кнопки
20. На Android `Alert.prompt` НЕ работает
21. `useCharacters` в admin-web — БЕЗ параметра limit
22. `fetchCharacters` возвращает массив, не `{ items }`
23. UUID пользователей МЕНЯЮТСЯ после seed — не хардкодить

### Rate Templates
24. `rateTemplateId` nullable
25. Override НЕ nullable (нет override = нет строки)
26. `RateTemplate.name` `@unique` → в seed очищать перед create
27. Legacy `saveMatrix` был ОПАСЕН — писал в общий шаблон. УДАЛЁН

### Cron
28. Напоминание идёт ПОЛУЧАТЕЛЮ (`toAnimatorId`), не отправителю
29. Ручной триггер: `runHandoverRemindersNow()` в `handover-reminders.job.ts`
30. На Windows при `process.exit(0)` до завершения Firebase SDK — libuv assertion (не наш баг, игнорировать)

### Vite dev
31. **После крупных патчей `.tsx` — перезапускать Vite dev-сервер** (Ctrl+C + `npm run dev`). HMR иногда не подхватывает изменения, а Ctrl+Shift+R (hard reload) помогает не всегда

### Git
32. После каждого блока: `git add -A && git status --short && git commit && git push`
33. `.gitignore`: firebase-admin-key.json, credentials.json, google-services.json, `server/.env`, `mobile/android/`, `scaffold-*.js`, `patch-*.js`, `/*.ps1`, `setup-*.ps1`, `test-*.ps1`, `diag*.ps1`, `*-handover.ps1`, `create-*.ps1`, `approve-*.ps1`, `accept-*.ps1`, `reject-*.ps1`, CLAUDE.md, AGENTS.md

## 🎨 Стиль работы с пользователем

- Программирует сам, читает код, копирует скрипты целиком
- Отвечать структурно, короткими блоками
- Скрипты создавать в корне как `scaffold-*.js` / `patch-*.js` / `write-*.js`, удалять после
- После патча — `npm run typecheck` (корень) + `npx tsc --noEmit` (mobile)
- Перед крупными изменениями — уточнять развилки
- Пользователь устаёт от больших сессий — предлагать отдых
- Формат патчей: один блок `$content = @'...'@` + WriteAllText + node + Remove-Item + typecheck

## 📌 ТЕКУЩИЙ СТАТУС (на 2026-10-14, вечер)

**Работает:**
- PM2: `event-agency-api` online (id 10), health ok
- Typecheck: shared, server, admin-web — чисто; mobile `npx tsc --noEmit` — чисто
- Git: main = origin
- HEAD: `ffe512d shared+server: validate OrderStatus transitions (B1) + allow new->in_progress (B8)`

**Сделано за сессию 2026-10-11..14:**
1. HA1–HA4 (Handover): модель + API + push + cron + мобилка + admin-web
2. Сводка в мобилке (директор + админ)
3. Возврат «назад» в источник из карточки заказа (мобилка + admin-web)
4. Админ может отмечать/снимать предоплату
5. Русский язык в истории изменений (мобилка + admin-web)
6. Группы ставок (Rate Templates): сервер + admin-web + mobile
7. Кастомные длительности персонажа → в шаблоны и override
8. УДАЛЕНИЕ LEGACY Rate matrix (сервер, БД, UI, seed)
9. Push handover проверен END-TO-END на живом устройстве
10. Cron-напоминания починены (получатель + текст)
11. `.gitignore` защищён от `.ps1`
12. Seed cleanup получил `handoverRequest.deleteMany`
13. Мобилка: approve/reject handover для director/admin + `HandoverPendingScreen` + кликабельный баннер (14.10)
14. Admin-web: история заявок — табы по статусам + фильтр по датам + фильтр по аниматору (14.10)
15. **АУДИТ логики статусов заказа** (14.10): e2e-скрипт + анализ, найдено 7 багов/рисков
16. **B1 FIXED:** валидация `ORDER_STATUS_FLOW` в `OrdersService.updateStatus` — `400 INVALID_STATUS_TRANSITION` на недопустимый переход
17. **B8 FIXED:** FLOW расширен — `new → in_progress` разрешён (final-payment авто-промоутит заказ)

## 🚧 План на следующие сессии

### Ближайшее (сегодня/завтра)
1. **✅ Аудит логики статусов заказа** — ЗАВЕРШЁН 14.10. Найдено 7 багов:
   - ✅ **B1** (fixed): FLOW не валидировался сервером
   - ✅ **B8** (fixed): `new → in_progress` разрешён
   - ⏳ **B3** (отложено, фронт): авто `new→confirmed` не пишет `OrderChange.field=status`
   - ⏳ **B4** (отложено, фронт): авто-фин.оплата пишет `field=finalPaymentReceived` вместо `status`
   - ⏳ **B5** (отложено, UX): нет push директору при `assignment.completed`
   - ⏳ **B6** (отложено, minor): мёртвый permission `ORDERS_STATUS_OWN`
   - ⏳ **B7** (отложено, minor): `PATCH /:id/animators/:animatorId` без `requirePermission`
   **Рекомендация B3/B4:** не менять сервер, поправить фронт — показывать обе истории в одном таймлайне.

2. **📊 UX-доработки в отчёте аниматора** (опционально):
   - Секция «Передачи заказов» с агрегатами (передал N, получил M, средний интервал до approve)

### Средние задачи
3. **🌐 Публикация в другие агентства** — NSSM / HTTPS / мультитенантность. Начать с проектирования.
4. **👤 Личный кабинет клиента** — роль `client`, magic-link, экран заказов.

## 📋 На старте новой сессии

1. Прочитать саммари.
2. Проверить: `pm2 list`, `curl health`, `git status`, `git log -3`.
3. Убедиться что `npm run typecheck` чистый + `cd mobile && npx tsc --noEmit` чистый.
4. Спросить пользователя что делаем.
5. **Приоритеты:** B3/B4 (фронт) → UX отчёта аниматора → публикация в агентства.
